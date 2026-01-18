/**
 * Theme Park Schedule Optimizer - Rope Drop Phase
 *
 * Phase 2: Handle rope drop strategy with delta-based ordering.
 * User selects 2-3 rides to prioritize at park open, algorithm orders
 * them by savings delta (peak wait - rope drop wait).
 */

import type {
  RideWithPredictions,
  RopeDropConfig,
  ScheduledItem,
  SchedulingContext,
} from '../types';
import {
  DEFAULT_RIDE_DURATION,
  MAX_ROPE_DROP_TARGETS,
  ROPE_DROP_DELTA_THRESHOLD,
} from '../constants';
import {
  calculateSavingsDelta,
  findOptimalPredictionHour,
  findPeakPredictionHour,
  getHourFromMinutes,
} from '../utils/timeUtils';
import { calculateWalkTime, normalizeLandName } from '../core/proximityCalculator';
import { addItemToContext } from '../core/timeBlockManager';

// =============================================================================
// ROPE DROP OPTIMIZATION
// =============================================================================

/**
 * Process rope drop targets and schedule them at park open
 *
 * The algorithm:
 * 1. Calculate savings delta for each target: (peak wait) - (rope drop wait)
 * 2. Sort by delta (highest first) - rides that benefit MOST go first
 * 3. Group same-land rides if delta difference is small (<15 min)
 * 4. Schedule in optimal order at park open
 */
export function processRopeDrop(
  context: SchedulingContext,
  config: RopeDropConfig
): ScheduledItem[] {
  if (!config.enabled || config.targets.length === 0) {
    return [];
  }

  const scheduledItems: ScheduledItem[] = [];

  // Limit to max targets
  const targets = config.targets.slice(0, MAX_ROPE_DROP_TARGETS);

  // Calculate delta for each target
  const targetsWithDelta = targets.map((ride) => ({
    ride,
    delta: calculateSavingsDelta(ride.hourlyPredictions ?? []),
    ropeDropWait: getRopeDropWait(ride, context.parkOpen),
    peakWait: findPeakPredictionHour(ride.hourlyPredictions ?? []).wait,
  }));

  // Sort by delta (highest first)
  targetsWithDelta.sort((a, b) => b.delta - a.delta);

  // Apply same-land grouping optimization
  const orderedTargets = optimizeForLandGrouping(targetsWithDelta);

  // Schedule each rope drop target
  let currentTime = context.parkOpen;

  for (const target of orderedTargets) {
    const ride = target.ride;
    const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;
    const waitTime = target.ropeDropWait;

    // Calculate walk time from previous item (if any)
    const walkTime =
      scheduledItems.length > 0
        ? calculateWalkTime(
            scheduledItems[scheduledItems.length - 1].land,
            ride.land
          )
        : 0;

    // Schedule the ride
    const scheduledTime = currentTime + walkTime;
    const endTime = scheduledTime + waitTime + rideDuration;

    const item: ScheduledItem = {
      id: `ropedrop_${ride.id}`,
      type: 'ride',
      scheduledTime,
      endTime,
      duration: waitTime + rideDuration,
      ride,
      expectedWait: waitTime,
      isOptimalTime: true, // Rope drop is always optimal for these rides
      walkFromPrevious: walkTime,
      reasoning: generateRopeDropReasoning(target, orderedTargets.indexOf(target) + 1),
      land: ride.land,
      parkId: context.input.parkId,
    };

    scheduledItems.push(item);
    addItemToContext(context, item);

    // Update current time
    currentTime = endTime;
  }

  // Add insight about rope drop
  if (orderedTargets.length > 0) {
    const totalSavings = orderedTargets.reduce((sum, t) => sum + t.delta, 0);
    context.insights.push(
      `Rope drop strategy saves ~${totalSavings} minutes by hitting ${orderedTargets.length} rides first`
    );
  }

  return scheduledItems;
}

/**
 * Get predicted wait time at rope drop (park open)
 */
function getRopeDropWait(ride: RideWithPredictions, parkOpen: number): number {
  const hour = getHourFromMinutes(parkOpen);
  const index = Math.max(0, Math.min(12, hour - 9));
  return ride.hourlyPredictions?.[index] ?? 15;
}

/**
 * Optimize rope drop order for land grouping when deltas are similar
 *
 * If two rides are in the same land and their delta difference is less than
 * the threshold, group them together to minimize walking.
 */
function optimizeForLandGrouping(
  targets: Array<{
    ride: RideWithPredictions;
    delta: number;
    ropeDropWait: number;
    peakWait: number;
  }>
): Array<{
  ride: RideWithPredictions;
  delta: number;
  ropeDropWait: number;
  peakWait: number;
}> {
  if (targets.length <= 2) {
    return targets;
  }

  // Check if we can improve by grouping same-land rides
  const result = [...targets];

  for (let i = 0; i < result.length - 1; i++) {
    for (let j = i + 2; j < result.length; j++) {
      const current = result[i];
      const next = result[i + 1];
      const candidate = result[j];

      // Check if current and candidate are in same land
      const currentLand = normalizeLandName(current.ride.land);
      const nextLand = normalizeLandName(next.ride.land);
      const candidateLand = normalizeLandName(candidate.ride.land);

      if (
        currentLand === candidateLand &&
        currentLand !== nextLand &&
        Math.abs(next.delta - candidate.delta) < ROPE_DROP_DELTA_THRESHOLD
      ) {
        // Swap to group same-land rides
        result[i + 1] = candidate;
        result[j] = next;
      }
    }
  }

  return result;
}

/**
 * Generate reasoning for a rope drop scheduled item
 */
function generateRopeDropReasoning(
  target: {
    ride: RideWithPredictions;
    delta: number;
    ropeDropWait: number;
    peakWait: number;
  },
  position: number
): string {
  const reasons: string[] = [];

  // Position in rope drop order
  const ordinal = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd';
  reasons.push(`${ordinal} rope drop target`);

  // Savings explanation
  reasons.push(
    `~${target.ropeDropWait} min wait vs ${target.peakWait} min at peak (saves ${target.delta} min)`
  );

  return reasons.join('. ') + '.';
}

// =============================================================================
// ROPE DROP VALIDATION
// =============================================================================

/**
 * Validate rope drop configuration
 */
export function validateRopeDropConfig(
  config: RopeDropConfig
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!config.enabled) {
    return { isValid: true, warnings };
  }

  // Check target count
  if (config.targets.length === 0) {
    warnings.push('Rope drop enabled but no targets selected');
  }

  if (config.targets.length > MAX_ROPE_DROP_TARGETS) {
    warnings.push(
      `Only first ${MAX_ROPE_DROP_TARGETS} rope drop targets will be prioritized`
    );
  }

  // Check for headliners
  const headliners = config.targets.filter((r) => r.popularity === 'headliner');
  if (headliners.length === 0) {
    warnings.push(
      'Consider selecting at least one headliner for rope drop to maximize savings'
    );
  }

  // Check for low-delta rides
  for (const target of config.targets) {
    const delta = calculateSavingsDelta(target.hourlyPredictions ?? []);
    if (delta < 15) {
      warnings.push(
        `${target.name} has low savings delta (${delta} min) - consider a different ride`
      );
    }
  }

  return {
    isValid: true,
    warnings,
  };
}

/**
 * Get rope drop target IDs as a Set for easy lookup
 */
export function getRopeDropTargetIds(config: RopeDropConfig): Set<string | number> {
  if (!config.enabled) {
    return new Set();
  }
  return new Set(config.targets.map((r) => r.id));
}

/**
 * Calculate total time needed for rope drop rides
 */
export function calculateRopeDropDuration(
  config: RopeDropConfig,
  parkOpen: number
): number {
  if (!config.enabled || config.targets.length === 0) {
    return 0;
  }

  let totalTime = 0;
  let lastLand: string | undefined;

  for (const ride of config.targets) {
    // Walk time
    if (lastLand) {
      totalTime += calculateWalkTime(lastLand, ride.land);
    }

    // Wait + ride time
    const waitTime = getRopeDropWait(ride, parkOpen);
    const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;
    totalTime += waitTime + rideDuration;

    lastLand = ride.land;
  }

  return totalTime;
}
