// Time Utility Functions

/**
 * Format hour and minute to display string (e.g., "9:30 AM")
 */
export function formatTime(hour: number, minute: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${h}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse arrival time string to hour number
 */
export function parseArrivalTime(arrivalTime: string): number {
  if (arrivalTime === 'rope-drop') return 9;

  // Handle formats like "9am", "10am", "1pm"
  const match = arrivalTime.match(/(\d+)(am|pm)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const period = match[2]?.toLowerCase();

    if (period === 'pm' && hour < 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    return hour;
  }

  return 9; // Default to 9am
}

/**
 * Default park closing hour (10 PM)
 */
export const DEFAULT_PARK_CLOSE_HOUR = 22;

/**
 * Calculate departure hour based on duration preference
 * Full day extends to park closing (10 PM), half day is 5-6 hours
 */
export function calculateDepartureHour(
  arrivalHour: number,
  duration: 'half-day' | 'full-day',
  parkCloseHour: number = DEFAULT_PARK_CLOSE_HOUR
): number {
  if (duration === 'half-day') {
    // Half day is 5-6 hours from arrival, but cap at park closing
    return Math.min(arrivalHour + 6, parkCloseHour);
  }
  // Full day extends to park closing (typically 10 PM)
  return parkCloseHour;
}

/**
 * Add minutes to a time and return new hour/minute
 */
export function addMinutes(
  hour: number,
  minute: number,
  minutesToAdd: number
): { hour: number; minute: number } {
  let newMinute = minute + minutesToAdd;
  let newHour = hour;

  while (newMinute >= 60) {
    newMinute -= 60;
    newHour++;
  }

  while (newMinute < 0) {
    newMinute += 60;
    newHour--;
  }

  return { hour: newHour, minute: newMinute };
}

/**
 * Calculate total minutes between two times
 */
export function minutesBetween(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): number {
  return (endHour - startHour) * 60 + (endMinute - startMinute);
}

/**
 * Check if a time is within park hours (9am - 10pm typically)
 */
export function isWithinParkHours(
  hour: number,
  openHour: number = 9,
  closeHour: number = 22
): boolean {
  return hour >= openHour && hour < closeHour;
}

/**
 * Get the current hour (for live adjustments)
 */
export function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Sum an array of numbers
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

/**
 * Calculate average of an array of numbers
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}

/**
 * Find max value in array
 */
export function max(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}

/**
 * Find min value in array
 */
export function min(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.min(...numbers);
}
