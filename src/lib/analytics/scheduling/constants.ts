/**
 * Theme Park Schedule Optimizer - Constants
 *
 * Timing values, buffers, walk times, and park hop eligibility rules.
 */

// =============================================================================
// TIME CONSTANTS
// =============================================================================

/** Default ride duration in minutes (for rides without specific data) */
export const DEFAULT_RIDE_DURATION = 5;

/** Average time spent experiencing a ride (queue + ride) */
export const AVERAGE_RIDE_EXPERIENCE = 25;

/** Buffer time before park close (don't schedule new rides) */
export const PARK_CLOSE_BUFFER = 20;

/** Minimum gap between scheduled items (minutes) */
export const MIN_GAP_BETWEEN_ITEMS = 5;

/** Maximum rides to attempt in a single day */
export const MAX_RIDES_PER_DAY = 15;

/** Minimum block duration to consider for scheduling */
export const MIN_SCHEDULABLE_BLOCK = 30;

// =============================================================================
// ENTERTAINMENT BUFFERS
// =============================================================================

/** Time to arrive early for entertainment by type (minutes) */
export const ENTERTAINMENT_ARRIVAL_BUFFERS: Record<string, number> = {
  parade: 20,       // Need to claim a spot
  fireworks: 30,    // Popular viewing spots fill early
  'water-show': 20, // Need viewing position
  show: 10,         // General shows need less lead time
  other: 15,
};

/** Time after entertainment before moving (dispersal time in minutes) */
export const ENTERTAINMENT_DISPERSAL_TIME: Record<string, number> = {
  parade: 10,       // Let crowds disperse
  fireworks: 15,    // Major crowd dispersal
  'water-show': 10,
  show: 5,
  other: 5,
};

/** Default entertainment duration if not specified */
export const DEFAULT_ENTERTAINMENT_DURATION: Record<string, number> = {
  parade: 25,
  fireworks: 20,
  'water-show': 15,
  show: 20,
  other: 15,
};

// =============================================================================
// WALK TIME CONSTANTS
// =============================================================================

/** Base walk time between any two points in same park (minutes) */
export const BASE_WALK_TIME = 8;

/** Walk time between adjacent lands (minutes) */
export const ADJACENT_LAND_WALK_TIME = 5;

/** Walk time between same land (minutes) */
export const SAME_LAND_WALK_TIME = 3;

/** Walk time between non-adjacent lands (minutes) */
export const DISTANT_LAND_WALK_TIME = 12;

/** Walk time multiplier for crowded conditions */
export const CROWDED_WALK_MULTIPLIER = 1.3;

// =============================================================================
// NET BENEFIT THRESHOLDS
// =============================================================================

/**
 * Minimum net benefit (wait savings - walk cost) for distant lands (12+ min walk)
 * Only suggest walking across the park if net benefit exceeds this threshold
 */
export const DISTANT_LAND_NET_BENEFIT_THRESHOLD = 10;

/**
 * Minimum net benefit for adjacent lands (5-11 min walk)
 * Lower threshold since walk cost is less
 */
export const ADJACENT_LAND_NET_BENEFIT_THRESHOLD = 3;

/**
 * Walk time friction multiplier - walking feels worse than waiting
 * 1 minute of walking = 1.2 minutes of perceived cost
 */
export const WALK_TIME_FRICTION = 1.2;

// =============================================================================
// PARK HOP ELIGIBILITY
// =============================================================================

/**
 * Park hop eligibility times (minutes since midnight)
 * These represent when guests can hop to their second park
 */
export const PARK_HOP_ELIGIBILITY: Record<string, number> = {
  // Disneyland Resort - Can hop at 11:00 AM (660 minutes)
  'disneyland': 660,
  'disney-california-adventure': 660,
  'dlr': 660,  // Alias for Disneyland Resort

  // Walt Disney World - Can hop at 2:00 PM (840 minutes)
  'magic-kingdom': 840,
  'epcot': 840,
  'hollywood-studios': 840,
  'animal-kingdom': 840,
  'wdw': 840,  // Alias for Walt Disney World

  // Universal (if applicable) - typically no restrictions
  'universal-studios-florida': 0,
  'islands-of-adventure': 0,
  'universal-studios-hollywood': 0,
};

/** Default park hop eligibility time if park not found */
export const DEFAULT_HOP_ELIGIBILITY = 660; // 11 AM

/** Travel time between parks in same resort (minutes) */
export const PARK_TRAVEL_TIMES: Record<string, Record<string, number>> = {
  // Disneyland Resort (very close together)
  'disneyland': {
    'disney-california-adventure': 10,
  },
  'disney-california-adventure': {
    'disneyland': 10,
  },

  // Walt Disney World (requires transportation)
  'magic-kingdom': {
    'epcot': 25,
    'hollywood-studios': 30,
    'animal-kingdom': 35,
  },
  'epcot': {
    'magic-kingdom': 25,
    'hollywood-studios': 15,  // Skyliner/boat
    'animal-kingdom': 25,
  },
  'hollywood-studios': {
    'magic-kingdom': 30,
    'epcot': 15,  // Skyliner/boat
    'animal-kingdom': 25,
  },
  'animal-kingdom': {
    'magic-kingdom': 35,
    'epcot': 25,
    'hollywood-studios': 25,
  },
};

/** Default travel time between parks */
export const DEFAULT_PARK_TRAVEL_TIME = 20;

// =============================================================================
// ROPE DROP CONSTANTS
// =============================================================================

/** Maximum number of rope drop target rides */
export const MAX_ROPE_DROP_TARGETS = 3;

/** Delta threshold for grouping same-land rope drop rides (minutes) */
export const ROPE_DROP_DELTA_THRESHOLD = 15;

/** Extra early arrival for rope drop strategy (minutes before park open) */
export const ROPE_DROP_EARLY_ARRIVAL = 30;

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

/** Weights for multi-factor slot scoring */
export const SLOT_SCORING_WEIGHTS = {
  waitTime: 0.40,         // Wait time at this slot
  proximityToPrev: 0.30,  // Walk time from previous item
  proximityToNext: 0.20,  // Walk time to next item
  importance: 0.10,       // Ride importance/popularity
};

/** Bonus for scheduling at optimal hour */
export const OPTIMAL_HOUR_BONUS = 20;

/** Penalty for scheduling at peak hour */
export const PEAK_HOUR_PENALTY = -15;

// =============================================================================
// RIDE IMPORTANCE SCORES
// =============================================================================

/** Base importance scores by popularity tier */
export const RIDE_IMPORTANCE_SCORES: Record<string, number> = {
  headliner: 100,
  popular: 70,
  moderate: 40,
  low: 20,
};

// =============================================================================
// MEAL BREAK CONSTANTS
// =============================================================================

/** Meal break duration range (minutes) */
export const MEAL_BREAK_DURATION_MIN = 30;
export const MEAL_BREAK_DURATION_MAX = 45;

/** Default meal break duration (minutes) - used for scheduling calculations */
export const MEAL_BREAK_DURATION = 35; // Use middle of range for calculations

/** Preferred lunch window (minutes since midnight) */
export const LUNCH_WINDOW = {
  earliest: 690,  // 11:30 AM
  latest: 810,    // 1:30 PM
  preferred: 750, // 12:30 PM
};

/** Preferred dinner window (minutes since midnight) */
export const DINNER_WINDOW = {
  earliest: 1020, // 5:00 PM
  latest: 1140,   // 7:00 PM
  preferred: 1080, // 6:00 PM
};

// =============================================================================
// PARK HOURS DEFAULTS
// =============================================================================

/** Default park hours if not specified */
export const DEFAULT_PARK_HOURS = {
  openHour: 9,
  openMinute: 0,
  closeHour: 21,
  closeMinute: 0,
};

/** Hours covered by predictions (9 AM to 9 PM) */
export const PREDICTION_HOURS = {
  start: 9,
  end: 21,
  count: 13,
};

// =============================================================================
// OVERFLOW REASONS
// =============================================================================

/** Human-readable overflow reason messages */
export const OVERFLOW_MESSAGES: Record<string, string> = {
  time_constraint: 'Not enough time remaining in the day',
  anchor_conflict: 'Conflicts with scheduled entertainment',
  headliner_density: 'Too many headliners competing for optimal time slots',
  park_hop_constraint: 'Cannot fit within park hopper time constraints',
};

/** Overflow suggestions by reason */
export const OVERFLOW_SUGGESTIONS: Record<string, string> = {
  time_constraint: 'Consider arriving earlier or visiting on another day',
  anchor_conflict: 'This ride competes with your selected entertainment for time',
  headliner_density: 'Consider removing a headliner or visiting on a less crowded day',
  park_hop_constraint: 'Consider allocating more time to this park or removing park hopping',
};
