/**
 * Shared park status utility
 * Provides consistent open/closed logic for both Dashboard and Park Detail pages
 */

/**
 * Minimal park hours interface for status calculation
 * This allows both the full ParkHours from API and the simplified version from components
 */
export interface ParkHoursInput {
  timezone?: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
}

/**
 * Default timezone mapping for parks
 */
export const PARK_TIMEZONES: Record<number, string> = {
  // Walt Disney World (Orlando) - Eastern
  5: 'America/New_York',
  6: 'America/New_York',
  7: 'America/New_York',
  8: 'America/New_York',
  // Universal Orlando - Eastern
  64: 'America/New_York',
  65: 'America/New_York',
  334: 'America/New_York',
  // Disneyland Resort (Anaheim) - Pacific
  16: 'America/Los_Angeles',
  17: 'America/Los_Angeles',
  // Universal Hollywood - Pacific
  66: 'America/Los_Angeles',
};

export interface ParkStatusResult {
  /** Whether the park is currently open */
  isOpen: boolean;
  /** Whether the park is currently closed */
  isClosed: boolean;
  /** Current time formatted for display (e.g., "7:30 AM") */
  currentTime: string;
  /** Opening time formatted for display (e.g., "9:00 AM") */
  opensAt: string;
  /** Closing time formatted for display (e.g., "10:00 PM") */
  closesAt: string;
  /** Park timezone */
  timezone: string;
}

/**
 * Format hour and minute to display string (e.g., "9:00 AM")
 */
function formatTimeDisplay(hour: number, minute: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${h}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get current time in a specific timezone
 */
function getCurrentTimeInTimezone(timezone: string): {
  hour: number;
  minute: number;
  formatted: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  return {
    hour,
    minute,
    formatted: formatTimeDisplay(hour, minute),
  };
}

/**
 * Check if a park is currently open based on its operating hours and ride status.
 * This is the unified logic used by both the Dashboard API and Park Detail page.
 *
 * @param hours - Park hours data (should always be provided - use getParkHours() which has fallback)
 * @param parkId - The park ID (used for timezone lookup if not in hours)
 * @param ridesOpen - Number of rides currently reporting as open
 * @returns Park status with open/closed state and display information
 */
export function getParkStatus(
  hours: ParkHoursInput | null,
  parkId: number,
  ridesOpen: number
): ParkStatusResult {
  const timezone = hours?.timezone || PARK_TIMEZONES[parkId] || 'America/New_York';
  const currentTime = getCurrentTimeInTimezone(timezone);
  const currentTimeMinutes = currentTime.hour * 60 + currentTime.minute;

  // Default values for display
  const opensAt = hours?.openingTimeFormatted || '9:00 AM';
  const closesAt = hours?.closingTimeFormatted || '9:00 PM';

  // If no rides are reporting data, consider the park closed
  // This handles cases where the API returns no ride data or all rides are closed
  if (ridesOpen === 0) {
    return {
      isOpen: false,
      isClosed: true,
      currentTime: currentTime.formatted,
      opensAt,
      closesAt,
      timezone,
    };
  }

  // If we have hours data, use time-based check
  if (hours) {
    const openTimeMinutes = hours.openHour * 60 + hours.openMinute;
    let closeTimeMinutes = hours.closeHour * 60 + hours.closeMinute;

    // Handle closing times past midnight (e.g., 1 AM = 25:00 conceptually)
    if (closeTimeMinutes < openTimeMinutes) {
      closeTimeMinutes += 24 * 60;
    }

    // Adjust current time if we're past midnight but before close
    let adjustedCurrentTime = currentTimeMinutes;
    if (currentTimeMinutes < openTimeMinutes && closeTimeMinutes > 24 * 60) {
      adjustedCurrentTime += 24 * 60;
    }

    const isWithinOperatingHours =
      adjustedCurrentTime >= openTimeMinutes && adjustedCurrentTime < closeTimeMinutes;

    return {
      isOpen: isWithinOperatingHours,
      isClosed: !isWithinOperatingHours,
      currentTime: currentTime.formatted,
      opensAt,
      closesAt,
      timezone,
    };
  }

  // Fallback: no hours data but rides are open - assume park is open
  // (ridesOpen === 0 is already handled above, so we know rides are reporting data)
  return {
    isOpen: true,
    isClosed: false,
    currentTime: currentTime.formatted,
    opensAt,
    closesAt,
    timezone,
  };
}

/**
 * Simple boolean check for park open status.
 * Use this when you only need the boolean result and don't need display info.
 *
 * @param hours - Park hours data
 * @param parkId - The park ID
 * @param ridesOpen - Number of rides currently reporting as open
 * @returns true if park is open, false otherwise
 */
export function isParkCurrentlyOpen(
  hours: ParkHoursInput | null,
  parkId: number,
  ridesOpen: number
): boolean {
  return getParkStatus(hours, parkId, ridesOpen).isOpen;
}
