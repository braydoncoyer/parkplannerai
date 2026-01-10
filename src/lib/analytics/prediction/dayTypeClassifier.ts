// Day Type Classifier
// Determines if a date is weekday, weekend, or holiday

import type { DayType } from '../types';

/**
 * US Federal Holidays for 2025-2026
 * Format: YYYY-MM-DD
 */
const US_HOLIDAYS = [
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents Day
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-27', // Thanksgiving
  '2025-11-28', // Day after Thanksgiving
  '2025-12-24', // Christmas Eve
  '2025-12-25', // Christmas Day
  '2025-12-31', // New Year's Eve
  // 2026
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents Day
  '2026-05-25', // Memorial Day
  '2026-07-03', // Independence Day (observed)
  '2026-07-04', // Independence Day
  '2026-09-07', // Labor Day
  '2026-10-12', // Columbus Day
  '2026-11-26', // Thanksgiving
  '2026-11-27', // Day after Thanksgiving
  '2026-12-24', // Christmas Eve
  '2026-12-25', // Christmas Day
  '2026-12-31', // New Year's Eve
];

/**
 * Peak season periods (school breaks, etc.)
 * These dates experience weekend-level crowds even on weekdays
 * Format: { start: 'MM-DD', end: 'MM-DD' }
 */
const PEAK_PERIODS = [
  { start: '03-10', end: '04-20' }, // Spring break season
  { start: '06-01', end: '08-20' }, // Summer vacation
  { start: '11-20', end: '12-01' }, // Thanksgiving week
  { start: '12-18', end: '01-05' }, // Winter holidays / Christmas-New Year
];

/**
 * Check if a date falls within a date range (ignoring year)
 */
function isDateInRange(mmdd: string, start: string, end: string): boolean {
  // Handle year wrap-around (e.g., Dec 18 - Jan 5)
  if (start > end) {
    return mmdd >= start || mmdd <= end;
  }
  return mmdd >= start && mmdd <= end;
}

/**
 * Classify a date as weekday, weekend, or holiday
 */
export function classifyDayType(date: Date | string): DayType {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
  const mmdd = dateStr.slice(5); // 'MM-DD'

  // Check if it's a federal holiday
  if (US_HOLIDAYS.includes(dateStr)) {
    return 'holiday';
  }

  // Check if it's in a peak period
  const isPeakPeriod = PEAK_PERIODS.some((period) =>
    isDateInRange(mmdd, period.start, period.end)
  );

  if (isPeakPeriod) {
    // During peak periods:
    // - Weekends become holiday-level
    // - Weekdays become weekend-level
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'holiday';
    }
    return 'weekend';
  }

  // Regular weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'weekend';
  }

  return 'weekday';
}

/**
 * Get a human-readable description of the day type
 */
export function getDayTypeDescription(date: Date | string): string {
  const dayType = classifyDayType(date);
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

  switch (dayType) {
    case 'holiday':
      return `${dayName} (Holiday - Expect very high crowds)`;
    case 'weekend':
      return `${dayName} (Weekend - Expect high crowds)`;
    case 'weekday':
      return `${dayName} (Weekday - Expect moderate crowds)`;
    default:
      return dayName;
  }
}

/**
 * Get crowd level multiplier for display purposes
 */
export function getCrowdMultiplierForDayType(dayType: DayType): number {
  switch (dayType) {
    case 'holiday':
      return 1.5;
    case 'weekend':
      return 1.2;
    case 'weekday':
      return 1.0;
    default:
      return 1.0;
  }
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toISOString().split('T')[0];
  return US_HOLIDAYS.includes(dateStr);
}

/**
 * Check if a specific date is in a peak period
 */
export function isPeakPeriod(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const mmdd = d.toISOString().split('T')[0].slice(5);
  return PEAK_PERIODS.some((period) =>
    isDateInRange(mmdd, period.start, period.end)
  );
}
