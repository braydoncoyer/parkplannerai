/**
 * Theme Park Schedule Optimizer - Anchor Phase
 *
 * Process entertainment events (parades, fireworks, shows) into fixed-time anchors.
 * Entertainment is IMMOVABLE - rides must schedule around them.
 */

import type {
  Entertainment,
  Anchor,
  ScheduledItem,
  SchedulingContext,
  ParkHopperConfig,
} from '../types';
import {
  ENTERTAINMENT_ARRIVAL_BUFFERS,
  ENTERTAINMENT_DISPERSAL_TIME,
  DEFAULT_ENTERTAINMENT_DURATION,
  MEAL_BREAK_DURATION,
  MEAL_BREAK_DURATION_MIN,
  MEAL_BREAK_DURATION_MAX,
  LUNCH_WINDOW,
  DINNER_WINDOW,
} from '../constants';

/**
 * Generate a random meal duration between min and max
 */
function getRandomMealDuration(): number {
  return Math.floor(
    Math.random() * (MEAL_BREAK_DURATION_MAX - MEAL_BREAK_DURATION_MIN + 1)
  ) + MEAL_BREAK_DURATION_MIN;
}
import { parseTimeToMinutes, doRangesOverlap } from '../utils/timeUtils';
import { createTransitionAnchor, calculateOptimalTransitionTime } from '../core/parkHopperManager';

// =============================================================================
// ENTERTAINMENT TO ANCHORS
// =============================================================================

/**
 * Convert entertainment events to anchors
 * Each entertainment event becomes a fixed time slot in the schedule
 */
export function createEntertainmentAnchors(
  entertainment: Entertainment[],
  parkOpen: number,
  parkClose: number
): Anchor[] {
  const anchors: Anchor[] = [];

  for (const ent of entertainment) {
    // Skip entertainment without show times
    if (!ent.showTimes || ent.showTimes.length === 0) {
      continue;
    }

    // Process each show time
    for (const showTime of ent.showTimes) {
      const startTime = parseTimeToMinutes(showTime.startTime);

      // Skip if outside park hours
      if (startTime < parkOpen || startTime > parkClose) {
        continue;
      }

      // Calculate duration
      let duration = ent.duration ?? DEFAULT_ENTERTAINMENT_DURATION[ent.category] ?? 20;

      // If end time is provided, calculate duration
      if (showTime.endTime) {
        const endTime = parseTimeToMinutes(showTime.endTime);
        duration = endTime - startTime;
      }

      // Get arrival buffer for this type
      const arrivalBuffer = ENTERTAINMENT_ARRIVAL_BUFFERS[ent.category] ?? 15;

      const anchor: Anchor = {
        id: `${ent.id}_${startTime}`,
        type: mapCategoryToAnchorType(ent.category),
        name: ent.name,
        startTime,
        endTime: startTime + duration,
        duration,
        arrivalBuffer,
        isMovable: false, // Entertainment is never movable
        parkId: undefined, // Will be set by caller if needed
      };

      anchors.push(anchor);
    }
  }

  // Sort by start time
  return anchors.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Map entertainment category to anchor type
 */
function mapCategoryToAnchorType(
  category: Entertainment['category']
): Anchor['type'] {
  switch (category) {
    case 'parade':
      return 'parade';
    case 'fireworks':
      return 'fireworks';
    case 'water-show':
      return 'show';
    case 'show':
      return 'show';
    default:
      return 'show';
  }
}

// =============================================================================
// MEAL BREAK ANCHORS
// =============================================================================

/**
 * Create meal break anchors if breaks are enabled
 */
export function createMealAnchors(
  includeBreaks: boolean,
  existingAnchors: Anchor[],
  parkOpen: number,
  parkClose: number
): Anchor[] {
  if (!includeBreaks) {
    return [];
  }

  const mealAnchors: Anchor[] = [];

  // Check if we should add lunch
  const lunchSlot = findMealSlot(
    existingAnchors,
    LUNCH_WINDOW.earliest,
    LUNCH_WINDOW.latest,
    LUNCH_WINDOW.preferred,
    parkOpen,
    parkClose
  );

  if (lunchSlot) {
    const lunchDuration = getRandomMealDuration();
    mealAnchors.push({
      id: 'lunch_break',
      type: 'meal',
      name: 'Lunch Break',
      startTime: lunchSlot,
      endTime: lunchSlot + lunchDuration,
      duration: lunchDuration,
      arrivalBuffer: 0,
      isMovable: true, // Meals can be shifted if needed
    });
  }

  // Check if we should add dinner (only if park is open past 6 PM)
  if (parkClose > DINNER_WINDOW.earliest) {
    const dinnerSlot = findMealSlot(
      [...existingAnchors, ...mealAnchors],
      DINNER_WINDOW.earliest,
      DINNER_WINDOW.latest,
      DINNER_WINDOW.preferred,
      parkOpen,
      parkClose
    );

    if (dinnerSlot) {
      const dinnerDuration = getRandomMealDuration();
      mealAnchors.push({
        id: 'dinner_break',
        type: 'meal',
        name: 'Dinner Break',
        startTime: dinnerSlot,
        endTime: dinnerSlot + dinnerDuration,
        duration: dinnerDuration,
        arrivalBuffer: 0,
        isMovable: true,
      });
    }
  }

  return mealAnchors;
}

/**
 * Find an available slot for a meal within a window
 */
function findMealSlot(
  existingAnchors: Anchor[],
  earliest: number,
  latest: number,
  preferred: number,
  parkOpen: number,
  parkClose: number
): number | null {
  // Adjust window to park hours
  const windowStart = Math.max(earliest, parkOpen);
  const windowEnd = Math.min(latest, parkClose - MEAL_BREAK_DURATION);

  if (windowStart >= windowEnd) {
    return null;
  }

  // Try preferred time first
  if (preferred >= windowStart && preferred <= windowEnd) {
    if (!conflictsWithAnchor(preferred, MEAL_BREAK_DURATION, existingAnchors)) {
      return preferred;
    }
  }

  // Search for available slot in 15-minute increments
  for (let time = windowStart; time <= windowEnd; time += 15) {
    if (!conflictsWithAnchor(time, MEAL_BREAK_DURATION, existingAnchors)) {
      return time;
    }
  }

  return null;
}

/**
 * Check if a time slot conflicts with existing anchors
 */
function conflictsWithAnchor(
  startTime: number,
  duration: number,
  anchors: Anchor[]
): boolean {
  const endTime = startTime + duration;

  for (const anchor of anchors) {
    // Include arrival buffer in conflict check
    const anchorStart = anchor.startTime - anchor.arrivalBuffer;
    const anchorEnd = anchor.endTime;

    if (doRangesOverlap(startTime, endTime, anchorStart, anchorEnd)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// PARK HOPPER TRANSITION ANCHOR
// =============================================================================

/**
 * Create park hopper transition anchor
 */
export function createParkHopperAnchor(
  config: ParkHopperConfig,
  park2Entertainment: Entertainment[]
): Anchor {
  const { transitionTime, reasoning } = calculateOptimalTransitionTime(
    config,
    park2Entertainment
  );

  const anchor = createTransitionAnchor(config, transitionTime);

  // Store reasoning for insights
  (anchor as any)._transitionReasoning = reasoning;

  return anchor;
}

// =============================================================================
// SCHEDULED ITEMS FROM ANCHORS
// =============================================================================

/**
 * Convert anchors to scheduled items for the final schedule
 */
export function anchorsToScheduledItems(anchors: Anchor[]): ScheduledItem[] {
  return anchors.map((anchor) => ({
    id: anchor.id,
    type: anchor.type === 'transition' ? 'transition' : 'entertainment',
    scheduledTime: anchor.startTime,
    endTime: anchor.endTime,
    duration: anchor.duration,
    entertainment:
      anchor.type !== 'transition' && anchor.type !== 'meal'
        ? {
            id: anchor.id,
            name: anchor.name,
            category: anchor.type as Entertainment['category'],
            duration: anchor.duration,
          }
        : undefined,
    reasoning: generateAnchorReasoning(anchor),
    parkId: anchor.parkId,
  }));
}

/**
 * Generate reasoning for an anchor
 */
function generateAnchorReasoning(anchor: Anchor): string {
  switch (anchor.type) {
    case 'parade':
      return `Arrive ${anchor.arrivalBuffer} min early for prime viewing spot`;
    case 'fireworks':
      return `Arrive ${anchor.arrivalBuffer} min early for best viewing location`;
    case 'show':
      return anchor.arrivalBuffer > 0
        ? `Arrive ${anchor.arrivalBuffer} min early`
        : 'Scheduled show time';
    case 'meal':
      return 'Scheduled break for meal';
    case 'transition':
      return (anchor as any)._transitionReasoning || 'Park hopper transition';
    default:
      return 'Fixed time event';
  }
}

// =============================================================================
// ANCHOR UTILITIES
// =============================================================================

/**
 * Get dispersal time for an anchor type
 */
export function getDispersalTime(anchorType: Anchor['type']): number {
  return ENTERTAINMENT_DISPERSAL_TIME[anchorType] ?? 5;
}

/**
 * Check if there's enough time before an anchor for a ride
 */
export function canFitBeforeAnchor(
  anchor: Anchor,
  rideDuration: number,
  earliestStart: number
): boolean {
  const latestRideEnd = anchor.startTime - anchor.arrivalBuffer;
  const earliestRideEnd = earliestStart + rideDuration;
  return earliestRideEnd <= latestRideEnd;
}

/**
 * Check if there's enough time after an anchor for a ride
 */
export function canFitAfterAnchor(
  anchor: Anchor,
  rideDuration: number,
  latestEnd: number
): boolean {
  const earliestRideStart = anchor.endTime + getDispersalTime(anchor.type);
  const latestRideEnd = earliestRideStart + rideDuration;
  return latestRideEnd <= latestEnd;
}

/**
 * Find anchors that a ride's optimal time conflicts with
 */
export function findConflictingAnchors(
  optimalTime: number,
  rideDuration: number,
  anchors: Anchor[]
): Anchor[] {
  const rideEnd = optimalTime + rideDuration;

  return anchors.filter((anchor) => {
    const anchorStart = anchor.startTime - anchor.arrivalBuffer;
    const anchorEnd = anchor.endTime + getDispersalTime(anchor.type);

    return doRangesOverlap(optimalTime, rideEnd, anchorStart, anchorEnd);
  });
}
