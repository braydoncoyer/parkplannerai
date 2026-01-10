// Smart Break Scheduler
// Suggests breaks when popular rides are at peak AND smaller rides aren't optimal

import type {
  RideWithPredictions,
  BreakAnalysis,
  BreakType,
  ScheduledBreak,
} from '../types';
import { getPredictedWaitForHour } from '../prediction/waitTimePredictor';
import { average, sum, formatTime } from '../utils/timeUtils';
import { formatBreakSuggestion, getLandActivities } from '../data/landActivities';

/**
 * Analyze if a break should be taken at the current hour
 *
 * SMART BREAK LOGIC:
 * Both conditions must be met:
 * 1. Headliner rides are at 80%+ of their daily peak wait time
 * 2. Smaller selected rides are also above their daily average (not optimal)
 */
export function analyzeBreakOpportunity(
  remainingRides: RideWithPredictions[],
  currentHour: number,
  includeBreaks: boolean,
  currentLand: string | null = null
): BreakAnalysis {
  // Default: no break
  const noBreak: BreakAnalysis = {
    shouldBreak: false,
    reason: '',
    breakType: 'snack',
    breakDuration: 0,
    resumeAtHour: currentHour,
    waitTimeSavings: 0,
    suggestion: '',
  };

  if (!includeBreaks || remainingRides.length === 0) {
    return { ...noBreak, reason: 'Breaks disabled or no remaining rides' };
  }

  // Separate rides by popularity
  const headliners = remainingRides.filter((r) => r.popularity === 'headliner');
  const others = remainingRides.filter((r) => r.popularity !== 'headliner');

  // If no headliners, use "popular" rides as the reference
  const priorityRides = headliners.length > 0 ? headliners :
    remainingRides.filter((r) => r.popularity === 'popular');
  const secondaryRides = headliners.length > 0 ? others :
    remainingRides.filter((r) => r.popularity !== 'popular');

  // If we don't have both groups, can't do smart analysis
  if (priorityRides.length === 0 || secondaryRides.length === 0) {
    return { ...noBreak, reason: 'Not enough ride variety for smart break analysis' };
  }

  // CONDITION 1: Check if headliner/priority rides are at peak (>= 80% of max)
  const headlinerAtPeak = priorityRides.some((ride) => {
    const currentWait = getPredictedWaitForHour(ride, currentHour);
    const maxWait = Math.max(...ride.hourlyPredictions);
    return currentWait >= maxWait * 0.8;
  });

  if (!headlinerAtPeak) {
    return {
      ...noBreak,
      reason: 'Priority rides not at peak - good time to ride them',
    };
  }

  // CONDITION 2: Check if smaller rides are NOT optimal (above average)
  const othersNotOptimal = secondaryRides.every((ride) => {
    const currentWait = getPredictedWaitForHour(ride, currentHour);
    const avgWait = average(ride.hourlyPredictions);
    return currentWait >= avgWait;
  });

  if (!othersNotOptimal) {
    // Some smaller rides have good wait times - do those instead
    const optimalSmallRides = secondaryRides.filter((ride) => {
      const currentWait = getPredictedWaitForHour(ride, currentHour);
      const avgWait = average(ride.hourlyPredictions);
      return currentWait < avgWait;
    });

    return {
      ...noBreak,
      reason: `${optimalSmallRides.length} smaller ride(s) have below-average waits now`,
    };
  }

  // BOTH CONDITIONS MET - Find optimal break window

  // Look 1-2 hours ahead for better times
  let bestResumeHour = currentHour;
  let maxSavings = 0;

  for (let futureHour = currentHour + 1; futureHour <= currentHour + 2; futureHour++) {
    if (futureHour > 21) break; // Park typically closes around 10pm

    const currentTotalWait = sum(
      remainingRides.map((r) => getPredictedWaitForHour(r, currentHour))
    );
    const futureTotalWait = sum(
      remainingRides.map((r) => getPredictedWaitForHour(r, futureHour))
    );
    const savings = currentTotalWait - futureTotalWait;

    if (savings > maxSavings) {
      maxSavings = savings;
      bestResumeHour = futureHour;
    }
  }

  const breakDuration = (bestResumeHour - currentHour) * 60;

  // Only recommend break if time savings justify it
  // Rule: Savings should be at least 50% of break duration
  if (maxSavings < breakDuration * 0.5) {
    return {
      ...noBreak,
      reason: `Wait time savings (${Math.round(maxSavings)} min) don't justify ${breakDuration} min break`,
    };
  }

  // Determine break type based on time of day
  const breakType = determineBreakType(currentHour, Math.min(breakDuration, 60));

  // Generate suggestion with land-specific activities
  const suggestion = currentLand
    ? formatBreakSuggestion(breakType, currentLand, currentHour)
    : getBreakSuggestion(breakType, currentHour);

  // Generate detailed reason
  const headlinerNames = priorityRides.map((r) => r.name).slice(0, 2).join(', ');
  const avgHeadlinerWait = Math.round(
    average(priorityRides.map((r) => getPredictedWaitForHour(r, currentHour)))
  );

  return {
    shouldBreak: true,
    reason: `${headlinerNames} extremely busy (~${avgHeadlinerWait} min). All selected rides have above-average waits. Break saves ~${Math.round(maxSavings)} min total.`,
    breakType,
    breakDuration: Math.min(breakDuration, 60), // Cap at 60 minutes
    resumeAtHour: bestResumeHour,
    waitTimeSavings: Math.round(maxSavings),
    suggestion,
  };
}

/**
 * Determine the type of break based on time of day
 */
export function determineBreakType(hour: number, duration: number): BreakType {
  // Lunch time (11am - 1pm)
  if (hour >= 11 && hour <= 13) {
    return duration >= 30 ? 'meal' : 'snack';
  }

  // Dinner time (5pm - 7pm)
  if (hour >= 17 && hour <= 19) {
    return duration >= 30 ? 'meal' : 'snack';
  }

  // Afternoon rest (2pm - 4pm)
  if (hour >= 14 && hour <= 16) {
    return 'rest';
  }

  // Default to snack
  return 'snack';
}

/**
 * Get a suggestion for what to do during the break
 */
export function getBreakSuggestion(breakType: BreakType, hour: number): string {
  switch (breakType) {
    case 'meal':
      if (hour >= 11 && hour <= 13) {
        return 'Great time for lunch! Crowds will ease by the time you finish.';
      }
      return 'Perfect time for dinner while peak crowds thin out.';

    case 'rest':
      return 'Take a rest - find some shade or AC. The afternoon heat brings out peak crowds.';

    case 'snack':
      return 'Grab a snack and hydrate. Wait times will improve soon.';

    default:
      return 'Take a break and recharge.';
  }
}

/**
 * Create a scheduled break item for the itinerary
 */
export function createScheduledBreak(
  analysis: BreakAnalysis,
  startHour: number,
  startMinute: number
): ScheduledBreak {
  const endMinutes = startMinute + analysis.breakDuration;
  const endHour = startHour + Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;

  const breakNames: Record<BreakType, string> = {
    meal: startHour >= 17 ? 'Dinner Break' : 'Lunch Break',
    snack: 'Snack Break',
    rest: 'Rest Break',
  };

  return {
    type: analysis.breakType,
    startTime: formatTime(startHour, startMinute),
    endTime: formatTime(endHour, endMinute),
    duration: analysis.breakDuration,
    reason: analysis.reason,
    suggestion: analysis.suggestion,
    waitTimeSavings: analysis.waitTimeSavings,
  };
}

/**
 * Check if it's been long enough since the last break
 * (Don't suggest breaks too frequently)
 */
export function shouldConsiderBreak(
  minutesSinceLastBreak: number,
  ridesCompletedSinceBreak: number
): boolean {
  // At least 90 minutes or 3 rides since last break
  return minutesSinceLastBreak >= 90 || ridesCompletedSinceBreak >= 3;
}
