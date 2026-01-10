// Entertainment Service - Fetches show times from ThemeParks.wiki API
// Provides fireworks, parades, and nighttime spectacular schedules

import { PARK_ID_MAPPING } from './parkHours';

export interface ShowTime {
  startTime: string; // ISO 8601
  endTime?: string;
  type: 'Performance' | 'Operating';
}

export interface Entertainment {
  id: string;
  name: string;
  entityType: 'SHOW' | 'ATTRACTION';
  status: 'OPERATING' | 'CLOSED' | 'DOWN';
  showTimes: ShowTime[];
  isNighttime: boolean;
  isParade: boolean;
  isFireworks: boolean;
  priority: 'must-see' | 'recommended' | 'optional';
}

export interface ParkEntertainment {
  parkId: number;
  parkName: string;
  date: string;
  entertainment: Entertainment[];
  nighttimeSpectacular: Entertainment | null;
  parade: Entertainment | null;
}

// Keywords to identify nighttime spectaculars
const NIGHTTIME_KEYWORDS = [
  'fireworks', 'happily ever after', 'luminous', 'harmonious',
  'fantasmic', 'world of color', 'illuminations', 'epcot forever',
  'starlight', 'enchantment', 'cinematic celebration'
];

// Keywords to identify parades
const PARADE_KEYWORDS = [
  'parade', 'cavalcade', 'festival of fantasy', 'magic happens',
  'boo to you', 'once upon a christmastime', 'electrical parade'
];

// Must-see entertainment by name (case-insensitive partial match)
const MUST_SEE_ENTERTAINMENT = [
  'fantasmic', 'world of color', 'happily ever after', 'luminous',
  'festival of fantasy', 'magic happens', 'cinematic celebration'
];

/**
 * Check if entertainment is a nighttime spectacular
 */
function isNighttimeShow(name: string, showTimes: ShowTime[]): boolean {
  const lowerName = name.toLowerCase();

  // Check name keywords
  if (NIGHTTIME_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return true;
  }

  // Check if all show times are after 7 PM
  if (showTimes.length > 0) {
    const allEvening = showTimes.every(st => {
      const hour = new Date(st.startTime).getHours();
      return hour >= 19; // 7 PM or later
    });
    if (allEvening) return true;
  }

  return false;
}

/**
 * Check if entertainment is a parade
 */
function isParade(name: string): boolean {
  const lowerName = name.toLowerCase();
  return PARADE_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Determine entertainment priority
 */
function getEntertainmentPriority(name: string): Entertainment['priority'] {
  const lowerName = name.toLowerCase();
  if (MUST_SEE_ENTERTAINMENT.some(keyword => lowerName.includes(keyword))) {
    return 'must-see';
  }
  if (isNighttimeShow(name, []) || isParade(name)) {
    return 'recommended';
  }
  return 'optional';
}

/**
 * Parse show times from API response
 */
function parseShowTimes(showtimes: Array<{ startTime?: string; endTime?: string; type?: string }>): ShowTime[] {
  return showtimes
    .filter(st => st.startTime)
    .map(st => ({
      startTime: st.startTime!,
      endTime: st.endTime,
      type: (st.type as ShowTime['type']) || 'Performance',
    }));
}

/**
 * Format show time for display (e.g., "9:00 PM")
 */
export function formatShowTime(isoString: string): string {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Fetch entertainment schedule from ThemeParks.wiki API
 */
export async function fetchParkEntertainment(
  queueTimesId: number,
  targetDate?: Date
): Promise<ParkEntertainment | null> {
  const themeParkId = PARK_ID_MAPPING[queueTimesId];

  if (!themeParkId) {
    console.warn(`No ThemeParks.wiki mapping for park ID: ${queueTimesId}`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themeparks.wiki/v1/entity/${themeParkId}/live`
    );

    if (!response.ok) {
      throw new Error(`ThemeParks.wiki API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter for shows and entertainment
    const entertainmentItems: Entertainment[] = [];
    let nighttimeSpectacular: Entertainment | null = null;
    let parade: Entertainment | null = null;

    const dateToFind = targetDate
      ? targetDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    for (const item of data.liveData || []) {
      // Only process shows with showtimes
      if (item.entityType !== 'SHOW' || !item.showtimes?.length) continue;

      // Filter showtimes for the target date
      const relevantShowtimes = item.showtimes.filter((st: { startTime?: string }) => {
        if (!st.startTime) return false;
        const showDate = st.startTime.split('T')[0];
        return showDate === dateToFind;
      });

      if (relevantShowtimes.length === 0) continue;

      const showTimes = parseShowTimes(relevantShowtimes);
      const isNighttime = isNighttimeShow(item.name, showTimes);
      const isParadeShow = isParade(item.name);

      const entertainment: Entertainment = {
        id: item.id,
        name: item.name,
        entityType: item.entityType,
        status: item.status || 'OPERATING',
        showTimes,
        isNighttime,
        isParade: isParadeShow,
        isFireworks: item.name.toLowerCase().includes('firework') ||
                     item.name.toLowerCase().includes('happily ever after') ||
                     item.name.toLowerCase().includes('luminous'),
        priority: getEntertainmentPriority(item.name),
      };

      entertainmentItems.push(entertainment);

      // Track primary nighttime spectacular
      if (isNighttime && entertainment.priority === 'must-see' && !nighttimeSpectacular) {
        nighttimeSpectacular = entertainment;
      }

      // Track primary parade
      if (isParadeShow && entertainment.priority === 'must-see' && !parade) {
        parade = entertainment;
      }
    }

    return {
      parkId: queueTimesId,
      parkName: getParkName(queueTimesId),
      date: dateToFind,
      entertainment: entertainmentItems,
      nighttimeSpectacular,
      parade,
    };
  } catch (error) {
    console.error(`Error fetching entertainment for park ID ${queueTimesId}:`, error);
    return null;
  }
}

/**
 * Get park name from Queue-Times ID
 */
function getParkName(queueTimesId: number): string {
  const names: Record<number, string> = {
    6: 'Magic Kingdom',
    5: 'EPCOT',
    7: "Disney's Hollywood Studios",
    8: "Disney's Animal Kingdom",
    16: 'Disneyland',
    17: 'Disney California Adventure',
    64: 'Islands of Adventure',
    65: 'Universal Studios Florida',
    334: 'Epic Universe',
    66: 'Universal Studios Hollywood',
  };
  return names[queueTimesId] || 'Unknown Park';
}

/**
 * Get fallback entertainment for parks when API data is unavailable
 * These are typical show times that can be used as defaults
 */
export function getDefaultEntertainment(queueTimesId: number): Partial<ParkEntertainment> {
  const defaults: Record<number, { nighttime?: Partial<Entertainment>; parade?: Partial<Entertainment> }> = {
    // Magic Kingdom
    6: {
      nighttime: {
        name: 'Happily Ever After',
        isNighttime: true,
        isFireworks: true,
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }], // 9 PM typical
      },
      parade: {
        name: 'Festival of Fantasy Parade',
        isParade: true,
        priority: 'must-see',
        showTimes: [{ startTime: '15:00', type: 'Performance' }], // 3 PM typical
      },
    },
    // EPCOT
    5: {
      nighttime: {
        name: 'Luminous',
        isNighttime: true,
        isFireworks: true,
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }],
      },
    },
    // Hollywood Studios
    7: {
      nighttime: {
        name: 'Fantasmic!',
        isNighttime: true,
        priority: 'must-see',
        showTimes: [{ startTime: '20:00', type: 'Performance' }, { startTime: '21:30', type: 'Performance' }],
      },
    },
    // Animal Kingdom
    8: {
      // No regular nighttime spectacular currently
    },
    // Disneyland
    16: {
      nighttime: {
        name: 'Fantasmic!',
        isNighttime: true,
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }, { startTime: '22:30', type: 'Performance' }],
      },
    },
    // DCA
    17: {
      nighttime: {
        name: 'World of Color',
        isNighttime: true,
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }],
      },
    },
  };

  return {
    parkId: queueTimesId,
    parkName: getParkName(queueTimesId),
    nighttimeSpectacular: defaults[queueTimesId]?.nighttime as Entertainment | undefined,
    parade: defaults[queueTimesId]?.parade as Entertainment | undefined,
  };
}
