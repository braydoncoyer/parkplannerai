/**
 * Theme Park Schedule Optimizer - Validation Phase
 *
 * Phase 5: Validate the schedule and generate final results.
 * Ensures all user-selected rides are either scheduled or in overflow,
 * calculates statistics, and generates insights.
 */

import type {
  RideWithPredictions,
  ScheduledItem,
  SchedulingContext,
  SchedulerResult,
  ScheduleValidation,
  ScheduleStats,
  OverflowItem,
  OverflowReason,
} from '../types';
import { OVERFLOW_MESSAGES, OVERFLOW_SUGGESTIONS } from '../constants';
import { calculateDuration, formatMinutesToTime } from '../utils/timeUtils';
import { findAllGaps } from '../core/timeBlockManager';
import { conflictsWithAnchor } from '../core/conflictResolver';

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that all user-selected rides are accounted for
 */
export function validateSchedule(
  context: SchedulingContext,
  userSelectedRides: RideWithPredictions[]
): ScheduleValidation {
  const warnings: string[] = [];

  // Find rides that weren't scheduled
  const missingRides = userSelectedRides.filter(
    (ride) => !context.scheduledRideIds.has(ride.id)
  );

  // Check for re-rides appearing when user rides are missing
  const rerides = context.scheduledItems.filter((item) => item.isReride);
  if (rerides.length > 0 && missingRides.length > 0) {
    warnings.push(
      'Warning: Re-rides were added while user-selected rides are still missing. This should not happen.'
    );
  }

  // Check for schedule gaps
  const gaps = findAllGaps(context.timeBlocks, context.scheduledItems, 30);
  const largeGaps = gaps.filter((gap) => gap.duration >= 60);
  if (largeGaps.length > 0 && missingRides.length > 0) {
    warnings.push(
      `Found ${largeGaps.length} gap(s) of 60+ minutes that could fit more rides`
    );
  }

  return {
    allUserRidesScheduled: missingRides.length === 0,
    missingRides,
    warnings,
  };
}

/**
 * Determine overflow reason for a ride that couldn't be scheduled
 */
export function determineOverflowReason(
  ride: RideWithPredictions,
  context: SchedulingContext
): OverflowReason {
  // Check for anchor conflicts
  const rideDuration = (ride.duration ?? 5) + 30; // ride + estimated wait
  for (const anchor of context.anchors) {
    if (conflictsWithAnchor(ride, anchor, rideDuration)) {
      return 'anchor_conflict';
    }
  }

  // Check if it's a headliner density issue
  if (ride.popularity === 'headliner') {
    const scheduledHeadliners = context.scheduledItems.filter(
      (item) => item.ride?.popularity === 'headliner'
    ).length;
    if (scheduledHeadliners >= 4) {
      return 'headliner_density';
    }
  }

  // Check for park hopper constraints
  if (context.input.parkHopper?.enabled) {
    return 'park_hop_constraint';
  }

  // Default: time constraint
  return 'time_constraint';
}

/**
 * Create overflow items for rides that couldn't be scheduled
 */
export function createOverflowItems(
  missingRides: RideWithPredictions[],
  context: SchedulingContext
): OverflowItem[] {
  return missingRides.map((ride) => {
    const reason = determineOverflowReason(ride, context);

    return {
      ride,
      reason,
      suggestion: generateOverflowSuggestion(ride, reason, context),
    };
  });
}

/**
 * Generate a helpful suggestion for an overflow item
 */
function generateOverflowSuggestion(
  ride: RideWithPredictions,
  reason: OverflowReason,
  context: SchedulingContext
): string {
  const baseSuggestion = OVERFLOW_SUGGESTIONS[reason] || OVERFLOW_SUGGESTIONS.time_constraint;

  // Add ride-specific context
  switch (reason) {
    case 'anchor_conflict':
      return `${ride.name}: ${baseSuggestion}. Consider adjusting entertainment choices.`;

    case 'headliner_density':
      return `${ride.name}: ${baseSuggestion}. Too many headliners for one day.`;

    case 'park_hop_constraint':
      return `${ride.name}: ${baseSuggestion}. Allocate more time to this park.`;

    case 'time_constraint':
    default:
      // Calculate how much more time would be needed
      const avgWait = ride.hourlyPredictions
        ? ride.hourlyPredictions.reduce((a, b) => a + b, 0) / ride.hourlyPredictions.length
        : 30;
      const timeNeeded = Math.round(avgWait + (ride.duration ?? 5) + 10);
      return `${ride.name}: Would need ~${timeNeeded} min. ${baseSuggestion}.`;
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Calculate schedule statistics
 */
export function calculateStats(context: SchedulingContext): ScheduleStats {
  const items = context.scheduledItems.filter((item) => item.type === 'ride');

  const totalWaitTime = items.reduce(
    (sum, item) => sum + (item.expectedWait ?? 0),
    0
  );

  const totalWalkTime = items.reduce(
    (sum, item) => sum + (item.walkFromPrevious ?? 0),
    0
  );

  const headlinerItems = items.filter(
    (item) => item.ride?.popularity === 'headliner'
  );
  const headlinersAtOptimal = headlinerItems.filter(
    (item) => item.isOptimalTime
  ).length;

  const reridesAdded = items.filter((item) => item.isReride).length;

  return {
    totalWaitTime,
    totalWalkTime,
    ridesScheduled: items.length - reridesAdded,
    headlinersAtOptimal,
    headlinersTotal: headlinerItems.length,
    reridesAdded,
  };
}

/**
 * Calculate comparison to naive scheduling
 */
export function calculateComparison(
  context: SchedulingContext,
  userSelectedRides: RideWithPredictions[]
): { waitTimeSaved: number; percentImprovement: number } | undefined {
  const scheduledRides = context.scheduledItems.filter(
    (item) => item.type === 'ride' && !item.isReride
  );

  if (scheduledRides.length === 0) {
    return undefined;
  }

  // Calculate actual wait time
  const actualWaitTime = scheduledRides.reduce(
    (sum, item) => sum + (item.expectedWait ?? 0),
    0
  );

  // Calculate naive wait time (average wait for each ride)
  let naiveWaitTime = 0;
  for (const item of scheduledRides) {
    if (item.ride?.hourlyPredictions) {
      const avgWait =
        item.ride.hourlyPredictions.reduce((a, b) => a + b, 0) /
        item.ride.hourlyPredictions.length;
      naiveWaitTime += avgWait;
    } else {
      naiveWaitTime += item.expectedWait ?? 30;
    }
  }

  const waitTimeSaved = Math.round(naiveWaitTime - actualWaitTime);
  const percentImprovement =
    naiveWaitTime > 0 ? Math.round((waitTimeSaved / naiveWaitTime) * 100) : 0;

  return {
    waitTimeSaved: Math.max(0, waitTimeSaved),
    percentImprovement: Math.max(0, percentImprovement),
  };
}

// =============================================================================
// INSIGHTS GENERATION
// =============================================================================

/**
 * Generate final insights for the schedule
 */
export function generateInsights(
  context: SchedulingContext,
  stats: ScheduleStats,
  validation: ScheduleValidation
): string[] {
  const insights = [...context.insights];

  // Summary insight
  insights.push(
    `Scheduled ${stats.ridesScheduled} rides with ~${stats.totalWaitTime} min total wait time`
  );

  // Headliner optimization insight
  if (stats.headlinersTotal > 0) {
    const headlinerPercent = Math.round(
      (stats.headlinersAtOptimal / stats.headlinersTotal) * 100
    );
    if (headlinerPercent >= 80) {
      insights.push('Excellent headliner timing - most at optimal windows');
    } else if (headlinerPercent >= 50) {
      insights.push('Good headliner timing - over half at optimal windows');
    }
  }

  // Walk time insight
  if (stats.totalWalkTime > 0) {
    insights.push(`~${stats.totalWalkTime} min walking between attractions`);
  }

  // Overflow insight
  if (validation.missingRides.length > 0) {
    insights.push(
      `${validation.missingRides.length} ride${validation.missingRides.length === 1 ? '' : 's'} could not be scheduled today`
    );
  }

  return insights;
}

// =============================================================================
// RESULT BUILDER
// =============================================================================

/**
 * Build the final scheduler result
 */
export function buildSchedulerResult(
  context: SchedulingContext,
  userSelectedRides: RideWithPredictions[]
): SchedulerResult {
  // Validate schedule
  const validation = validateSchedule(context, userSelectedRides);

  // Create overflow items
  const overflow = createOverflowItems(validation.missingRides, context);
  context.overflow = overflow;

  // Calculate stats
  const stats = calculateStats(context);

  // Calculate comparison
  const comparison = calculateComparison(context, userSelectedRides);

  // Generate insights
  const insights = generateInsights(context, stats, validation);

  // Sort items by scheduled time
  const sortedItems = [...context.scheduledItems].sort(
    (a, b) => a.scheduledTime - b.scheduledTime
  );

  return {
    items: sortedItems,
    overflow,
    validation,
    stats,
    insights,
    comparison,
  };
}
