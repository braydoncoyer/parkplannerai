/**
 * Theme Park Schedule Optimizer - Conflict Resolver
 *
 * Handles conflicts when multiple rides want the same time slot.
 * Implements priority rules for headliner vs headliner, headliner vs entertainment, etc.
 */

import type {
  RideWithPredictions,
  Anchor,
  TimeBlock,
  ScheduleGap,
  SchedulingContext,
} from '../types';
import {
  findOptimalPredictionHour,
  findPeakPredictionHour,
  calculateSavingsDelta,
  doRangesOverlap,
  getHourFromMinutes,
} from '../utils/timeUtils';
import { findGapsInBlock, findAllGaps } from './timeBlockManager';

// =============================================================================
// CONFLICT TYPES
// =============================================================================

export type ConflictType =
  | 'headliner_vs_headliner'
  | 'headliner_vs_entertainment'
  | 'ride_vs_ride'
  | 'time_overlap';

export interface ConflictResult {
  winner: RideWithPredictions;
  loser: RideWithPredictions;
  reason: string;
  alternativeTime?: number;
}

// =============================================================================
// HEADLINER VS HEADLINER RESOLUTION
// =============================================================================

/**
 * Resolve conflict when two headliners want the same optimal time slot
 *
 * Rules:
 * 1. Narrower optimal window wins (more constrained ride gets preference)
 * 2. Higher wait delta wins (ride that "hurts more" to miss optimal)
 * 3. Rope drop target gets absolute priority at park open
 */
export function resolveHeadlinerConflict(
  ride1: RideWithPredictions,
  ride2: RideWithPredictions,
  isRide1RopeDropTarget: boolean = false,
  isRide2RopeDropTarget: boolean = false
): ConflictResult {
  // Rope drop targets get absolute priority at park open
  if (isRide1RopeDropTarget && !isRide2RopeDropTarget) {
    return {
      winner: ride1,
      loser: ride2,
      reason: 'Rope drop target gets priority at park open',
    };
  }
  if (isRide2RopeDropTarget && !isRide1RopeDropTarget) {
    return {
      winner: ride2,
      loser: ride1,
      reason: 'Rope drop target gets priority at park open',
    };
  }

  // Calculate savings delta (how much each ride benefits from optimal time)
  const delta1 = calculateSavingsDelta(ride1.hourlyPredictions ?? []);
  const delta2 = calculateSavingsDelta(ride2.hourlyPredictions ?? []);

  // Calculate optimal window width (how many hours are within 20% of optimal)
  const window1 = calculateOptimalWindowWidth(ride1.hourlyPredictions ?? []);
  const window2 = calculateOptimalWindowWidth(ride2.hourlyPredictions ?? []);

  // Narrower window wins (more constrained ride)
  if (window1 < window2 - 1) {
    return {
      winner: ride1,
      loser: ride2,
      reason: `${ride1.name} has narrower optimal window (${window1} vs ${window2} hours)`,
    };
  }
  if (window2 < window1 - 1) {
    return {
      winner: ride2,
      loser: ride1,
      reason: `${ride2.name} has narrower optimal window (${window2} vs ${window1} hours)`,
    };
  }

  // If windows are similar, higher delta wins
  if (delta1 > delta2 + 5) {
    return {
      winner: ride1,
      loser: ride2,
      reason: `${ride1.name} saves more time at optimal (${delta1} vs ${delta2} min)`,
    };
  }
  if (delta2 > delta1 + 5) {
    return {
      winner: ride2,
      loser: ride1,
      reason: `${ride2.name} saves more time at optimal (${delta2} vs ${delta1} min)`,
    };
  }

  // Tie-breaker: higher average wait wins (more important to optimize)
  const avg1 = ride1.hourlyPredictions?.reduce((a, b) => a + b, 0) ?? 0 / 13;
  const avg2 = ride2.hourlyPredictions?.reduce((a, b) => a + b, 0) ?? 0 / 13;

  if (avg1 >= avg2) {
    return {
      winner: ride1,
      loser: ride2,
      reason: `${ride1.name} has higher average wait time`,
    };
  }

  return {
    winner: ride2,
    loser: ride1,
    reason: `${ride2.name} has higher average wait time`,
  };
}

/**
 * Calculate how many hours are within 20% of the optimal wait time
 */
function calculateOptimalWindowWidth(predictions: number[]): number {
  if (predictions.length === 0) return 13; // No data, assume wide window

  const minWait = Math.min(...predictions);
  const threshold = minWait * 1.2;

  return predictions.filter((wait) => wait <= threshold).length;
}

// =============================================================================
// HEADLINER VS ENTERTAINMENT RESOLUTION
// =============================================================================

/**
 * Entertainment is IMMOVABLE. Headliner must work around it.
 *
 * @returns Alternative times for the headliner (before or after entertainment)
 */
export function resolveHeadlinerVsEntertainment(
  ride: RideWithPredictions,
  anchor: Anchor,
  context: SchedulingContext
): {
  canScheduleBefore: boolean;
  canScheduleAfter: boolean;
  beforeTime?: number;
  afterTime?: number;
  recommendation: 'before' | 'after' | 'neither';
  beforeWait?: number;
  afterWait?: number;
} {
  const rideDuration = (ride.duration ?? 5) + 30; // ride + average wait

  // Check if there's time before the entertainment
  const beforeEnd = anchor.startTime - anchor.arrivalBuffer;
  const beforeStart = beforeEnd - rideDuration;

  const canScheduleBefore =
    beforeStart >= context.parkOpen &&
    !hasConflictInRange(beforeStart, beforeEnd, context);

  // Check if there's time after the entertainment
  const afterStart = anchor.endTime;
  const afterEnd = afterStart + rideDuration;

  const canScheduleAfter =
    afterEnd <= context.effectiveClose &&
    !hasConflictInRange(afterStart, afterEnd, context);

  // Calculate wait times at each option
  const predictions = ride.hourlyPredictions ?? [];
  const beforeWait = canScheduleBefore
    ? predictions[getHourFromMinutes(beforeStart) - 9] ?? 30
    : undefined;
  const afterWait = canScheduleAfter
    ? predictions[getHourFromMinutes(afterStart) - 9] ?? 30
    : undefined;

  // Determine recommendation
  let recommendation: 'before' | 'after' | 'neither' = 'neither';

  if (canScheduleBefore && canScheduleAfter) {
    // Prefer the option with lower wait time
    recommendation =
      (beforeWait ?? Infinity) <= (afterWait ?? Infinity) ? 'before' : 'after';
  } else if (canScheduleBefore) {
    recommendation = 'before';
  } else if (canScheduleAfter) {
    recommendation = 'after';
  }

  return {
    canScheduleBefore,
    canScheduleAfter,
    beforeTime: canScheduleBefore ? beforeStart : undefined,
    afterTime: canScheduleAfter ? afterStart : undefined,
    recommendation,
    beforeWait,
    afterWait,
  };
}

/**
 * Check if there's a conflict in a time range
 */
function hasConflictInRange(
  start: number,
  end: number,
  context: SchedulingContext
): boolean {
  for (const slot of context.usedSlots.values()) {
    if (doRangesOverlap(start, end, slot.start, slot.end)) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// ALTERNATIVE TIME FINDING
// =============================================================================

/**
 * Find alternative times for a ride that lost a conflict
 * Returns the next best times sorted by wait time
 */
export function findAlternativeTimes(
  ride: RideWithPredictions,
  context: SchedulingContext,
  excludeTimes: number[] = []
): { time: number; wait: number; gap: ScheduleGap }[] {
  const predictions = ride.hourlyPredictions ?? [];
  const rideDuration = (ride.duration ?? 5) + 30;

  // Find all available gaps
  const gaps = findAllGaps(context.timeBlocks, context.scheduledItems, rideDuration);

  // Score each gap by the wait time at that hour
  const alternatives: { time: number; wait: number; gap: ScheduleGap }[] = [];

  for (const gap of gaps) {
    const hour = getHourFromMinutes(gap.start);
    const index = Math.max(0, Math.min(12, hour - 9));
    const wait = predictions[index] ?? 30;

    // Skip excluded times
    if (excludeTimes.some((t) => Math.abs(t - gap.start) < 30)) {
      continue;
    }

    alternatives.push({
      time: gap.start,
      wait,
      gap,
    });
  }

  // Sort by wait time (lowest first)
  return alternatives.sort((a, b) => a.wait - b.wait);
}

/**
 * Find the next best hour for a ride (excluding already claimed times)
 */
export function findNextBestHour(
  ride: RideWithPredictions,
  claimedHours: Set<number>,
  parkOpen: number,
  parkClose: number
): { hour: number; wait: number } | null {
  const predictions = ride.hourlyPredictions ?? [];

  // Create array of hours with their wait times
  const hourWaits: { hour: number; wait: number }[] = [];

  for (let hour = 9; hour <= 21; hour++) {
    const minuteTime = hour * 60;

    // Skip if outside park hours
    if (minuteTime < parkOpen || minuteTime > parkClose - 30) {
      continue;
    }

    // Skip if hour is claimed
    if (claimedHours.has(hour)) {
      continue;
    }

    const index = hour - 9;
    const wait = predictions[index] ?? 30;
    hourWaits.push({ hour, wait });
  }

  // Sort by wait time and return the best one
  hourWaits.sort((a, b) => a.wait - b.wait);

  return hourWaits.length > 0 ? hourWaits[0] : null;
}

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

/**
 * Check if two rides want overlapping optimal times
 */
export function haveOverlappingOptimalTimes(
  ride1: RideWithPredictions,
  ride2: RideWithPredictions,
  toleranceHours: number = 1
): boolean {
  const optimal1 = findOptimalPredictionHour(ride1.hourlyPredictions ?? []);
  const optimal2 = findOptimalPredictionHour(ride2.hourlyPredictions ?? []);

  return Math.abs(optimal1.hour - optimal2.hour) <= toleranceHours;
}

/**
 * Find all headliner conflicts in a set of rides
 */
export function findHeadlinerConflicts(
  headliners: RideWithPredictions[]
): Array<{ ride1: RideWithPredictions; ride2: RideWithPredictions }> {
  const conflicts: Array<{ ride1: RideWithPredictions; ride2: RideWithPredictions }> = [];

  for (let i = 0; i < headliners.length; i++) {
    for (let j = i + 1; j < headliners.length; j++) {
      if (haveOverlappingOptimalTimes(headliners[i], headliners[j])) {
        conflicts.push({
          ride1: headliners[i],
          ride2: headliners[j],
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if a ride's optimal time conflicts with an anchor
 */
export function conflictsWithAnchor(
  ride: RideWithPredictions,
  anchor: Anchor,
  rideDuration: number = 35
): boolean {
  const optimal = findOptimalPredictionHour(ride.hourlyPredictions ?? []);
  const rideStart = optimal.hour * 60;
  const rideEnd = rideStart + rideDuration;

  const anchorStart = anchor.startTime - anchor.arrivalBuffer;
  const anchorEnd = anchor.endTime;

  return doRangesOverlap(rideStart, rideEnd, anchorStart, anchorEnd);
}

// =============================================================================
// RESOLUTION STRATEGIES
// =============================================================================

/**
 * Batch resolve all headliner conflicts
 * Returns an ordered list of headliners with their assigned hours
 */
export function resolveAllHeadlinerConflicts(
  headliners: RideWithPredictions[],
  ropeDropTargetIds: Set<string | number>,
  parkOpen: number,
  parkClose: number
): Map<string | number, { hour: number; wait: number }> {
  const assignments = new Map<string | number, { hour: number; wait: number }>();
  const claimedHours = new Set<number>();

  // Sort headliners by priority:
  // 1. Rope drop targets first
  // 2. Then by savings delta (highest first)
  const sorted = [...headliners].sort((a, b) => {
    const aIsRopeDrop = ropeDropTargetIds.has(a.id);
    const bIsRopeDrop = ropeDropTargetIds.has(b.id);

    if (aIsRopeDrop && !bIsRopeDrop) return -1;
    if (bIsRopeDrop && !aIsRopeDrop) return 1;

    const deltaA = calculateSavingsDelta(a.hourlyPredictions ?? []);
    const deltaB = calculateSavingsDelta(b.hourlyPredictions ?? []);

    return deltaB - deltaA;
  });

  // Assign hours in priority order
  for (const ride of sorted) {
    const optimal = findOptimalPredictionHour(ride.hourlyPredictions ?? []);

    // Check if optimal hour is available
    if (!claimedHours.has(optimal.hour)) {
      assignments.set(ride.id, { hour: optimal.hour, wait: optimal.wait });
      claimedHours.add(optimal.hour);
    } else {
      // Find next best hour
      const alternative = findNextBestHour(ride, claimedHours, parkOpen, parkClose);

      if (alternative) {
        assignments.set(ride.id, alternative);
        claimedHours.add(alternative.hour);
      }
      // If no alternative found, ride will go to overflow
    }
  }

  return assignments;
}
