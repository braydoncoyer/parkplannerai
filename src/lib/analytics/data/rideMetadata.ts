// Ride Metadata - Maps ride names to popularity tiers and height requirements
// Uses pattern matching for flexible name matching from API
// Height requirements sourced from official park websites (Disney, Universal)

import type { RidePopularity, RideCategory, RideMetadata } from '../types';

/**
 * Ride metadata database
 * namePatterns: Array of strings to match (case-insensitive, partial match)
 * minHeight: Minimum height requirement in inches (undefined = no requirement)
 */
export const RIDE_METADATA_DB: RideMetadata[] = [
  // ==========================================
  // WALT DISNEY WORLD - MAGIC KINGDOM
  // ==========================================
  {
    namePatterns: ['tron lightcycle', 'tron'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 48,
  },
  {
    namePatterns: ['seven dwarfs mine train', 'seven dwarfs'],
    popularity: 'headliner',
    category: 'family',
    duration: 3,
    minHeight: 38,
  },
  {
    namePatterns: ['space mountain'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
    minHeight: 44,
  },
  {
    namePatterns: ['big thunder mountain', 'big thunder'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
    minHeight: 40,
  },
  {
    namePatterns: ["tiana's bayou adventure", 'tiana'],
    popularity: 'headliner',
    category: 'family',
    duration: 11,
    minHeight: 40,
  },
  {
    namePatterns: ['barnstormer', 'great goofini'],
    popularity: 'low',
    category: 'kids',
    duration: 1,
    minHeight: 35,
  },
  {
    namePatterns: ['tomorrowland speedway', 'speedway'],
    popularity: 'low',
    category: 'kids',
    duration: 5,
    minHeight: 32,
  },
  {
    namePatterns: ["peter pan's flight", 'peter pan'],
    popularity: 'popular',
    category: 'family',
    duration: 3,
  },
  {
    namePatterns: ['pirates of the caribbean', 'pirates'],
    popularity: 'moderate',
    category: 'family',
    duration: 8,
  },
  {
    namePatterns: ['haunted mansion'],
    popularity: 'moderate',
    category: 'family',
    duration: 8,
  },
  {
    namePatterns: ['jungle cruise'],
    popularity: 'moderate',
    category: 'family',
    duration: 10,
  },
  {
    namePatterns: ["buzz lightyear's space ranger", 'buzz lightyear'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['winnie the pooh', 'many adventures'],
    popularity: 'moderate',
    category: 'kids',
    duration: 4,
  },
  {
    namePatterns: ['carousel', 'cinderella', 'prince charming'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['dumbo', 'flying elephants'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['small world', "it's a small world"],
    popularity: 'low',
    category: 'family',
    duration: 15,
  },
  {
    namePatterns: ['tiki room', 'enchanted tiki'],
    popularity: 'low',
    category: 'show',
    duration: 15,
  },
  {
    namePatterns: ['country bear', 'country bears'],
    popularity: 'low',
    category: 'show',
    duration: 15,
  },
  {
    namePatterns: ['peoplemover', 'tomorrowland transit'],
    popularity: 'low',
    category: 'family',
    duration: 10,
  },
  {
    namePatterns: ['astro orbiter'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['magic carpets', 'aladdin'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['under the sea', 'little mermaid', 'ariel'],
    popularity: 'low',
    category: 'family',
    duration: 6,
  },
  {
    namePatterns: ['mad tea party', 'tea cups'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['liberty square riverboat', 'riverboat'],
    popularity: 'low',
    category: 'family',
    duration: 17,
  },
  {
    namePatterns: ['tom sawyer island'],
    popularity: 'low',
    category: 'kids',
    duration: 30,
  },
  {
    namePatterns: ['hall of presidents'],
    popularity: 'low',
    category: 'show',
    duration: 25,
  },
  {
    namePatterns: ['carousel of progress'],
    popularity: 'low',
    category: 'show',
    duration: 21,
  },
  {
    namePatterns: ['monsters inc laugh floor', 'laugh floor'],
    popularity: 'low',
    category: 'show',
    duration: 15,
  },

  // ==========================================
  // WALT DISNEY WORLD - EPCOT
  // ==========================================
  {
    namePatterns: ['guardians of the galaxy', 'cosmic rewind'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 42,
  },
  {
    namePatterns: ['remy', "remy's ratatouille", 'ratatouille'],
    popularity: 'headliner',
    category: 'family',
    duration: 4,
  },
  {
    namePatterns: ['test track'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['frozen ever after', 'frozen'],
    popularity: 'popular',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['soarin'],
    popularity: 'popular',
    category: 'family',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['mission: space orange', 'mission space orange', 'orange mission'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 44,
  },
  {
    namePatterns: ['mission: space green', 'mission space green', 'green mission'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['mission: space', 'mission space'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 40, // Green version default
  },
  {
    namePatterns: ['spaceship earth'],
    popularity: 'moderate',
    category: 'family',
    duration: 15,
  },
  {
    namePatterns: ['living with the land'],
    popularity: 'moderate',
    category: 'family',
    duration: 14,
  },
  {
    namePatterns: ['the seas with nemo', 'nemo & friends', 'finding nemo'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['journey into imagination', 'figment'],
    popularity: 'moderate',
    category: 'family',
    duration: 8,
  },
  {
    namePatterns: ['gran fiesta tour', 'three caballeros'],
    popularity: 'low',
    category: 'family',
    duration: 8,
  },

  // ==========================================
  // WALT DISNEY WORLD - HOLLYWOOD STUDIOS
  // ==========================================
  {
    namePatterns: ['rise of the resistance', 'star wars rise'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 18,
    minHeight: 40,
  },
  {
    namePatterns: ['slinky dog dash', 'slinky dog'],
    popularity: 'headliner',
    category: 'family',
    duration: 2,
    minHeight: 38,
  },
  {
    namePatterns: ['tower of terror', 'twilight zone tower'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ["rock 'n' roller", 'rock n roller', 'aerosmith'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
    minHeight: 48,
  },
  {
    namePatterns: ['millennium falcon', 'smugglers run'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
    minHeight: 38,
  },
  {
    namePatterns: ['toy story mania'],
    popularity: 'popular',
    category: 'family',
    duration: 7,
  },
  {
    namePatterns: ['star tours'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['runaway railway', 'mickey & minnie', "mickey and minnie's"],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['alien swirling saucers'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
    minHeight: 32,
  },
  {
    namePatterns: ['muppet*vision', 'muppet vision', 'muppets'],
    popularity: 'low',
    category: 'show',
    duration: 15,
  },

  // ==========================================
  // WALT DISNEY WORLD - ANIMAL KINGDOM
  // ==========================================
  {
    namePatterns: ['flight of passage', 'avatar flight'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 44,
  },
  {
    namePatterns: ['expedition everest', 'everest'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
    minHeight: 44,
  },
  {
    namePatterns: ["na'vi river journey", 'navi river'],
    popularity: 'popular',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['kilimanjaro safaris', 'safari'],
    popularity: 'popular',
    category: 'family',
    duration: 22,
  },
  {
    namePatterns: ['dinosaur'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 4,
    minHeight: 40,
  },
  {
    namePatterns: ['kali river rapids', 'kali river'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 38,
  },
  {
    namePatterns: ['gorilla falls', 'pangani forest'],
    popularity: 'low',
    category: 'family',
    duration: 30,
  },
  {
    namePatterns: ['maharajah jungle trek'],
    popularity: 'low',
    category: 'family',
    duration: 30,
  },
  {
    namePatterns: ['triceratop spin'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ["it's tough to be a bug", 'tough to be a bug'],
    popularity: 'low',
    category: 'show',
    duration: 9,
  },
  {
    namePatterns: ['feathered friends', 'flights of wonder', 'bird show'],
    popularity: 'low',
    category: 'show',
    duration: 25,
  },
  {
    namePatterns: ['animation experience', 'conservation station'],
    popularity: 'low',
    category: 'family',
    duration: 30,
  },

  // ==========================================
  // DISNEYLAND RESORT - DISNEYLAND PARK
  // ==========================================
  {
    namePatterns: ['indiana jones adventure', 'indiana jones'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 4,
    minHeight: 46,
  },
  {
    namePatterns: ['matterhorn bobsleds', 'matterhorn'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
    minHeight: 42,
  },
  {
    namePatterns: ["chip 'n' dale's gadgetcoaster", 'gadgetcoaster', 'gadget'],
    popularity: 'low',
    category: 'kids',
    duration: 1,
    minHeight: 35,
  },
  {
    namePatterns: ['autopia'],
    popularity: 'low',
    category: 'kids',
    duration: 5,
    minHeight: 32,
  },
  {
    namePatterns: ['roger rabbit', 'car toon spin'],
    popularity: 'moderate',
    category: 'family',
    duration: 4,
  },
  {
    namePatterns: ['mr. toad', "mr toad's wild ride"],
    popularity: 'moderate',
    category: 'family',
    duration: 2,
  },
  {
    namePatterns: ['snow white', "snow white's enchanted wish", "snow white's scary"],
    popularity: 'moderate',
    category: 'family',
    duration: 3,
  },
  {
    namePatterns: ['alice in wonderland'],
    popularity: 'moderate',
    category: 'family',
    duration: 4,
  },
  {
    namePatterns: ["pinocchio's daring journey", 'pinocchio'],
    popularity: 'low',
    category: 'family',
    duration: 3,
  },
  {
    namePatterns: ['storybook land canal', 'storybook land'],
    popularity: 'low',
    category: 'family',
    duration: 8,
  },
  {
    namePatterns: ['casey jr.', 'casey jr circus'],
    popularity: 'low',
    category: 'kids',
    duration: 4,
  },
  {
    namePatterns: ['king arthur carrousel'],
    popularity: 'low',
    category: 'kids',
    duration: 3,
  },
  {
    namePatterns: ['finding nemo submarine', 'submarine voyage'],
    popularity: 'moderate',
    category: 'family',
    duration: 14,
  },

  // ==========================================
  // DISNEYLAND RESORT - CALIFORNIA ADVENTURE
  // ==========================================
  {
    namePatterns: ['radiator springs racers', 'radiator springs'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['web slingers', 'spider-man web'],
    popularity: 'headliner',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['incredicoaster'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
    minHeight: 48,
  },
  {
    namePatterns: ['guardians of the galaxy – mission: breakout', 'mission: breakout', 'mission breakout'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
    minHeight: 40,
  },
  {
    namePatterns: ['grizzly river run', 'grizzly river'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 8,
    minHeight: 42,
  },
  {
    namePatterns: ["goofy's sky school", 'goofy sky school'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 2,
    minHeight: 42,
  },
  {
    namePatterns: ['silly symphony swings'],
    popularity: 'moderate',
    category: 'family',
    duration: 2,
    minHeight: 40, // 48 for single, 40 for tandem
  },
  {
    namePatterns: ["jumpin' jellyfish", 'jumpin jellyfish'],
    popularity: 'low',
    category: 'kids',
    duration: 1,
    minHeight: 40,
  },
  {
    namePatterns: ["mater's junkyard jamboree", 'mater junkyard'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
    minHeight: 32,
  },
  {
    namePatterns: ["luigi's rollickin' roadsters", 'luigi rollickin'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
    minHeight: 32,
  },
  {
    namePatterns: ['monsters, inc. mike & sulley', 'monsters inc'],
    popularity: 'moderate',
    category: 'family',
    duration: 4,
  },
  {
    namePatterns: ['toy story midway mania', 'midway mania'],
    popularity: 'popular',
    category: 'family',
    duration: 7,
  },
  {
    namePatterns: ['little mermaid', 'ariel undersea'],
    popularity: 'moderate',
    category: 'family',
    duration: 6,
  },
  {
    namePatterns: ['golden zephyr'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },

  // ==========================================
  // UNIVERSAL ORLANDO - UNIVERSAL STUDIOS FLORIDA
  // ==========================================
  {
    namePatterns: ['escape from gringotts', 'gringotts'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
    minHeight: 42,
  },
  {
    namePatterns: ['revenge of the mummy', 'mummy'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
    minHeight: 48,
  },
  {
    namePatterns: ['men in black', 'alien attack'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 42,
  },
  {
    namePatterns: ['simpsons ride', 'simpsons'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['transformers', '3d battle'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['despicable me minion mayhem', 'minion mayhem'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['fast & furious', 'fast and furious', 'supercharged'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['race through new york', 'jimmy fallon'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['et adventure', 'e.t. adventure'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 34,
  },
  {
    namePatterns: ['trolls trollercoaster'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
    minHeight: 36,
  },
  {
    namePatterns: ['hogwarts express', 'king', 'cross station'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['villain-con minion blast', 'minion blast'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ["kang & kodos", 'twirl', "n' hurl"],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },

  // ==========================================
  // UNIVERSAL ORLANDO - ISLANDS OF ADVENTURE
  // ==========================================
  {
    namePatterns: ["hagrid's magical creatures", "hagrid's motorbike"],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 48,
  },
  {
    namePatterns: ['velocicoaster'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 51,
  },
  {
    namePatterns: ['forbidden journey', 'harry potter and the forbidden'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 48,
  },
  {
    namePatterns: ['incredible hulk', 'hulk coaster'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
    minHeight: 54,
  },
  {
    namePatterns: ['doctor doom', 'fearfall'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 1,
    minHeight: 52,
  },
  {
    namePatterns: ['dudley do-right', 'ripsaw falls'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 44,
  },
  {
    namePatterns: ['spider-man', 'amazing adventures'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['jurassic park river', 'jurassic world river'],
    popularity: 'moderate',
    category: 'family',
    duration: 7,
    minHeight: 42,
  },
  {
    namePatterns: ['popeye & bluto', 'bilge-rat barges'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 42,
  },
  {
    namePatterns: ['skull island', 'reign of kong'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 6,
    minHeight: 36,
  },
  {
    namePatterns: ['flight of the hippogriff', 'hippogriff'],
    popularity: 'moderate',
    category: 'family',
    duration: 1,
    minHeight: 36,
  },
  {
    namePatterns: ['cat in the hat'],
    popularity: 'low',
    category: 'kids',
    duration: 4,
    minHeight: 36,
  },
  {
    namePatterns: ['high in the sky', 'seuss trolley'],
    popularity: 'low',
    category: 'kids',
    duration: 4,
    minHeight: 36,
  },
  {
    namePatterns: ['pteranodon flyers'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
    minHeight: 36,
  },
  {
    namePatterns: ['one fish two fish', 'seuss'],
    popularity: 'low',
    category: 'kids',
    duration: 3,
  },
  {
    namePatterns: ['caro-seuss-el'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['storm force', 'accelatron'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },

  // ==========================================
  // UNIVERSAL ORLANDO - EPIC UNIVERSE
  // ==========================================
  {
    namePatterns: ['battle at the ministry', 'ministry of magic'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['stardust racers'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 48,
  },
  {
    namePatterns: ['dragon racer', 'dragon racers rally'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
    minHeight: 48,
  },
  {
    namePatterns: ['monsters unchained', 'frankenstein experiment'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 48,
  },
  {
    namePatterns: ['mario kart', "bowser's challenge"],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
    minHeight: 40,
  },
  {
    namePatterns: ['mine-cart madness', 'mine cart madness', 'donkey kong'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 4,
    minHeight: 40,
  },
  {
    namePatterns: ['curse of the werewolf', 'werewolf'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
    minHeight: 40,
  },
  {
    namePatterns: ["hiccup's wing gliders", 'wing gliders', 'how to train your dragon'],
    popularity: 'popular',
    category: 'family',
    duration: 3,
    minHeight: 40,
  },
  {
    namePatterns: ["yoshi's adventure", 'yoshi'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
    minHeight: 34,
  },
  {
    namePatterns: ['astronomica'],
    popularity: 'low',
    category: 'family',
    duration: 3,
  },
  {
    namePatterns: ['constellation carousel'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['fyre drill'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
  },
  {
    namePatterns: ['viking training camp'],
    popularity: 'low',
    category: 'kids',
    duration: 15,
  },
];

/**
 * Find ride metadata by name using fuzzy matching
 */
export function findRideMetadata(rideName: string): RideMetadata | null {
  const normalizedName = rideName.toLowerCase().trim();

  for (const metadata of RIDE_METADATA_DB) {
    for (const pattern of metadata.namePatterns) {
      if (normalizedName.includes(pattern.toLowerCase())) {
        return metadata;
      }
    }
  }

  return null;
}

/**
 * Get ride popularity, with fallback based on current wait time
 */
export function getRidePopularity(
  rideName: string,
  currentWaitTime?: number | null
): RidePopularity {
  const metadata = findRideMetadata(rideName);

  if (metadata) {
    return metadata.popularity;
  }

  // Fallback: infer popularity from current wait time
  if (currentWaitTime === null || currentWaitTime === undefined) {
    return 'moderate'; // Default assumption
  }

  if (currentWaitTime >= 60) return 'headliner';
  if (currentWaitTime >= 35) return 'popular';
  if (currentWaitTime >= 15) return 'moderate';
  return 'low';
}

/**
 * Get ride category, with fallback
 */
export function getRideCategory(rideName: string): RideCategory {
  const metadata = findRideMetadata(rideName);
  return metadata?.category ?? 'other';
}

/**
 * Get ride duration, with fallback
 */
export function getRideDuration(rideName: string): number {
  const metadata = findRideMetadata(rideName);
  return metadata?.duration ?? 5; // Default 5 minutes
}

/**
 * Get ride minimum height requirement in inches
 * Returns undefined if no height requirement
 */
export function getRideMinHeight(rideName: string): number | undefined {
  const metadata = findRideMetadata(rideName);
  return metadata?.minHeight;
}

/**
 * Check if a rider meets the height requirement for a ride
 */
export function meetsHeightRequirement(rideName: string, riderHeightInches: number): boolean {
  const minHeight = getRideMinHeight(rideName);
  if (minHeight === undefined) return true; // No requirement
  return riderHeightInches >= minHeight;
}

/**
 * Format height for display (inches to feet and inches)
 */
export function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  if (feet === 0) return `${inches}"`;
  if (remainingInches === 0) return `${feet}'`;
  return `${feet}'${remainingInches}"`;
}

/**
 * Get full ride info with all metadata
 */
export function enrichRideWithMetadata(ride: {
  id: number | string;
  name: string;
  land?: string;
  isOpen?: boolean;
  waitTime?: number | null;
}): {
  id: number | string;
  name: string;
  land?: string;
  isOpen: boolean;
  currentWaitTime: number | null;
  popularity: RidePopularity;
  category: RideCategory;
  duration: number;
  minHeight?: number;
} {
  return {
    id: ride.id,
    name: ride.name,
    land: ride.land,
    isOpen: ride.isOpen ?? true,
    currentWaitTime: ride.waitTime ?? null,
    popularity: getRidePopularity(ride.name, ride.waitTime),
    category: getRideCategory(ride.name),
    duration: getRideDuration(ride.name),
    minHeight: getRideMinHeight(ride.name),
  };
}
