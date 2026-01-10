// Ride Metadata - Maps ride names to popularity tiers
// Uses pattern matching for flexible name matching from API

import type { RidePopularity, RideCategory, RideMetadata } from '../types';

/**
 * Ride metadata database
 * namePatterns: Array of strings to match (case-insensitive, partial match)
 */
export const RIDE_METADATA_DB: RideMetadata[] = [
  // ==========================================
  // HEADLINER RIDES (75 min base wait)
  // ==========================================

  // Universal - Epic Universe / Islands of Adventure / Studios
  {
    namePatterns: ['battle at the ministry', 'ministry of magic'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ["hagrid's magical creatures", "hagrid's motorbike"],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
  },
  {
    namePatterns: ['velocicoaster'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
  },
  {
    namePatterns: ['forbidden journey', 'harry potter and the forbidden'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
  },

  // Disney - Magic Kingdom
  {
    namePatterns: ['seven dwarfs mine train', 'seven dwarfs'],
    popularity: 'headliner',
    category: 'family',
    duration: 3,
  },
  {
    namePatterns: ['tron lightcycle', 'tron'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
  },

  // Disney - Hollywood Studios
  {
    namePatterns: ['rise of the resistance', 'star wars rise'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 18,
  },
  {
    namePatterns: ['slinky dog dash', 'slinky dog'],
    popularity: 'headliner',
    category: 'family',
    duration: 2,
  },

  // Disney - Animal Kingdom
  {
    namePatterns: ['flight of passage', 'avatar flight'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 5,
  },

  // Disney - EPCOT
  {
    namePatterns: ['guardians of the galaxy', 'cosmic rewind'],
    popularity: 'headliner',
    category: 'thrill',
    duration: 3,
  },
  {
    namePatterns: ['remy', "remy's ratatouille", 'ratatouille'],
    popularity: 'headliner',
    category: 'family',
    duration: 4,
  },

  // ==========================================
  // POPULAR RIDES (45 min base wait)
  // ==========================================

  // Universal
  {
    namePatterns: ['escape from gringotts', 'gringotts'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ['revenge of the mummy', 'mummy'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
  },
  {
    namePatterns: ['hollywood rip ride rockit', 'rip ride'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
  },
  {
    namePatterns: ['incredible hulk', 'hulk coaster'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
  },
  {
    namePatterns: ['jurassic world velocicoaster'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
  },

  // Disney - Magic Kingdom
  {
    namePatterns: ['space mountain'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
  },
  {
    namePatterns: ['big thunder mountain', 'big thunder'],
    popularity: 'popular',
    category: 'thrill',
    duration: 4,
  },
  {
    namePatterns: ['splash mountain'],
    popularity: 'popular',
    category: 'thrill',
    duration: 11,
  },
  {
    namePatterns: ["peter pan's flight", 'peter pan'],
    popularity: 'popular',
    category: 'family',
    duration: 3,
  },

  // Disney - Hollywood Studios
  {
    namePatterns: ['tower of terror', 'twilight zone tower'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ["rock 'n' roller", 'rock n roller', 'aerosmith'],
    popularity: 'popular',
    category: 'thrill',
    duration: 2,
  },
  {
    namePatterns: ['millennium falcon', 'smugglers run'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ['toy story mania'],
    popularity: 'popular',
    category: 'family',
    duration: 7,
  },

  // Disney - Animal Kingdom
  {
    namePatterns: ['expedition everest', 'everest'],
    popularity: 'popular',
    category: 'thrill',
    duration: 3,
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

  // Disney - EPCOT
  {
    namePatterns: ['test track'],
    popularity: 'popular',
    category: 'thrill',
    duration: 5,
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
  },

  // ==========================================
  // MODERATE RIDES (25 min base wait)
  // ==========================================

  // Universal
  {
    namePatterns: ['men in black', 'alien attack'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['simpsons ride', 'simpsons'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },
  {
    namePatterns: ['transformers', '3d battle'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ['spider-man', 'amazing adventures'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ['jurassic park river', 'jurassic world'],
    popularity: 'moderate',
    category: 'family',
    duration: 7,
  },

  // Disney - Magic Kingdom
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

  // Disney - EPCOT
  {
    namePatterns: ['spaceship earth'],
    popularity: 'moderate',
    category: 'family',
    duration: 15,
  },
  {
    namePatterns: ['living with the land', 'living seas'],
    popularity: 'moderate',
    category: 'family',
    duration: 14,
  },
  {
    namePatterns: ['journey into imagination', 'figment'],
    popularity: 'moderate',
    category: 'family',
    duration: 8,
  },

  // Disney - Hollywood Studios
  {
    namePatterns: ['star tours'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
  },
  {
    namePatterns: ['runaway railway', 'mickey & minnie'],
    popularity: 'moderate',
    category: 'family',
    duration: 5,
  },

  // Disney - Animal Kingdom
  {
    namePatterns: ['dinosaur'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 4,
  },
  {
    namePatterns: ['kali river rapids', 'kali river'],
    popularity: 'moderate',
    category: 'thrill',
    duration: 5,
  },

  // ==========================================
  // LOW WAIT RIDES (10 min base wait)
  // ==========================================
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
    namePatterns: ['one fish two fish', 'seuss'],
    popularity: 'low',
    category: 'kids',
    duration: 3,
  },
  {
    namePatterns: ['cat in the hat'],
    popularity: 'low',
    category: 'kids',
    duration: 4,
  },
  {
    namePatterns: ['caro-seuss-el'],
    popularity: 'low',
    category: 'kids',
    duration: 2,
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
  };
}
