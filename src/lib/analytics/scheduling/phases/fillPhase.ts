/**
 * Theme Park Schedule Optimizer - Fill Phase
 *
 * Phase 4: Fill remaining time with non-headliner rides.
 * Uses multi-factor scoring to place rides in optimal slots.
 */

import type {
  RideWithPredictions,
  ScheduledItem,
  SchedulingContext,
  ScheduleGap,
} from '../types';
import { DEFAULT_RIDE_DURATION } from '../constants';
import { getInterpolatedWaitTime, getHourFromMinutes } from '../utils/timeUtils';
import { calculateWalkTime } from '../core/proximityCalculator';
import {
  findBestSlot,
  generateSlotCandidates,
  scoreSlotForRide,
} from '../core/slotScorer';
import {
  addItemToContext,
  findAllGaps,
  getItemBefore,
  getItemAfter,
} from '../core/timeBlockManager';

// =============================================================================
// FILL REMAINING RIDES
// =============================================================================

/**
 * Fill remaining gaps with non-headliner rides
 *
 * @param context Current scheduling context
 * @param rides Remaining rides to schedule (non-headliners)
 * @returns Scheduled items
 */
export function fillRemainingRides(
  context: SchedulingContext,
  rides: RideWithPredictions[]
): ScheduledItem[] {
  const scheduledItems: ScheduledItem[] = [];

  // Filter out already scheduled rides
  const remainingRides = rides.filter(
    (ride) => !context.scheduledRideIds.has(ride.id)
  );

  if (remainingRides.length === 0) {
    return scheduledItems;
  }

  // Sort rides by importance (popular > moderate > low)
  const sortedRides = sortRidesByImportance(remainingRides);

  // Schedule each ride in the best available slot
  for (const ride of sortedRides) {
    const scheduledItem = scheduleRideInBestSlot(context, ride);

    if (scheduledItem) {
      scheduledItems.push(scheduledItem);
    }
  }

  return scheduledItems;
}

/**
 * Schedule a single ride in the best available slot
 */
function scheduleRideInBestSlot(
  context: SchedulingContext,
  ride: RideWithPredictions
): ScheduledItem | null {
  const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;

  // Find all available gaps (filter by parkId for park hopper mode)
  const relevantBlocks = ride.parkId
    ? context.timeBlocks.filter(b => b.parkId === ride.parkId)
    : context.timeBlocks;
  const gaps = findAllGaps(
    relevantBlocks,
    context.scheduledItems,
    rideDuration + 10 // Min gap = ride duration + some buffer for wait/walk
  );

  if (gaps.length === 0) {
    return null;
  }

  // Find the best slot using multi-factor scoring
  const bestSlot = findBestSlot(ride, gaps, context);

  if (!bestSlot) {
    return null;
  }

  // Get expected wait at the scheduled time
  const expectedWait = getInterpolatedWaitTime(
    bestSlot.scheduledTime,
    ride.hourlyPredictions ?? []
  );

  // Create scheduled item
  const item: ScheduledItem = {
    id: `ride_${ride.id}`,
    type: 'ride',
    scheduledTime: bestSlot.scheduledTime,
    endTime: bestSlot.scheduledTime + expectedWait + rideDuration,
    duration: expectedWait + rideDuration,
    ride,
    expectedWait,
    isOptimalTime: isAtOptimalTime(ride, bestSlot.scheduledTime),
    walkFromPrevious: bestSlot.walkTime,
    reasoning: generateFillReasoning(ride, bestSlot.scheduledTime, expectedWait, bestSlot.walkTime),
    land: ride.land,
    parkId: ride.parkId ?? context.input.parkId,  // Use ride's parkId for park hopper mode
  };

  // Try to add - if conflict, return null (ride will go to overflow)
  if (!addItemToContext(context, item)) {
    return null;
  }
  return item;
}

/**
 * Check if a scheduled time is at the ride's optimal hour
 */
function isAtOptimalTime(ride: RideWithPredictions, scheduledTime: number): boolean {
  const predictions = ride.hourlyPredictions ?? [];
  if (predictions.length === 0) return false;

  const scheduledHour = getHourFromMinutes(scheduledTime);
  const minWait = Math.min(...predictions);
  const scheduledWait = predictions[scheduledHour - 9] ?? minWait;

  // Within 10% of optimal is considered optimal
  return scheduledWait <= minWait * 1.1;
}

/**
 * Sort rides by importance for fill order
 */
function sortRidesByImportance(rides: RideWithPredictions[]): RideWithPredictions[] {
  const priorityOrder = {
    headliner: 0,
    popular: 1,
    moderate: 2,
    low: 3,
  };

  return [...rides].sort((a, b) => {
    const priorityA = priorityOrder[a.popularity ?? 'moderate'] ?? 2;
    const priorityB = priorityOrder[b.popularity ?? 'moderate'] ?? 2;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Tie-breaker: higher average wait (more popular) first
    const avgA = (a.hourlyPredictions ?? []).reduce((s, v) => s + v, 0) / 13;
    const avgB = (b.hourlyPredictions ?? []).reduce((s, v) => s + v, 0) / 13;

    return avgB - avgA;
  });
}

/**
 * Generate reasoning for a fill ride scheduled item
 */
function generateFillReasoning(
  ride: RideWithPredictions,
  scheduledTime: number,
  expectedWait: number,
  walkTime: number
): string {
  const reasons: string[] = [];

  // Wait time context
  const predictions = ride.hourlyPredictions ?? [];
  if (predictions.length > 0) {
    const avgWait = predictions.reduce((a, b) => a + b, 0) / predictions.length;

    if (expectedWait < avgWait * 0.8) {
      const savings = Math.round(avgWait - expectedWait);
      reasons.push(`${savings} min below average wait`);
    } else if (expectedWait <= avgWait) {
      reasons.push(`Below average wait (~${expectedWait} min)`);
    } else {
      reasons.push(`~${expectedWait} min wait`);
    }
  } else {
    reasons.push(`~${expectedWait} min wait`);
  }

  // Walk time context
  if (walkTime <= 3) {
    reasons.push('Nearby location');
  } else if (walkTime <= 8) {
    reasons.push('Short walk');
  }

  // Popularity context
  if (ride.popularity === 'popular') {
    reasons.push('Popular attraction');
  }

  return reasons.join('. ') + '.';
}

// =============================================================================
// RE-RIDE HANDLING
// =============================================================================

/**
 * Add re-rides to fill remaining gaps (only after ALL user rides are scheduled)
 *
 * @param context Current scheduling context
 * @param candidates Re-ride candidates (rides already scheduled earlier)
 * @param maxRerides Maximum number of re-rides to add
 * @returns Scheduled re-ride items
 */
export function fillWithRerides(
  context: SchedulingContext,
  candidates: RideWithPredictions[],
  maxRerides: number = 3
): ScheduledItem[] {
  const scheduledItems: ScheduledItem[] = [];

  if (candidates.length === 0 || maxRerides <= 0) {
    return scheduledItems;
  }

  // Sort candidates by priority (headliners first, then popular)
  const sortedCandidates = sortRidesByImportance(candidates);

  let reridesAdded = 0;

  for (const ride of sortedCandidates) {
    if (reridesAdded >= maxRerides) {
      break;
    }

    // Find available gaps (filter by parkId for park hopper mode)
    const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;
    const relevantBlocks = ride.parkId
      ? context.timeBlocks.filter(b => b.parkId === ride.parkId)
      : context.timeBlocks;
    const gaps = findAllGaps(relevantBlocks, context.scheduledItems, rideDuration + 20);

    if (gaps.length === 0) {
      break;
    }

    // Find best slot for re-ride
    const bestSlot = findBestSlot(ride, gaps, context);

    if (!bestSlot) {
      continue;
    }

    const expectedWait = getInterpolatedWaitTime(
      bestSlot.scheduledTime,
      ride.hourlyPredictions ?? []
    );

    const item: ScheduledItem = {
      id: `reride_${ride.id}_${reridesAdded}`,
      type: 'ride',
      scheduledTime: bestSlot.scheduledTime,
      endTime: bestSlot.scheduledTime + expectedWait + rideDuration,
      duration: expectedWait + rideDuration,
      ride,
      expectedWait,
      isOptimalTime: isAtOptimalTime(ride, bestSlot.scheduledTime),
      walkFromPrevious: bestSlot.walkTime,
      reasoning: `Re-ride opportunity. ${generateFillReasoning(ride, bestSlot.scheduledTime, expectedWait, bestSlot.walkTime)}`,
      land: ride.land,
      parkId: ride.parkId ?? context.input.parkId,  // Use ride's parkId for park hopper mode
      isReride: true,
    };

    // Try to add - skip if conflict
    if (!addItemToContext(context, item)) {
      continue;
    }
    scheduledItems.push(item);
    reridesAdded++;
  }

  if (reridesAdded > 0) {
    context.insights.push(
      `Added ${reridesAdded} re-ride${reridesAdded === 1 ? '' : 's'} to fill extra time`
    );
  }

  return scheduledItems;
}

// =============================================================================
// GAP ANALYSIS
// =============================================================================

/**
 * Analyze remaining gaps after filling
 */
export function analyzeRemainingGaps(
  context: SchedulingContext
): { gaps: ScheduleGap[]; totalTime: number; canFitMore: boolean } {
  const gaps = findAllGaps(context.timeBlocks, context.scheduledItems, 20);
  const totalTime = gaps.reduce((sum, gap) => sum + gap.duration, 0);

  // Can fit more if there's at least 30 minutes of gap time
  const canFitMore = totalTime >= 30;

  return { gaps, totalTime, canFitMore };
}

/**
 * Estimate how many more rides could fit
 */
export function estimateRemainingCapacity(
  context: SchedulingContext,
  averageRideTime: number = 35
): number {
  const { totalTime } = analyzeRemainingGaps(context);
  return Math.floor(totalTime / averageRideTime);
}
