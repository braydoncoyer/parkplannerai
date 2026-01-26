/**
 * Theme Park Schedule Optimizer - Type Definitions
 *
 * Core types for the anchor-based scheduling algorithm with optimal time placement.
 */

import type { RidePopularity, RideCategory, DayType } from '../types';

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Ride data with hourly wait time predictions
 */
export interface RideWithPredictions {
  id: string | number;
  name: string;
  land?: string;
  parkId?: string;
  parkShortName?: string;
  isOpen?: boolean;
  waitTime?: number | null;
  popularity?: RidePopularity;
  category?: RideCategory;
  duration?: number;
  /** 13-hour array of predicted wait times (9am-9pm, index 0 = 9am) */
  hourlyPredictions?: number[];
}

/**
 * Park operating hours
 */
export interface ParkHours {
  openHour: number;
  openMinute?: number;
  closeHour: number;
  closeMinute?: number;
}

/**
 * Entertainment event (parade, fireworks, show)
 */
export interface Entertainment {
  id: string;
  name: string;
  category: 'parade' | 'fireworks' | 'water-show' | 'show' | 'other';
  showTimes?: Array<{ startTime: string; endTime?: string }>;
  duration?: number;
  location?: string;
}

/**
 * User preferences for scheduling
 */
export interface SchedulerPreferences {
  arrivalTime: string;
  departureTime?: string;
  includeBreaks: boolean;
  priority: 'thrill' | 'family' | 'shows' | 'balanced';
  allowRerides?: boolean;
}

/**
 * Rope drop configuration
 */
export interface RopeDropConfig {
  enabled: boolean;
  /** User-selected rides to prioritize at park open (2-3 rides) */
  targets: RideWithPredictions[];
}

/**
 * Park hopper configuration
 */
export interface ParkHopperConfig {
  enabled: boolean;
  park1Id: string;
  park2Id: string;
  park1Name: string;
  park2Name: string;
  /** Minutes since midnight when hopping is allowed (e.g., 660 for 11 AM) */
  eligibilityTime: number;
  /** Minutes to travel between parks */
  travelTime: number;
  /** User-specified transition time, or null to auto-optimize */
  userTransitionTime?: number;
  park1Rides: RideWithPredictions[];
  park2Rides: RideWithPredictions[];
}

/**
 * Main input to the scheduler
 */
export interface SchedulerInput {
  /** All user-selected rides for this day */
  selectedRides: RideWithPredictions[];
  /** Park operating hours */
  parkHours: ParkHours;
  /** Entertainment events (parades, fireworks) */
  entertainment: Entertainment[];
  /** User preferences */
  preferences: SchedulerPreferences;
  /** Rope drop configuration */
  ropeDrop?: RopeDropConfig;
  /** Park hopper configuration (if enabled) */
  parkHopper?: ParkHopperConfig;
  /** Day type for wait time adjustments */
  dayType: DayType;
  /** Park ID for park-specific logic */
  parkId?: string;
}

/**
 * Multi-day trip input
 */
export interface TripSchedulerInput {
  /** All days in the trip */
  days: Array<{
    date: Date;
    input: SchedulerInput;
  }>;
  /** All user-selected rides across the entire trip */
  allSelectedRides: RideWithPredictions[];
  /** Whether re-rides are allowed after all selections are scheduled */
  allowRerides: boolean;
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Park time boundaries for park-aware scheduling
 * Used in park hopper mode to constrain scheduling to valid windows
 */
export interface ParkTimeBoundaries {
  parkId: string;
  /** Earliest schedulable time in minutes since midnight */
  earliestTime: number;
  /** Latest schedulable time in minutes since midnight */
  latestTime: number;
}

/**
 * A time block is a schedulable region between anchors
 */
export interface TimeBlock {
  id: string;
  /** Start time in minutes since midnight */
  start: number;
  /** End time in minutes since midnight */
  end: number;
  /** Duration in minutes */
  duration: number;
  /** The anchor that precedes this block (if any) */
  precedingAnchor?: Anchor;
  /** The anchor that follows this block (if any) */
  followedBy?: Anchor;
  /** Park ID for park hopper mode */
  parkId?: string;
}

/**
 * An anchor is a fixed-time event (entertainment, transition, meal)
 */
export interface Anchor {
  id: string;
  type: 'parade' | 'fireworks' | 'show' | 'meal' | 'transition';
  name: string;
  /** Start time in minutes since midnight */
  startTime: number;
  /** End time in minutes since midnight */
  endTime: number;
  /** Duration in minutes */
  duration: number;
  /** Minutes to arrive early for good viewing */
  arrivalBuffer: number;
  /** Whether this anchor's time can be adjusted (only transitions) */
  isMovable: boolean;
  /** Earliest allowed time (for movable anchors) */
  earliestTime?: number;
  /** Park ID for park hopper mode */
  parkId?: string;
}

/**
 * A time slot represents a reserved period in the schedule
 */
export interface TimeSlot {
  /** Start time in minutes since midnight */
  start: number;
  /** End time in minutes since midnight */
  end: number;
  /** ID of the item occupying this slot */
  occupiedBy: string;
  /** Land for proximity calculations */
  land?: string;
  /** Park ID for park hopper mode */
  parkId?: string;
}

/**
 * Gap between scheduled items
 */
export interface ScheduleGap {
  /** Unique identifier for this gap */
  id?: string;
  /** Start time in minutes since midnight */
  start: number;
  /** End time in minutes since midnight */
  end: number;
  /** Duration in minutes */
  duration: number;
  /** Land of the previous item (for walk time calculation) */
  previousLand?: string;
  /** Land of the next item (for walk time calculation) */
  nextLand?: string;
  /** The time block this gap is within */
  timeBlock: TimeBlock;
}

/**
 * Candidate slot for placing a ride
 */
export interface SlotCandidate {
  gap: ScheduleGap;
  /** Calculated score for this slot */
  score: number;
  /** Scheduled start time (after walk from previous) */
  scheduledTime: number;
  /** Expected wait time at this slot */
  waitTime: number;
  /** Walk time from previous item */
  walkTime: number;
  /** Walk time to next item */
  walkToNext: number;
  /** Net benefit in minutes (wait savings - walk cost) for debugging */
  netBenefit?: number;
}

/**
 * Scoring breakdown for a slot
 */
export interface SlotScore {
  /** Total score (sum of all components) */
  total: number;
  /** Score from wait time (40% weight) */
  waitTimeScore: number;
  /** Score from proximity to previous (30% weight) */
  proximityToPrevScore: number;
  /** Score from proximity to next (20% weight) */
  proximityToNextScore: number;
  /** Score from ride importance (10% weight) */
  importanceScore: number;
  /** Whether this is the ride's optimal hour */
  isOptimalHour: boolean;
  /** Reasoning for this score */
  reasoning: string;
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

/**
 * A scheduled item in the final schedule
 */
export interface ScheduledItem {
  id: string;
  type: 'ride' | 'entertainment' | 'break' | 'walk' | 'transition';
  /** Start time in minutes since midnight */
  scheduledTime: number;
  /** End time in minutes since midnight */
  endTime: number;
  /** Duration in minutes */
  duration: number;
  /** The ride (if type is 'ride') */
  ride?: RideWithPredictions;
  /** The entertainment (if type is 'entertainment') */
  entertainment?: Entertainment;
  /** Expected wait time (for rides) */
  expectedWait?: number;
  /** Whether this is at the ride's optimal time */
  isOptimalTime?: boolean;
  /** Walk time from previous item */
  walkFromPrevious?: number;
  /** Human-readable reasoning for this placement */
  reasoning: string;
  /** Land for display and proximity calculations */
  land?: string;
  /** Park ID for park hopper mode */
  parkId?: string;
  /** Whether this is a re-ride */
  isReride?: boolean;
}

/**
 * A ride that couldn't be scheduled (overflow)
 */
export interface OverflowItem {
  ride: RideWithPredictions;
  reason: OverflowReason;
  /** Human-readable suggestion for what to do */
  suggestion: string;
  /** If applicable, an alternative day that would work better */
  alternativeDay?: string;
}

export type OverflowReason =
  | 'time_constraint'      // Not enough time remaining in the day
  | 'anchor_conflict'      // Conflicts with entertainment
  | 'headliner_density'    // Too many headliners compete for optimal slots
  | 'park_hop_constraint'; // Can't fit in either park's time block

/**
 * Validation results from the scheduler
 */
export interface ScheduleValidation {
  /** Whether all user-selected rides are scheduled */
  allUserRidesScheduled: boolean;
  /** Rides that were selected but not scheduled */
  missingRides: RideWithPredictions[];
  /** Warning messages */
  warnings: string[];
}

/**
 * Statistics about the generated schedule
 */
export interface ScheduleStats {
  /** Total expected wait time in minutes */
  totalWaitTime: number;
  /** Total walk time in minutes */
  totalWalkTime: number;
  /** Number of rides scheduled */
  ridesScheduled: number;
  /** Number of headliners at their optimal time */
  headlinersAtOptimal: number;
  /** Total number of headliners */
  headlinersTotal: number;
  /** Number of re-rides added */
  reridesAdded: number;
}

/**
 * Result from the scheduler for a single day
 */
export interface SchedulerResult {
  /** The final schedule items in chronological order */
  items: ScheduledItem[];
  /** Rides that couldn't fit */
  overflow: OverflowItem[];
  /** Validation results */
  validation: ScheduleValidation;
  /** Schedule statistics */
  stats: ScheduleStats;
  /** Insights for the user */
  insights: string[];
  /** Comparison to naive scheduling */
  comparison?: {
    waitTimeSaved: number;
    percentImprovement: number;
  };
}

/**
 * Result from multi-day trip scheduling
 */
export interface TripSchedulerResult {
  /** Results for each day */
  days: Array<{
    date: Date;
    result: SchedulerResult;
  }>;
  /** Trip-wide statistics */
  tripStats: {
    totalRidesScheduled: number;
    totalWaitTime: number;
    totalWalkTime: number;
    allUserRidesScheduled: boolean;
    totalRerides: number;
  };
  /** Trip-wide insights */
  tripInsights: string[];
}

// =============================================================================
// CONTEXT TYPES (for tracking state across phases)
// =============================================================================

/**
 * Context passed between scheduling phases
 */
export interface SchedulingContext {
  /** Original input */
  input: SchedulerInput;
  /** Park open time in minutes since midnight */
  parkOpen: number;
  /** Effective close time (with buffer) in minutes since midnight */
  effectiveClose: number;
  /** All anchors (entertainment + transitions) */
  anchors: Anchor[];
  /** Available time blocks */
  timeBlocks: TimeBlock[];
  /** Currently scheduled items */
  scheduledItems: ScheduledItem[];
  /** Used time slots (for conflict detection) */
  usedSlots: Map<string, TimeSlot>;
  /** IDs of rides that have been scheduled */
  scheduledRideIds: Set<string | number>;
  /** Overflow items */
  overflow: OverflowItem[];
  /** Generated insights */
  insights: string[];
}

/**
 * Trip-level context for multi-day scheduling
 */
export interface TripContext {
  /** IDs of rides scheduled anywhere in the trip */
  tripScheduledRideIds: Set<string | number>;
  /** Rides not yet scheduled in any day */
  remainingUserRides: RideWithPredictions[];
  /** Whether all user selections have been scheduled */
  allUserRidesScheduled: boolean;
  /** Day results accumulated so far */
  dayResults: Array<{ date: Date; result: SchedulerResult }>;
}
