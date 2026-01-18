/**
 * Theme Park Schedule Optimizer - Trip Tracker
 *
 * Manages multi-day trip state to ensure ALL user-selected rides
 * are scheduled before ANY re-rides are added.
 */

import type {
  RideWithPredictions,
  SchedulerResult,
  TripContext,
  TripSchedulerInput,
  TripSchedulerResult,
} from '../types';

// =============================================================================
// TRIP CONTEXT CREATION
// =============================================================================

/**
 * Create initial trip context for multi-day scheduling
 */
export function createTripContext(
  allSelectedRides: RideWithPredictions[]
): TripContext {
  return {
    tripScheduledRideIds: new Set(),
    remainingUserRides: [...allSelectedRides],
    allUserRidesScheduled: false,
    dayResults: [],
  };
}

/**
 * Get a normalized ride ID for consistent tracking
 */
export function normalizeRideId(id: string | number): string {
  return String(id);
}

// =============================================================================
// TRIP STATE UPDATES
// =============================================================================

/**
 * Update trip context after scheduling a day
 * Marks rides as scheduled and updates remaining list
 */
export function updateTripContextAfterDay(
  context: TripContext,
  dayResult: SchedulerResult,
  date: Date
): TripContext {
  const updatedContext = { ...context };

  // Add scheduled ride IDs to trip-wide set
  for (const item of dayResult.items) {
    if (item.type === 'ride' && item.ride && !item.isReride) {
      const normalizedId = normalizeRideId(item.ride.id);
      updatedContext.tripScheduledRideIds.add(normalizedId);
    }
  }

  // Update remaining user rides
  updatedContext.remainingUserRides = updatedContext.remainingUserRides.filter(
    (ride) => !updatedContext.tripScheduledRideIds.has(normalizeRideId(ride.id))
  );

  // Check if all user rides are now scheduled
  updatedContext.allUserRidesScheduled = updatedContext.remainingUserRides.length === 0;

  // Record day result
  updatedContext.dayResults = [
    ...context.dayResults,
    { date, result: dayResult },
  ];

  return updatedContext;
}

/**
 * Check if a specific ride has been scheduled in the trip
 */
export function isRideScheduledInTrip(
  context: TripContext,
  rideId: string | number
): boolean {
  return context.tripScheduledRideIds.has(normalizeRideId(rideId));
}

/**
 * Get rides that haven't been scheduled yet in the trip
 */
export function getUnscheduledRides(context: TripContext): RideWithPredictions[] {
  return context.remainingUserRides;
}

/**
 * Check if re-rides are allowed based on trip state
 * Re-rides are ONLY allowed after ALL user selections are scheduled
 */
export function areReridesAllowed(context: TripContext): boolean {
  return context.allUserRidesScheduled;
}

// =============================================================================
// RIDE DISTRIBUTION
// =============================================================================

/**
 * Distribute user-selected rides across trip days
 * Prioritizes even distribution of headliners and land grouping
 *
 * @param input Trip input with all days and rides
 * @returns Map of day index to rides for that day
 */
export function distributeRidesAcrossDays(
  input: TripSchedulerInput
): Map<number, RideWithPredictions[]> {
  const distribution = new Map<number, RideWithPredictions[]>();
  const numDays = input.days.length;

  // Initialize distribution for each day
  for (let i = 0; i < numDays; i++) {
    distribution.set(i, []);
  }

  // Separate rides by popularity for balanced distribution
  const headliners = input.allSelectedRides.filter((r) => r.popularity === 'headliner');
  const popular = input.allSelectedRides.filter((r) => r.popularity === 'popular');
  const moderate = input.allSelectedRides.filter((r) => r.popularity === 'moderate');
  const low = input.allSelectedRides.filter((r) => r.popularity === 'low');

  // Distribute headliners evenly (1-2 per day)
  distributeEvenly(headliners, distribution, numDays);

  // Distribute popular rides evenly
  distributeEvenly(popular, distribution, numDays);

  // Distribute remaining rides, grouping by land where possible
  distributeWithLandGrouping([...moderate, ...low], distribution, numDays);

  return distribution;
}

/**
 * Distribute rides evenly across days
 */
function distributeEvenly(
  rides: RideWithPredictions[],
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): void {
  let dayIndex = 0;

  for (const ride of rides) {
    const dayRides = distribution.get(dayIndex) || [];
    dayRides.push(ride);
    distribution.set(dayIndex, dayRides);

    // Round-robin to next day
    dayIndex = (dayIndex + 1) % numDays;
  }
}

/**
 * Distribute rides with preference for land grouping
 */
function distributeWithLandGrouping(
  rides: RideWithPredictions[],
  distribution: Map<number, RideWithPredictions[]>,
  numDays: number
): void {
  // Group rides by land
  const ridesByLand = new Map<string, RideWithPredictions[]>();

  for (const ride of rides) {
    const land = ride.land?.toLowerCase() || 'unknown';
    const landRides = ridesByLand.get(land) || [];
    landRides.push(ride);
    ridesByLand.set(land, landRides);
  }

  // Find which day has the most rides from each land already
  const landDayAssignments = new Map<string, number>();

  for (const [land, landRides] of ridesByLand) {
    let bestDay = 0;
    let bestCount = 0;

    for (let day = 0; day < numDays; day++) {
      const dayRides = distribution.get(day) || [];
      const count = dayRides.filter(
        (r) => r.land?.toLowerCase() === land
      ).length;

      if (count > bestCount) {
        bestCount = count;
        bestDay = day;
      }
    }

    landDayAssignments.set(land, bestDay);
  }

  // Assign rides to their land's preferred day, balancing load
  for (const [land, landRides] of ridesByLand) {
    const preferredDay = landDayAssignments.get(land) || 0;

    for (const ride of landRides) {
      // Find day with fewest rides, preferring the land's preferred day
      let targetDay = preferredDay;
      const preferredDayRides = distribution.get(preferredDay) || [];

      // Check if preferred day is overloaded
      const avgRidesPerDay = rides.length / numDays;
      if (preferredDayRides.length > avgRidesPerDay + 2) {
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

// =============================================================================
// TRIP STATISTICS
// =============================================================================

/**
 * Calculate trip-wide statistics from all day results
 */
export function calculateTripStats(context: TripContext): {
  totalRidesScheduled: number;
  totalWaitTime: number;
  totalWalkTime: number;
  allUserRidesScheduled: boolean;
  totalRerides: number;
} {
  let totalRidesScheduled = 0;
  let totalWaitTime = 0;
  let totalWalkTime = 0;
  let totalRerides = 0;

  for (const { result } of context.dayResults) {
    totalRidesScheduled += result.stats.ridesScheduled;
    totalWaitTime += result.stats.totalWaitTime;
    totalWalkTime += result.stats.totalWalkTime;
    totalRerides += result.stats.reridesAdded;
  }

  return {
    totalRidesScheduled,
    totalWaitTime,
    totalWalkTime,
    allUserRidesScheduled: context.allUserRidesScheduled,
    totalRerides,
  };
}

/**
 * Generate trip-wide insights
 */
export function generateTripInsights(context: TripContext): string[] {
  const insights: string[] = [];
  const stats = calculateTripStats(context);

  // All rides scheduled insight
  if (context.allUserRidesScheduled) {
    insights.push('All selected rides have been scheduled across your trip!');
  } else {
    const remaining = context.remainingUserRides.length;
    insights.push(
      `${remaining} ride${remaining === 1 ? '' : 's'} could not be scheduled. Consider adding another day or removing some selections.`
    );
  }

  // Re-rides insight
  if (stats.totalRerides > 0) {
    insights.push(
      `Added ${stats.totalRerides} re-ride${stats.totalRerides === 1 ? '' : 's'} to fill extra time.`
    );
  }

  // Time savings insight
  if (stats.totalWaitTime > 0) {
    const hoursWaiting = Math.round(stats.totalWaitTime / 60);
    insights.push(
      `Estimated total wait time: ${hoursWaiting} hour${hoursWaiting === 1 ? '' : 's'} across ${context.dayResults.length} day${context.dayResults.length === 1 ? '' : 's'}.`
    );
  }

  return insights;
}

// =============================================================================
// TRIP RESULT BUILDER
// =============================================================================

/**
 * Build final trip result from context
 */
export function buildTripResult(context: TripContext): TripSchedulerResult {
  return {
    days: context.dayResults,
    tripStats: calculateTripStats(context),
    tripInsights: generateTripInsights(context),
  };
}

/**
 * Get rides available for re-rides on a specific day
 * Only returns rides that were already scheduled earlier in the trip
 */
export function getAvailableRerides(
  context: TripContext,
  currentDayIndex: number
): RideWithPredictions[] {
  if (!areReridesAllowed(context)) {
    return [];
  }

  // Collect rides that were scheduled in previous days
  const rerideCandidates: RideWithPredictions[] = [];

  for (let i = 0; i < currentDayIndex && i < context.dayResults.length; i++) {
    const dayResult = context.dayResults[i].result;

    for (const item of dayResult.items) {
      if (item.type === 'ride' && item.ride) {
        // Don't add duplicates
        const alreadyAdded = rerideCandidates.some(
          (r) => normalizeRideId(r.id) === normalizeRideId(item.ride!.id)
        );

        if (!alreadyAdded) {
          rerideCandidates.push(item.ride);
        }
      }
    }
  }

  // Sort by popularity (headliners first for re-rides)
  return rerideCandidates.sort((a, b) => {
    const priorityOrder = { headliner: 0, popular: 1, moderate: 2, low: 3 };
    const aPriority = priorityOrder[a.popularity ?? 'moderate'] ?? 2;
    const bPriority = priorityOrder[b.popularity ?? 'moderate'] ?? 2;
    return aPriority - bPriority;
  });
}
