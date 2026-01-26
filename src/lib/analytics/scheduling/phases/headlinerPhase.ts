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
  ScheduleGap,
  TimeBlock,
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

  // Build park boundaries from time blocks for park hopper mode
  const parkBoundaries = buildParkBoundariesFromContext(context);

  // Resolve conflicts and get hour assignments
  const assignments = resolveAllHeadlinerConflicts(
    remainingHeadliners,
    ropeDropTargetIds,
    context.parkOpen,
    context.effectiveClose,
    parkBoundaries
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

  // Find a gap that contains the target time (filter by parkId for park hopper mode)
  // Only filter by parkId if blocks actually have parkId set (true park hopper mode)
  const hasParkIdBlocks = context.timeBlocks.some(b => b.parkId);
  const relevantBlocks = headliner.parkId && hasParkIdBlocks
    ? context.timeBlocks.filter(b => b.parkId === headliner.parkId)
    : context.timeBlocks;
  const gaps = findAllGaps(relevantBlocks, context.scheduledItems, totalDuration);

  // For park hopper mode: Park 2 rides should ALWAYS use "schedule as late as possible"
  // The conflict resolver doesn't know about park-specific windows, so it may assign
  // mid-day hours when evening would have much lower waits
  let skipTargetHour = false;
  if (relevantBlocks.length > 0) {
    const parkWindowStart = Math.min(...relevantBlocks.map(b => b.start));
    // If this ride's park window starts AFTER the overall park open,
    // it's a Park 2 ride - always schedule as late as possible for lower waits
    if (parkWindowStart > context.parkOpen) {
      skipTargetHour = true;
    }
  }

  // Find a gap that can fit the ride starting at or near the target time
  let bestGap: ScheduleGap | null = null;
  let finalScheduledTime = targetTime;
  let walkTime = 0;

  // Skip the target-hour matching if the target is invalid for this park
  if (!skipTargetHour) {
    for (const gap of gaps) {
    // Calculate walk time for this gap
    const prevItem = getItemBefore(context, gap.start);
    const gapWalkTime = prevItem ? calculateWalkTime(prevItem.land, headliner.land) : 0;

    // The total time we need from the start of the gap
    const totalTimeInGap = gapWalkTime + totalDuration;

    // Check if the gap can fit the ride including walk time
    if (totalTimeInGap > gap.duration) {
      continue; // Gap too small
    }

    // Calculate the actual scheduled time (start of ride after walking)
    const earliestStart = gap.start + gapWalkTime;
    const latestStart = gap.end - totalDuration;

    // Check if target time fits within this gap
    if (gap.start <= targetTime && targetTime + totalDuration <= gap.end) {
      // Target time fits perfectly - use it if it's after we finish walking
      if (targetTime >= earliestStart) {
        bestGap = gap;
        finalScheduledTime = targetTime;
        walkTime = gapWalkTime;
        break;
      }
    }

    // If target time is within the gap OR the gap ends close to target time (within 1 hour)
    // Only then try to fit the ride near the target
    const gapContainsTarget = gap.start <= targetTime && targetTime <= gap.end;
    const gapEndsNearTarget = gap.end >= targetTime - 60 && gap.end <= targetTime + 60;

    if ((gapContainsTarget || gapEndsNearTarget) && latestStart >= earliestStart) {
      bestGap = gap;
      // Schedule at target time if possible, otherwise at the latest possible start within the gap
      finalScheduledTime = Math.min(Math.max(targetTime, earliestStart), latestStart);
      walkTime = gapWalkTime;
      break;
    }

    // If the gap is after the target but still at the same hour
    if (gap.start > targetTime && getHourFromMinutes(gap.start) === hour) {
      bestGap = gap;
      finalScheduledTime = earliestStart;
      walkTime = gapWalkTime;
      break;
    }
  }
  } // End of if (!skipTargetHour)

  // If no gap at target hour (or target hour was invalid), find the LATEST possible scheduling time
  // This ensures headliners are scheduled as late as possible (evening = lower waits)
  // while still finishing before entertainment anchors
  if (!bestGap) {
    let latestPossibleStart = -1;

    // Evaluate ALL gaps and pick the one where we can schedule LATEST
    for (const gap of gaps) {
      const prevItem = getItemBefore(context, gap.start);
      const gapWalkTime = prevItem ? calculateWalkTime(prevItem.land, headliner.land) : 0;
      const totalTimeNeeded = gapWalkTime + totalDuration;

      if (totalTimeNeeded <= gap.duration) {
        // Calculate the LATEST possible start time in this gap
        // This is the end of the gap minus the ride duration
        const latestStartInGap = gap.end - totalDuration;

        // Choose this gap if it allows a later start time
        if (latestStartInGap > latestPossibleStart) {
          latestPossibleStart = latestStartInGap;
          bestGap = gap;
          walkTime = gapWalkTime;
          // Schedule at the latest possible time in this gap
          finalScheduledTime = latestStartInGap;
        }
      }
    }
  }

  if (!bestGap) {
    // No available slot - headliner will go to overflow
    return null;
  }

  // Final validation that the ride fits within the gap
  if (finalScheduledTime + totalDuration > bestGap.end) {
    // Ride doesn't actually fit - this gap won't work
    return null;
  }

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
    parkId: headliner.parkId ?? context.input.parkId,  // Use ride's parkId for park hopper mode
  };

  // Try to add item - if conflict, find the LATEST possible scheduling time
  const added = addItemToContext(context, item);
  if (!added) {
    // Get fresh gaps after failed attempt
    // Only filter by parkId if blocks actually have parkId set (true park hopper mode)
    const hasParkIdBlocksFallback = context.timeBlocks.some(b => b.parkId);
    const relevantBlocksFallback = headliner.parkId && hasParkIdBlocksFallback
      ? context.timeBlocks.filter(b => b.parkId === headliner.parkId)
      : context.timeBlocks;
    const remainingGaps = findAllGaps(relevantBlocksFallback, context.scheduledItems, totalDuration);

    // Find the gap where we can schedule LATEST (evening = lower waits)
    let bestFallbackGap: ScheduleGap | null = null;
    let bestFallbackWalkTime = 0;
    let latestPossibleStart = -1;

    for (const fallbackGap of remainingGaps) {
      const prevItem = getItemBefore(context, fallbackGap.start);
      const fallbackWalkTime = prevItem ? calculateWalkTime(prevItem.land, headliner.land) : 0;
      const totalTimeNeeded = fallbackWalkTime + totalDuration;

      if (totalTimeNeeded <= fallbackGap.duration) {
        // Calculate the LATEST possible start time in this gap
        const latestStartInGap = fallbackGap.end - totalDuration;

        if (latestStartInGap > latestPossibleStart) {
          latestPossibleStart = latestStartInGap;
          bestFallbackGap = fallbackGap;
          bestFallbackWalkTime = fallbackWalkTime;
        }
      }
    }

    // Try to add at the latest possible time
    if (bestFallbackGap) {
      const newScheduledTime = latestPossibleStart;
      item.scheduledTime = newScheduledTime;
      item.endTime = newScheduledTime + totalDuration;
      item.walkFromPrevious = bestFallbackWalkTime;
      item.isOptimalTime = false;
      item.reasoning = generateHeadlinerReasoning(headliner, newScheduledTime, expectedWait, false);

      if (addItemToContext(context, item)) {
        return item;
      }
    }
    return null;
  }
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
// PARK BOUNDARY UTILITIES
// =============================================================================

/**
 * Build park time boundaries from scheduling context
 * Groups time blocks by parkId and finds min/max times for each park
 *
 * @param context Current scheduling context
 * @returns Map of parkId to time boundaries, or undefined if not in park hopper mode
 */
function buildParkBoundariesFromContext(
  context: SchedulingContext
): Map<string, { earliestTime: number; latestTime: number }> | undefined {
  // Check if we have park-specific time blocks (park hopper mode)
  const blocksWithParkId = context.timeBlocks.filter((b) => b.parkId);

  if (blocksWithParkId.length === 0) {
    return undefined; // Not in park hopper mode
  }

  const boundaries = new Map<string, { earliestTime: number; latestTime: number }>();

  // Group blocks by parkId
  for (const block of blocksWithParkId) {
    if (!block.parkId) continue;

    const existing = boundaries.get(block.parkId);

    if (existing) {
      // Update min/max times
      existing.earliestTime = Math.min(existing.earliestTime, block.start);
      existing.latestTime = Math.max(existing.latestTime, block.end);
    } else {
      // First block for this park
      boundaries.set(block.parkId, {
        earliestTime: block.start,
        latestTime: block.end,
      });
    }
  }

  return boundaries.size > 0 ? boundaries : undefined;
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
