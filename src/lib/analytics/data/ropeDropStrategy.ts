// Rope Drop Strategy Data
// Defines the best rides to hit first at each park when rope dropping
// Based on community knowledge and typical wait time patterns

export interface RopeDropTarget {
  rideName: string;          // Name to match against API ride names
  rideNameAliases?: string[]; // Alternative names/spellings
  priority: 1 | 2 | 3;       // 1 = highest priority, hit FIRST
  typicalRopeDropWait: number; // Wait time if you rope drop (minutes)
  typicalMiddayWait: number;   // Wait time at peak (for comparison)
  notes?: string;
  requiresVirtualQueue?: boolean;
  boardingGroupTips?: string;
}

export interface ParkRopeDropStrategy {
  parkId: number;
  parkName: string;
  generalTips: string[];
  targets: RopeDropTarget[];
  suggestedOrder: string[]; // Ride names in optimal rope drop order
}

/**
 * Rope drop strategies by park
 */
export const ROPE_DROP_STRATEGIES: Record<number, ParkRopeDropStrategy> = {
  // Magic Kingdom
  6: {
    parkId: 6,
    parkName: 'Magic Kingdom',
    generalTips: [
      'Head to the back of the park first - Fantasyland and Tomorrowland fill up quickly',
      'Seven Dwarfs Mine Train has the biggest wait time difference between rope drop and midday',
      'Consider skipping Main Street shops on arrival - they\'ll be there all day',
    ],
    targets: [
      {
        rideName: 'Seven Dwarfs Mine Train',
        priority: 1,
        typicalRopeDropWait: 20,
        typicalMiddayWait: 90,
        notes: 'THE rope drop target at MK - wait difference of 70+ minutes',
      },
      {
        rideName: 'TRON Lightcycle / Run',
        rideNameAliases: ['TRON', 'Lightcycle'],
        priority: 1,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 100,
        requiresVirtualQueue: true,
        boardingGroupTips: 'Join virtual queue at 7 AM. If missed, try standby at rope drop.',
      },
      {
        rideName: 'Space Mountain',
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 65,
      },
      {
        rideName: 'Big Thunder Mountain Railroad',
        priority: 2,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 55,
      },
      {
        rideName: 'Peter Pan\'s Flight',
        rideNameAliases: ['Peter Pan'],
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 70,
        notes: 'Always has a line - rope drop is the best time',
      },
    ],
    suggestedOrder: [
      'Seven Dwarfs Mine Train',
      'Peter Pan\'s Flight',
      'Space Mountain',
      'Big Thunder Mountain Railroad',
    ],
  },

  // EPCOT
  5: {
    parkId: 5,
    parkName: 'EPCOT',
    generalTips: [
      'Guardians of the Galaxy and Remy are the main rope drop targets',
      'Test Track has single rider line that stays short most of the day',
      'World Showcase doesn\'t open until 11 AM',
    ],
    targets: [
      {
        rideName: 'Guardians of the Galaxy: Cosmic Rewind',
        rideNameAliases: ['Guardians', 'Cosmic Rewind'],
        priority: 1,
        typicalRopeDropWait: 35,
        typicalMiddayWait: 120,
        requiresVirtualQueue: true,
        boardingGroupTips: 'Virtual queue at 7 AM is essential. Standby sometimes available.',
      },
      {
        rideName: 'Remy\'s Ratatouille Adventure',
        rideNameAliases: ['Remy', 'Ratatouille'],
        priority: 1,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 75,
      },
      {
        rideName: 'Frozen Ever After',
        rideNameAliases: ['Frozen'],
        priority: 2,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 70,
      },
      {
        rideName: 'Test Track',
        priority: 2,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 65,
        notes: 'Single rider line is often faster than standby',
      },
    ],
    suggestedOrder: [
      'Guardians of the Galaxy: Cosmic Rewind',
      'Remy\'s Ratatouille Adventure',
      'Frozen Ever After',
      'Test Track',
    ],
  },

  // Hollywood Studios
  7: {
    parkId: 7,
    parkName: "Disney's Hollywood Studios",
    generalTips: [
      'Rise of the Resistance is THE rope drop priority - run there first',
      'Slinky Dog and Mickey & Minnie\'s Runaway Railway are also great rope drop targets',
      'Tower of Terror and Rock \'n\' Roller Coaster stay reasonable throughout the day',
    ],
    targets: [
      {
        rideName: 'Star Wars: Rise of the Resistance',
        rideNameAliases: ['Rise of the Resistance', 'ROTR'],
        priority: 1,
        typicalRopeDropWait: 45,
        typicalMiddayWait: 120,
        notes: 'Most popular ride at WDW - rope drop essential',
      },
      {
        rideName: 'Slinky Dog Dash',
        rideNameAliases: ['Slinky Dog'],
        priority: 1,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 80,
      },
      {
        rideName: "Mickey & Minnie's Runaway Railway",
        rideNameAliases: ['Runaway Railway'],
        priority: 2,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 70,
      },
      {
        rideName: 'Millennium Falcon: Smugglers Run',
        rideNameAliases: ['Millennium Falcon', 'Smugglers Run'],
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 55,
      },
    ],
    suggestedOrder: [
      'Star Wars: Rise of the Resistance',
      'Slinky Dog Dash',
      "Mickey & Minnie's Runaway Railway",
      'Millennium Falcon: Smugglers Run',
    ],
  },

  // Animal Kingdom
  8: {
    parkId: 8,
    parkName: "Disney's Animal Kingdom",
    generalTips: [
      'Flight of Passage is the must-do rope drop - get there 30 min before open',
      'Na\'vi River Journey has shorter waits but still benefits from rope drop',
      'Kilimanjaro Safaris is best early when animals are active',
    ],
    targets: [
      {
        rideName: 'Avatar Flight of Passage',
        rideNameAliases: ['Flight of Passage'],
        priority: 1,
        typicalRopeDropWait: 35,
        typicalMiddayWait: 120,
        notes: 'THE rope drop target - saves 85+ minutes',
      },
      {
        rideName: 'Na\'vi River Journey',
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 65,
      },
      {
        rideName: 'Kilimanjaro Safaris',
        priority: 2,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 45,
        notes: 'Animals most active in early morning',
      },
      {
        rideName: 'Expedition Everest',
        priority: 3,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 45,
      },
    ],
    suggestedOrder: [
      'Avatar Flight of Passage',
      'Na\'vi River Journey',
      'Kilimanjaro Safaris',
      'Expedition Everest',
    ],
  },

  // Disneyland
  16: {
    parkId: 16,
    parkName: 'Disneyland',
    generalTips: [
      'Rise of the Resistance and Indiana Jones are top rope drop priorities',
      'Matterhorn Bobsleds benefits significantly from rope drop',
      'Space Mountain and Big Thunder stay moderate throughout the day',
    ],
    targets: [
      {
        rideName: 'Star Wars: Rise of the Resistance',
        rideNameAliases: ['Rise of the Resistance'],
        priority: 1,
        typicalRopeDropWait: 40,
        typicalMiddayWait: 100,
      },
      {
        rideName: 'Indiana Jones Adventure',
        rideNameAliases: ['Indiana Jones'],
        priority: 1,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 75,
      },
      {
        rideName: 'Matterhorn Bobsleds',
        rideNameAliases: ['Matterhorn'],
        priority: 2,
        typicalRopeDropWait: 20,
        typicalMiddayWait: 60,
      },
      {
        rideName: 'Big Thunder Mountain Railroad',
        priority: 2,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 50,
      },
    ],
    suggestedOrder: [
      'Star Wars: Rise of the Resistance',
      'Indiana Jones Adventure',
      'Matterhorn Bobsleds',
      'Big Thunder Mountain Railroad',
    ],
  },

  // Disney California Adventure
  17: {
    parkId: 17,
    parkName: 'Disney California Adventure',
    generalTips: [
      'Radiator Springs Racers is THE rope drop target - run to Cars Land first',
      'Guardians of the Galaxy (tower) and WEB SLINGERS are also great early',
      'Incredicoaster stays reasonable most of the day',
    ],
    targets: [
      {
        rideName: 'Radiator Springs Racers',
        rideNameAliases: ['RSR', 'Radiator Springs'],
        priority: 1,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 90,
        notes: 'THE rope drop target at DCA - saves 60+ minutes',
      },
      {
        rideName: 'WEB SLINGERS: A Spider-Man Adventure',
        rideNameAliases: ['WEB SLINGERS', 'Spider-Man'],
        priority: 1,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 65,
      },
      {
        rideName: 'Guardians of the Galaxy - Mission: BREAKOUT!',
        rideNameAliases: ['Guardians', 'Mission Breakout', 'Tower of Terror'],
        priority: 2,
        typicalRopeDropWait: 20,
        typicalMiddayWait: 50,
      },
      {
        rideName: 'Incredicoaster',
        priority: 3,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 40,
      },
    ],
    suggestedOrder: [
      'Radiator Springs Racers',
      'WEB SLINGERS: A Spider-Man Adventure',
      'Guardians of the Galaxy - Mission: BREAKOUT!',
      'Incredicoaster',
    ],
  },

  // Universal Studios Florida
  65: {
    parkId: 65,
    parkName: 'Universal Studios Florida',
    generalTips: [
      'Hagrid\'s is in Islands of Adventure, not this park',
      'Revenge of the Mummy and Hollywood Rip Ride Rockit benefit from rope drop',
      'Harry Potter and the Escape from Gringotts is the top target here',
    ],
    targets: [
      {
        rideName: 'Harry Potter and the Escape from Gringotts',
        rideNameAliases: ['Gringotts', 'Escape from Gringotts'],
        priority: 1,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 75,
      },
      {
        rideName: 'Revenge of the Mummy',
        rideNameAliases: ['Mummy'],
        priority: 2,
        typicalRopeDropWait: 15,
        typicalMiddayWait: 45,
      },
      {
        rideName: 'Hollywood Rip Ride Rockit',
        rideNameAliases: ['Rip Ride Rockit'],
        priority: 2,
        typicalRopeDropWait: 20,
        typicalMiddayWait: 50,
      },
    ],
    suggestedOrder: [
      'Harry Potter and the Escape from Gringotts',
      'Revenge of the Mummy',
      'Hollywood Rip Ride Rockit',
    ],
  },

  // Islands of Adventure
  64: {
    parkId: 64,
    parkName: 'Islands of Adventure',
    generalTips: [
      'Hagrid\'s is THE rope drop target - be at the gate 30+ minutes early',
      'VelociCoaster is also a great rope drop target',
      'The Forbidden Journey stays reasonable if you miss rope drop',
    ],
    targets: [
      {
        rideName: "Hagrid's Magical Creatures Motorbike Adventure",
        rideNameAliases: ['Hagrid', 'Hagrid\'s'],
        priority: 1,
        typicalRopeDropWait: 35,
        typicalMiddayWait: 120,
        notes: 'Most popular ride at Universal - rope drop or very late evening',
      },
      {
        rideName: 'VelociCoaster',
        priority: 1,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 70,
      },
      {
        rideName: 'Harry Potter and the Forbidden Journey',
        rideNameAliases: ['Forbidden Journey'],
        priority: 2,
        typicalRopeDropWait: 20,
        typicalMiddayWait: 55,
      },
      {
        rideName: 'The Amazing Adventures of Spider-Man',
        rideNameAliases: ['Spider-Man'],
        priority: 3,
        typicalRopeDropWait: 10,
        typicalMiddayWait: 35,
      },
    ],
    suggestedOrder: [
      "Hagrid's Magical Creatures Motorbike Adventure",
      'VelociCoaster',
      'Harry Potter and the Forbidden Journey',
    ],
  },

  // Epic Universe
  334: {
    parkId: 334,
    parkName: 'Epic Universe',
    generalTips: [
      'As a new park, all lands will be busy - pick your must-do world first',
      'Ministry of Magic (Harry Potter) and Mario Kart will likely be top targets',
      'Consider starting in the world furthest from the entrance',
    ],
    targets: [
      {
        rideName: 'Harry Potter and the Battle at the Ministry',
        rideNameAliases: ['Battle at the Ministry', 'Ministry'],
        priority: 1,
        typicalRopeDropWait: 45,
        typicalMiddayWait: 120,
        notes: 'Expected to be the most popular ride at Epic Universe',
      },
      {
        rideName: 'Mario Kart: Bowser\'s Challenge',
        rideNameAliases: ['Mario Kart'],
        priority: 1,
        typicalRopeDropWait: 40,
        typicalMiddayWait: 100,
      },
      {
        rideName: 'Donkey Kong Mine Cart Madness',
        rideNameAliases: ['Donkey Kong', 'Mine Cart'],
        priority: 2,
        typicalRopeDropWait: 30,
        typicalMiddayWait: 75,
      },
      {
        rideName: 'Curse of the Werewolf',
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 60,
      },
      {
        rideName: 'Stardust Racers',
        priority: 2,
        typicalRopeDropWait: 25,
        typicalMiddayWait: 55,
      },
    ],
    suggestedOrder: [
      'Harry Potter and the Battle at the Ministry',
      'Mario Kart: Bowser\'s Challenge',
      'Donkey Kong Mine Cart Madness',
      'Stardust Racers',
    ],
  },
};

/**
 * Get rope drop strategy for a specific park
 */
export function getRopeDropStrategy(parkId: number): ParkRopeDropStrategy | null {
  return ROPE_DROP_STRATEGIES[parkId] || null;
}

/**
 * Check if a ride is a rope drop target
 */
export function isRopeDropTarget(rideName: string, parkId: number): RopeDropTarget | null {
  const strategy = ROPE_DROP_STRATEGIES[parkId];
  if (!strategy) return null;

  const lowerName = rideName.toLowerCase();

  for (const target of strategy.targets) {
    if (target.rideName.toLowerCase() === lowerName) {
      return target;
    }
    if (target.rideNameAliases?.some(alias => lowerName.includes(alias.toLowerCase()))) {
      return target;
    }
    if (lowerName.includes(target.rideName.toLowerCase().split(':')[0])) {
      return target;
    }
  }

  return null;
}

/**
 * Get estimated rope drop wait time for a ride
 * Returns the typical rope drop wait if it's a target, or reduced regular wait otherwise
 */
export function getRopeDropWaitEstimate(rideName: string, parkId: number, regularWait: number): number {
  const target = isRopeDropTarget(rideName, parkId);

  if (target) {
    return target.typicalRopeDropWait;
  }

  // For non-target rides, assume 40% of regular wait at rope drop
  return Math.max(5, Math.round(regularWait * 0.4));
}
