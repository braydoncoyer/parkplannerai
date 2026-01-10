// Seeded Historical Wait Time Patterns
// Based on typical theme park crowd patterns
// Can be replaced with real collected data later

import type { DayType, RidePopularity } from '../types';

/**
 * Hourly crowd multipliers by day type
 * Index 0 = 9am, Index 12 = 9pm
 * Multiplier of 1.0 = average crowd level
 *
 * Note: Even at rope drop, headliners have significant waits
 * because everyone rushes to them first. The multipliers reflect
 * overall park crowd levels, not individual ride behavior.
 */
export const HOURLY_PATTERNS: Record<DayType, number[]> = {
  weekday: [
    0.7,   // 9am  - Rope drop rush to headliners
    0.75,  // 10am - Still building
    0.9,   // 11am - Approaching lunch rush
    1.1,   // 12pm - Lunch peak begins
    1.2,   // 1pm  - Peak afternoon crowds
    1.15,  // 2pm  - Still busy
    1.0,   // 3pm  - Slight afternoon dip
    0.9,   // 4pm  - Pre-dinner lull (best time!)
    0.95,  // 5pm  - Building again
    1.05,  // 6pm  - Dinner rush
    0.85,  // 7pm  - Evening wind down
    0.7,   // 8pm  - Lower crowds
    0.55,  // 9pm  - Approaching close
  ],
  weekend: [
    0.85,  // 9am  - Heavy rope drop
    0.95,  // 10am - Filling up fast
    1.1,   // 11am - Already busy
    1.3,   // 12pm - Peak lunch crowds
    1.4,   // 1pm  - Maximum crowds (worst time)
    1.35,  // 2pm  - Still very busy
    1.15,  // 3pm  - Slight improvement
    1.05,  // 4pm  - Afternoon dip
    1.1,   // 5pm  - Building for evening
    1.25,  // 6pm  - Dinner rush
    1.05,  // 7pm  - Still elevated
    0.85,  // 8pm  - Winding down
    0.65,  // 9pm  - Lower crowds
  ],
  holiday: [
    1.0,   // 9am  - Packed even at opening
    1.15,  // 10am - Already crowded
    1.35,  // 11am - Very busy
    1.55,  // 12pm - Extremely crowded
    1.7,   // 1pm  - Peak (avoid if possible)
    1.6,   // 2pm  - Still extreme
    1.4,   // 3pm  - Some relief
    1.25,  // 4pm  - Still busy
    1.35,  // 5pm  - Building again
    1.5,   // 6pm  - Dinner peak
    1.25,  // 7pm  - Elevated
    1.0,   // 8pm  - Starting to clear
    0.8,   // 9pm  - Better but still busy
  ],
};

/**
 * Base wait times by ride popularity tier (in minutes)
 * These represent typical wait times under normal (1.0 multiplier) conditions
 *
 * Headliners are calibrated for rides like Battle at the Ministry,
 * Flight of Passage, Hagrid's - which regularly exceed 90 min waits
 */
export const BASE_WAIT_BY_POPULARITY: Record<RidePopularity, number> = {
  headliner: 105, // Top attractions: Flight of Passage, Hagrid's, Battle at Ministry
  popular: 55,    // Popular rides: Space Mountain, Expedition Everest, Forbidden Journey
  moderate: 30,   // Moderate demand: Pirates, Jungle Cruise, Haunted Mansion
  low: 12,        // Low wait attractions: Carousel, smaller rides, shows
};

/**
 * Get hourly multiplier for a specific hour and day type
 */
export function getHourlyMultiplier(hour: number, dayType: DayType): number {
  const hourIndex = Math.max(0, Math.min(12, hour - 9)); // 9am = 0, 9pm = 12
  return HOURLY_PATTERNS[dayType][hourIndex] ?? 1.0;
}

/**
 * Get base wait time for a popularity tier
 */
export function getBaseWaitTime(popularity: RidePopularity): number {
  return BASE_WAIT_BY_POPULARITY[popularity];
}

/**
 * Calculate predicted wait time for a ride at a specific hour
 */
export function calculatePredictedWait(
  popularity: RidePopularity,
  hour: number,
  dayType: DayType,
  currentWaitTime?: number | null
): number {
  const baseWait = getBaseWaitTime(popularity);
  const hourlyMultiplier = getHourlyMultiplier(hour, dayType);

  // Base prediction
  let predictedWait = baseWait * hourlyMultiplier;

  // If we have current wait time, use it to adjust prediction
  // This accounts for today's specific crowd conditions
  if (currentWaitTime !== null && currentWaitTime !== undefined && currentWaitTime > 0) {
    const currentHour = new Date().getHours();
    const expectedCurrentWait = baseWait * getHourlyMultiplier(currentHour, dayType);

    if (expectedCurrentWait > 0) {
      const rideSpecificFactor = currentWaitTime / expectedCurrentWait;
      // Blend predicted with current-adjusted (60% pattern, 40% current)
      predictedWait = predictedWait * (0.6 + 0.4 * rideSpecificFactor);
    }
  }

  return Math.round(predictedWait);
}

/**
 * Get all hourly predictions for a ride (9am - 9pm)
 */
export function getHourlyPredictions(
  popularity: RidePopularity,
  dayType: DayType,
  currentWaitTime?: number | null
): number[] {
  const predictions: number[] = [];

  for (let hour = 9; hour <= 21; hour++) {
    predictions.push(calculatePredictedWait(popularity, hour, dayType, currentWaitTime));
  }

  return predictions;
}

/**
 * Find optimal hours for a ride (lowest predicted wait times)
 */
export function findOptimalHours(
  predictions: number[],
  count: number = 3
): { hour: number; wait: number }[] {
  const hourlyData = predictions.map((wait, index) => ({
    hour: index + 9,
    wait,
  }));

  return hourlyData
    .sort((a, b) => a.wait - b.wait)
    .slice(0, count);
}

/**
 * Find peak hours for a ride (highest predicted wait times)
 */
export function findPeakHours(
  predictions: number[],
  count: number = 3
): { hour: number; wait: number }[] {
  const hourlyData = predictions.map((wait, index) => ({
    hour: index + 9,
    wait,
  }));

  return hourlyData
    .sort((a, b) => b.wait - a.wait)
    .slice(0, count);
}

/**
 * Check if a wait time is below average for the day
 */
export function isBelowAverageWait(
  predictedWait: number,
  predictions: number[]
): boolean {
  const average = predictions.reduce((a, b) => a + b, 0) / predictions.length;
  return predictedWait < average;
}

/**
 * Check if current hour is at peak (>= 80% of daily max)
 */
export function isAtPeak(
  predictedWait: number,
  predictions: number[],
  threshold: number = 0.8
): boolean {
  const maxWait = Math.max(...predictions);
  return predictedWait >= maxWait * threshold;
}
