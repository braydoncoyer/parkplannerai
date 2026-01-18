/**
 * Theme Park Schedule Optimizer - Proximity Calculator
 *
 * Calculates walk times between lands and provides land adjacency information.
 */

import {
  SAME_LAND_WALK_TIME,
  ADJACENT_LAND_WALK_TIME,
  DISTANT_LAND_WALK_TIME,
  BASE_WALK_TIME,
  CROWDED_WALK_MULTIPLIER,
} from '../constants';

// =============================================================================
// LAND ADJACENCY MAP
// =============================================================================

/**
 * Comprehensive adjacency map for all major theme parks
 * Each land maps to an array of adjacent lands
 */
const LAND_ADJACENCY_MAP: Record<string, string[]> = {
  // Magic Kingdom
  'main street, u.s.a.': ['adventureland', 'tomorrowland'],
  'adventureland': ['main street, u.s.a.', 'frontierland'],
  'frontierland': ['adventureland', 'liberty square'],
  'liberty square': ['frontierland', 'fantasyland'],
  'fantasyland': ['liberty square', 'tomorrowland'],
  'tomorrowland': ['fantasyland', 'main street, u.s.a.'],

  // EPCOT
  'world celebration': ['world nature', 'world showcase'],
  'world nature': ['world celebration', 'world showcase'],
  'world discovery': ['world celebration', 'world showcase'],
  'world showcase': ['world celebration', 'world nature', 'world discovery'],

  // Hollywood Studios
  'hollywood boulevard': ['echo lake', 'sunset boulevard'],
  'sunset boulevard': ['hollywood boulevard'],
  'echo lake': ['hollywood boulevard', "star wars: galaxy's edge"],
  "star wars: galaxy's edge": ['echo lake', 'toy story land'],
  'toy story land': ["star wars: galaxy's edge", 'animation courtyard'],
  'animation courtyard': ['toy story land', 'hollywood boulevard'],

  // Animal Kingdom
  'discovery island': ['africa', 'asia', 'pandora', 'dinoland u.s.a.'],
  'africa': ['discovery island', 'asia'],
  'asia': ['africa', 'discovery island', 'dinoland u.s.a.'],
  'pandora - the world of avatar': ['discovery island'],
  'pandora': ['discovery island'],
  'dinoland u.s.a.': ['discovery island', 'asia'],

  // Universal Studios Florida
  'production central': ['new york', 'hollywood'],
  'new york': ['production central', 'san francisco'],
  'san francisco': ['new york', 'the wizarding world of harry potter - diagon alley'],
  'the wizarding world of harry potter - diagon alley': ['san francisco', 'world expo'],
  'diagon alley': ['san francisco', 'world expo'],
  'world expo': ['diagon alley', 'springfield'],
  'springfield': ['world expo', "woody woodpecker's kidzone"],
  'hollywood': ['production central'],

  // Islands of Adventure
  'port of entry': ['marvel super hero island', 'seuss landing'],
  'marvel super hero island': ['port of entry', 'toon lagoon'],
  'toon lagoon': ['marvel super hero island', 'skull island'],
  'skull island': ['toon lagoon', 'jurassic park'],
  'jurassic park': ['skull island', 'the wizarding world of harry potter - hogsmeade'],
  'the wizarding world of harry potter - hogsmeade': ['jurassic park', 'the lost continent'],
  'hogsmeade': ['jurassic park', 'the lost continent'],
  'the lost continent': ['hogsmeade', 'seuss landing'],
  'seuss landing': ['the lost continent', 'port of entry'],

  // Epic Universe
  'celestial park': ['super nintendo world', 'the wizarding world of harry potter - ministry of magic', 'dark universe', 'how to train your dragon - isle of berk'],
  'super nintendo world': ['celestial park', 'the wizarding world of harry potter - ministry of magic'],
  'the wizarding world of harry potter - ministry of magic': ['celestial park', 'super nintendo world', 'how to train your dragon - isle of berk'],
  'ministry of magic': ['celestial park', 'super nintendo world', 'how to train your dragon - isle of berk'],
  'dark universe': ['celestial park', 'how to train your dragon - isle of berk'],
  'how to train your dragon - isle of berk': ['celestial park', 'dark universe', 'the wizarding world of harry potter - ministry of magic'],
  'isle of berk': ['celestial park', 'dark universe', 'ministry of magic'],

  // Disneyland
  'new orleans square': ['adventureland', 'critter country', 'frontierland'],
  'critter country': ['new orleans square', "star wars: galaxy's edge"],
  "mickey's toontown": ['fantasyland'],

  // Disney California Adventure
  'buena vista street': ['hollywood land', 'grizzly peak'],
  'hollywood land': ['buena vista street', 'avengers campus'],
  'avengers campus': ['hollywood land', 'cars land'],
  'cars land': ['avengers campus', 'pacific wharf'],
  'pacific wharf': ['cars land', 'paradise gardens park', 'grizzly peak'],
  'paradise gardens park': ['pacific wharf', 'pixar pier'],
  'pixar pier': ['paradise gardens park'],
  'grizzly peak': ['buena vista street', 'pacific wharf'],

  // Universal Studios Hollywood
  'upper lot': ['lower lot'],
  'lower lot': ['upper lot'],
};

// =============================================================================
// LAND NORMALIZATION
// =============================================================================

/**
 * Normalize a land name for comparison
 * Handles common variations and aliases
 */
export function normalizeLandName(land: string | null | undefined): string {
  if (!land) return '';

  const normalized = land.toLowerCase().trim();

  // Common aliases
  const aliases: Record<string, string> = {
    "galaxy's edge": "star wars: galaxy's edge",
    'galaxys edge': "star wars: galaxy's edge",
    'star wars land': "star wars: galaxy's edge",
    'pandora': 'pandora - the world of avatar',
    'avatar land': 'pandora - the world of avatar',
    'diagon alley': 'the wizarding world of harry potter - diagon alley',
    'hogsmeade': 'the wizarding world of harry potter - hogsmeade',
    'ministry of magic': 'the wizarding world of harry potter - ministry of magic',
    'isle of berk': 'how to train your dragon - isle of berk',
    'main street': 'main street, u.s.a.',
    'dinoland': 'dinoland u.s.a.',
  };

  return aliases[normalized] || normalized;
}

// =============================================================================
// ADJACENCY FUNCTIONS
// =============================================================================

/**
 * Check if two lands are adjacent
 */
export function areLandsAdjacent(
  land1: string | null | undefined,
  land2: string | null | undefined
): boolean {
  if (!land1 || !land2) return false;

  const norm1 = normalizeLandName(land1);
  const norm2 = normalizeLandName(land2);

  if (norm1 === norm2) return true; // Same land is considered adjacent

  const adjacent1 = LAND_ADJACENCY_MAP[norm1] || [];
  const adjacent2 = LAND_ADJACENCY_MAP[norm2] || [];

  return adjacent1.includes(norm2) || adjacent2.includes(norm1);
}

/**
 * Get all lands adjacent to a given land
 */
export function getAdjacentLands(land: string | null | undefined): string[] {
  if (!land) return [];

  const normalized = normalizeLandName(land);
  return LAND_ADJACENCY_MAP[normalized] || [];
}

// =============================================================================
// WALK TIME CALCULATIONS
// =============================================================================

/**
 * Calculate walk time between two lands
 *
 * @param fromLand The starting land
 * @param toLand The destination land
 * @param isCrowded Whether to apply crowded multiplier
 * @returns Walk time in minutes
 */
export function calculateWalkTime(
  fromLand: string | null | undefined,
  toLand: string | null | undefined,
  isCrowded: boolean = false
): number {
  // Default walk time if either land is unknown
  if (!fromLand || !toLand) {
    return isCrowded
      ? Math.round(BASE_WALK_TIME * CROWDED_WALK_MULTIPLIER)
      : BASE_WALK_TIME;
  }

  const from = normalizeLandName(fromLand);
  const to = normalizeLandName(toLand);

  let walkTime: number;

  if (from === to) {
    // Same land - minimal transition
    walkTime = SAME_LAND_WALK_TIME;
  } else if (areLandsAdjacent(from, to)) {
    // Adjacent lands - short walk
    walkTime = ADJACENT_LAND_WALK_TIME;
  } else {
    // Different areas - longer walk
    walkTime = DISTANT_LAND_WALK_TIME;
  }

  // Apply crowded multiplier if needed
  if (isCrowded) {
    walkTime = Math.round(walkTime * CROWDED_WALK_MULTIPLIER);
  }

  return walkTime;
}

/**
 * Calculate total walk time for a sequence of lands
 */
export function calculateTotalWalkTime(
  lands: (string | null | undefined)[],
  isCrowded: boolean = false
): number {
  if (lands.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < lands.length; i++) {
    total += calculateWalkTime(lands[i - 1], lands[i], isCrowded);
  }

  return total;
}

// =============================================================================
// PROXIMITY SCORING
// =============================================================================

/**
 * Calculate proximity score between two lands
 * Higher score = closer proximity = less walking
 *
 * @returns Score from 0-100
 */
export function calculateProximityScore(
  fromLand: string | null | undefined,
  toLand: string | null | undefined
): number {
  if (!fromLand || !toLand) {
    return 50; // Neutral score when land info is missing
  }

  const from = normalizeLandName(fromLand);
  const to = normalizeLandName(toLand);

  if (from === to) {
    return 100; // Same land - maximum score
  }

  if (areLandsAdjacent(from, to)) {
    return 70; // Adjacent lands - good score
  }

  return 30; // Different areas - low score
}

/**
 * Find the optimal ordering of rides to minimize total walk time
 * Uses a greedy nearest-neighbor approach
 *
 * @param rides Array of items with land property
 * @param startingLand Optional starting land
 * @returns Reordered array for minimal walking
 */
export function optimizeForProximity<T extends { land?: string }>(
  items: T[],
  startingLand?: string
): T[] {
  if (items.length <= 1) return [...items];

  const result: T[] = [];
  const remaining = [...items];

  // Start with item in starting land, or first item
  let currentLand = startingLand || remaining[0]?.land;

  while (remaining.length > 0) {
    // Find the closest item to current land
    let bestIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const score = calculateProximityScore(currentLand, remaining[i].land);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // Move best item to result
    const [chosen] = remaining.splice(bestIndex, 1);
    result.push(chosen);
    currentLand = chosen.land;
  }

  return result;
}

/**
 * Group items by land for efficient routing
 */
export function groupByLand<T extends { land?: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const land = normalizeLandName(item.land) || 'unknown';
    const group = groups.get(land) || [];
    group.push(item);
    groups.set(land, group);
  }

  return groups;
}

/**
 * Check if grouping by land would improve walk efficiency
 * Returns true if items are spread across many non-adjacent lands
 */
export function wouldBenefitFromLandGrouping<T extends { land?: string }>(
  items: T[]
): boolean {
  if (items.length <= 2) return false;

  const lands = new Set(items.map((item) => normalizeLandName(item.land) || 'unknown'));

  // If items are in more than 3 different non-adjacent lands, grouping helps
  if (lands.size <= 2) return false;

  // Check adjacency relationships
  const landArray = Array.from(lands);
  let nonAdjacentPairs = 0;

  for (let i = 0; i < landArray.length; i++) {
    for (let j = i + 1; j < landArray.length; j++) {
      if (!areLandsAdjacent(landArray[i], landArray[j])) {
        nonAdjacentPairs++;
      }
    }
  }

  // If more than 30% of pairs are non-adjacent, recommend grouping
  const totalPairs = (landArray.length * (landArray.length - 1)) / 2;
  return nonAdjacentPairs / totalPairs > 0.3;
}
