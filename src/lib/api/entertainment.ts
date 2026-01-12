// Entertainment Service - Fetches show times from ThemeParks.wiki API
// Provides fireworks, parades, and nighttime spectacular schedules

import { PARK_ID_MAPPING } from './parkHours';

export interface ShowTime {
  startTime: string; // ISO 8601
  endTime?: string;
  type: 'Performance' | 'Operating';
}

export type EntertainmentCategory =
  | 'fireworks'      // Pyrotechnic shows (Happily Ever After, Wondrous Journeys)
  | 'water-show'     // Water/projection shows (World of Color, Fantasmic!)
  | 'parade'         // Parades (Magic Happens, Festival of Fantasy)
  | 'projection'     // Castle projections, light shows
  | 'stage-show'     // Stage performances
  | 'character'      // Character experiences, cavalcades
  | 'other';         // Other entertainment

export interface Entertainment {
  id: string;
  name: string;
  entityType: 'SHOW' | 'ATTRACTION';
  status: 'OPERATING' | 'CLOSED' | 'DOWN';
  showTimes: ShowTime[];
  isNighttime: boolean;
  isParade: boolean;
  isFireworks: boolean;
  category: EntertainmentCategory;
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

// Keywords to identify fireworks shows (pyrotechnic)
const FIREWORKS_KEYWORDS = [
  'fireworks', 'happily ever after', 'luminous', 'wondrous journeys',
  'enchantment', 'harmonious', 'epcot forever', 'illuminations',
  'remember... dreams come true', 'wishes'
];

// Keywords to identify water/projection shows
const WATER_SHOW_KEYWORDS = [
  'world of color', 'fantasmic', 'rivers of light', 'fountains'
];

// Keywords to identify parades
const PARADE_KEYWORDS = [
  'parade', 'festival of fantasy', 'magic happens',
  'boo to you', 'once upon a christmastime', 'electrical parade',
  'main street electrical', 'paint the night', 'spectromagic'
];

// Keywords to identify character experiences/cavalcades
const CHARACTER_KEYWORDS = [
  'cavalcade', 'character', 'meet', 'greeting'
];

// Keywords for general nighttime entertainment (catch-all)
const NIGHTTIME_KEYWORDS = [
  ...FIREWORKS_KEYWORDS,
  ...WATER_SHOW_KEYWORDS,
  'starlight', 'cinematic celebration', 'nighttime'
];

// Must-see entertainment by name (case-insensitive partial match)
const MUST_SEE_ENTERTAINMENT = [
  'fantasmic', 'world of color', 'happily ever after', 'luminous',
  'wondrous journeys', 'festival of fantasy', 'magic happens',
  'cinematic celebration', 'enchantment'
];

/**
 * Determine the category of entertainment
 */
function getEntertainmentCategory(name: string, showTimes: ShowTime[]): EntertainmentCategory {
  const lowerName = name.toLowerCase();

  // Check for parades first (most specific)
  if (PARADE_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'parade';
  }

  // Check for fireworks
  if (FIREWORKS_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'fireworks';
  }

  // Check for water shows
  if (WATER_SHOW_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'water-show';
  }

  // Check for character experiences
  if (CHARACTER_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'character';
  }

  // Check if it's a nighttime show based on time
  if (showTimes.length > 0) {
    const allEvening = showTimes.every(st => {
      const hour = new Date(st.startTime).getHours();
      return hour >= 19; // 7 PM or later
    });
    if (allEvening) {
      return 'projection'; // Evening show, likely projection/light show
    }
  }

  // Check for stage show keywords
  if (lowerName.includes('show') || lowerName.includes('musical') || lowerName.includes('live')) {
    return 'stage-show';
  }

  return 'other';
}

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
      const category = getEntertainmentCategory(item.name, showTimes);

      const entertainment: Entertainment = {
        id: item.id,
        name: item.name,
        entityType: item.entityType,
        status: item.status || 'OPERATING',
        showTimes,
        isNighttime,
        isParade: isParadeShow,
        isFireworks: category === 'fireworks',
        category,
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
        category: 'fireworks',
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }], // 9 PM typical
      },
      parade: {
        name: 'Festival of Fantasy Parade',
        isParade: true,
        category: 'parade',
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
        category: 'fireworks',
        priority: 'must-see',
        showTimes: [{ startTime: '21:00', type: 'Performance' }],
      },
    },
    // Hollywood Studios
    7: {
      nighttime: {
        name: 'Fantasmic!',
        isNighttime: true,
        isFireworks: false,
        category: 'water-show',
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
        name: 'Wondrous Journeys',
        isNighttime: true,
        isFireworks: true,
        category: 'fireworks',
        priority: 'must-see',
        showTimes: [{ startTime: '21:30', type: 'Performance' }],
      },
      parade: {
        name: 'Magic Happens Parade',
        isParade: true,
        category: 'parade',
        priority: 'must-see',
        showTimes: [{ startTime: '17:30', type: 'Performance' }], // 5:30 PM typical
      },
    },
    // DCA
    17: {
      nighttime: {
        name: 'World of Color',
        isNighttime: true,
        isFireworks: false,
        category: 'water-show',
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
