/**
 * Theme Park Schedule Optimizer - Headliner Phase
 *
 * Phase 3: Place headliner rides at their optimal times.
 * Each headliner is scheduled at its lowest predicted wait time,
 * with conflict resolution for overlapping optimal windows.
 */

import type {
  RideWithPredictions,
  ScheduledItem,
  SchedulingContext,
  Anchor,
} from '../types';
import { DEFAULT_RIDE_DURATION } from '../constants';
import {
  findOptimalPredictionHour,
  getInterpolatedWaitTime,
  calculateSavingsDelta,
  getHourFromMinutes,
} from '../utils/timeUtils';
import { calculateWalkTime } from '../core/proximityCalculator';
import {
  resolveAllHeadlinerConflicts,
  findAlternativeTimes,
  conflictsWithAnchor,
} from '../core/conflictResolver';
import {
  addItemToContext,
  findAllGaps,
  findBestFittingGap,
  getItemBefore,
} from '../core/timeBlockManager';
import { findConflictingAnchors } from './anchorPhase';

// =============================================================================
// HEADLINER PLACEMENT
// =============================================================================

/**
 * Process and schedule headliner rides at their optimal times
 *
 * @param context Current scheduling context
 * @param headliners Headliner rides to schedule
 * @param ropeDropTargetIds IDs of rides already scheduled as rope drop targets
 * @returns Scheduled headliner items
 */
export function processHeadliners(
  context: SchedulingContext,
  headliners: RideWithPredictions[],
  ropeDropTargetIds: Set<string | number>
): ScheduledItem[] {
  const scheduledItems: ScheduledItem[] = [];

  // Filter out rides already scheduled as rope drop
  const remainingHeadliners = headliners.filter(
    (h) => !ropeDropTargetIds.has(h.id) && !context.scheduledRideIds.has(h.id)
  );

  if (remainingHeadliners.length === 0) {
    return scheduledItems;
  }

  // Resolve conflicts and get hour assignments
  const assignments = resolveAllHeadlinerConflicts(
    remainingHeadliners,
    ropeDropTargetIds,
    context.parkOpen,
    context.effectiveClose
  );

  // Schedule each headliner at its assigned hour
  for (const headliner of remainingHeadliners) {
    const assignment = assignments.get(headliner.id);

    if (!assignment) {
      // Couldn't find a slot - will go to overflow
      continue;
    }

    const scheduledItem = scheduleHeadlinerAtTime(
      context,
      headliner,
      assignment.hour,
      assignment.wait
    );

    if (scheduledItem) {
      scheduledItems.push(scheduledItem);
    }
  }

  // Generate insight about headliner placement
  const atOptimal = scheduledItems.filter((item) => item.isOptimalTime).length;
  if (scheduledItems.length > 0) {
    context.insights.push(
      `${atOptimal}/${scheduledItems.length} headliners scheduled at their optimal times`
    );
  }

  return scheduledItems;
}

/**
 * Schedule a headliner at a specific hour
 */
function scheduleHeadlinerAtTime(
  context: SchedulingContext,
  headliner: RideWithPredictions,
  hour: number,
  expectedWait: number
): ScheduledItem | null {
  const rideDuration = headliner.duration ?? DEFAULT_RIDE_DURATION;
  const totalDuration = expectedWait + rideDuration;

  // Convert hour to minutes since midnight
  const targetTime = hour * 60;

  // Find a gap that contains the target time
  const gaps = findAllGaps(context.timeBlocks, context.scheduledItems, totalDuration);

  // Find a gap that can fit the ride starting at or near the target time
  let bestGap = null;
  let bestScheduledTime = targetTime;

  for (const gap of gaps) {
    if (gap.start <= targetTime && gap.end >= targetTime + totalDuration) {
      bestGap = gap;
      bestScheduledTime = targetTime;
      break;
    }

    // If target time is in the gap but doesn't fit perfectly, adjust
    if (gap.start <= targetTime && gap.end >= gap.start + totalDuration) {
      bestGap = gap;
      bestScheduledTime = Math.max(targetTime, gap.start);
      break;
    }

    // If the gap is after the target but still at the same hour
    if (gap.start > targetTime && getHourFromMinutes(gap.start) === hour) {
      if (gap.duration >= totalDuration) {
        bestGap = gap;
        bestScheduledTime = gap.start;
        break;
      }
    }
  }

  // If no gap at target hour, find any available gap
  if (!bestGap) {
    bestGap = findBestFittingGap(gaps, totalDuration);
    if (bestGap) {
      bestScheduledTime = bestGap.start;
    }
  }

  if (!bestGap) {
    // No available slot - headliner will go to overflow
    return null;
  }

  // Get previous item for walk time calculation
  const prevItem = getItemBefore(context, bestScheduledTime);
  const walkTime = prevItem
    ? calculateWalkTime(prevItem.land, headliner.land)
    : 0;

  // Adjust scheduled time for walk
  const finalScheduledTime = bestScheduledTime + walkTime;

  // Check if it's at optimal time
  const optimal = findOptimalPredictionHour(headliner.hourlyPredictions ?? []);
  const isOptimalTime = getHourFromMinutes(finalScheduledTime) === optimal.hour;

  const item: ScheduledItem = {
    id: `headliner_${headliner.id}`,
    type: 'ride',
    scheduledTime: finalScheduledTime,
    endTime: finalScheduledTime + expectedWait + rideDuration,
    duration: expectedWait + rideDuration,
    ride: headliner,
    expectedWait,
    isOptimalTime,
    walkFromPrevious: walkTime,
    reasoning: generateHeadlinerReasoning(headliner, finalScheduledTime, expectedWait, isOptimalTime),
    land: headliner.land,
    parkId: context.input.parkId,
  };

  addItemToContext(context, item);
  return item;
}

/**
 * Generate reasoning for a headliner scheduled item
 */
function generateHeadlinerReasoning(
  headliner: RideWithPredictions,
  scheduledTime: number,
  expectedWait: number,
  isOptimalTime: boolean
): string {
  const reasons: string[] = [];

  if (isOptimalTime) {
    reasons.push(`Optimal time for this headliner (~${expectedWait} min wait)`);

    // Calculate savings
    const predictions = headliner.hourlyPredictions ?? [];
    const avgWait = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const savings = Math.round(avgWait - expectedWait);

    if (savings > 10) {
      reasons.push(`${savings} min below daily average`);
    }
  } else {
    const optimal = findOptimalPredictionHour(headliner.hourlyPredictions ?? []);
    reasons.push(`Best available slot (~${expectedWait} min wait)`);
    reasons.push(`Optimal was ${optimal.hour > 12 ? optimal.hour - 12 : optimal.hour}:00 ${optimal.hour >= 12 ? 'PM' : 'AM'}`);
  }

  return reasons.join('. ') + '.';
}

// =============================================================================
// HEADLINER UTILITIES
// =============================================================================

/**
 * Identify headliners from a list of rides
 */
export function identifyHeadliners(rides: RideWithPredictions[]): RideWithPredictions[] {
  return rides.filter((ride) => ride.popularity === 'headliner');
}

/**
 * Sort headliners by scheduling priority
 * Priority: savings delta (highest first), then average wait time
 */
export function sortHeadlinersByPriority(
  headliners: RideWithPredictions[]
): RideWithPredictions[] {
  return [...headliners].sort((a, b) => {
    const deltaA = calculateSavingsDelta(a.hourlyPredictions ?? []);
    const deltaB = calculateSavingsDelta(b.hourlyPredictions ?? []);

    // Higher delta = higher priority
    if (Math.abs(deltaA - deltaB) > 10) {
      return deltaB - deltaA;
    }

    // Tie-breaker: higher average wait
    const avgA = (a.hourlyPredictions ?? []).reduce((s, v) => s + v, 0) / 13;
    const avgB = (b.hourlyPredictions ?? []).reduce((s, v) => s + v, 0) / 13;

    return avgB - avgA;
  });
}

/**
 * Check if all headliners can be accommodated
 */
export function canAccommodateAllHeadliners(
  context: SchedulingContext,
  headliners: RideWithPredictions[],
  ropeDropTargetIds: Set<string | number>
): { canFit: boolean; overflow: RideWithPredictions[] } {
  const remaining = headliners.filter(
    (h) => !ropeDropTargetIds.has(h.id) && !context.scheduledRideIds.has(h.id)
  );

  // Check if we have enough time blocks
  const gaps = findAllGaps(context.timeBlocks, context.scheduledItems, 30);
  const totalGapTime = gaps.reduce((sum, gap) => sum + gap.duration, 0);

  // Estimate time needed
  let timeNeeded = 0;
  for (const headliner of remaining) {
    const optimal = findOptimalPredictionHour(headliner.hourlyPredictions ?? []);
    const rideDuration = headliner.duration ?? DEFAULT_RIDE_DURATION;
    timeNeeded += optimal.wait + rideDuration + 8; // +8 for walking
  }

  if (timeNeeded <= totalGapTime) {
    return { canFit: true, overflow: [] };
  }

  // Determine which headliners might overflow
  const overflow: RideWithPredictions[] = [];
  let remainingTime = totalGapTime;

  const sorted = sortHeadlinersByPriority(remaining);
  for (const headliner of sorted) {
    const optimal = findOptimalPredictionHour(headliner.hourlyPredictions ?? []);
    const rideDuration = headliner.duration ?? DEFAULT_RIDE_DURATION;
    const timeForRide = optimal.wait + rideDuration + 8;

    if (remainingTime >= timeForRide) {
      remainingTime -= timeForRide;
    } else {
      overflow.push(headliner);
    }
  }

  return { canFit: overflow.length === 0, overflow };
}
