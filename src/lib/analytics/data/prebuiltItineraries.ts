// Pre-built Itinerary Templates for quick planning
// These templates provide curated ride selections for different guest profiles

export type TemplateCategory = 'first-timer' | 'thrill-seeker' | 'family' | 'relaxed' | 'classic';

export interface ItineraryTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  parkId: number;
  parkName: string;
  // Ride names to match (uses fuzzy matching like other ride metadata)
  mustDoRides: string[];
  // Suggested additional rides if time permits
  optionalRides: string[];
  // Recommended settings
  duration: 'full-day' | 'half-day';
  arrivalTime: 'rope-drop' | '10am' | '12pm';
  strategy: 'headliner-rush' | 'wave-rider' | 'family-first' | null;
  includeBreaks: boolean;
  // UI display
  icon: string; // Emoji icon
  difficulty: 'easy' | 'moderate' | 'intense';
  estimatedWalkingMiles: number;
  tags: string[];
}

export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [
  // ==========================================
  // MAGIC KINGDOM (Park ID: 6)
  // ==========================================
  {
    id: 'mk-first-timer',
    name: 'First Timer Magic Kingdom',
    description: 'Experience all the Disney classics! Perfect for your first visit to the most magical place on earth.',
    category: 'first-timer',
    parkId: 6,
    parkName: 'Magic Kingdom',
    mustDoRides: [
      'seven dwarfs mine train',
      'space mountain',
      'pirates of the caribbean',
      'haunted mansion',
      'jungle cruise',
      "it's a small world",
      'big thunder mountain',
      "peter pan's flight",
    ],
    optionalRides: [
      'buzz lightyear',
      'tomorrowland transit authority',
      'winnie the pooh',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🏰',
    difficulty: 'moderate',
    estimatedWalkingMiles: 8,
    tags: ['Must-See', 'Classic Disney', 'Family Friendly'],
  },
  {
    id: 'mk-thrill-seeker',
    name: 'Thrill Seeker Magic Kingdom',
    description: 'Hit all the thrilling attractions at Magic Kingdom including TRON and Space Mountain.',
    category: 'thrill-seeker',
    parkId: 6,
    parkName: 'Magic Kingdom',
    mustDoRides: [
      'tron lightcycle',
      'seven dwarfs mine train',
      'space mountain',
      'big thunder mountain',
      'splash mountain',
      'pirates of the caribbean',
      'haunted mansion',
    ],
    optionalRides: [
      'buzz lightyear',
      'jungle cruise',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '⚡',
    difficulty: 'intense',
    estimatedWalkingMiles: 10,
    tags: ['Thrill Rides', 'Coasters', 'Fast-Paced'],
  },
  {
    id: 'mk-family-kids',
    name: 'Family with Young Kids',
    description: 'A relaxed pace with plenty of kid-friendly attractions and character opportunities.',
    category: 'family',
    parkId: 6,
    parkName: 'Magic Kingdom',
    mustDoRides: [
      "it's a small world",
      "peter pan's flight",
      'winnie the pooh',
      'dumbo',
      'carousel',
      'jungle cruise',
      'pirates of the caribbean',
      'buzz lightyear',
    ],
    optionalRides: [
      'seven dwarfs mine train',
      'magic carpets',
      'barnstormer',
    ],
    duration: 'full-day',
    arrivalTime: '10am',
    strategy: 'family-first',
    includeBreaks: true,
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'easy',
    estimatedWalkingMiles: 5,
    tags: ['Kid-Friendly', 'Relaxed Pace', 'Characters'],
  },
  {
    id: 'mk-half-day',
    name: 'Magic Kingdom Half Day Highlights',
    description: 'Short on time? Hit the best of Magic Kingdom in just a few hours.',
    category: 'relaxed',
    parkId: 6,
    parkName: 'Magic Kingdom',
    mustDoRides: [
      'seven dwarfs mine train',
      'pirates of the caribbean',
      'haunted mansion',
      'space mountain',
    ],
    optionalRides: [
      'jungle cruise',
      'big thunder mountain',
    ],
    duration: 'half-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: false,
    icon: '⏰',
    difficulty: 'moderate',
    estimatedWalkingMiles: 4,
    tags: ['Quick Visit', 'Best Of', 'Efficient'],
  },

  // ==========================================
  // EPCOT (Park ID: 5)
  // ==========================================
  {
    id: 'epcot-first-timer',
    name: 'First Timer EPCOT',
    description: 'Experience the best of World Showcase and Future World on your first EPCOT visit.',
    category: 'first-timer',
    parkId: 5,
    parkName: 'EPCOT',
    mustDoRides: [
      'guardians of the galaxy',
      'frozen ever after',
      'test track',
      'soarin',
      'spaceship earth',
      'remy',
    ],
    optionalRides: [
      'living with the land',
      'journey into imagination',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🌍',
    difficulty: 'moderate',
    estimatedWalkingMiles: 9,
    tags: ['World Showcase', 'First Visit', 'Must-See'],
  },
  {
    id: 'epcot-thrill-seeker',
    name: 'Thrill Seeker EPCOT',
    description: 'Guardians, Test Track, and all the exciting rides EPCOT has to offer.',
    category: 'thrill-seeker',
    parkId: 5,
    parkName: 'EPCOT',
    mustDoRides: [
      'guardians of the galaxy',
      'test track',
      'mission: space',
      'frozen ever after',
      'soarin',
      'remy',
    ],
    optionalRides: [
      'spaceship earth',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '🚀',
    difficulty: 'intense',
    estimatedWalkingMiles: 10,
    tags: ['Thrill Rides', 'Fast-Paced', 'Headliners'],
  },

  // ==========================================
  // HOLLYWOOD STUDIOS (Park ID: 7)
  // ==========================================
  {
    id: 'hs-first-timer',
    name: 'First Timer Hollywood Studios',
    description: 'Experience Galaxy\'s Edge, Toy Story Land, and all the Hollywood magic.',
    category: 'first-timer',
    parkId: 7,
    parkName: 'Hollywood Studios',
    mustDoRides: [
      'rise of the resistance',
      'millennium falcon',
      'slinky dog dash',
      'tower of terror',
      'toy story mania',
      'runaway railway',
    ],
    optionalRides: [
      "rock 'n' roller coaster",
      'star tours',
      'alien swirling saucers',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🎬',
    difficulty: 'moderate',
    estimatedWalkingMiles: 7,
    tags: ['Star Wars', 'Toy Story', 'Must-See'],
  },
  {
    id: 'hs-star-wars',
    name: 'Star Wars Galaxy\'s Edge Focus',
    description: 'Immerse yourself in the Star Wars universe with all Galaxy\'s Edge experiences.',
    category: 'thrill-seeker',
    parkId: 7,
    parkName: 'Hollywood Studios',
    mustDoRides: [
      'rise of the resistance',
      'millennium falcon',
      'star tours',
      'tower of terror',
      "rock 'n' roller coaster",
    ],
    optionalRides: [
      'slinky dog dash',
      'runaway railway',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '🌟',
    difficulty: 'intense',
    estimatedWalkingMiles: 8,
    tags: ['Star Wars', 'Immersive', 'Thrill Rides'],
  },

  // ==========================================
  // ANIMAL KINGDOM (Park ID: 8)
  // ==========================================
  {
    id: 'ak-first-timer',
    name: 'First Timer Animal Kingdom',
    description: 'Experience Pandora, the Safari, and all of Animal Kingdom\'s best attractions.',
    category: 'first-timer',
    parkId: 8,
    parkName: 'Animal Kingdom',
    mustDoRides: [
      'flight of passage',
      "na'vi river journey",
      'kilimanjaro safaris',
      'expedition everest',
      'dinosaur',
    ],
    optionalRides: [
      'kali river rapids',
      'triceratop spin',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🦁',
    difficulty: 'moderate',
    estimatedWalkingMiles: 7,
    tags: ['Avatar', 'Safari', 'Nature'],
  },
  {
    id: 'ak-thrill-seeker',
    name: 'Thrill Seeker Animal Kingdom',
    description: 'Flight of Passage, Everest, and the most exciting Animal Kingdom experiences.',
    category: 'thrill-seeker',
    parkId: 8,
    parkName: 'Animal Kingdom',
    mustDoRides: [
      'flight of passage',
      'expedition everest',
      'dinosaur',
      'kali river rapids',
      'kilimanjaro safaris',
    ],
    optionalRides: [
      "na'vi river journey",
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '🏔️',
    difficulty: 'intense',
    estimatedWalkingMiles: 8,
    tags: ['Thrill Rides', 'Avatar', 'Adventure'],
  },

  // ==========================================
  // UNIVERSAL ISLANDS OF ADVENTURE (Park ID: 64)
  // ==========================================
  {
    id: 'ioa-first-timer',
    name: 'First Timer Islands of Adventure',
    description: 'Experience the Wizarding World, VelociCoaster, and all of IOA\'s best.',
    category: 'first-timer',
    parkId: 64,
    parkName: 'Islands of Adventure',
    mustDoRides: [
      "hagrid's magical creatures",
      'velocicoaster',
      'forbidden journey',
      'incredible hulk',
      'spider-man',
      'jurassic world',
    ],
    optionalRides: [
      'flight of the hippogriff',
      'cat in the hat',
      'popeye',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🧙',
    difficulty: 'moderate',
    estimatedWalkingMiles: 7,
    tags: ['Harry Potter', 'Thrill Rides', 'Must-See'],
  },
  {
    id: 'ioa-thrill-seeker',
    name: 'Thrill Seeker Islands of Adventure',
    description: 'VelociCoaster, Hagrid\'s, Hulk - all the intense coasters IOA has to offer.',
    category: 'thrill-seeker',
    parkId: 64,
    parkName: 'Islands of Adventure',
    mustDoRides: [
      'velocicoaster',
      "hagrid's magical creatures",
      'incredible hulk',
      'forbidden journey',
      'doctor doom',
      'jurassic world',
    ],
    optionalRides: [
      'spider-man',
      'popeye',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '🎢',
    difficulty: 'intense',
    estimatedWalkingMiles: 9,
    tags: ['Coasters', 'Extreme', 'Adrenaline'],
  },

  // ==========================================
  // UNIVERSAL STUDIOS FLORIDA (Park ID: 65)
  // ==========================================
  {
    id: 'usf-first-timer',
    name: 'First Timer Universal Studios',
    description: 'Diagon Alley, Mummy, and all the classic Universal Studios attractions.',
    category: 'first-timer',
    parkId: 65,
    parkName: 'Universal Studios Florida',
    mustDoRides: [
      'escape from gringotts',
      'revenge of the mummy',
      'hollywood rip ride rockit',
      'transformers',
      'simpsons ride',
      'men in black',
    ],
    optionalRides: [
      'et adventure',
      'fast & furious',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '🎥',
    difficulty: 'moderate',
    estimatedWalkingMiles: 6,
    tags: ['Harry Potter', 'Movies', 'Must-See'],
  },
  {
    id: 'usf-thrill-seeker',
    name: 'Thrill Seeker Universal Studios',
    description: 'Rip Ride Rockit, Mummy, and the most thrilling Universal experiences.',
    category: 'thrill-seeker',
    parkId: 65,
    parkName: 'Universal Studios Florida',
    mustDoRides: [
      'hollywood rip ride rockit',
      'revenge of the mummy',
      'escape from gringotts',
      'transformers',
      'men in black',
    ],
    optionalRides: [
      'simpsons ride',
    ],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'headliner-rush',
    includeBreaks: true,
    icon: '🎸',
    difficulty: 'intense',
    estimatedWalkingMiles: 7,
    tags: ['Coasters', 'Thrill Rides', 'Fast-Paced'],
  },

  // ==========================================
  // EPIC UNIVERSE (Park ID: 334)
  // ==========================================
  {
    id: 'eu-first-timer',
    name: 'First Timer Epic Universe',
    description: 'Experience all the brand new worlds at Universal\'s Epic Universe.',
    category: 'first-timer',
    parkId: 334,
    parkName: 'Epic Universe',
    mustDoRides: [
      'battle at the ministry',
      "hagrid's magical creatures",
    ],
    optionalRides: [],
    duration: 'full-day',
    arrivalTime: 'rope-drop',
    strategy: 'wave-rider',
    includeBreaks: true,
    icon: '✨',
    difficulty: 'moderate',
    estimatedWalkingMiles: 8,
    tags: ['New Park', 'Must-See', 'Grand Opening'],
  },
];

/**
 * Get templates for a specific park
 */
export function getTemplatesForPark(parkId: number): ItineraryTemplate[] {
  return ITINERARY_TEMPLATES.filter(t => t.parkId === parkId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): ItineraryTemplate[] {
  return ITINERARY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(templateId: string): ItineraryTemplate | undefined {
  return ITINERARY_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all unique parks that have templates
 */
export function getParksWithTemplates(): { parkId: number; parkName: string; templateCount: number }[] {
  const parkMap = new Map<number, { parkName: string; count: number }>();

  for (const template of ITINERARY_TEMPLATES) {
    const existing = parkMap.get(template.parkId);
    if (existing) {
      existing.count++;
    } else {
      parkMap.set(template.parkId, { parkName: template.parkName, count: 1 });
    }
  }

  return Array.from(parkMap.entries()).map(([parkId, data]) => ({
    parkId,
    parkName: data.parkName,
    templateCount: data.count,
  }));
}

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<TemplateCategory, { label: string; description: string; icon: string }> = {
  'first-timer': {
    label: 'First Timer',
    description: 'Perfect for your first visit',
    icon: '🎉',
  },
  'thrill-seeker': {
    label: 'Thrill Seeker',
    description: 'Maximum thrills and coasters',
    icon: '⚡',
  },
  'family': {
    label: 'Family',
    description: 'Great for kids and families',
    icon: '👨‍👩‍👧‍👦',
  },
  'relaxed': {
    label: 'Relaxed',
    description: 'Take it easy and enjoy',
    icon: '🌴',
  },
  'classic': {
    label: 'Classic',
    description: 'Timeless favorites',
    icon: '✨',
  },
};
