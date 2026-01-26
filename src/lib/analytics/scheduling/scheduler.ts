/**
 * Theme Park Schedule Optimizer - Main Scheduler
 *
 * Orchestrates all scheduling phases to create an optimized daily schedule.
 * This is the primary entry point for the scheduling algorithm.
 */

import type {
  SchedulerInput,
  SchedulerResult,
  TripSchedulerInput,
  TripSchedulerResult,
  RideWithPredictions,
  SchedulingContext,
  Anchor,
} from './types';

// Phase imports
import {
  initializeSchedulingContext,
  finalizeContextSetup,
  finalizeContextSetupForParkHopper,
  validateContext,
} from './phases/setupPhase';
import {
  createEntertainmentAnchors,
  createMealAnchors,
  createParkHopperAnchor,
  anchorsToScheduledItems,
} from './phases/anchorPhase';
import {
  processRopeDrop,
  getRopeDropTargetIds,
  validateRopeDropConfig,
} from './phases/ropeDropPhase';
import {
  processHeadliners,
  identifyHeadliners,
} from './phases/headlinerPhase';
import { fillRemainingRides, fillWithRerides } from './phases/fillPhase';
import { buildSchedulerResult } from './phases/validationPhase';
import { distributeRidesAcrossDays, getRidesForDay } from './phases/distributionPhase';
import { reserveSlot } from './core/timeBlockManager';
import type { DistributionStrategy } from './phases/distributionPhase';

// Utility imports
import {
  createTripContext,
  updateTripContextAfterDay,
  areReridesAllowed,
  getAvailableRerides,
  buildTripResult,
} from './utils/tripTracker';

// =============================================================================
// SINGLE DAY SCHEDULER
// =============================================================================

/**
 * Create an optimized schedule for a single day
 *
 * Algorithm Phases:
 * 1. Setup - Initialize context with park hours
 * 2. Anchors - Process entertainment as fixed-time anchors
 * 3. Rope Drop - Schedule rope drop targets at park open (if enabled)
 * 4. Headliners - Place headliners at their optimal times
 * 5. Fill - Fill remaining gaps with other rides
 * 6. Validation - Verify all rides scheduled, generate results
 *
 * @param input Scheduler input with rides, hours, entertainment, preferences
 * @returns Optimized schedule with items, overflow, stats, and insights
 */
export function createOptimizedSchedule(input: SchedulerInput): SchedulerResult {
  // =========================================================================
  // PHASE 1: SETUP
  // =========================================================================

  // Initialize scheduling context
  const context = initializeSchedulingContext(input);

  // =========================================================================
  // PHASE 2: ANCHORS
  // =========================================================================

  // Create entertainment anchors
  const entertainmentAnchors = createEntertainmentAnchors(
    input.entertainment,
    context.parkOpen,
    context.effectiveClose
  );

  // Create meal anchors if breaks are enabled
  const mealAnchors = createMealAnchors(
    input.preferences.includeBreaks,
    entertainmentAnchors,
    context.parkOpen,
    context.effectiveClose
  );

  // Combine all anchors
  let allAnchors: Anchor[] = [...entertainmentAnchors, ...mealAnchors];

  // Handle park hopper transition anchor
  if (input.parkHopper?.enabled) {
    const transitionAnchor = createParkHopperAnchor(
      input.parkHopper,
      input.entertainment.filter((e) =>
        input.parkHopper!.park2Rides.some((r) => r.parkId === input.parkHopper!.park2Id)
      )
    );
    allAnchors.push(transitionAnchor);
  }

  // Sort anchors by time
  allAnchors.sort((a, b) => a.startTime - b.startTime);

  // Finalize context with anchors and time blocks
  if (input.parkHopper?.enabled) {
    const transitionAnchor = allAnchors.find(a => a.type === 'transition');
    const transitionTime = transitionAnchor?.startTime ?? input.parkHopper.eligibilityTime;
    finalizeContextSetupForParkHopper(context, allAnchors, input.parkHopper, transitionTime);
  } else {
    finalizeContextSetup(context, allAnchors, input.parkId);
  }

  // Add entertainment items to schedule and reserve their time slots
  const entertainmentItems = anchorsToScheduledItems(
    entertainmentAnchors.filter((a) => a.type !== 'meal')
  );
  for (const item of entertainmentItems) {
    context.scheduledItems.push(item);
    // Reserve the entertainment slot so rides can't be scheduled during this time
    reserveSlot(
      context.usedSlots,
      item.id,
      item.scheduledTime,
      item.endTime,
      item.id,
      item.entertainment?.location,
      item.parkId
    );
  }

  // Add transition item to schedule for park hopper mode
  if (input.parkHopper?.enabled) {
    const transitionAnchor = allAnchors.find(a => a.type === 'transition');
    if (transitionAnchor) {
      const transitionItems = anchorsToScheduledItems([transitionAnchor]);
      for (const item of transitionItems) {
        context.scheduledItems.push(item);
        // Reserve the transition slot
        reserveSlot(
          context.usedSlots,
          item.id,
          item.scheduledTime,
          item.endTime,
          item.id,
          undefined,
          item.parkId
        );
      }
    }
  }

  // Validate context
  const contextValidation = validateContext(context);
  if (!contextValidation.isValid) {
    // Return early with validation errors
    return {
      items: context.scheduledItems,
      overflow: [],
      validation: {
        allUserRidesScheduled: false,
        missingRides: input.selectedRides,
        warnings: contextValidation.errors,
      },
      stats: {
        totalWaitTime: 0,
        totalWalkTime: 0,
        ridesScheduled: 0,
        headlinersAtOptimal: 0,
        headlinersTotal: 0,
        reridesAdded: 0,
      },
      insights: contextValidation.errors,
    };
  }

  // =========================================================================
  // PHASE 3: ROPE DROP
  // =========================================================================

  if (input.ropeDrop?.enabled) {
    const ropeDropValidation = validateRopeDropConfig(input.ropeDrop);
    if (ropeDropValidation.warnings.length > 0) {
      context.insights.push(...ropeDropValidation.warnings);
    }

    processRopeDrop(context, input.ropeDrop);
  }

  // Get rope drop target IDs for conflict resolution
  const ropeDropTargetIds = getRopeDropTargetIds(input.ropeDrop ?? { enabled: false, targets: [] });

  // =========================================================================
  // PHASE 4: HEADLINERS
  // =========================================================================

  // Identify headliners from selected rides
  const headliners = identifyHeadliners(input.selectedRides);

  // Schedule headliners at optimal times
  processHeadliners(context, headliners, ropeDropTargetIds);

  // =========================================================================
  // PHASE 5: FILL REMAINING
  // =========================================================================

  // Get non-headliner rides
  const nonHeadliners = input.selectedRides.filter(
    (ride) => ride.popularity !== 'headliner'
  );

  // Fill remaining gaps with non-headliner rides
  fillRemainingRides(context, nonHeadliners);

  // =========================================================================
  // PHASE 6: VALIDATION & RESULTS
  // =========================================================================

  // Build final result
  return buildSchedulerResult(context, input.selectedRides);
}

/**
 * Async wrapper for createOptimizedSchedule
 * Use this when calling from React components
 */
export async function createOptimizedScheduleAsync(
  input: SchedulerInput
): Promise<SchedulerResult> {
  // Allow UI to update before heavy computation
  await new Promise((resolve) => setTimeout(resolve, 0));

  return createOptimizedSchedule(input);
}

// =============================================================================
// MULTI-DAY TRIP SCHEDULER
// =============================================================================

/**
 * Create optimized schedules for a multi-day trip
 *
 * Key principle: ALL user-selected rides must be scheduled before ANY re-rides.
 *
 * @param input Trip input with all days and rides
 * @returns Trip result with day schedules and trip-wide statistics
 */
export function createOptimizedTrip(input: TripSchedulerInput): TripSchedulerResult {
  // Determine distribution strategy
  // For light trips with rerides enabled, front-load all rides on Day 1
  const ridesPerDay = input.allSelectedRides.length / input.days.length;
  const strategy: DistributionStrategy = (ridesPerDay <= 4 && input.allowRerides) ? 'front-load' : 'even';

  // Distribute rides across days using determined strategy
  const distribution = distributeRidesAcrossDays(input, strategy);

  // Initialize trip context
  let tripContext = createTripContext(input.allSelectedRides);

  // Schedule each day
  for (let dayIndex = 0; dayIndex < input.days.length; dayIndex++) {
    const day = input.days[dayIndex];
    const dayRides = getRidesForDay(distribution, dayIndex);

    // Create day input with distributed rides
    const dayInput: SchedulerInput = {
      ...day.input,
      selectedRides: dayRides,
    };

    // Schedule the day
    let dayResult = createOptimizedSchedule(dayInput);

    // Check if we can add re-rides (only after ALL user rides are scheduled trip-wide)
    tripContext = updateTripContextAfterDay(tripContext, dayResult, day.date);

    if (input.allowRerides && areReridesAllowed(tripContext)) {
      // Get available re-ride candidates
      const rerideCandidates = getAvailableRerides(tripContext, dayIndex);

      if (rerideCandidates.length > 0) {
        // Re-run with re-rides
        // This is a simplification - in practice, we'd extend the existing schedule
        const context = initializeSchedulingContext(dayInput);

        // Copy scheduled items from result
        for (const item of dayResult.items) {
          context.scheduledItems.push(item);
          if (item.ride) {
            context.scheduledRideIds.add(item.ride.id);
          }
        }

        // Add re-rides to fill remaining gaps
        const rerides = fillWithRerides(context, rerideCandidates, 3);

        // Update result with re-rides
        if (rerides.length > 0) {
          dayResult = {
            ...dayResult,
            items: [...dayResult.items, ...rerides].sort(
              (a, b) => a.scheduledTime - b.scheduledTime
            ),
            stats: {
              ...dayResult.stats,
              reridesAdded: rerides.length,
            },
          };
        }
      }
    }

    // Update trip context with final day result
    tripContext = updateTripContextAfterDay(tripContext, dayResult, day.date);
  }

  // Build and return trip result
  return buildTripResult(tripContext);
}

/**
 * Async wrapper for createOptimizedTrip
 */
export async function createOptimizedTripAsync(
  input: TripSchedulerInput
): Promise<TripSchedulerResult> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  return createOptimizedTrip(input);
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Quick estimate of how many rides can fit in a day
 */
export function estimateRideCapacity(
  parkOpenHour: number,
  parkCloseHour: number,
  entertainmentCount: number = 0,
  includeBreaks: boolean = false
): number {
  const availableMinutes =
    (parkCloseHour - parkOpenHour) * 60 -
    20 - // Close buffer
    entertainmentCount * 50 - // Entertainment + buffer each
    (includeBreaks ? 90 : 0); // Meal breaks

  const avgRideTime = 35; // wait + ride + walk
  return Math.floor(availableMinutes / avgRideTime);
}

/**
 * Check if a set of rides is reasonable for a single day
 */
export function isReasonableForOneDay(
  rideCount: number,
  parkOpenHour: number,
  parkCloseHour: number,
  entertainmentCount: number = 0
): { isReasonable: boolean; maxRides: number; suggestion?: string } {
  const maxRides = estimateRideCapacity(
    parkOpenHour,
    parkCloseHour,
    entertainmentCount,
    true
  );

  if (rideCount <= maxRides) {
    return { isReasonable: true, maxRides };
  }

  const excess = rideCount - maxRides;
  return {
    isReasonable: false,
    maxRides,
    suggestion: `Consider removing ${excess} ride${excess === 1 ? '' : 's'} or splitting into multiple days`,
  };
}
