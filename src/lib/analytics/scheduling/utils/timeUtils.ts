/**
 * Theme Park Schedule Optimizer - Time Utilities
 *
 * Functions for parsing, formatting, and manipulating time values.
 * All internal times are stored as minutes since midnight for easy math.
 */

import { PREDICTION_HOURS } from '../constants';

// =============================================================================
// TIME PARSING
// =============================================================================

/**
 * Parse a time string into minutes since midnight
 * Supports formats: "9:00 AM", "14:30", "2:30 PM", "9am", "9 AM"
 */
export function parseTimeToMinutes(timeString: string): number {
  if (!timeString) {
    return 0;
  }

  const normalized = timeString.trim().toLowerCase();

  // Try HH:MM AM/PM format
  const amPmMatch = normalized.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2] || '0', 10);
    const period = amPmMatch[3]?.toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  // Try just hours with AM/PM (e.g., "9am", "9 am")
  const hourOnlyMatch = normalized.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (hourOnlyMatch) {
    let hours = parseInt(hourOnlyMatch[1], 10);
    const period = hourOnlyMatch[2].toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return hours * 60;
  }

  // Try 24-hour format (e.g., "14:30")
  const militaryMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Try just a number (assume hours)
  const numberOnly = parseInt(normalized, 10);
  if (!isNaN(numberOnly) && numberOnly >= 0 && numberOnly <= 24) {
    return numberOnly * 60;
  }

  console.warn(`Could not parse time: "${timeString}", defaulting to 0`);
  return 0;
}

/**
 * Parse park hours object into minutes since midnight
 */
export function parseParkHours(parkHours: {
  openHour: number;
  openMinute?: number;
  closeHour: number;
  closeMinute?: number;
}): { open: number; close: number } {
  const open = parkHours.openHour * 60 + (parkHours.openMinute ?? 0);
  const close = parkHours.closeHour * 60 + (parkHours.closeMinute ?? 0);
  return { open, close };
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

/**
 * Format minutes since midnight to display string
 * @param minutes Minutes since midnight
 * @param format 'short' = "9:00 AM", 'long' = "9:00 AM", 'military' = "09:00"
 */
export function formatMinutesToTime(
  minutes: number,
  format: 'short' | 'long' | 'military' = 'short'
): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (format === 'military') {
    return `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const minsStr = mins.toString().padStart(2, '0');

  return `${hours12}:${minsStr} ${period}`;
}

/**
 * Format a duration in minutes to human-readable string
 * @param minutes Duration in minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format a time range for display
 */
export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinutesToTime(startMinutes)} - ${formatMinutesToTime(endMinutes)}`;
}

// =============================================================================
// TIME CALCULATIONS
// =============================================================================

/**
 * Get the hour (0-23) from minutes since midnight
 */
export function getHourFromMinutes(minutes: number): number {
  return Math.floor(minutes / 60);
}

/**
 * Get minutes within the hour from total minutes
 */
export function getMinutesWithinHour(minutes: number): number {
  return minutes % 60;
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(startMinutes: number, endMinutes: number): number {
  return Math.max(0, endMinutes - startMinutes);
}

/**
 * Check if a time falls within a range
 */
export function isTimeInRange(
  time: number,
  rangeStart: number,
  rangeEnd: number
): boolean {
  return time >= rangeStart && time <= rangeEnd;
}

/**
 * Check if two time ranges overlap
 */
export function doRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Get overlap duration between two time ranges
 * Returns 0 if no overlap
 */
export function getOverlapDuration(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): number {
  if (!doRangesOverlap(start1, end1, start2, end2)) {
    return 0;
  }
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return overlapEnd - overlapStart;
}

/**
 * Clamp a time to be within a range
 */
export function clampTime(time: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, time));
}

/**
 * Round time to nearest increment (default 5 minutes)
 */
export function roundToNearestIncrement(minutes: number, increment: number = 5): number {
  return Math.round(minutes / increment) * increment;
}

// =============================================================================
// PREDICTION HOUR UTILITIES
// =============================================================================

/**
 * Convert minutes since midnight to prediction array index
 * Predictions cover 9 AM - 9 PM (indices 0-12)
 */
export function minutesToPredictionIndex(minutes: number): number {
  const hour = getHourFromMinutes(minutes);
  return Math.max(0, Math.min(PREDICTION_HOURS.count - 1, hour - PREDICTION_HOURS.start));
}

/**
 * Convert prediction array index to hour of day
 */
export function predictionIndexToHour(index: number): number {
  return PREDICTION_HOURS.start + Math.max(0, Math.min(PREDICTION_HOURS.count - 1, index));
}

/**
 * Get predicted wait time for a specific minute from hourly predictions
 * Interpolates between hours for more accurate mid-hour predictions
 */
export function getInterpolatedWaitTime(
  minutes: number,
  hourlyPredictions: number[]
): number {
  const hour = getHourFromMinutes(minutes);
  const minutesFraction = getMinutesWithinHour(minutes) / 60;

  const currentIndex = minutesToPredictionIndex(minutes);
  const nextIndex = Math.min(currentIndex + 1, hourlyPredictions.length - 1);

  const currentWait = hourlyPredictions[currentIndex] ?? 30;
  const nextWait = hourlyPredictions[nextIndex] ?? currentWait;

  // Linear interpolation between hours
  return Math.round(currentWait + (nextWait - currentWait) * minutesFraction);
}

/**
 * Find the hour with the lowest predicted wait time
 */
export function findOptimalPredictionHour(hourlyPredictions: number[]): {
  hour: number;
  index: number;
  wait: number;
} {
  let minIndex = 0;
  let minWait = hourlyPredictions[0] ?? Infinity;

  for (let i = 1; i < hourlyPredictions.length; i++) {
    const wait = hourlyPredictions[i];
    if (wait !== undefined && wait < minWait) {
      minWait = wait;
      minIndex = i;
    }
  }

  return {
    hour: predictionIndexToHour(minIndex),
    index: minIndex,
    wait: minWait,
  };
}

/**
 * Find the hour with the lowest predicted wait time WITHIN a constrained time window
 * Used for park hopper mode to find optimal times for Park 2 rides
 *
 * @param hourlyPredictions 13-hour array of predicted wait times (9am-9pm)
 * @param earliestTime Earliest allowed time in minutes since midnight
 * @param latestTime Latest allowed time in minutes since midnight
 */
export function findOptimalPredictionHourInWindow(
  hourlyPredictions: number[],
  earliestTime: number,
  latestTime: number
): {
  hour: number;
  index: number;
  wait: number;
} | null {
  // Convert time boundaries to valid hour range
  const earliestHour = Math.max(PREDICTION_HOURS.start, Math.ceil(earliestTime / 60));
  const latestHour = Math.min(PREDICTION_HOURS.end, Math.floor(latestTime / 60));

  if (earliestHour > latestHour) {
    return null; // No valid hours in window
  }

  let minIndex = -1;
  let minWait = Infinity;

  for (let hour = earliestHour; hour <= latestHour; hour++) {
    const index = hour - PREDICTION_HOURS.start;
    if (index < 0 || index >= hourlyPredictions.length) continue;

    const wait = hourlyPredictions[index];
    if (wait !== undefined && wait < minWait) {
      minWait = wait;
      minIndex = index;
    }
  }

  if (minIndex === -1) {
    return null;
  }

  return {
    hour: predictionIndexToHour(minIndex),
    index: minIndex,
    wait: minWait,
  };
}

/**
 * Find the hour with the highest predicted wait time
 */
export function findPeakPredictionHour(hourlyPredictions: number[]): {
  hour: number;
  index: number;
  wait: number;
} {
  let maxIndex = 0;
  let maxWait = hourlyPredictions[0] ?? 0;

  for (let i = 1; i < hourlyPredictions.length; i++) {
    const wait = hourlyPredictions[i];
    if (wait !== undefined && wait > maxWait) {
      maxWait = wait;
      maxIndex = i;
    }
  }

  return {
    hour: predictionIndexToHour(maxIndex),
    index: maxIndex,
    wait: maxWait,
  };
}

/**
 * Calculate the "savings delta" for a ride
 * This is the difference between peak wait and optimal wait
 * Used for rope drop prioritization
 */
export function calculateSavingsDelta(hourlyPredictions: number[]): number {
  const optimal = findOptimalPredictionHour(hourlyPredictions);
  const peak = findPeakPredictionHour(hourlyPredictions);
  return peak.wait - optimal.wait;
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get the day of week name
 */
export function getDayOfWeekName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
