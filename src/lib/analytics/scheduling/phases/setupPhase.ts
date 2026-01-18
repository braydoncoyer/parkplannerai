/**
 * Theme Park Schedule Optimizer - Setup Phase
 *
 * Phase 1: Initialize scheduling context with park hours and time blocks.
 */

import type {
  SchedulerInput,
  SchedulingContext,
  Anchor,
  TimeBlock,
} from '../types';
import { PARK_CLOSE_BUFFER, DEFAULT_PARK_HOURS } from '../constants';
import { parseParkHours, parseTimeToMinutes } from '../utils/timeUtils';
import { createTimeBlocks, resetBlockIdCounter } from '../core/timeBlockManager';

// =============================================================================
// CONTEXT INITIALIZATION
// =============================================================================

/**
 * Create initial scheduling context from input
 * This is Phase 1 of the scheduling algorithm
 */
export function initializeSchedulingContext(
  input: SchedulerInput
): SchedulingContext {
  // Reset block ID counter for deterministic IDs
  resetBlockIdCounter();

  // Parse park hours
  const parkHours = input.parkHours ?? DEFAULT_PARK_HOURS;
  const { open: parkOpen, close: parkClose } = parseParkHours(parkHours);

  // Calculate effective close time (with buffer)
  const effectiveClose = parkClose - PARK_CLOSE_BUFFER;

  // Parse arrival time override if provided
  let actualParkOpen = parkOpen;
  if (input.preferences.arrivalTime) {
    const arrivalMinutes = parseTimeToMinutes(input.preferences.arrivalTime);
    if (arrivalMinutes > parkOpen) {
      actualParkOpen = arrivalMinutes;
    }
  }

  // Parse departure time override if provided
  let actualEffectiveClose = effectiveClose;
  if (input.preferences.departureTime) {
    const departureMinutes = parseTimeToMinutes(input.preferences.departureTime);
    if (departureMinutes < effectiveClose) {
      actualEffectiveClose = departureMinutes;
    }
  }

  // Create initial context (anchors and time blocks added later)
  const context: SchedulingContext = {
    input,
    parkOpen: actualParkOpen,
    effectiveClose: actualEffectiveClose,
    anchors: [],
    timeBlocks: [],
    scheduledItems: [],
    usedSlots: new Map(),
    scheduledRideIds: new Set(),
    overflow: [],
    insights: [],
  };

  return context;
}

/**
 * Create time blocks from anchors
 * Called after anchors are set up
 */
export function createTimeBlocksFromAnchors(
  context: SchedulingContext,
  parkId?: string
): TimeBlock[] {
  return createTimeBlocks(
    context.parkOpen,
    context.effectiveClose,
    context.anchors,
    parkId
  );
}

/**
 * Finalize context setup with time blocks
 */
export function finalizeContextSetup(
  context: SchedulingContext,
  anchors: Anchor[],
  parkId?: string
): SchedulingContext {
  // Set anchors
  context.anchors = anchors;

  // Create time blocks based on anchors
  context.timeBlocks = createTimeBlocks(
    context.parkOpen,
    context.effectiveClose,
    anchors,
    parkId
  );

  // Generate setup insight
  const totalHours = Math.round((context.effectiveClose - context.parkOpen) / 60 * 10) / 10;
  context.insights.push(
    `Scheduling ${totalHours} hours at the park (${formatTimeRange(context.parkOpen, context.effectiveClose)})`
  );

  if (anchors.length > 0) {
    const entertainmentAnchors = anchors.filter(
      (a) => a.type !== 'transition' && a.type !== 'meal'
    );
    if (entertainmentAnchors.length > 0) {
      context.insights.push(
        `${entertainmentAnchors.length} entertainment event(s) scheduled as anchors`
      );
    }
  }

  return context;
}

/**
 * Format time range for display
 */
function formatTimeRange(startMinutes: number, endMinutes: number): string {
  const formatTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
}

// =============================================================================
// CONTEXT VALIDATION
// =============================================================================

/**
 * Validate scheduling context
 */
export function validateContext(
  context: SchedulingContext
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check park hours are valid
  if (context.parkOpen >= context.effectiveClose) {
    errors.push('Invalid park hours: close time must be after open time');
  }

  // Check we have at least some schedulable time
  const availableTime = context.effectiveClose - context.parkOpen;
  if (availableTime < 60) {
    errors.push('Insufficient time available (less than 1 hour)');
  }

  // Check we have rides to schedule
  if (context.input.selectedRides.length === 0) {
    errors.push('No rides selected to schedule');
  }

  // Check time blocks were created
  if (context.timeBlocks.length === 0 && context.anchors.length > 0) {
    // This might be okay if anchors fill the entire day
    const anchorsDuration = context.anchors.reduce(
      (total, anchor) => total + anchor.duration + anchor.arrivalBuffer,
      0
    );
    if (anchorsDuration < availableTime - 30) {
      errors.push('No schedulable time blocks created');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get total schedulable time from context
 */
export function getTotalSchedulableTime(context: SchedulingContext): number {
  return context.timeBlocks.reduce((total, block) => total + block.duration, 0);
}

/**
 * Estimate ride capacity for the day
 */
export function estimateRideCapacity(
  context: SchedulingContext,
  averageRideTime: number = 35
): number {
  const totalTime = getTotalSchedulableTime(context);
  return Math.floor(totalTime / averageRideTime);
}

/**
 * Check if there's enough time for all selected rides
 */
export function hasEnoughTimeForRides(
  context: SchedulingContext,
  rides: number,
  averageRideTime: number = 35
): boolean {
  const capacity = estimateRideCapacity(context, averageRideTime);
  return capacity >= rides;
}
