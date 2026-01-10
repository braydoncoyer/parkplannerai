// Park Hours Service - Fetches operating hours from ThemeParks.wiki API

/**
 * Mapping between Queue-Times park IDs and ThemeParks.wiki UUIDs
 */
export const PARK_ID_MAPPING: Record<number, string> = {
  // Walt Disney World
  6: '75ea578a-adc8-4116-a54d-dccb60765ef9',   // Magic Kingdom
  5: '47f90d2c-e191-4239-a466-5892ef59a88b',   // EPCOT
  7: '288747d1-8b4f-4a64-867e-ea7c9b27bad8',   // Hollywood Studios
  8: '1c84a229-8862-4648-9c71-378ddd2c7693',   // Animal Kingdom
  // Disneyland Resort
  16: '7340550b-c14d-4def-80bb-acdb51d49a66',  // Disneyland
  17: '832fcd51-ea19-4e77-85c7-75d5843b127c',  // Disney California Adventure
  // Universal Orlando
  64: '267615cc-8943-4c2a-ae2c-5da728ca591f',  // Islands of Adventure
  65: 'eb3f4560-2383-4a36-9152-6b3e5ed6bc57',  // Universal Studios Florida
  334: '12dbb85b-265f-44e6-bccf-f1faa17211fc', // Epic Universe
  // Universal Hollywood
  66: 'bc4005c5-8c7e-41d7-b349-cdddf1796427',  // Universal Studios Hollywood
};

export interface ParkSchedule {
  date: string;
  openingTime: string; // ISO 8601
  closingTime: string; // ISO 8601
  type: 'OPERATING' | 'EXTRA_HOURS' | string;
}

export interface ParkHours {
  parkId: number;
  parkName: string;
  date: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
  hasExtendedHours: boolean;
  extendedCloseHour?: number;
  extendedCloseMinute?: number;
}

interface ThemeParksScheduleResponse {
  schedule: ParkSchedule[];
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
 * Parse ISO timestamp to hour and minute in the PARK'S timezone
 * (extracts time directly from ISO string to avoid user timezone conversion)
 *
 * ISO format: "2026-01-10T22:00:00-05:00"
 * We want to extract 22:00 as the park's local time, not convert to user's timezone
 */
function parseISOTime(isoString: string): { hour: number; minute: number } {
  // Extract the time portion directly from the ISO string (before timezone offset)
  // Format: YYYY-MM-DDTHH:MM:SS-TZ:TZ
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);

  if (timeMatch) {
    return {
      hour: parseInt(timeMatch[1], 10),
      minute: parseInt(timeMatch[2], 10),
    };
  }

  // Fallback to Date parsing if regex fails (shouldn't happen with valid ISO)
  const date = new Date(isoString);
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/**
 * Get ThemeParks.wiki UUID for a Queue-Times park ID
 */
export function getThemeParkWikiId(queueTimesId: number): string | null {
  return PARK_ID_MAPPING[queueTimesId] || null;
}

/**
 * Fetch park schedule from ThemeParks.wiki API
 */
export async function fetchParkSchedule(
  queueTimesId: number,
  targetDate?: Date
): Promise<ParkHours | null> {
  const themeParkId = getThemeParkWikiId(queueTimesId);

  if (!themeParkId) {
    console.warn(`No ThemeParks.wiki mapping for park ID: ${queueTimesId}`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themeparks.wiki/v1/entity/${themeParkId}/schedule`
    );

    if (!response.ok) {
      throw new Error(`ThemeParks.wiki API error: ${response.status}`);
    }

    const data: ThemeParksScheduleResponse = await response.json();

    // Target date in YYYY-MM-DD format
    const dateToFind = targetDate
      ? targetDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Find operating schedule for the target date
    const operatingSchedule = data.schedule.find(
      (s) => s.date === dateToFind && s.type === 'OPERATING'
    );

    // Find extended hours if available
    const extendedSchedule = data.schedule.find(
      (s) => s.date === dateToFind && s.type === 'EXTRA_HOURS'
    );

    if (!operatingSchedule) {
      console.warn(`No operating schedule found for date: ${dateToFind}`);
      return null;
    }

    const openTime = parseISOTime(operatingSchedule.openingTime);
    const closeTime = parseISOTime(operatingSchedule.closingTime);

    const parkHours: ParkHours = {
      parkId: queueTimesId,
      parkName: getParkName(queueTimesId),
      date: dateToFind,
      openHour: openTime.hour,
      openMinute: openTime.minute,
      closeHour: closeTime.hour,
      closeMinute: closeTime.minute,
      openingTimeFormatted: formatTimeDisplay(openTime.hour, openTime.minute),
      closingTimeFormatted: formatTimeDisplay(closeTime.hour, closeTime.minute),
      hasExtendedHours: !!extendedSchedule,
    };

    // Add extended hours if available
    if (extendedSchedule) {
      const extendedClose = parseISOTime(extendedSchedule.closingTime);
      parkHours.extendedCloseHour = extendedClose.hour;
      parkHours.extendedCloseMinute = extendedClose.minute;
    }

    return parkHours;
  } catch (error) {
    console.error(`Error fetching park schedule for ID ${queueTimesId}:`, error);
    return null;
  }
}

/**
 * Get park name from Queue-Times ID
 */
function getParkName(queueTimesId: number): string {
  const names: Record<number, string> = {
    // Walt Disney World
    6: 'Magic Kingdom',
    5: 'EPCOT',
    7: "Disney's Hollywood Studios",
    8: "Disney's Animal Kingdom",
    // Disneyland Resort
    16: 'Disneyland',
    17: 'Disney California Adventure',
    // Universal Orlando
    64: 'Islands of Adventure',
    65: 'Universal Studios Florida',
    334: 'Epic Universe',
    // Universal Hollywood
    66: 'Universal Studios Hollywood',
  };
  return names[queueTimesId] || 'Unknown Park';
}

/**
 * Get default park hours when API is unavailable
 */
export function getDefaultParkHours(queueTimesId: number): ParkHours {
  // Default hours by park type
  // WDW: 5, 6, 7, 8 | Disneyland Resort: 16, 17
  const isDisney = [5, 6, 7, 8, 16, 17].includes(queueTimesId);

  return {
    parkId: queueTimesId,
    parkName: getParkName(queueTimesId),
    date: new Date().toISOString().split('T')[0],
    openHour: 9,
    openMinute: 0,
    closeHour: isDisney ? 21 : 22, // Disney typically 9 PM, Universal 10 PM
    closeMinute: 0,
    openingTimeFormatted: '9:00 AM',
    closingTimeFormatted: isDisney ? '9:00 PM' : '10:00 PM',
    hasExtendedHours: false,
  };
}

/**
 * Fetch park hours with fallback to defaults
 */
export async function getParkHours(
  queueTimesId: number,
  targetDate?: Date
): Promise<ParkHours> {
  const hours = await fetchParkSchedule(queueTimesId, targetDate);
  return hours || getDefaultParkHours(queueTimesId);
}
