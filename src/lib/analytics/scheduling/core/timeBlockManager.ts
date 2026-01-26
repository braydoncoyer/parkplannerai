/**
 * Theme Park Schedule Optimizer - Time Block Manager
 *
 * Creates and manages time blocks (schedulable regions between anchors).
 * Handles gap finding within blocks for ride placement.
 */

import type {
  TimeBlock,
  TimeSlot,
  ScheduleGap,
  Anchor,
  ScheduledItem,
  SchedulingContext,
} from '../types';
import {
  MIN_SCHEDULABLE_BLOCK,
  PARK_CLOSE_BUFFER,
  MIN_GAP_BETWEEN_ITEMS,
} from '../constants';
import { calculateDuration, doRangesOverlap } from '../utils/timeUtils';

// =============================================================================
// TIME BLOCK CREATION
// =============================================================================

/**
 * Generate a unique block ID
 */
let blockIdCounter = 0;
export function generateBlockId(): string {
  return `block_${++blockIdCounter}`;
}

/**
 * Reset block ID counter (for testing)
 */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0;
}

/**
 * Create time blocks from park hours and anchors
 * Time blocks are the schedulable regions between fixed-time events
 *
 * @param parkOpen Park open time in minutes since midnight
 * @param parkClose Park close time in minutes since midnight
 * @param anchors Sorted array of anchors (entertainment, transitions, meals)
 * @param parkId Optional park ID for park hopper mode
 * @returns Array of time blocks
 */
export function createTimeBlocks(
  parkOpen: number,
  parkClose: number,
  anchors: Anchor[],
  parkId?: string
): TimeBlock[] {
  const blocks: TimeBlock[] = [];

  // Apply close buffer
  const effectiveClose = parkClose - PARK_CLOSE_BUFFER;

  // Sort anchors by start time
  const sortedAnchors = [...anchors].sort((a, b) => a.startTime - b.startTime);

  // If no anchors, single block from open to close
  if (sortedAnchors.length === 0) {
    const duration = calculateDuration(parkOpen, effectiveClose);

    if (duration >= MIN_SCHEDULABLE_BLOCK) {
      blocks.push({
        id: generateBlockId(),
        start: parkOpen,
        end: effectiveClose,
        duration,
        parkId,
      });
    }

    return blocks;
  }

  // Create block from park open to first anchor
  const firstAnchor = sortedAnchors[0];
  const firstBlockEnd = firstAnchor.startTime - firstAnchor.arrivalBuffer;
  const firstBlockDuration = calculateDuration(parkOpen, firstBlockEnd);

  if (firstBlockDuration >= MIN_SCHEDULABLE_BLOCK) {
    blocks.push({
      id: generateBlockId(),
      start: parkOpen,
      end: firstBlockEnd,
      duration: firstBlockDuration,
      followedBy: firstAnchor,
      parkId,
    });
  }

  // Create blocks between anchors
  for (let i = 0; i < sortedAnchors.length - 1; i++) {
    const currentAnchor = sortedAnchors[i];
    const nextAnchor = sortedAnchors[i + 1];

    const blockStart = currentAnchor.endTime;
    const blockEnd = nextAnchor.startTime - nextAnchor.arrivalBuffer;
    const blockDuration = calculateDuration(blockStart, blockEnd);

    if (blockDuration >= MIN_SCHEDULABLE_BLOCK) {
      blocks.push({
        id: generateBlockId(),
        start: blockStart,
        end: blockEnd,
        duration: blockDuration,
        precedingAnchor: currentAnchor,
        followedBy: nextAnchor,
        parkId,
      });
    }
  }

  // Create block from last anchor to park close
  const lastAnchor = sortedAnchors[sortedAnchors.length - 1];
  const lastBlockStart = lastAnchor.endTime;
  const lastBlockDuration = calculateDuration(lastBlockStart, effectiveClose);

  if (lastBlockDuration >= MIN_SCHEDULABLE_BLOCK) {
    blocks.push({
      id: generateBlockId(),
      start: lastBlockStart,
      end: effectiveClose,
      duration: lastBlockDuration,
      precedingAnchor: lastAnchor,
      parkId,
    });
  }

  return blocks;
}

// =============================================================================
// GAP FINDING
// =============================================================================

/**
 * Find available gaps within a time block
 * Gaps are periods not occupied by scheduled items
 *
 * @param block The time block to search
 * @param scheduledItems Currently scheduled items
 * @param minGapSize Minimum gap size to consider
 * @returns Array of available gaps
 */
export function findGapsInBlock(
  block: TimeBlock,
  scheduledItems: ScheduledItem[],
  minGapSize: number = MIN_GAP_BETWEEN_ITEMS
): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];

  // Filter items that overlap with this block
  const itemsInBlock = scheduledItems
    .filter((item) =>
      doRangesOverlap(item.scheduledTime, item.endTime, block.start, block.end)
    )
    .sort((a, b) => a.scheduledTime - b.scheduledTime);

  // If no items in block, entire block is a gap
  if (itemsInBlock.length === 0) {
    const duration = calculateDuration(block.start, block.end);

    if (duration >= minGapSize) {
      gaps.push({
        id: `gap_${block.start}_${block.end}`,
        start: block.start,
        end: block.end,
        duration,
        timeBlock: block,
      });
    }

    return gaps;
  }

  // Gap from block start to first item
  const firstItem = itemsInBlock[0];
  const firstGapDuration = calculateDuration(block.start, firstItem.scheduledTime);

  if (firstGapDuration >= minGapSize) {
    gaps.push({
      id: `gap_${block.start}_${firstItem.scheduledTime}`,
      start: block.start,
      end: firstItem.scheduledTime,
      duration: firstGapDuration,
      nextLand: firstItem.land,
      timeBlock: block,
    });
  }

  // Gaps between items
  for (let i = 0; i < itemsInBlock.length - 1; i++) {
    const current = itemsInBlock[i];
    const next = itemsInBlock[i + 1];

    const gapStart = current.endTime;
    const gapEnd = next.scheduledTime;
    const gapDuration = calculateDuration(gapStart, gapEnd);

    if (gapDuration >= minGapSize) {
      gaps.push({
        id: `gap_${gapStart}_${gapEnd}`,
        start: gapStart,
        end: gapEnd,
        duration: gapDuration,
        previousLand: current.land,
        nextLand: next.land,
        timeBlock: block,
      });
    }
  }

  // Gap from last item to block end
  const lastItem = itemsInBlock[itemsInBlock.length - 1];
  const lastGapDuration = calculateDuration(lastItem.endTime, block.end);

  if (lastGapDuration >= minGapSize) {
    gaps.push({
      id: `gap_${lastItem.endTime}_${block.end}`,
      start: lastItem.endTime,
      end: block.end,
      duration: lastGapDuration,
      previousLand: lastItem.land,
      timeBlock: block,
    });
  }

  return gaps;
}

/**
 * Find all available gaps across all time blocks
 */
export function findAllGaps(
  blocks: TimeBlock[],
  scheduledItems: ScheduledItem[],
  minGapSize: number = MIN_GAP_BETWEEN_ITEMS
): ScheduleGap[] {
  const allGaps: ScheduleGap[] = [];

  for (const block of blocks) {
    const blockGaps = findGapsInBlock(block, scheduledItems, minGapSize);
    allGaps.push(...blockGaps);
  }

  // Sort by start time
  return allGaps.sort((a, b) => a.start - b.start);
}

// =============================================================================
// SLOT MANAGEMENT
// =============================================================================

/**
 * Check if a time range conflicts with existing slots
 */
export function hasConflict(
  start: number,
  end: number,
  usedSlots: Map<string, TimeSlot>
): boolean {
  for (const slot of usedSlots.values()) {
    if (doRangesOverlap(start, end, slot.start, slot.end)) {
      return true;
    }
  }
  return false;
}

/**
 * Reserve a time slot
 */
export function reserveSlot(
  usedSlots: Map<string, TimeSlot>,
  slotId: string,
  start: number,
  end: number,
  occupiedBy: string,
  land?: string,
  parkId?: string
): void {
  usedSlots.set(slotId, {
    start,
    end,
    occupiedBy,
    land,
    parkId,
  });
}

/**
 * Release a reserved time slot
 */
export function releaseSlot(
  usedSlots: Map<string, TimeSlot>,
  slotId: string
): void {
  usedSlots.delete(slotId);
}

/**
 * Find the best gap that can fit a ride of given duration
 *
 * @param gaps Available gaps
 * @param rideDuration Total time needed (wait + experience + walk)
 * @param preferAfter Prefer gaps after this time (for optimal scheduling)
 * @returns The best fitting gap, or null if none fits
 */
export function findBestFittingGap(
  gaps: ScheduleGap[],
  rideDuration: number,
  preferAfter?: number
): ScheduleGap | null {
  // Filter gaps that can fit the ride
  const fittingGaps = gaps.filter((gap) => gap.duration >= rideDuration);

  if (fittingGaps.length === 0) {
    return null;
  }

  // If we have a time preference, try to find a gap after that time
  if (preferAfter !== undefined) {
    const preferredGaps = fittingGaps.filter((gap) => gap.start >= preferAfter);
    if (preferredGaps.length > 0) {
      // Return the first (earliest) preferred gap
      return preferredGaps[0];
    }
  }

  // Return the first fitting gap
  return fittingGaps[0];
}

// =============================================================================
// BLOCK QUERIES
// =============================================================================

/**
 * Find the time block containing a specific time
 */
export function findBlockAtTime(
  blocks: TimeBlock[],
  time: number
): TimeBlock | undefined {
  return blocks.find((block) => time >= block.start && time <= block.end);
}

/**
 * Get total available time across all blocks
 */
export function getTotalAvailableTime(blocks: TimeBlock[]): number {
  return blocks.reduce((total, block) => total + block.duration, 0);
}

/**
 * Get blocks for a specific park (for park hopper mode)
 */
export function getBlocksForPark(
  blocks: TimeBlock[],
  parkId: string
): TimeBlock[] {
  return blocks.filter((block) => block.parkId === parkId);
}

/**
 * Calculate remaining schedulable time in a block
 */
export function getRemainingTimeInBlock(
  block: TimeBlock,
  scheduledItems: ScheduledItem[]
): number {
  const itemsInBlock = scheduledItems.filter((item) =>
    doRangesOverlap(item.scheduledTime, item.endTime, block.start, block.end)
  );

  const usedTime = itemsInBlock.reduce(
    (total, item) => total + calculateDuration(item.scheduledTime, item.endTime),
    0
  );

  return block.duration - usedTime;
}

/**
 * Estimate how many more rides can fit in remaining time
 */
export function estimateRemainingCapacity(
  blocks: TimeBlock[],
  scheduledItems: ScheduledItem[],
  averageRideDuration: number = 35
): number {
  let totalRemaining = 0;

  for (const block of blocks) {
    totalRemaining += getRemainingTimeInBlock(block, scheduledItems);
  }

  return Math.floor(totalRemaining / averageRideDuration);
}

// =============================================================================
// CONTEXT HELPERS
// =============================================================================

/**
 * Update scheduling context after adding an item
 * Returns true if item was added successfully, false if there was a conflict
 */
export function addItemToContext(
  context: SchedulingContext,
  item: ScheduledItem
): boolean {
  // Check for conflicts before adding
  if (hasConflict(item.scheduledTime, item.endTime, context.usedSlots)) {
    return false;
  }

  // Check endTime doesn't exceed the relevant time block boundary
  // This is critical for park hopper mode where Park 1 rides must end before transition
  const relevantBlock = context.timeBlocks.find(block =>
    block.parkId === item.parkId &&
    item.scheduledTime >= block.start &&
    item.scheduledTime < block.end
  );

  if (relevantBlock) {
    // Validate against the specific time block boundary
    if (item.endTime > relevantBlock.end) {
      return false;
    }
  } else {
    // Fallback to overall effectiveClose check (non-park-hopper mode)
    if (item.endTime > context.effectiveClose) {
      return false;
    }
  }

  // Add to scheduled items
  context.scheduledItems.push(item);

  // Sort by scheduled time
  context.scheduledItems.sort((a, b) => a.scheduledTime - b.scheduledTime);

  // Reserve the time slot
  reserveSlot(
    context.usedSlots,
    item.id,
    item.scheduledTime,
    item.endTime,
    item.id,
    item.land,
    item.parkId
  );

  // Track ride ID if it's a ride
  if (item.type === 'ride' && item.ride) {
    context.scheduledRideIds.add(item.ride.id);
  }

  return true;
}

/**
 * Get the last scheduled item (for proximity calculations)
 */
export function getLastScheduledItem(
  context: SchedulingContext
): ScheduledItem | undefined {
  if (context.scheduledItems.length === 0) {
    return undefined;
  }
  return context.scheduledItems[context.scheduledItems.length - 1];
}

/**
 * Get item scheduled immediately before a given time
 */
export function getItemBefore(
  context: SchedulingContext,
  time: number
): ScheduledItem | undefined {
  const itemsBefore = context.scheduledItems.filter(
    (item) => item.endTime <= time
  );

  if (itemsBefore.length === 0) {
    return undefined;
  }

  return itemsBefore[itemsBefore.length - 1];
}

/**
 * Get item scheduled immediately after a given time
 */
export function getItemAfter(
  context: SchedulingContext,
  time: number
): ScheduledItem | undefined {
  return context.scheduledItems.find((item) => item.scheduledTime >= time);
}
