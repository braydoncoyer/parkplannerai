/**
 * Park Hopper Tests
 *
 * Tests for verifying park hopper scheduling behavior across various scenarios.
 * Run with: npx tsx src/lib/analytics/scheduling/__tests__/park-hopper.test.ts
 */

import { createOptimizedSchedule } from '../scheduler';
import type {
  SchedulerInput,
  RideWithPredictions,
  Entertainment,
  ParkHopperConfig,
} from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockRide(
  id: string,
  name: string,
  popularity: 'headliner' | 'popular' | 'moderate' | 'low' = 'moderate',
  land: string = 'Fantasyland',
  parkId: string = 'disneyland'
): RideWithPredictions {
  // Different wait time patterns based on popularity
  const baseWaits = {
    headliner: [45, 55, 70, 90, 100, 110, 105, 95, 85, 75, 60, 50, 40],
    popular: [25, 35, 45, 55, 65, 70, 65, 60, 50, 40, 35, 30, 25],
    moderate: [15, 20, 25, 35, 40, 45, 40, 35, 30, 25, 20, 15, 10],
    low: [5, 10, 15, 20, 25, 25, 25, 20, 15, 10, 10, 5, 5],
  };

  return {
    id,
    name,
    land,
    parkId,
    popularity,
    duration: 5,
    hourlyPredictions: baseWaits[popularity],
  };
}

function createEntertainment(
  id: string,
  name: string,
  category: 'parade' | 'fireworks' | 'show',
  startTime: string,
  duration: number = 30
): Entertainment {
  return {
    id,
    name,
    category,
    showTimes: [{ startTime }],
    duration,
  };
}

// =============================================================================
// DISNEYLAND RIDES (Park 1)
// =============================================================================

const DISNEYLAND_HEADLINERS: RideWithPredictions[] = [
  createMockRide('dl-1', 'Space Mountain', 'headliner', 'Tomorrowland', 'disneyland'),
  createMockRide('dl-2', 'Matterhorn Bobsleds', 'headliner', 'Fantasyland', 'disneyland'),
  createMockRide('dl-3', 'Indiana Jones Adventure', 'headliner', 'Adventureland', 'disneyland'),
  createMockRide('dl-4', 'Big Thunder Mountain', 'headliner', 'Frontierland', 'disneyland'),
];

const DISNEYLAND_POPULAR: RideWithPredictions[] = [
  createMockRide('dl-5', 'Splash Mountain', 'popular', 'Critter Country', 'disneyland'),
  createMockRide('dl-6', 'Pirates of the Caribbean', 'popular', 'New Orleans Square', 'disneyland'),
  createMockRide('dl-7', 'Haunted Mansion', 'popular', 'New Orleans Square', 'disneyland'),
  createMockRide('dl-8', 'Star Tours', 'popular', 'Tomorrowland', 'disneyland'),
];

const DISNEYLAND_MODERATE: RideWithPredictions[] = [
  createMockRide('dl-9', 'Jungle Cruise', 'moderate', 'Adventureland', 'disneyland'),
  createMockRide('dl-10', "It's a Small World", 'moderate', 'Fantasyland', 'disneyland'),
  createMockRide('dl-11', 'Peter Pan\'s Flight', 'moderate', 'Fantasyland', 'disneyland'),
  createMockRide('dl-12', 'Buzz Lightyear', 'moderate', 'Tomorrowland', 'disneyland'),
];

const DISNEYLAND_LOW: RideWithPredictions[] = [
  createMockRide('dl-13', 'Mr. Toad\'s Wild Ride', 'low', 'Fantasyland', 'disneyland'),
  createMockRide('dl-14', 'Alice in Wonderland', 'low', 'Fantasyland', 'disneyland'),
  createMockRide('dl-15', 'Autopia', 'low', 'Tomorrowland', 'disneyland'),
];

// =============================================================================
// DCA RIDES (Park 2)
// =============================================================================

const DCA_HEADLINERS: RideWithPredictions[] = [
  createMockRide('dca-1', 'Radiator Springs Racers', 'headliner', 'Cars Land', 'dca'),
  createMockRide('dca-2', 'Guardians of the Galaxy', 'headliner', 'Avengers Campus', 'dca'),
  createMockRide('dca-3', 'Incredicoaster', 'headliner', 'Pixar Pier', 'dca'),
  createMockRide('dca-4', 'Web Slingers', 'headliner', 'Avengers Campus', 'dca'),
];

const DCA_POPULAR: RideWithPredictions[] = [
  createMockRide('dca-5', 'Soarin\' Around the World', 'popular', 'Grizzly Peak', 'dca'),
  createMockRide('dca-6', 'Toy Story Midway Mania', 'popular', 'Pixar Pier', 'dca'),
  createMockRide('dca-7', 'Grizzly River Run', 'popular', 'Grizzly Peak', 'dca'),
  createMockRide('dca-8', 'Monsters Inc', 'popular', 'Hollywood Land', 'dca'),
];

const DCA_MODERATE: RideWithPredictions[] = [
  createMockRide('dca-9', 'Luigi\'s Rollickin\' Roadsters', 'moderate', 'Cars Land', 'dca'),
  createMockRide('dca-10', 'Mater\'s Junkyard Jamboree', 'moderate', 'Cars Land', 'dca'),
  createMockRide('dca-11', 'Goofy\'s Sky School', 'moderate', 'Paradise Gardens', 'dca'),
  createMockRide('dca-12', 'Inside Out Emotional Whirlwind', 'moderate', 'Pixar Pier', 'dca'),
];

const DCA_LOW: RideWithPredictions[] = [
  createMockRide('dca-13', 'Little Mermaid', 'low', 'Paradise Gardens', 'dca'),
  createMockRide('dca-14', 'Golden Zephyr', 'low', 'Paradise Gardens', 'dca'),
  createMockRide('dca-15', 'Jessie\'s Critter Carousel', 'low', 'Pixar Pier', 'dca'),
];

// =============================================================================
// ENTERTAINMENT
// =============================================================================

const DISNEYLAND_ENTERTAINMENT: Entertainment[] = [
  createEntertainment('dl-parade', 'Magic Happens Parade', 'parade', '17:30', 30),
  createEntertainment('dl-fireworks', 'Wondrous Journeys', 'fireworks', '21:30', 20),
];

const DCA_ENTERTAINMENT: Entertainment[] = [
  createEntertainment('dca-show', 'World of Color', 'show', '21:00', 25),
];

// =============================================================================
// TEST CONFIGURATIONS
// =============================================================================

interface ParkHopperTestConfig {
  id: string;
  name: string;
  startPark: 'disneyland' | 'dca';
  endPark: 'disneyland' | 'dca';
  park1Rides: RideWithPredictions[];
  park2Rides: RideWithPredictions[];
  entertainment: Entertainment[];
  hopTime: number; // Minutes since midnight for hop eligibility
  transitionTime?: number; // User-specified transition time (optional)
  expectedChecks: {
    minRidesInPark1: number;
    minRidesInPark2: number;
    noOverlapWithEntertainment: boolean;
    scheduleWithinParkHours: boolean;
    transitionAfterHopTime: boolean;
  };
}

// =============================================================================
// TEST SCENARIOS: DISNEYLAND → DCA
// =============================================================================

const DL_TO_DCA_TESTS: ParkHopperTestConfig[] = [
  // PH01: Light day - 2 DL rides, 2 DCA rides
  {
    id: 'PH01',
    name: 'DL→DCA: Light day (4 total rides)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [DISNEYLAND_HEADLINERS[0], DISNEYLAND_POPULAR[0]],
    park2Rides: [DCA_HEADLINERS[0], DCA_POPULAR[0]],
    entertainment: [],
    hopTime: 660, // 11 AM
    expectedChecks: {
      minRidesInPark1: 2,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH02: Medium day - 4 DL rides, 4 DCA rides
  {
    id: 'PH02',
    name: 'DL→DCA: Medium day (8 total rides)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH03: Packed day - All headliners + popular from both parks
  {
    id: 'PH03',
    name: 'DL→DCA: Packed day (16 total rides)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS, ...DISNEYLAND_POPULAR],
    park2Rides: [...DCA_HEADLINERS, ...DCA_POPULAR],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 6, // May not fit all
      minRidesInPark2: 6,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH04: Light day with DL parade
  {
    id: 'PH04',
    name: 'DL→DCA: Light day with Magic Happens parade',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [DISNEYLAND_HEADLINERS[0], DISNEYLAND_POPULAR[0]],
    park2Rides: [DCA_HEADLINERS[0], DCA_POPULAR[0]],
    entertainment: [DISNEYLAND_ENTERTAINMENT[0]], // Magic Happens at 5:30 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 2,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH05: Medium day with DL fireworks
  {
    id: 'PH05',
    name: 'DL→DCA: Medium day with Wondrous Journeys',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    entertainment: [DISNEYLAND_ENTERTAINMENT[1]], // Fireworks at 9:30 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH06: Medium day with World of Color (DCA)
  {
    id: 'PH06',
    name: 'DL→DCA: Medium day with World of Color',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    entertainment: [DCA_ENTERTAINMENT[0]], // World of Color at 9 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH07: Packed day with all entertainment
  {
    id: 'PH07',
    name: 'DL→DCA: Packed day with parade + fireworks + World of Color',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS, ...DISNEYLAND_POPULAR],
    park2Rides: [...DCA_HEADLINERS, ...DCA_POPULAR],
    entertainment: [...DISNEYLAND_ENTERTAINMENT, ...DCA_ENTERTAINMENT],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH08: Early hop time (1 PM)
  {
    id: 'PH08',
    name: 'DL→DCA: Early hop time (1 PM)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 780, // 1 PM
    expectedChecks: {
      minRidesInPark1: 2,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH09: Late hop time (3 PM)
  {
    id: 'PH09',
    name: 'DL→DCA: Late hop time (3 PM)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 3), ...DISNEYLAND_POPULAR.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2)],
    entertainment: [],
    hopTime: 900, // 3 PM
    expectedChecks: {
      minRidesInPark1: 5,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH10: User-specified transition time
  {
    id: 'PH10',
    name: 'DL→DCA: User specifies 2 PM transition',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    park2Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 660,
    transitionTime: 840, // 2 PM user-specified
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },
];

// =============================================================================
// TEST SCENARIOS: DCA → DISNEYLAND
// =============================================================================

const DCA_TO_DL_TESTS: ParkHopperTestConfig[] = [
  // PH11: Light day - 2 DCA rides, 2 DL rides
  {
    id: 'PH11',
    name: 'DCA→DL: Light day (4 total rides)',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [DCA_HEADLINERS[0], DCA_POPULAR[0]],
    park2Rides: [DISNEYLAND_HEADLINERS[0], DISNEYLAND_POPULAR[0]],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 2,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH12: Medium day - 4 DCA rides, 4 DL rides
  {
    id: 'PH12',
    name: 'DCA→DL: Medium day (8 total rides)',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH13: Packed day
  {
    id: 'PH13',
    name: 'DCA→DL: Packed day (16 total rides)',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS, ...DCA_POPULAR],
    park2Rides: [...DISNEYLAND_HEADLINERS, ...DISNEYLAND_POPULAR],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 6,
      minRidesInPark2: 6,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH14: Medium day with World of Color
  {
    id: 'PH14',
    name: 'DCA→DL: Medium day with World of Color',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [DCA_ENTERTAINMENT[0]], // World of Color at 9 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH15: Medium day with DL parade (after hop)
  {
    id: 'PH15',
    name: 'DCA→DL: Medium day with Magic Happens (in DL after hop)',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [DISNEYLAND_ENTERTAINMENT[0]], // Parade at 5:30 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH16: Medium day with DL fireworks (after hop)
  {
    id: 'PH16',
    name: 'DCA→DL: Medium day with Wondrous Journeys (in DL after hop)',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [DISNEYLAND_ENTERTAINMENT[1]], // Fireworks at 9:30 PM
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH17: Packed day with all entertainment
  {
    id: 'PH17',
    name: 'DCA→DL: Packed day with all entertainment',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS, ...DCA_POPULAR],
    park2Rides: [...DISNEYLAND_HEADLINERS, ...DISNEYLAND_POPULAR],
    entertainment: [...DISNEYLAND_ENTERTAINMENT, ...DCA_ENTERTAINMENT],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH18: Very early hop (11 AM)
  {
    id: 'PH18',
    name: 'DCA→DL: Very early hop (11 AM) - more time at DL',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [DCA_HEADLINERS[0]],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 3), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 660, // 11 AM
    expectedChecks: {
      minRidesInPark1: 1,
      minRidesInPark2: 5,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH19: Late hop (4 PM)
  {
    id: 'PH19',
    name: 'DCA→DL: Late hop (4 PM) - more time at DCA',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 3), ...DCA_POPULAR.slice(0, 3)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2)],
    entertainment: [],
    hopTime: 960, // 4 PM
    expectedChecks: {
      minRidesInPark1: 6,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH20: User specifies transition at 3 PM
  {
    id: 'PH20',
    name: 'DCA→DL: User specifies 3 PM transition',
    startPark: 'dca',
    endPark: 'disneyland',
    park1Rides: [...DCA_HEADLINERS.slice(0, 2), ...DCA_POPULAR.slice(0, 2)],
    park2Rides: [...DISNEYLAND_HEADLINERS.slice(0, 2), ...DISNEYLAND_POPULAR.slice(0, 2)],
    entertainment: [],
    hopTime: 660,
    transitionTime: 900, // 3 PM user-specified
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },
];

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

const EDGE_CASE_TESTS: ParkHopperTestConfig[] = [
  // PH21: Only headliners (stress test optimal time placement)
  {
    id: 'PH21',
    name: 'Edge: All headliners only (8 headliners)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS],
    park2Rides: [...DCA_HEADLINERS],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 3,
      minRidesInPark2: 3,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH22: Only low-popularity rides (should be fast)
  {
    id: 'PH22',
    name: 'Edge: Only low-popularity rides (6 total)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_LOW],
    park2Rides: [...DCA_LOW],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 3,
      minRidesInPark2: 3,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH23: Mixed popularity with all entertainment
  {
    id: 'PH23',
    name: 'Edge: All ride types + all entertainment',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [
      DISNEYLAND_HEADLINERS[0],
      DISNEYLAND_POPULAR[0],
      DISNEYLAND_MODERATE[0],
      DISNEYLAND_LOW[0],
    ],
    park2Rides: [DCA_HEADLINERS[0], DCA_POPULAR[0], DCA_MODERATE[0], DCA_LOW[0]],
    entertainment: [...DISNEYLAND_ENTERTAINMENT, ...DCA_ENTERTAINMENT],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 4,
      minRidesInPark2: 4,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH24: Imbalanced - many Park 1 rides, few Park 2 rides
  {
    id: 'PH24',
    name: 'Edge: Imbalanced (10 DL rides, 2 DCA rides)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [...DISNEYLAND_HEADLINERS, ...DISNEYLAND_POPULAR, ...DISNEYLAND_MODERATE.slice(0, 2)],
    park2Rides: [DCA_HEADLINERS[0], DCA_POPULAR[0]],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 8,
      minRidesInPark2: 2,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },

  // PH25: Imbalanced reverse - few Park 1, many Park 2
  {
    id: 'PH25',
    name: 'Edge: Imbalanced (2 DL rides, 10 DCA rides)',
    startPark: 'disneyland',
    endPark: 'dca',
    park1Rides: [DISNEYLAND_HEADLINERS[0], DISNEYLAND_POPULAR[0]],
    park2Rides: [...DCA_HEADLINERS, ...DCA_POPULAR, ...DCA_MODERATE.slice(0, 2)],
    entertainment: [],
    hopTime: 660,
    expectedChecks: {
      minRidesInPark1: 2,
      minRidesInPark2: 8,
      noOverlapWithEntertainment: true,
      scheduleWithinParkHours: true,
      transitionAfterHopTime: true,
    },
  },
];

// =============================================================================
// TEST RUNNER
// =============================================================================

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

function runParkHopperTest(config: ParkHopperTestConfig): {
  passed: boolean;
  failures: string[];
  warnings: string[];
  details: {
    totalRidesScheduled: number;
    park1Rides: number;
    park2Rides: number;
    transitionTime: number | null;
    entertainmentOverlaps: number;
    scheduleStart: number;
    scheduleEnd: number;
  };
} {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Build park hopper config
  const parkHopperConfig: ParkHopperConfig = {
    enabled: true,
    park1Id: config.startPark,
    park2Id: config.endPark,
    park1Name: config.startPark === 'disneyland' ? 'Disneyland' : 'Disney California Adventure',
    park2Name: config.endPark === 'disneyland' ? 'Disneyland' : 'Disney California Adventure',
    eligibilityTime: config.hopTime,
    travelTime: 15, // 15 minutes between parks
    userTransitionTime: config.transitionTime,
    park1Rides: config.park1Rides,
    park2Rides: config.park2Rides,
  };

  // Build scheduler input
  const input: SchedulerInput = {
    selectedRides: [...config.park1Rides, ...config.park2Rides],
    parkHours: { openHour: 8, closeHour: 24 }, // 8 AM to midnight
    entertainment: config.entertainment,
    preferences: {
      arrivalTime: '08:00',
      includeBreaks: true,
      priority: 'balanced',
      allowRerides: false,
    },
    parkHopper: parkHopperConfig,
    dayType: 'weekday',
    parkId: config.startPark,
  };

  // Run scheduler
  const result = createOptimizedSchedule(input);

  // Analyze results
  const rideItems = result.items.filter((item) => item.type === 'ride');
  const park1RideItems = rideItems.filter((item) => item.parkId === config.startPark);
  const park2RideItems = rideItems.filter((item) => item.parkId === config.endPark);

  // Find transition item
  const transitionItem = result.items.find((item) => item.type === 'transition');
  const transitionTime = transitionItem?.scheduledTime ?? null;

  // Check entertainment overlaps
  let entertainmentOverlaps = 0;
  const entertainmentItems = result.items.filter((item) => item.type === 'entertainment');

  for (const ride of rideItems) {
    for (const ent of entertainmentItems) {
      if (
        ride.scheduledTime < ent.endTime &&
        ride.endTime > ent.scheduledTime
      ) {
        entertainmentOverlaps++;
        failures.push(
          `Ride "${ride.ride?.name}" (${formatTime(ride.scheduledTime)}-${formatTime(ride.endTime)}) overlaps with "${ent.entertainment?.name}" (${formatTime(ent.scheduledTime)}-${formatTime(ent.endTime)})`
        );
      }
    }
  }

  // Get schedule bounds
  const scheduleStart = rideItems.length > 0 ? Math.min(...rideItems.map((r) => r.scheduledTime)) : 0;
  const scheduleEnd = rideItems.length > 0 ? Math.max(...rideItems.map((r) => r.endTime)) : 0;

  // Validate: minimum rides in Park 1
  if (park1RideItems.length < config.expectedChecks.minRidesInPark1) {
    failures.push(
      `Park 1 has ${park1RideItems.length} rides, expected at least ${config.expectedChecks.minRidesInPark1}`
    );
  }

  // Validate: minimum rides in Park 2
  if (park2RideItems.length < config.expectedChecks.minRidesInPark2) {
    failures.push(
      `Park 2 has ${park2RideItems.length} rides, expected at least ${config.expectedChecks.minRidesInPark2}`
    );
  }

  // Validate: no entertainment overlap
  if (config.expectedChecks.noOverlapWithEntertainment && entertainmentOverlaps > 0) {
    // Already added to failures above
  }

  // Validate: schedule within park hours
  if (config.expectedChecks.scheduleWithinParkHours) {
    const parkOpen = 8 * 60; // 8 AM
    const parkClose = 24 * 60; // Midnight

    if (scheduleStart < parkOpen) {
      failures.push(`Schedule starts before park open: ${formatTime(scheduleStart)}`);
    }
    if (scheduleEnd > parkClose) {
      failures.push(`Schedule extends past park close: ${formatTime(scheduleEnd)}`);
    }
  }

  // Validate: transition after hop eligibility time
  if (config.expectedChecks.transitionAfterHopTime && transitionTime !== null) {
    if (transitionTime < config.hopTime) {
      failures.push(
        `Transition at ${formatTime(transitionTime)} is before hop eligibility time ${formatTime(config.hopTime)}`
      );
    }
  }

  // Check if park 2 rides are after transition
  if (transitionTime !== null) {
    for (const ride of park2RideItems) {
      if (ride.scheduledTime < transitionTime) {
        failures.push(
          `Park 2 ride "${ride.ride?.name}" scheduled at ${formatTime(ride.scheduledTime)} before transition at ${formatTime(transitionTime)}`
        );
      }
    }
  }

  // Check if park 1 rides are before transition (no going back after hopping)
  if (transitionTime !== null) {
    for (const ride of park1RideItems) {
      if (ride.scheduledTime >= transitionTime) {
        failures.push(
          `Park 1 ride "${ride.ride?.name}" scheduled at ${formatTime(ride.scheduledTime)} AFTER transition at ${formatTime(transitionTime)} - cannot return to Park 1`
        );
      }
    }
  }

  // Warnings
  if (result.overflow.length > 0) {
    warnings.push(`${result.overflow.length} rides in overflow: ${result.overflow.map((o) => o.ride.name).join(', ')}`);
  }

  if (!transitionTime && config.park2Rides.length > 0) {
    warnings.push('No transition scheduled but Park 2 rides were requested');
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    details: {
      totalRidesScheduled: rideItems.length,
      park1Rides: park1RideItems.length,
      park2Rides: park2RideItems.length,
      transitionTime,
      entertainmentOverlaps,
      scheduleStart,
      scheduleEnd,
    },
  };
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================

console.log('='.repeat(80));
console.log('PARK HOPPER TESTS');
console.log('='.repeat(80));

const allTests = [...DL_TO_DCA_TESTS, ...DCA_TO_DL_TESTS, ...EDGE_CASE_TESTS];
let passed = 0;
let failed = 0;
const failedTests: string[] = [];
const testResults: Array<{
  id: string;
  name: string;
  passed: boolean;
  failures: string[];
  warnings: string[];
  details: ReturnType<typeof runParkHopperTest>['details'];
}> = [];

// Run Disneyland → DCA tests
console.log('\n--- DISNEYLAND → DCA TESTS ---\n');

for (const test of DL_TO_DCA_TESTS) {
  const result = runParkHopperTest(test);
  testResults.push({ id: test.id, name: test.name, ...result });

  if (result.passed) {
    passed++;
    console.log(`✓ ${test.id}: ${test.name}`);
    console.log(
      `  → Park 1: ${result.details.park1Rides} rides, Park 2: ${result.details.park2Rides} rides`
    );
    if (result.details.transitionTime) {
      console.log(`  → Transition at ${formatTime(result.details.transitionTime)}`);
    }
  } else {
    failed++;
    failedTests.push(test.id);
    console.log(`✗ ${test.id}: ${test.name}`);
    result.failures.forEach((f) => console.log(`  FAIL: ${f}`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`  WARN: ${w}`));
  }
}

// Run DCA → Disneyland tests
console.log('\n--- DCA → DISNEYLAND TESTS ---\n');

for (const test of DCA_TO_DL_TESTS) {
  const result = runParkHopperTest(test);
  testResults.push({ id: test.id, name: test.name, ...result });

  if (result.passed) {
    passed++;
    console.log(`✓ ${test.id}: ${test.name}`);
    console.log(
      `  → Park 1: ${result.details.park1Rides} rides, Park 2: ${result.details.park2Rides} rides`
    );
    if (result.details.transitionTime) {
      console.log(`  → Transition at ${formatTime(result.details.transitionTime)}`);
    }
  } else {
    failed++;
    failedTests.push(test.id);
    console.log(`✗ ${test.id}: ${test.name}`);
    result.failures.forEach((f) => console.log(`  FAIL: ${f}`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`  WARN: ${w}`));
  }
}

// Run edge case tests
console.log('\n--- EDGE CASE TESTS ---\n');

for (const test of EDGE_CASE_TESTS) {
  const result = runParkHopperTest(test);
  testResults.push({ id: test.id, name: test.name, ...result });

  if (result.passed) {
    passed++;
    console.log(`✓ ${test.id}: ${test.name}`);
    console.log(
      `  → Park 1: ${result.details.park1Rides} rides, Park 2: ${result.details.park2Rides} rides`
    );
    if (result.details.transitionTime) {
      console.log(`  → Transition at ${formatTime(result.details.transitionTime)}`);
    }
  } else {
    failed++;
    failedTests.push(test.id);
    console.log(`✗ ${test.id}: ${test.name}`);
    result.failures.forEach((f) => console.log(`  FAIL: ${f}`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`  WARN: ${w}`));
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('PARK HOPPER TEST SUMMARY');
console.log('='.repeat(80));

console.log(`\nTotal: ${allTests.length} tests`);
console.log(`Passed: ${passed} (${((passed / allTests.length) * 100).toFixed(1)}%)`);
console.log(`Failed: ${failed}`);

if (failedTests.length > 0) {
  console.log(`\nFailed Tests: ${failedTests.join(', ')}`);
}

// Category breakdown
const dlToDcaResults = testResults.filter((r) => DL_TO_DCA_TESTS.some((t) => t.id === r.id));
const dcaToDlResults = testResults.filter((r) => DCA_TO_DL_TESTS.some((t) => t.id === r.id));
const edgeCaseResults = testResults.filter((r) => EDGE_CASE_TESTS.some((t) => t.id === r.id));

console.log(`\nBy Category:`);
console.log(
  `  DL → DCA:     ${dlToDcaResults.filter((r) => r.passed).length}/${dlToDcaResults.length} passed`
);
console.log(
  `  DCA → DL:     ${dcaToDlResults.filter((r) => r.passed).length}/${dcaToDlResults.length} passed`
);
console.log(
  `  Edge Cases:   ${edgeCaseResults.filter((r) => r.passed).length}/${edgeCaseResults.length} passed`
);

// Warnings summary
const allWarnings = testResults.flatMap((r) => r.warnings);
if (allWarnings.length > 0) {
  console.log(`\nWarnings Summary (${allWarnings.length} total):`);
  const uniqueWarnings = [...new Set(allWarnings)];
  uniqueWarnings.slice(0, 5).forEach((w) => console.log(`  - ${w}`));
  if (uniqueWarnings.length > 5) {
    console.log(`  ... and ${uniqueWarnings.length - 5} more`);
  }
}

console.log('\n');
