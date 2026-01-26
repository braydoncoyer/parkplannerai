/**
 * Theme Park Schedule Optimizer - Distribution Phase
 *
 * Phase 0: Distribute rides across multi-day trips.
 * Ensures all user-selected rides are scheduled before any re-rides.
 */

import type {
  RideWithPredictions,
  TripSchedulerInput,
  SchedulerInput,
} from '../types';
import { calculateSavingsDelta } from '../utils/timeUtils';
import { normalizeLandName } from '../core/proximityCalculator';

// =============================================================================
// DISTRIBUTION STRATEGY
// =============================================================================

export type DistributionStrategy = 'even' | 'front-load';

// =============================================================================
// RIDE DISTRIBUTION
// =============================================================================

/**
 * Distribute user-selected rides across trip days
 *
 * Strategy options:
 * - 'even': Distribute rides evenly across all days (default)
 * - 'front-load': Put all rides on Day 1 for re-rides on subsequent days
 *
 * Even strategy:
 * 1. Headliners distributed evenly (1-2 per day)
 * 2. Rides grouped by land when possible
 * 3. Entertainment-coordinated rides on appropriate days
 * 4. Capacity-balanced across days
 *
 * @param input Multi-day trip input
 * @param strategy Distribution strategy ('even' or 'front-load')
 * @returns Map of day index to rides for that day
 */
export function distributeRidesAcrossDays(
  input: TripSchedulerInput,
  strategy: DistributionStrategy = 'even'
): Map<number, RideWithPredictions[]> {
  const distribution = new Map<number, RideWithPredictions[]>();
  const numDays = input.days.length;

  // Initialize distribution for each day
  for (let i = 0; i < numDays; i++) {
    distribution.set(i, []);
  }

  if (input.allSelectedRides.length === 0) {
    return distribution;
  }

  // Front-load strategy: all rides on Day 1 for re-rides on subsequent days
  if (strategy === 'front-load') {
    distribution.set(0, [...input.allSelectedRides]);
    return distribution;
  }

  // Even distribution strategy (default)
  // Categorize rides
  const { headliners, popular, moderate, low } = categorizeRides(input.allSelectedRides);

  // Step 1: Distribute headliners evenly
  distributeHeadlinersEvenly(headliners, distribution, numDays);

  // Step 2: Distribute popular rides with land grouping consideration
  distributeWithLandAffinity(popular, distribution, numDays);

  // Step 3: Distribute remaining rides
  distributeWithLandAffinity([...moderate, ...low], distribution, numDays);

  // Step 4: Balance if any day is overloaded
  balanceDistribution(distribution, numDays);

  return distribution;
}

/**
 * Categorize rides by popularity
 */
function categorizeRides(rides: RideWithPredictions[]): {
  headliners: RideWithPredictions[];
  popular: RideWithPredictions[];
  moderate: RideWithPredictions[];
  low: RideWithPredictions[];
} {
  return {
    headliners: rides.filter((r) => r.popularity === 'headliner'),
    popular: rides.filter((r) => r.popularity === 'popular'),
    moderate: rides.filter((r) => r.popularity === 'moderate'),
    low: rides.filter((r) => r.popularity === 'low' || !r.popularity),
  };
}

/**
 * Distribute headliners evenly across days
 * Sort by savings delta to prioritize most time-sensitive rides
 */
function distributeHeadlinersEvenly(
  headliners: RideWithPredictions[],
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): void {
  // Sort by savings delta (highest first)
  const sorted = [...headliners].sort((a, b) => {
    const deltaA = calculateSavingsDelta(a.hourlyPredictions ?? []);
    const deltaB = calculateSavingsDelta(b.hourlyPredictions ?? []);
    return deltaB - deltaA;
  });

  // Distribute in round-robin fashion
  let dayIndex = 0;
  for (const headliner of sorted) {
    const dayRides = distribution.get(dayIndex) || [];
    dayRides.push(headliner);
    distribution.set(dayIndex, dayRides);

    dayIndex = (dayIndex + 1) % numDays;
  }
}

/**
 * Distribute rides with consideration for land grouping
 */
function distributeWithLandAffinity(
  rides: RideWithPredictions[],
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): void {
  // Group rides by land
  const ridesByLand = new Map<string, RideWithPredictions[]>();

  for (const ride of rides) {
    const land = normalizeLandName(ride.land) || 'unknown';
    const landRides = ridesByLand.get(land) || [];
    landRides.push(ride);
    ridesByLand.set(land, landRides);
  }

  // Find which day has most rides from each land
  const landDayPreference = new Map<string, number>();

  for (const [land] of ridesByLand) {
    let bestDay = 0;
    let bestCount = 0;

    for (let day = 0; day < numDays; day++) {
      const dayRides = distribution.get(day) || [];
      const count = dayRides.filter(
        (r) => normalizeLandName(r.land) === land
      ).length;

      if (count > bestCount) {
        bestCount = count;
        bestDay = day;
      }
    }

    landDayPreference.set(land, bestDay);
  }

  // Assign rides to their land's preferred day, balancing load
  for (const [land, landRides] of ridesByLand) {
    const preferredDay = landDayPreference.get(land) || 0;

    for (const ride of landRides) {
      // Check if preferred day is overloaded
      const preferredDayRides = distribution.get(preferredDay) || [];
      const avgRidesPerDay = rides.length / numDays;

      let targetDay = preferredDay;
      if (preferredDayRides.length > avgRidesPerDay + 3) {
        // Find least loaded day
        targetDay = findLeastLoadedDay(distribution, numDays);
      }

      const dayRides = distribution.get(targetDay) || [];
      dayRides.push(ride);
      distribution.set(targetDay, dayRides);
    }
  }
}

/**
 * Find the day with the fewest rides
 */
function findLeastLoadedDay(
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): number {
  let minDay = 0;
  let minCount = Infinity;

  for (let day = 0; day < numDays; day++) {
    const count = distribution.get(day)?.length || 0;
    if (count < minCount) {
      minCount = count;
      minDay = day;
    }
  }

  return minDay;
}

/**
 * Balance distribution if any day is significantly overloaded
 */
function balanceDistribution(
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): void {
  const totalRides = Array.from(distribution.values()).reduce(
    (sum, rides) => sum + rides.length,
    0
  );
  const avgPerDay = totalRides / numDays;
  const maxPerDay = Math.ceil(avgPerDay * 1.3); // Allow 30% overage

  // Find overloaded days
  for (let day = 0; day < numDays; day++) {
    const dayRides = distribution.get(day) || [];

    while (dayRides.length > maxPerDay) {
      // Find the least loaded day
      const targetDay = findLeastLoadedDay(distribution, numDays);

      if (targetDay === day) {
        break; // All days are equally loaded
      }

      // Move the lowest priority ride (last in list is usually lowest)
      const rideToMove = dayRides.pop();
      if (rideToMove) {
        const targetRides = distribution.get(targetDay) || [];
        targetRides.push(rideToMove);
        distribution.set(targetDay, targetRides);
      }
    }

    distribution.set(day, dayRides);
  }
}

// =============================================================================
// DAY CAPACITY ESTIMATION
// =============================================================================

/**
 * Estimate how many rides can fit on each day
 */
export function estimateDayCapacities(
  input: TripSchedulerInput,
  avgRideTime: number = 35
): Map<number, number> {
  const capacities = new Map<number, number>();

  for (let i = 0; i < input.days.length; i++) {
    const day = input.days[i];
    const parkHours = day.input.parkHours;

    // Calculate available time
    const openMinutes = parkHours.openHour * 60 + (parkHours.openMinute ?? 0);
    const closeMinutes = parkHours.closeHour * 60 + (parkHours.closeMinute ?? 0);
    let availableTime = closeMinutes - openMinutes - 20; // 20 min buffer

    // Subtract entertainment time
    for (const ent of day.input.entertainment) {
      if (ent.showTimes && ent.showTimes.length > 0) {
        availableTime -= (ent.duration ?? 20) + 30; // entertainment + buffer
      }
    }

    // Subtract meal breaks if enabled
    if (day.input.preferences.includeBreaks) {
      availableTime -= 90; // lunch + dinner
    }

    // Calculate capacity
    const capacity = Math.floor(availableTime / avgRideTime);
    capacities.set(i, Math.max(1, capacity));
  }

  return capacities;
}

/**
 * Check if all rides can fit across the trip
 */
export function canFitAllRides(
  input: TripSchedulerInput,
  avgRideTime: number = 35
): { canFit: boolean; totalCapacity: number; totalRides: number } {
  const capacities = estimateDayCapacities(input, avgRideTime);
  const totalCapacity = Array.from(capacities.values()).reduce((a, b) => a + b, 0);
  const totalRides = input.allSelectedRides.length;

  return {
    canFit: totalCapacity >= totalRides,
    totalCapacity,
    totalRides,
  };
}

// =============================================================================
// DISTRIBUTION VALIDATION
// =============================================================================

/**
 * Validate the distribution
 */
export function validateDistribution(
  distribution: Map<number, RideWithPredictions[]>,
  allRides: RideWithPredictions[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check all rides are distributed
  const distributedIds = new Set<string | number>();
  for (const [, rides] of distribution) {
    for (const ride of rides) {
      distributedIds.add(ride.id);
    }
  }

  for (const ride of allRides) {
    if (!distributedIds.has(ride.id)) {
      errors.push(`Ride ${ride.name} was not distributed to any day`);
    }
  }

  // Check for duplicate assignments
  const seenIds = new Set<string | number>();
  for (const [day, rides] of distribution) {
    for (const ride of rides) {
      if (seenIds.has(ride.id)) {
        warnings.push(`Ride ${ride.name} is assigned to multiple days`);
      }
      seenIds.add(ride.id);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get rides assigned to a specific day
 */
export function getRidesForDay(
  distribution: Map<number, RideWithPredictions[]>,
  dayIndex: number
): RideWithPredictions[] {
  return distribution.get(dayIndex) || [];
}
