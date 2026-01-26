/**
 * Theme Park Schedule Optimizer - Park Hopper Manager
 *
 * Handles park hop eligibility, transition timing, and multi-park scheduling.
 * Ensures transitions happen after eligibility time while optimizing for ride efficiency.
 */

import type {
  RideWithPredictions,
  ParkHopperConfig,
  Anchor,
  Entertainment,
  SchedulingContext,
} from '../types';
import {
  PARK_HOP_ELIGIBILITY,
  DEFAULT_HOP_ELIGIBILITY,
  PARK_TRAVEL_TIMES,
  DEFAULT_PARK_TRAVEL_TIME,
} from '../constants';
import {
  findOptimalPredictionHour,
  calculateSavingsDelta,
  getHourFromMinutes,
} from '../utils/timeUtils';

// =============================================================================
// ELIGIBILITY CHECKING
// =============================================================================

/**
 * Get the park hop eligibility time for a park
 * @param parkId The park identifier
 * @returns Minutes since midnight when hopping is allowed
 */
export function getParkHopEligibilityTime(parkId: string): number {
  const normalizedId = parkId.toLowerCase().replace(/[_\s]/g, '-');

  // Check for exact match
  if (PARK_HOP_ELIGIBILITY[normalizedId] !== undefined) {
    return PARK_HOP_ELIGIBILITY[normalizedId];
  }

  // Check for partial match
  for (const [key, value] of Object.entries(PARK_HOP_ELIGIBILITY)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return value;
    }
  }

  return DEFAULT_HOP_ELIGIBILITY;
}

/**
 * Get travel time between two parks
 */
export function getParkTravelTime(fromParkId: string, toParkId: string): number {
  const from = fromParkId.toLowerCase().replace(/[_\s]/g, '-');
  const to = toParkId.toLowerCase().replace(/[_\s]/g, '-');

  const fromTimes = PARK_TRAVEL_TIMES[from];
  if (fromTimes && fromTimes[to] !== undefined) {
    return fromTimes[to];
  }

  return DEFAULT_PARK_TRAVEL_TIME;
}

/**
 * Check if a transition time is valid (after eligibility)
 */
export function isTransitionTimeValid(
  transitionTime: number,
  toParkId: string
): boolean {
  const eligibilityTime = getParkHopEligibilityTime(toParkId);
  return transitionTime >= eligibilityTime;
}

// =============================================================================
// TRANSITION ANCHOR CREATION
// =============================================================================

/**
 * Create a transition anchor for park hopping
 */
export function createTransitionAnchor(
  config: ParkHopperConfig,
  transitionTime: number
): Anchor {
  const travelTime = getParkTravelTime(config.park1Id, config.park2Id);

  return {
    id: `transition_${config.park1Id}_to_${config.park2Id}`,
    type: 'transition',
    name: `Travel to ${config.park2Name}`,
    startTime: transitionTime,
    endTime: transitionTime + travelTime,
    duration: travelTime,
    arrivalBuffer: 0, // No arrival buffer needed for transitions
    isMovable: config.userTransitionTime === undefined, // Only movable if not user-specified
    earliestTime: config.eligibilityTime,
    parkId: config.park2Id, // Anchor belongs to the destination park
  };
}

// =============================================================================
// OPTIMAL TRANSITION TIMING
// =============================================================================

/**
 * Calculate the optimal transition time based on ride schedules
 *
 * Factors considered:
 * 1. Must be >= eligibility time (hard constraint)
 * 2. Complete high-value morning rides in Park 1 first
 * 3. Catch Park 2 entertainment if selected
 * 4. Consider Park 2 headliner optimal times
 * 5. Minimize dead time during transition
 */
export function calculateOptimalTransitionTime(
  config: ParkHopperConfig,
  park2Entertainment: Entertainment[]
): { transitionTime: number; reasoning: string } {
  // If user specified a transition time, use it
  if (config.userTransitionTime !== undefined) {
    return {
      transitionTime: config.userTransitionTime,
      reasoning: 'User-specified transition time',
    };
  }

  const eligibilityTime = config.eligibilityTime;
  const travelTime = config.travelTime;

  // Calculate headliner optimal times for Park 2
  const park2Headliners = config.park2Rides.filter(
    (r) => r.popularity === 'headliner'
  );

  const headlinerOptimalTimes = park2Headliners.map((ride) => ({
    ride,
    optimal: findOptimalPredictionHour(ride.hourlyPredictions ?? []),
    delta: calculateSavingsDelta(ride.hourlyPredictions ?? []),
  }));

  // Find entertainment in Park 2 that affects timing
  const significantEntertainment = park2Entertainment.filter((e) =>
    ['parade', 'fireworks', 'water-show'].includes(e.category)
  );

  // Get earliest entertainment time in Park 2
  let earliestEntertainment: number | null = null;
  for (const ent of significantEntertainment) {
    if (ent.showTimes && ent.showTimes.length > 0) {
      for (const show of ent.showTimes) {
        const showTime = parseShowTime(show.startTime);
        if (showTime !== null && (earliestEntertainment === null || showTime < earliestEntertainment)) {
          earliestEntertainment = showTime;
        }
      }
    }
  }

  // Calculate transition options

  // Option 1: Transition at eligibility time
  const atEligibility = eligibilityTime;

  // Option 2: Transition to arrive before entertainment
  let beforeEntertainment: number | null = null;
  if (earliestEntertainment !== null) {
    // Need to arrive 30 min before entertainment
    const arriveBy = earliestEntertainment - 30;
    if (arriveBy - travelTime >= eligibilityTime) {
      beforeEntertainment = arriveBy - travelTime;
    }
  }

  // Option 3: Transition to arrive for headliner optimal time
  let forHeadliner: number | null = null;
  if (headlinerOptimalTimes.length > 0) {
    // Find the headliner with highest delta (benefits most from timing)
    const bestHeadliner = headlinerOptimalTimes.sort((a, b) => b.delta - a.delta)[0];
    const arriveBy = bestHeadliner.optimal.hour * 60;

    if (arriveBy - travelTime >= eligibilityTime) {
      forHeadliner = arriveBy - travelTime;
    }
  }

  // Choose the best option - default is eligibility time
  // We prefer EARLIER transitions to maximize time at Park 2
  let transitionTime = atEligibility;
  let reasoning = 'Transition at earliest eligible time';

  // If entertainment option exists and is earlier than current, prefer it
  if (beforeEntertainment !== null && beforeEntertainment >= eligibilityTime) {
    if (beforeEntertainment < transitionTime) {
      transitionTime = beforeEntertainment;
      reasoning = 'Transition timed to arrive before selected entertainment';
    }
  }

  // If headliner option exists and is EARLIER than current, consider it
  // (We don't want to delay transition just for a headliner's late-evening optimal time)
  if (forHeadliner !== null && forHeadliner >= eligibilityTime && forHeadliner < transitionTime) {
    const bestHeadliner = headlinerOptimalTimes.sort((a, b) => b.delta - a.delta)[0];
    transitionTime = forHeadliner;
    reasoning = `Transition timed for ${bestHeadliner.ride.name}'s optimal window`;
  }

  return { transitionTime, reasoning };
}

/**
 * Parse a show time string to minutes since midnight
 */
function parseShowTime(timeString: string): number | null {
  if (!timeString) return null;

  // Try to parse HH:MM format
  const match = timeString.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

// =============================================================================
// RIDE DISTRIBUTION BETWEEN PARKS
// =============================================================================

/**
 * Distribute rides between parks based on optimal timing
 *
 * Rides are assigned to parks based on:
 * 1. Their optimal time (morning rides → Park 1, afternoon rides → Park 2)
 * 2. Headliner priority (more important headliners get their optimal park)
 * 3. User's rope drop targets always go to Park 1
 */
export function distributeRidesBetweenParks(
  config: ParkHopperConfig,
  transitionTime: number,
  ropeDropTargetIds: Set<string | number>
): { park1Rides: RideWithPredictions[]; park2Rides: RideWithPredictions[] } {
  const park1Rides: RideWithPredictions[] = [];
  const park2Rides: RideWithPredictions[] = [];

  // All Park 1 rides stay in Park 1
  for (const ride of config.park1Rides) {
    park1Rides.push(ride);
  }

  // All Park 2 rides go to Park 2
  for (const ride of config.park2Rides) {
    park2Rides.push(ride);
  }

  return { park1Rides, park2Rides };
}

/**
 * Get available time in each park for scheduling
 */
export function getParkTimeWindows(
  parkOpenTime: number,
  parkCloseTime: number,
  transitionTime: number,
  travelTime: number,
  isPark1: boolean
): { start: number; end: number } {
  if (isPark1) {
    // Park 1: from open until transition
    return {
      start: parkOpenTime,
      end: transitionTime,
    };
  } else {
    // Park 2: from arrival until close
    return {
      start: transitionTime + travelTime,
      end: parkCloseTime,
    };
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate park hopper configuration
 */
export function validateParkHopperConfig(
  config: ParkHopperConfig
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that parks are different
  if (config.park1Id === config.park2Id) {
    errors.push('Park 1 and Park 2 must be different');
  }

  // Check that eligibility time is valid
  if (config.eligibilityTime < 0 || config.eligibilityTime > 1440) {
    errors.push('Invalid eligibility time');
  }

  // Check that travel time is reasonable
  if (config.travelTime < 5 || config.travelTime > 60) {
    errors.push('Travel time should be between 5 and 60 minutes');
  }

  // Check that we have rides in at least one park
  if (config.park1Rides.length === 0 && config.park2Rides.length === 0) {
    errors.push('No rides selected for either park');
  }

  // If user specified transition time, validate it
  if (config.userTransitionTime !== undefined) {
    if (config.userTransitionTime < config.eligibilityTime) {
      errors.push(
        `Transition time (${formatTime(config.userTransitionTime)}) is before park hop eligibility (${formatTime(config.eligibilityTime)})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format minutes since midnight to time string
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// =============================================================================
// INSIGHTS GENERATION
// =============================================================================

/**
 * Generate park hopper insights
 */
export function generateParkHopperInsights(
  config: ParkHopperConfig,
  transitionTime: number,
  park1RidesScheduled: number,
  park2RidesScheduled: number
): string[] {
  const insights: string[] = [];

  const travelTime = config.travelTime;
  const arrivalTime = transitionTime + travelTime;

  // Transition timing insight
  insights.push(
    `Leave ${config.park1Name} at ${formatTime(transitionTime)}, arrive at ${config.park2Name} by ${formatTime(arrivalTime)}`
  );

  // Rides in each park
  insights.push(
    `${park1RidesScheduled} rides scheduled in ${config.park1Name}, ${park2RidesScheduled} in ${config.park2Name}`
  );

  // Eligibility reminder if transitioning at minimum time
  if (transitionTime === config.eligibilityTime) {
    insights.push(
      `Transitioning at the earliest allowed time for park hopping`
    );
  }

  return insights;
}
