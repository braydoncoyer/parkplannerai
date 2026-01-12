// Ride Orderer with Multi-Factor Scoring
// Determines the best ride for each time slot

import type {
  RideWithPredictions,
  RideScore,
  RideCategory,
} from '../types';
import { getPredictedWaitForHour } from '../prediction/waitTimePredictor';
import { getRideWeight, getAdjustedWeight } from '../data/rideWeights';

/**
 * Score a ride for a specific time slot using multi-factor scoring
 *
 * SCORING BREAKDOWN (optimized for efficiency):
 * - Wait Time Score: 0-150 (HIGHEST PRIORITY - lower wait = higher score)
 * - Proximity Score: 0-100 (HIGH PRIORITY - same land = big bonus, reduces walking)
 * - Ride Weight Score: 0-60 (HIGH PRIORITY - must-do rides get big boost)
 * - Priority Score: 0-40 (headliners get boost at optimal times only)
 * - User Preference: -15 to +50 (matches user's priority: thrill/family/shows)
 * - Efficiency Score: 0-20 (quick rides with low waits)
 * - Below Average Bonus: -20 to +30 (only schedule if wait is below daily average)
 *
 * NOTE: Variety scoring REMOVED - we optimize for time, not variety
 */
export function scoreRideForSlot(
  ride: RideWithPredictions,
  hour: number,
  lastCategory: RideCategory | null,
  lastLand: string | null,
  userPriority: 'thrill' | 'family' | 'shows' | 'balanced'
): RideScore {
  const predictedWait = getPredictedWaitForHour(ride, hour);
  const maxWait = 120; // 2 hours max for normalization

  // Calculate average wait for this ride
  const avgWait = ride.hourlyPredictions.reduce((a, b) => a + b, 0) / ride.hourlyPredictions.length;
  const minWait = Math.min(...ride.hourlyPredictions);

  // WAIT TIME SCORE (0-150) - HIGHEST WEIGHT
  // Lower wait = much higher score
  const waitTimeScore = Math.max(0, Math.round(150 - (predictedWait / maxWait) * 150));

  // BELOW AVERAGE BONUS (0-30)
  // Strong bonus for scheduling when wait is below this ride's daily average
  // Penalty for scheduling above average
  let belowAverageBonus = 0;
  if (predictedWait <= minWait * 1.1) {
    belowAverageBonus = 30; // At or near optimal time
  } else if (predictedWait < avgWait * 0.8) {
    belowAverageBonus = 25; // Well below average
  } else if (predictedWait < avgWait) {
    belowAverageBonus = 15; // Below average
  } else if (predictedWait > avgWait * 1.2) {
    belowAverageBonus = -20; // PENALTY for above average wait - avoid this time
  } else {
    belowAverageBonus = 0; // Average wait, neutral
  }

  // PROXIMITY SCORE (0-100) - HIGH WEIGHT
  // Strongly reward staying in the same area to minimize walking
  let proximityScore = 0;
  if (lastLand === null) {
    proximityScore = 50; // First ride, neutral score
  } else if (ride.land && lastLand) {
    // Normalize land names for comparison (lowercase, trim)
    const currentLand = ride.land.toLowerCase().trim();
    const previousLand = lastLand.toLowerCase().trim();

    if (currentLand === previousLand) {
      proximityScore = 100; // Same land - STRONG bonus
    } else if (areLandsAdjacent(currentLand, previousLand)) {
      proximityScore = 60; // Adjacent lands - good bonus
    } else {
      proximityScore = 0; // Different area - no bonus, requires walking
    }
  }

  // RIDE WEIGHT SCORE (0-60)
  // Use the ride weights data to prioritize must-do attractions
  // Adjusts based on user priority preference
  const adjustedWeight = getAdjustedWeight(ride.name, userPriority);
  // Scale weight (1-100) to score (0-60)
  const rideWeightScore = Math.round((adjustedWeight / 100) * 60);

  // PRIORITY SCORE (0-40)
  // Headliners get boost, but only at optimal times
  let priorityScore: number;
  const isOptimalTime = predictedWait <= avgWait;

  switch (ride.popularity) {
    case 'headliner':
      // Headliners only get full bonus at optimal times
      priorityScore = isOptimalTime ? 40 : 20;
      break;
    case 'popular':
      priorityScore = isOptimalTime ? 25 : 15;
      break;
    case 'moderate':
      priorityScore = 10;
      break;
    case 'low':
      priorityScore = 5;
      break;
    default:
      priorityScore = 5;
  }

  // EFFICIENCY SCORE (0-20)
  // Reward rides with low total time commitment (wait + ride)
  const totalTimeCommitment = predictedWait + ride.duration;
  let efficiencyScore: number;
  if (totalTimeCommitment < 30) {
    efficiencyScore = 20;
  } else if (totalTimeCommitment < 60) {
    efficiencyScore = 15;
  } else if (totalTimeCommitment < 90) {
    efficiencyScore = 10;
  } else {
    efficiencyScore = 5;
  }

  // USER PREFERENCE BONUS (0-50)
  // Significantly boost rides matching user's preferred category
  let preferenceBonus = 0;
  if (userPriority !== 'balanced') {
    if (userPriority === 'thrill' && ride.category === 'thrill') {
      preferenceBonus = 50; // Strong boost for thrill seekers
    } else if (userPriority === 'family' && (ride.category === 'family' || ride.category === 'kids')) {
      preferenceBonus = 50; // Strong boost for family rides
    } else if (userPriority === 'shows' && ride.category === 'show') {
      preferenceBonus = 50; // Strong boost for shows
    } else {
      // Mild penalty for non-matching categories when a preference is set
      preferenceBonus = -15;
    }
  }

  // VARIETY SCORE REMOVED - we don't sacrifice efficiency for variety
  const varietyScore = 0;

  const totalScore = waitTimeScore + proximityScore + rideWeightScore + priorityScore + efficiencyScore + belowAverageBonus + preferenceBonus;

  return {
    ride,
    hour,
    totalScore,
    breakdown: {
      waitTimeScore,
      priorityScore,
      varietyScore,
      efficiencyScore,
      proximityScore,
      rideWeightScore,
    },
  };
}

/**
 * Check if two lands are adjacent (for partial proximity bonus)
 * This helps with parks where some areas are close together
 */
export function areLandsAdjacent(land1: string, land2: string): boolean {
  // Define adjacency relationships for major parks
  const adjacencyMap: Record<string, string[]> = {
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
    'springfield': ['world expo', 'woody woodpecker\'s kidzone'],
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

    // Disneyland - unique lands only (shared lands use WDW adjacencies as fallback)
    // Note: Galaxy's Edge exists in both parks with different adjacencies - using HS version
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

  const adjacent1 = adjacencyMap[land1] || [];
  const adjacent2 = adjacencyMap[land2] || [];

  return adjacent1.includes(land2) || adjacent2.includes(land1);
}

/**
 * Calculate walk time between two lands
 * - Same land: 3 minutes (minimal transition)
 * - Adjacent lands: 8 minutes (short walk)
 * - Different areas: 15 minutes (longer walk across park)
 */
export function getWalkTimeBetweenLands(
  fromLand: string | null | undefined,
  toLand: string | null | undefined
): number {
  // If either land is unknown, use default
  if (!fromLand || !toLand) return 10;

  // Normalize land names
  const from = fromLand.toLowerCase().trim();
  const to = toLand.toLowerCase().trim();

  // Same land - minimal transition time
  if (from === to) return 3;

  // Adjacent lands - short walk
  if (areLandsAdjacent(from, to)) return 8;

  // Different areas - longer walk
  return 15;
}

/**
 * Select the best ride for a given time slot from available candidates
 */
export function selectBestRide(
  candidates: RideWithPredictions[],
  hour: number,
  lastCategory: RideCategory | null,
  lastLand: string | null,
  userPriority: 'thrill' | 'family' | 'shows' | 'balanced'
): RideWithPredictions | null {
  if (candidates.length === 0) return null;

  // Score all candidates
  const scores = candidates.map((ride) =>
    scoreRideForSlot(ride, hour, lastCategory, lastLand, userPriority)
  );

  // Sort by total score (highest first)
  scores.sort((a, b) => b.totalScore - a.totalScore);

  // Return the ride with highest score
  return scores[0]?.ride ?? null;
}

/**
 * Generate reasoning for why a ride was scheduled at this time
 */
export function generateRideReasoning(
  ride: RideWithPredictions,
  hour: number,
  score: RideScore,
  lastLand: string | null
): string {
  const predictedWait = getPredictedWaitForHour(ride, hour);
  const avgWait = Math.round(
    ride.hourlyPredictions.reduce((a, b) => a + b, 0) / ride.hourlyPredictions.length
  );
  const minWait = Math.min(...ride.hourlyPredictions);

  const reasons: string[] = [];

  // Wait time quality - the most important factor
  if (predictedWait <= minWait * 1.15) {
    reasons.push(`Optimal time - lowest wait of the day (~${predictedWait} min)`);
  } else if (predictedWait < avgWait * 0.8) {
    const savings = Math.round(avgWait - predictedWait);
    reasons.push(`${savings} min below daily average`);
  } else if (predictedWait < avgWait) {
    reasons.push(`Below average wait time`);
  }

  // Headliner-specific reasoning
  if (ride.popularity === 'headliner') {
    if (predictedWait <= avgWait) {
      reasons.push('Headliner at optimal window');
    }
  }

  // Proximity/location reasoning - key factor
  if (score.breakdown.proximityScore >= 80) {
    reasons.push('Same area - no walking needed');
  } else if (score.breakdown.proximityScore >= 50) {
    reasons.push('Adjacent area - minimal walk');
  }

  // Efficiency for quick rides
  if (score.breakdown.efficiencyScore >= 18 && predictedWait <= avgWait) {
    reasons.push('Quick experience');
  }

  // Default reason if none generated
  if (reasons.length === 0) {
    if (predictedWait <= avgWait) {
      reasons.push(`Good timing (~${predictedWait} min wait)`);
    } else {
      reasons.push(`~${predictedWait} min wait`);
    }
  }

  return reasons.join('. ') + '.';
}

/**
 * Sort rides by their optimal scheduling priority using ride weights
 * Uses the comprehensive ride weights database to prioritize must-do attractions
 * User preferences adjust weights via getAdjustedWeight
 */
export function prioritizeRides(
  rides: RideWithPredictions[],
  userPriority: 'thrill' | 'family' | 'shows' | 'balanced'
): RideWithPredictions[] {
  return [...rides].sort((a, b) => {
    // Use adjusted weights which account for user priority
    const weightA = getAdjustedWeight(a.name, userPriority);
    const weightB = getAdjustedWeight(b.name, userPriority);

    // Higher weight = higher priority (should come first)
    return weightB - weightA;
  });
}

/**
 * Find the best hour to schedule a specific ride
 */
export function findBestHourForRide(
  ride: RideWithPredictions,
  availableHours: number[]
): number {
  let bestHour = availableHours[0] ?? 9;
  let lowestWait = Infinity;

  for (const hour of availableHours) {
    const wait = getPredictedWaitForHour(ride, hour);
    if (wait < lowestWait) {
      lowestWait = wait;
      bestHour = hour;
    }
  }

  return bestHour;
}
