/**
 * Ride Weights Data
 *
 * This file contains priority weights for rides across Disney parks.
 * Weights are used to:
 * 1. Prioritize scheduling high-value rides even with longer waits
 * 2. Determine which rides to skip first when time is limited
 * 3. Identify "must-do" attractions for first-time visitors
 *
 * Weight Scale:
 * - 100: Iconic must-do (skip everything else for this)
 * - 90-99: Headliner (worth long waits)
 * - 70-89: Popular (high priority)
 * - 50-69: Family favorite (solid choice)
 * - 30-49: Standard (good if time permits)
 * - 10-29: Low priority (skip if busy)
 *
 * Sources:
 * - Disney Tourist Blog (disneytouristblog.com)
 * - Mouse Hacking (mousehacking.com)
 * - Magic Guides (magicguides.com)
 * - Mickey Visit (mickeyvisit.com)
 */

export type RideCategory = 'headliner' | 'popular' | 'family' | 'standard';

export interface RideWeight {
  weight: number;
  mustDo: boolean;
  category: RideCategory;
  notes?: string;
}

// Pattern-based matching for rides (lowercase)
// More specific patterns should come first
export const RIDE_WEIGHTS: Record<string, RideWeight> = {
  // ============================================================================
  // MAGIC KINGDOM (Park ID: 6)
  // ============================================================================

  // Headliners (90-100)
  'tron lightcycle': { weight: 100, mustDo: true, category: 'headliner', notes: 'Newest headliner, extremely popular' },
  'seven dwarfs mine train': { weight: 95, mustDo: true, category: 'headliner', notes: 'Family coaster, always long waits' },
  'space mountain': { weight: 90, mustDo: true, category: 'headliner', notes: 'Classic indoor coaster' },
  'big thunder mountain': { weight: 88, mustDo: true, category: 'headliner', notes: 'Wildest ride in the wilderness' },
  "tiana's bayou adventure": { weight: 92, mustDo: true, category: 'headliner', notes: 'New in 2024, replaced Splash Mountain' },
  'splash mountain': { weight: 92, mustDo: true, category: 'headliner', notes: 'Classic log flume (now Tianas)' },

  // Popular (70-89)
  'pirates of the caribbean': { weight: 85, mustDo: true, category: 'popular', notes: 'Iconic boat ride' },
  'haunted mansion': { weight: 85, mustDo: true, category: 'popular', notes: '999 happy haunts' },
  "peter pan's flight": { weight: 80, mustDo: false, category: 'popular', notes: 'Classic dark ride, long waits' },
  'jungle cruise': { weight: 75, mustDo: false, category: 'popular', notes: 'Skipper jokes, recently updated' },
  'buzz lightyear': { weight: 70, mustDo: false, category: 'popular', notes: 'Interactive shooter ride' },

  // Family (50-69)
  "it's a small world": { weight: 60, mustDo: false, category: 'family', notes: 'Classic boat ride' },
  'small world': { weight: 60, mustDo: false, category: 'family' },
  'the many adventures of winnie the pooh': { weight: 55, mustDo: false, category: 'family' },
  'winnie the pooh': { weight: 55, mustDo: false, category: 'family' },
  'under the sea': { weight: 55, mustDo: false, category: 'family', notes: 'Little Mermaid dark ride' },
  'little mermaid': { weight: 55, mustDo: false, category: 'family' },
  'prince charming regal carrousel': { weight: 40, mustDo: false, category: 'family' },
  'carrousel': { weight: 40, mustDo: false, category: 'family' },
  'dumbo': { weight: 50, mustDo: false, category: 'family', notes: 'Classic spinner' },
  'magic carpets': { weight: 45, mustDo: false, category: 'family' },
  'barnstormer': { weight: 50, mustDo: false, category: 'family', notes: 'Kids first coaster' },
  'tomorrowland speedway': { weight: 45, mustDo: false, category: 'family' },
  'astro orbiter': { weight: 40, mustDo: false, category: 'standard' },
  'peoplemover': { weight: 55, mustDo: false, category: 'family', notes: 'Relaxing tour of Tomorrowland' },
  'tomorrowland transit authority': { weight: 55, mustDo: false, category: 'family' },

  // Standard (30-49)
  'liberty square riverboat': { weight: 35, mustDo: false, category: 'standard' },
  'tom sawyer island': { weight: 30, mustDo: false, category: 'standard' },
  'country bear jamboree': { weight: 40, mustDo: false, category: 'standard' },
  "walt disney's enchanted tiki room": { weight: 40, mustDo: false, category: 'standard' },
  'tiki room': { weight: 40, mustDo: false, category: 'standard' },
  'hall of presidents': { weight: 35, mustDo: false, category: 'standard' },
  "mickey's philharmagic": { weight: 50, mustDo: false, category: 'family', notes: '3D show' },
  'philharmagic': { weight: 50, mustDo: false, category: 'family' },
  'monsters inc laugh floor': { weight: 45, mustDo: false, category: 'standard' },
  'laugh floor': { weight: 45, mustDo: false, category: 'standard' },

  // ============================================================================
  // EPCOT (Park ID: 5)
  // ============================================================================

  // Headliners (90-100)
  'guardians of the galaxy: cosmic rewind': { weight: 100, mustDo: true, category: 'headliner', notes: 'EPCOTs first coaster, reverse launch' },
  'cosmic rewind': { weight: 100, mustDo: true, category: 'headliner' },
  'test track': { weight: 92, mustDo: true, category: 'headliner', notes: 'Fastest WDW ride at 65mph, reopened 2025' },

  // Popular (70-89)
  'frozen ever after': { weight: 88, mustDo: true, category: 'popular', notes: 'Frozen boat ride, long waits' },
  "remy's ratatouille adventure": { weight: 85, mustDo: true, category: 'popular', notes: 'Trackless dark ride' },
  'ratatouille': { weight: 85, mustDo: true, category: 'popular' },
  "soarin' around the world": { weight: 85, mustDo: true, category: 'popular', notes: 'Hang glider simulator' },
  'soarin': { weight: 85, mustDo: true, category: 'popular' },

  // Family (50-69)
  'spaceship earth': { weight: 70, mustDo: false, category: 'family', notes: 'Iconic EPCOT ride, may be closed for refurb' },
  'living with the land': { weight: 55, mustDo: false, category: 'family', notes: 'Boat ride through greenhouses' },
  'the seas with nemo': { weight: 50, mustDo: false, category: 'family' },
  'nemo': { weight: 50, mustDo: false, category: 'family' },
  'journey into imagination': { weight: 45, mustDo: false, category: 'family', notes: 'Figment ride' },
  'figment': { weight: 45, mustDo: false, category: 'family' },
  'gran fiesta tour': { weight: 45, mustDo: false, category: 'family', notes: 'Three Caballeros boat ride' },
  'three caballeros': { weight: 45, mustDo: false, category: 'family' },

  // Standard
  'mission: space': { weight: 60, mustDo: false, category: 'standard', notes: 'Intense spinner, not for everyone' },
  'mission space': { weight: 60, mustDo: false, category: 'standard' },
  'turtle talk with crush': { weight: 40, mustDo: false, category: 'standard' },

  // ============================================================================
  // HOLLYWOOD STUDIOS (Park ID: 7)
  // ============================================================================

  // Headliners (90-100)
  'rise of the resistance': { weight: 100, mustDo: true, category: 'headliner', notes: 'Best ride at WDW per many rankings' },
  'tower of terror': { weight: 95, mustDo: true, category: 'headliner', notes: 'Twilight Zone drop tower' },
  "rock 'n' roller coaster": { weight: 90, mustDo: true, category: 'headliner', notes: 'Launch coaster with inversions' },
  'rock n roller': { weight: 90, mustDo: true, category: 'headliner' },
  'aerosmith': { weight: 90, mustDo: true, category: 'headliner' },

  // Popular (70-89)
  'millennium falcon': { weight: 85, mustDo: true, category: 'popular', notes: 'Pilot the Falcon' },
  'smugglers run': { weight: 85, mustDo: true, category: 'popular' },
  'slinky dog dash': { weight: 82, mustDo: true, category: 'popular', notes: 'Family coaster, long waits' },
  "mickey & minnie's runaway railway": { weight: 80, mustDo: true, category: 'popular', notes: 'Trackless dark ride' },
  'runaway railway': { weight: 80, mustDo: true, category: 'popular' },
  'toy story mania': { weight: 78, mustDo: false, category: 'popular', notes: '4D shooter game' },

  // Family (50-69)
  'alien swirling saucers': { weight: 50, mustDo: false, category: 'family', notes: 'Gentle spinner' },
  'muppet vision 3d': { weight: 55, mustDo: false, category: 'family' },
  'muppet': { weight: 55, mustDo: false, category: 'family' },

  // Standard
  'star tours': { weight: 65, mustDo: false, category: 'standard', notes: 'Star Wars simulator' },
  'indiana jones stunt': { weight: 50, mustDo: false, category: 'standard' },

  // ============================================================================
  // ANIMAL KINGDOM (Park ID: 8)
  // ============================================================================

  // Headliners (90-100)
  'avatar flight of passage': { weight: 100, mustDo: true, category: 'headliner', notes: 'Best ride at AK, possibly WDW' },
  'flight of passage': { weight: 100, mustDo: true, category: 'headliner' },
  'expedition everest': { weight: 92, mustDo: true, category: 'headliner', notes: 'Yeti coaster, forwards and backwards' },
  'everest': { weight: 92, mustDo: true, category: 'headliner' },

  // Popular (70-89)
  'kilimanjaro safaris': { weight: 88, mustDo: true, category: 'popular', notes: 'Real safari experience' },
  'safari': { weight: 88, mustDo: true, category: 'popular' },
  "na'vi river journey": { weight: 75, mustDo: false, category: 'popular', notes: 'Beautiful boat ride, amazing animatronic' },
  'navi river': { weight: 75, mustDo: false, category: 'popular' },
  'kali river rapids': { weight: 70, mustDo: false, category: 'popular', notes: 'You will get soaked' },

  // Family (50-69)
  'dinosaur': { weight: 65, mustDo: false, category: 'family', notes: 'Closing 2026' },
  'gorilla falls': { weight: 50, mustDo: false, category: 'family' },
  'maharajah jungle trek': { weight: 45, mustDo: false, category: 'family' },
  'wildlife express train': { weight: 40, mustDo: false, category: 'family' },
  'triceratop spin': { weight: 35, mustDo: false, category: 'standard' },

  // New/Coming
  'zootopia': { weight: 75, mustDo: false, category: 'popular', notes: 'Opened Nov 2025' },

  // ============================================================================
  // DISNEYLAND (Park ID: 16)
  // ============================================================================

  // Headliners (90-100)
  'indiana jones adventure': { weight: 98, mustDo: true, category: 'headliner', notes: 'Unique to Disneyland' },
  'indiana jones': { weight: 98, mustDo: true, category: 'headliner' },
  'matterhorn bobsleds': { weight: 95, mustDo: true, category: 'headliner', notes: 'First tubular steel coaster, unique' },
  'matterhorn': { weight: 95, mustDo: true, category: 'headliner' },
  'rise of the resistance dl': { weight: 100, mustDo: true, category: 'headliner' },

  // Popular at DL (shared names handled above)
  'mr. toad': { weight: 75, mustDo: false, category: 'popular', notes: 'Classic, unique to DL' },
  "mr. toad's wild ride": { weight: 75, mustDo: false, category: 'popular' },
  'alice in wonderland': { weight: 65, mustDo: false, category: 'family', notes: 'Unique to DL' },
  "snow white's enchanted wish": { weight: 60, mustDo: false, category: 'family' },
  "snow white's scary adventures": { weight: 60, mustDo: false, category: 'family' },
  "pinocchio's daring journey": { weight: 55, mustDo: false, category: 'family' },
  'pinocchio': { weight: 55, mustDo: false, category: 'family' },
  'finding nemo submarine voyage': { weight: 60, mustDo: false, category: 'family' },
  'submarine': { weight: 60, mustDo: false, category: 'family' },
  "roger rabbit's car toon spin": { weight: 65, mustDo: false, category: 'family' },
  'roger rabbit': { weight: 65, mustDo: false, category: 'family' },

  // ============================================================================
  // DISNEY CALIFORNIA ADVENTURE (Park ID: 17)
  // ============================================================================

  // Headliners (90-100)
  'radiator springs racers': { weight: 100, mustDo: true, category: 'headliner', notes: 'Best DCA ride' },
  'guardians of the galaxy - mission: breakout': { weight: 95, mustDo: true, category: 'headliner', notes: 'Randomized drop tower' },
  'mission breakout': { weight: 95, mustDo: true, category: 'headliner' },
  'breakout': { weight: 95, mustDo: true, category: 'headliner' },
  'incredicoaster': { weight: 88, mustDo: true, category: 'headliner', notes: 'High-speed coaster' },

  // Popular (70-89)
  'web slingers': { weight: 82, mustDo: true, category: 'popular', notes: 'Spider-Man shooter ride' },
  'spider-man': { weight: 82, mustDo: true, category: 'popular' },
  'soarin over california': { weight: 85, mustDo: true, category: 'popular' },
  'grizzly river run': { weight: 75, mustDo: false, category: 'popular', notes: 'River rapids, you will get wet' },
  'toy story midway mania': { weight: 78, mustDo: false, category: 'popular' },
  'midway mania': { weight: 78, mustDo: false, category: 'popular' },

  // Family (50-69)
  'monsters inc': { weight: 55, mustDo: false, category: 'family' },
  "mike & sulley": { weight: 55, mustDo: false, category: 'family' },
  'little mermaid dca': { weight: 50, mustDo: false, category: 'family' },
  "ariel's undersea adventure": { weight: 50, mustDo: false, category: 'family' },
  'goofy sky school': { weight: 55, mustDo: false, category: 'family', notes: 'Wild mouse coaster' },
  'sky school': { weight: 55, mustDo: false, category: 'family' },
  'golden zephyr': { weight: 35, mustDo: false, category: 'standard' },
  'silly symphony swings': { weight: 40, mustDo: false, category: 'standard' },
  'jumpin jellyfish': { weight: 35, mustDo: false, category: 'standard' },
  "luigi's rollickin' roadsters": { weight: 50, mustDo: false, category: 'family' },
  'luigi': { weight: 50, mustDo: false, category: 'family' },
  "mater's junkyard jamboree": { weight: 50, mustDo: false, category: 'family' },
  'mater': { weight: 50, mustDo: false, category: 'family' },

  // ============================================================================
  // UNIVERSAL STUDIOS FLORIDA (Park ID: 64)
  // ============================================================================

  // Headliners
  "hagrid's magical creatures": { weight: 100, mustDo: true, category: 'headliner', notes: 'Best Universal ride' },
  'hagrid': { weight: 100, mustDo: true, category: 'headliner' },
  'velocicoaster': { weight: 98, mustDo: true, category: 'headliner', notes: 'Intense coaster' },
  'harry potter and the forbidden journey': { weight: 95, mustDo: true, category: 'headliner' },
  'forbidden journey': { weight: 95, mustDo: true, category: 'headliner' },
  'revenge of the mummy': { weight: 85, mustDo: true, category: 'popular' },
  'mummy': { weight: 85, mustDo: true, category: 'popular' },

  // ============================================================================
  // ISLANDS OF ADVENTURE (Park ID: 65)
  // ============================================================================

  'the incredible hulk coaster': { weight: 90, mustDo: true, category: 'headliner' },
  'hulk': { weight: 90, mustDo: true, category: 'headliner' },
  'the amazing adventures of spider-man': { weight: 85, mustDo: true, category: 'popular' },
  'jurassic world velocicoaster': { weight: 98, mustDo: true, category: 'headliner' },

  // ============================================================================
  // EPIC UNIVERSE (Park ID: 334) - Opening 2025
  // ============================================================================

  'starfall racers': { weight: 95, mustDo: true, category: 'headliner', notes: 'Dueling coaster' },
  'stardust racers': { weight: 95, mustDo: true, category: 'headliner' },
  'harry potter and the battle at the ministry': { weight: 98, mustDo: true, category: 'headliner' },
  'ministry of magic': { weight: 98, mustDo: true, category: 'headliner' },
  'how to train your dragon': { weight: 90, mustDo: true, category: 'headliner' },
  'hiccup': { weight: 90, mustDo: true, category: 'headliner' },
};

/**
 * Get the weight for a ride by name
 * Uses fuzzy matching to find the best match
 */
export function getRideWeight(rideName: string): RideWeight {
  const lowerName = rideName.toLowerCase().trim();

  // Try exact match first
  if (RIDE_WEIGHTS[lowerName]) {
    return RIDE_WEIGHTS[lowerName];
  }

  // Try partial match (ride name contains pattern or pattern contains ride name)
  for (const [pattern, weight] of Object.entries(RIDE_WEIGHTS)) {
    if (lowerName.includes(pattern) || pattern.includes(lowerName)) {
      return weight;
    }
  }

  // Try word-by-word matching for multi-word ride names
  const words = lowerName.split(/\s+/).filter(w => w.length > 3);
  for (const [pattern, weight] of Object.entries(RIDE_WEIGHTS)) {
    for (const word of words) {
      if (pattern.includes(word)) {
        return weight;
      }
    }
  }

  // Default weight for unknown rides
  return {
    weight: 50,
    mustDo: false,
    category: 'standard',
    notes: 'Unknown ride - using default weight',
  };
}

/**
 * Get all must-do rides for a specific park
 */
export function getMustDoRides(parkId: number): string[] {
  // This would need to be enhanced with park-specific data
  // For now, return rides marked as mustDo
  return Object.entries(RIDE_WEIGHTS)
    .filter(([_, data]) => data.mustDo)
    .map(([name, _]) => name);
}

/**
 * Compare two rides by weight (for sorting)
 * Returns negative if a should come first, positive if b should come first
 */
export function compareRidesByWeight(rideNameA: string, rideNameB: string): number {
  const weightA = getRideWeight(rideNameA);
  const weightB = getRideWeight(rideNameB);
  return weightB.weight - weightA.weight; // Higher weight = higher priority
}

/**
 * Adjust weight based on user preferences
 */
export function getAdjustedWeight(
  rideName: string,
  userPriority: 'thrill' | 'family' | 'shows' | 'balanced'
): number {
  const baseWeight = getRideWeight(rideName);
  let adjustment = 0;

  // Adjust based on user priority
  switch (userPriority) {
    case 'thrill':
      if (baseWeight.category === 'headliner') adjustment = 10;
      if (baseWeight.category === 'family') adjustment = -10;
      break;
    case 'family':
      if (baseWeight.category === 'family') adjustment = 15;
      if (baseWeight.category === 'headliner') adjustment = -5;
      break;
    case 'shows':
      // Shows aren't in this data, but we could add them
      break;
    case 'balanced':
      // No adjustment
      break;
  }

  return Math.max(10, Math.min(100, baseWeight.weight + adjustment));
}
