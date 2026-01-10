// Wait Time Predictor
// Predicts wait times based on historical patterns and ride popularity

import type { RidePopularity, RideWithPredictions, PredictedWaitTime } from '../types';
import {
  getHourlyPredictions,
  calculatePredictedWait,
  findOptimalHours,
  findPeakHours,
  isBelowAverageWait,
  isAtPeak,
} from '../data/historicalPatterns';
import { enrichRideWithMetadata } from '../data/rideMetadata';
import { classifyDayType } from './dayTypeClassifier';

/**
 * Generate full predictions for a ride
 */
export function predictRideWaitTimes(
  ride: {
    id: number | string;
    name: string;
    land?: string;
    isOpen?: boolean;
    waitTime?: number | null;
  },
  visitDate: Date | string
): RideWithPredictions {
  const enrichedRide = enrichRideWithMetadata(ride);
  const dayType = classifyDayType(visitDate);

  const hourlyPredictions = getHourlyPredictions(
    enrichedRide.popularity,
    dayType,
    enrichedRide.currentWaitTime
  );

  return {
    ...enrichedRide,
    hourlyPredictions,
  };
}

/**
 * Get predicted wait time for a specific hour
 */
export function getPredictedWaitForHour(
  ride: RideWithPredictions,
  hour: number
): number {
  const index = Math.max(0, Math.min(12, hour - 9));
  return ride.hourlyPredictions[index] ?? 30;
}

/**
 * Get detailed prediction for a specific ride at a specific hour
 */
export function getDetailedPrediction(
  ride: RideWithPredictions,
  hour: number
): PredictedWaitTime {
  const predictedWait = getPredictedWaitForHour(ride, hour);
  const isOptimal = isBelowAverageWait(predictedWait, ride.hourlyPredictions);
  const isPeak = isAtPeak(predictedWait, ride.hourlyPredictions);

  // Determine confidence based on current wait data availability
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (ride.currentWaitTime !== null && ride.currentWaitTime > 0) {
    confidence = 'high';
  } else if (ride.popularity === 'headliner' || ride.popularity === 'popular') {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Generate reasoning
  const reasoning = generatePredictionReasoning(
    ride,
    hour,
    predictedWait,
    isOptimal,
    isPeak
  );

  return {
    rideId: ride.id,
    rideName: ride.name,
    hour,
    predictedWait,
    confidence,
    isOptimalWindow: isOptimal,
    isPeakTime: isPeak,
    reasoning,
  };
}

/**
 * Generate human-readable reasoning for a prediction
 */
function generatePredictionReasoning(
  ride: RideWithPredictions,
  hour: number,
  predictedWait: number,
  isOptimal: boolean,
  isPeak: boolean
): string {
  const hourStr = formatHour(hour);
  const avgWait = Math.round(
    ride.hourlyPredictions.reduce((a, b) => a + b, 0) / ride.hourlyPredictions.length
  );

  // Peak time warning
  if (isPeak) {
    const optimalHours = findOptimalHours(ride.hourlyPredictions, 2);
    const optimalStr = optimalHours.map((h) => formatHour(h.hour)).join(' or ');
    return `Peak wait time at ${hourStr}. Consider ${optimalStr} for shorter waits (~${optimalHours[0].wait} min).`;
  }

  // Optimal window
  if (isOptimal) {
    const savings = avgWait - predictedWait;
    if (savings > 10) {
      return `Optimal time - ${savings} min shorter than daily average.`;
    }
    return `Good time - below average wait.`;
  }

  // Headliner advice
  if (ride.popularity === 'headliner') {
    const optimalHours = findOptimalHours(ride.hourlyPredictions, 1);
    if (hour !== optimalHours[0].hour) {
      return `Headliner ride - best at ${formatHour(optimalHours[0].hour)} (~${optimalHours[0].wait} min).`;
    }
    return `Best time for this headliner attraction.`;
  }

  // Default
  return `Expected ~${predictedWait} min wait.`;
}

/**
 * Format hour for display (e.g., 14 -> "2:00 PM")
 */
function formatHour(hour: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${h}:00 ${period}`;
}

/**
 * Find the best hours to ride a specific attraction
 */
export function findBestHoursForRide(
  ride: RideWithPredictions,
  count: number = 3
): { hour: number; wait: number; formatted: string }[] {
  return findOptimalHours(ride.hourlyPredictions, count).map((h) => ({
    ...h,
    formatted: formatHour(h.hour),
  }));
}

/**
 * Find the worst hours to ride a specific attraction
 */
export function findWorstHoursForRide(
  ride: RideWithPredictions,
  count: number = 3
): { hour: number; wait: number; formatted: string }[] {
  return findPeakHours(ride.hourlyPredictions, count).map((h) => ({
    ...h,
    formatted: formatHour(h.hour),
  }));
}

/**
 * Calculate total predicted wait time for a list of rides at their best times
 */
export function calculateOptimalTotalWait(rides: RideWithPredictions[]): number {
  return rides.reduce((total, ride) => {
    const bestHour = findOptimalHours(ride.hourlyPredictions, 1)[0];
    return total + (bestHour?.wait ?? 30);
  }, 0);
}

/**
 * Calculate average wait time if rides were done at a specific hour
 */
export function calculateWaitAtHour(
  rides: RideWithPredictions[],
  hour: number
): number {
  return rides.reduce((total, ride) => {
    return total + getPredictedWaitForHour(ride, hour);
  }, 0);
}

/**
 * Get wait time comparison between two hours
 */
export function compareHours(
  rides: RideWithPredictions[],
  hour1: number,
  hour2: number
): { hour1Total: number; hour2Total: number; savings: number } {
  const hour1Total = calculateWaitAtHour(rides, hour1);
  const hour2Total = calculateWaitAtHour(rides, hour2);

  return {
    hour1Total,
    hour2Total,
    savings: hour1Total - hour2Total,
  };
}
