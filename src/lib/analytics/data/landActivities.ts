// Land Activities - Dining, Shopping, and Entertainment options per land
// Used to provide specific suggestions during breaks when wait times are high

export interface DiningOption {
  name: string;
  type: 'quick-service' | 'table-service' | 'snack' | 'bar';
  cuisine?: string;
  specialty?: string;
  priceRange: '$' | '$$' | '$$$';
  image?: string;
}

export interface ShoppingOption {
  name: string;
  type: 'merchandise' | 'specialty' | 'souvenirs';
  highlights?: string;
  image?: string;
}

export interface EntertainmentOption {
  name: string;
  type: 'show' | 'character-meet' | 'interactive' | 'exhibit';
  duration?: number; // minutes
}

export interface LandActivities {
  dining: DiningOption[];
  shopping: ShoppingOption[];
  entertainment: EntertainmentOption[];
}

/**
 * Land activities database
 * Keys should match land names from the API (case-insensitive matching)
 */
export const LAND_ACTIVITIES: Record<string, LandActivities> = {
  // ==========================================
  // EPIC UNIVERSE
  // ==========================================

  'super nintendo world': {
    dining: [
      {
        name: 'Toadstool Cafe',
        type: 'quick-service',
        cuisine: 'Japanese-Italian fusion',
        specialty: 'Mushroom-themed dishes, Mario-inspired meals',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      },
      {
        name: '1-UP Factory',
        type: 'snack',
        specialty: 'Interactive treats and themed snacks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: '1-UP Factory',
        type: 'merchandise',
        highlights: 'Power-Up Bands, Mario merchandise, Nintendo collectibles',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Power-Up Band Activities',
        type: 'interactive',
        duration: 15,
      },
      {
        name: 'Key Challenges',
        type: 'interactive',
        duration: 10,
      },
    ],
  },

  'the wizarding world of harry potter - ministry of magic': {
    dining: [
      {
        name: 'Le Cirque Arcanus',
        type: 'table-service',
        cuisine: 'French',
        specialty: 'Parisian-inspired magical dining',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Cafe LEstrange',
        type: 'quick-service',
        specialty: 'French pastries and magical beverages',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Wands by Gregorovitch',
        type: 'specialty',
        highlights: 'Interactive wands, wand customization',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
      {
        name: 'Les Galeries Mirifiques',
        type: 'merchandise',
        highlights: 'Wizarding robes, magical artifacts',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Interactive Wand Experiences',
        type: 'interactive',
        duration: 20,
      },
    ],
  },

  'ministry of magic': {
    dining: [
      {
        name: 'Le Cirque Arcanus',
        type: 'table-service',
        cuisine: 'French',
        specialty: 'Parisian-inspired magical dining',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Cafe LEstrange',
        type: 'quick-service',
        specialty: 'French pastries and magical beverages',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Wands by Gregorovitch',
        type: 'specialty',
        highlights: 'Interactive wands, wand customization',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Interactive Wand Experiences',
        type: 'interactive',
        duration: 20,
      },
    ],
  },

  'dark universe': {
    dining: [
      {
        name: 'Das Stakehaus',
        type: 'quick-service',
        cuisine: 'German',
        specialty: 'Grilled meats and hearty fare',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
      },
      {
        name: 'Monsters Cafe',
        type: 'snack',
        specialty: 'Monster-themed treats',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Dark Arts Curiosities',
        type: 'specialty',
        highlights: 'Classic monster merchandise, horror collectibles',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Monster Character Encounters',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  'how to train your dragon - isle of berk': {
    dining: [
      {
        name: 'Mead Hall',
        type: 'table-service',
        cuisine: 'Viking-inspired',
        specialty: 'Hearty Viking feasts, roasted meats',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop',
      },
      {
        name: 'The Rookery',
        type: 'quick-service',
        specialty: 'Dragon-themed snacks and drinks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Hiccups Workshop',
        type: 'merchandise',
        highlights: 'Dragon toys, Viking gear, Toothless merchandise',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Dragon Training',
        type: 'interactive',
        duration: 15,
      },
      {
        name: 'Meet Toothless',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  'isle of berk': {
    dining: [
      {
        name: 'Mead Hall',
        type: 'table-service',
        cuisine: 'Viking-inspired',
        specialty: 'Hearty Viking feasts',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Hiccups Workshop',
        type: 'merchandise',
        highlights: 'Dragon toys, Viking gear',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Meet Toothless',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  'celestial park': {
    dining: [
      {
        name: 'Starfall Racers Cafe',
        type: 'quick-service',
        specialty: 'Cosmic-themed dining',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      },
      {
        name: 'Galaxy Sweets',
        type: 'snack',
        specialty: 'Space-themed desserts and treats',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Celestial Gifts',
        type: 'souvenirs',
        highlights: 'Epic Universe merchandise, park souvenirs',
        image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Celestial Park Shows',
        type: 'show',
        duration: 20,
      },
    ],
  },

  // ==========================================
  // ISLANDS OF ADVENTURE
  // ==========================================

  'the wizarding world of harry potter - hogsmeade': {
    dining: [
      {
        name: 'Three Broomsticks',
        type: 'quick-service',
        cuisine: 'British',
        specialty: 'Fish and chips, shepherds pie, Butterbeer',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      },
      {
        name: 'Hogs Head',
        type: 'bar',
        specialty: 'Butterbeer, specialty drinks',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ollivanders',
        type: 'specialty',
        highlights: 'Interactive wands, wand selection experience',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
      {
        name: 'Honeydukes',
        type: 'specialty',
        highlights: 'Chocolate Frogs, Bertie Botts, wizarding sweets',
        image: 'https://images.unsplash.com/photo-1499195333224-3ce974eecb47?w=400&h=300&fit=crop',
      },
      {
        name: 'Filchs Emporium',
        type: 'merchandise',
        highlights: 'House robes, Dark Arts items, Hogwarts merchandise',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Frog Choir',
        type: 'show',
        duration: 15,
      },
      {
        name: 'Interactive Wand Spells',
        type: 'interactive',
        duration: 20,
      },
    ],
  },

  'hogsmeade': {
    dining: [
      {
        name: 'Three Broomsticks',
        type: 'quick-service',
        cuisine: 'British',
        specialty: 'Butterbeer, British fare',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ollivanders',
        type: 'specialty',
        highlights: 'Interactive wands',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
      {
        name: 'Honeydukes',
        type: 'specialty',
        highlights: 'Wizarding sweets',
        image: 'https://images.unsplash.com/photo-1499195333224-3ce974eecb47?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Frog Choir',
        type: 'show',
        duration: 15,
      },
    ],
  },

  'jurassic park': {
    dining: [
      {
        name: 'Thunder Falls Terrace',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Rotisserie chicken, ribs, views of the river ride',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
      },
      {
        name: 'The Watering Hole',
        type: 'snack',
        specialty: 'Tropical drinks and snacks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Jurassic Outfitters',
        type: 'merchandise',
        highlights: 'Dinosaur toys, Jurassic Park gear',
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop',
      },
      {
        name: 'Dinostore',
        type: 'souvenirs',
        highlights: 'Dinosaur fossils, educational items',
        image: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Raptor Encounter',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  'marvel super hero island': {
    dining: [
      {
        name: 'Cafe 4',
        type: 'quick-service',
        cuisine: 'Italian',
        specialty: 'Pizza, pasta, in Fantastic Four setting',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      },
      {
        name: 'Captain America Diner',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, all-American fare',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Marvel Alterniverse Store',
        type: 'merchandise',
        highlights: 'Marvel Comics, superhero merchandise',
        image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop',
      },
      {
        name: 'Spider-Man Shop',
        type: 'specialty',
        highlights: 'Spider-Man exclusive merchandise',
        image: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Meet Spider-Man',
        type: 'character-meet',
        duration: 10,
      },
      {
        name: 'Meet Captain America',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  'seuss landing': {
    dining: [
      {
        name: 'Green Eggs and Ham Cafe',
        type: 'quick-service',
        specialty: 'Green eggs and ham, kid-friendly options',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
      },
      {
        name: 'Circus McGurkus',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Pizza, pasta, fried chicken',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'All the Books You Can Read',
        type: 'specialty',
        highlights: 'Dr. Seuss books, Seuss character toys',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Oh! The Stories Youll Hear!',
        type: 'show',
        duration: 15,
      },
    ],
  },

  // ==========================================
  // UNIVERSAL STUDIOS FLORIDA
  // ==========================================

  'the wizarding world of harry potter - diagon alley': {
    dining: [
      {
        name: 'Leaky Cauldron',
        type: 'quick-service',
        cuisine: 'British',
        specialty: 'Bangers and mash, fish and chips, Butterbeer',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      },
      {
        name: 'Florean Fortescues Ice Cream',
        type: 'snack',
        specialty: 'Magical ice cream flavors',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ollivanders',
        type: 'specialty',
        highlights: 'Interactive wands',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
      {
        name: 'Weasleys Wizard Wheezes',
        type: 'specialty',
        highlights: 'Joke products, Pygmy Puffs',
        image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&h=300&fit=crop',
      },
      {
        name: 'Madam Malkins',
        type: 'specialty',
        highlights: 'Hogwarts robes, house merchandise',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
      },
      {
        name: 'Quality Quidditch Supplies',
        type: 'specialty',
        highlights: 'Quidditch gear, house team items',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Celestina Warbeck',
        type: 'show',
        duration: 15,
      },
      {
        name: 'Interactive Wand Spells',
        type: 'interactive',
        duration: 20,
      },
      {
        name: 'Gringotts Money Exchange',
        type: 'interactive',
        duration: 5,
      },
    ],
  },

  'diagon alley': {
    dining: [
      {
        name: 'Leaky Cauldron',
        type: 'quick-service',
        specialty: 'British fare, Butterbeer',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ollivanders',
        type: 'specialty',
        highlights: 'Interactive wands',
        image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=300&fit=crop',
      },
      {
        name: 'Weasleys Wizard Wheezes',
        type: 'specialty',
        highlights: 'Joke products',
        image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Interactive Wand Spells',
        type: 'interactive',
        duration: 20,
      },
    ],
  },

  'springfield': {
    dining: [
      {
        name: 'Krusty Burger',
        type: 'quick-service',
        specialty: 'Krusty Burger, Clogger burger',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
      {
        name: 'Moes Tavern',
        type: 'bar',
        specialty: 'Duff Beer, Flaming Moe',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
      },
      {
        name: 'Lard Lad Donuts',
        type: 'snack',
        specialty: 'Giant pink donuts',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Kwik-E-Mart',
        type: 'specialty',
        highlights: 'Simpsons merchandise, Squishees',
        image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  // ==========================================
  // MAGIC KINGDOM
  // ==========================================

  'adventureland': {
    dining: [
      {
        name: 'Jungle Navigation Co.',
        type: 'quick-service',
        specialty: 'Plant-based bowls, global flavors',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
      },
      {
        name: 'Aloha Isle',
        type: 'snack',
        specialty: 'Dole Whip',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Agrabah Bazaar',
        type: 'merchandise',
        highlights: 'Aladdin merchandise, exotic items',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Pirates League',
        type: 'interactive',
        duration: 30,
      },
    ],
  },

  'fantasyland': {
    dining: [
      {
        name: 'Be Our Guest Restaurant',
        type: 'table-service',
        cuisine: 'French',
        specialty: 'French cuisine in the Beast castle',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Pinocchio Village Haus',
        type: 'quick-service',
        cuisine: 'Italian',
        specialty: 'Pizza, pasta',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      },
      {
        name: 'Storybook Treats',
        type: 'snack',
        specialty: 'Soft-serve, specialty sundaes',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Bibbidi Bobbidi Boutique',
        type: 'specialty',
        highlights: 'Princess makeovers',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop',
      },
      {
        name: 'Castle Couture',
        type: 'merchandise',
        highlights: 'Princess merchandise',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Meet Princesses at Fairytale Hall',
        type: 'character-meet',
        duration: 15,
      },
    ],
  },

  'tomorrowland': {
    dining: [
      {
        name: 'Cosmic Rays Starlight Cafe',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, chicken, rotisserie',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      },
      {
        name: 'Auntie Gravitys Galactic Goodies',
        type: 'snack',
        specialty: 'Soft-serve, floats',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Tomorrowland Light & Power Co.',
        type: 'merchandise',
        highlights: 'Space Mountain merchandise, futuristic items',
        image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Monsters Inc. Laugh Floor',
        type: 'show',
        duration: 15,
      },
    ],
  },

  'liberty square': {
    dining: [
      {
        name: 'Liberty Tree Tavern',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Thanksgiving feast, colonial atmosphere',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      },
      {
        name: 'Sleepy Hollow',
        type: 'snack',
        specialty: 'Waffle sandwiches, funnel cakes',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Memento Mori',
        type: 'specialty',
        highlights: 'Haunted Mansion merchandise',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'frontierland': {
    dining: [
      {
        name: 'Pecos Bill Tall Tale Inn',
        type: 'quick-service',
        cuisine: 'Tex-Mex',
        specialty: 'Fajitas, nachos, burgers',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Frontier Trading Post',
        type: 'merchandise',
        highlights: 'Western wear, cowboy items',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Country Bear Jamboree',
        type: 'show',
        duration: 15,
      },
    ],
  },

  // ==========================================
  // DISNEYLAND
  // ==========================================

  'new orleans square': {
    dining: [
      {
        name: 'Blue Bayou Restaurant',
        type: 'table-service',
        cuisine: 'Cajun/Creole',
        specialty: 'Fine dining inside Pirates of the Caribbean',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Café Orleans',
        type: 'table-service',
        cuisine: 'Cajun/Creole',
        specialty: 'Monte Cristo sandwiches, beignets',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
      {
        name: 'French Market',
        type: 'quick-service',
        cuisine: 'Southern',
        specialty: 'Jambalaya, fried chicken, gumbo',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Mint Julep Bar',
        type: 'snack',
        specialty: 'Mint juleps, Mickey beignets',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Pieces of Eight',
        type: 'specialty',
        highlights: 'Pirate merchandise, exit shop for Pirates ride',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
      {
        name: 'Cristal d\'Orleans',
        type: 'specialty',
        highlights: 'Glass figurines, collectibles',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'critter country': {
    dining: [
      {
        name: 'Hungry Bear Restaurant',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, fried chicken, plant-based options',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Pooh Corner',
        type: 'merchandise',
        highlights: 'Winnie the Pooh merchandise, candy',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  "star wars: galaxy's edge": {
    dining: [
      {
        name: "Docking Bay 7 Food and Cargo",
        type: 'quick-service',
        cuisine: 'Galactic',
        specialty: 'Smoked Kaadu Ribs, Fried Endorian Tip-Yip',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: "Oga's Cantina",
        type: 'bar',
        specialty: 'Exotic galactic cocktails and snacks',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
      {
        name: 'Ronto Roasters',
        type: 'quick-service',
        specialty: 'Ronto Wraps, grilled sausages',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
      {
        name: 'Milk Stand',
        type: 'snack',
        specialty: 'Blue and Green Milk',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: "Savi's Workshop",
        type: 'specialty',
        highlights: 'Build your own lightsaber experience',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Droid Depot',
        type: 'specialty',
        highlights: 'Build your own droid, Star Wars collectibles',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
      {
        name: 'Toydarian Toymaker',
        type: 'merchandise',
        highlights: 'Handcrafted toys and plush',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Character Encounters',
        type: 'character-meet',
        duration: 10,
      },
    ],
  },

  "mickey's toontown": {
    dining: [
      {
        name: "Café Daisy",
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Kid-friendly meals, specialty drinks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: "Good Boy! Grocers",
        type: 'snack',
        specialty: 'Churros, treats, cold drinks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Gag Factory',
        type: 'merchandise',
        highlights: 'Classic Disney character merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: "Mickey's House",
        type: 'character-meet',
        duration: 15,
      },
      {
        name: "Minnie's House",
        type: 'character-meet',
        duration: 15,
      },
      {
        name: 'CenTOONial Park',
        type: 'interactive',
        duration: 20,
      },
    ],
  },

  // ==========================================
  // DISNEY CALIFORNIA ADVENTURE
  // ==========================================

  'buena vista street': {
    dining: [
      {
        name: 'Carthay Circle Restaurant',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Upscale California cuisine, signature fried biscuits',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Fiddler, Fifer & Practical Café',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Starbucks coffee, pastries, sandwiches',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
      },
      {
        name: 'Clarabelle\'s Hand-Scooped Ice Cream',
        type: 'snack',
        specialty: 'Hand-scooped ice cream, sundaes',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Elias & Co.',
        type: 'merchandise',
        highlights: 'Main gift shop, Disney merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Julius Katz & Sons',
        type: 'specialty',
        highlights: 'Home goods, kitchen items',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Five & Dime',
        type: 'show',
        duration: 15,
      },
    ],
  },

  'hollywood land': {
    dining: [
      {
        name: 'Award Wieners',
        type: 'quick-service',
        specialty: 'Gourmet hot dogs, loaded fries',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
      {
        name: 'Hollywood Lounge',
        type: 'bar',
        specialty: 'Craft cocktails, appetizers',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Off the Page',
        type: 'specialty',
        highlights: 'Disney animation art, collectibles',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Disney Junior Dance Party!',
        type: 'show',
        duration: 25,
      },
    ],
  },

  'avengers campus': {
    dining: [
      {
        name: 'Pym Test Kitchen',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Giant/tiny themed food, Quantum Pretzel',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Pym Tasting Lab',
        type: 'bar',
        specialty: 'Craft beers, specialty cocktails',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
      {
        name: 'Shawarma Palace',
        type: 'quick-service',
        specialty: 'Shawarma wraps (like the Avengers!)',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Avengers Headquarters',
        type: 'merchandise',
        highlights: 'Marvel merchandise, superhero gear',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'WEB Suppliers',
        type: 'specialty',
        highlights: 'Spider-Man merchandise, WEB Shooters',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Avengers Character Encounters',
        type: 'character-meet',
        duration: 10,
      },
      {
        name: 'Spider-Man Stunts',
        type: 'show',
        duration: 5,
      },
    ],
  },

  'cars land': {
    dining: [
      {
        name: 'Flo\'s V8 Café',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Slow-cooked ribs, pot roast, Route 66 cuisine',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Cozy Cone Motel',
        type: 'snack',
        specialty: 'Cone-shaped treats, churros, ice cream',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
      {
        name: 'Fillmore\'s Taste-In',
        type: 'snack',
        specialty: 'Organic snacks, fresh fruit, smoothies',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ramone\'s House of Body Art',
        type: 'merchandise',
        highlights: 'Cars merchandise, die-cast vehicles',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Sarge\'s Surplus Hut',
        type: 'merchandise',
        highlights: 'Cars merchandise, Route 66 souvenirs',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'pacific wharf': {
    dining: [
      {
        name: 'Pacific Wharf Café',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Sourdough bread bowls, clam chowder',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Cocina Cucamonga Mexican Grill',
        type: 'quick-service',
        cuisine: 'Mexican',
        specialty: 'Street tacos, burritos, nachos',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
      {
        name: 'Rita\'s Baja Blenders',
        type: 'bar',
        specialty: 'Frozen margaritas, tropical drinks',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Bing Bong\'s Sweet Stuff',
        type: 'specialty',
        highlights: 'Candy, Pixar merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'paradise gardens park': {
    dining: [
      {
        name: 'Paradise Garden Grill',
        type: 'quick-service',
        cuisine: 'Mediterranean',
        specialty: 'Gyros, kebabs, falafel',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Boardwalk Pizza & Pasta',
        type: 'quick-service',
        cuisine: 'Italian',
        specialty: 'Pizza, pasta, breadsticks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Seaside Souvenirs',
        type: 'souvenirs',
        highlights: 'DCA merchandise, park memorabilia',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'The Little Mermaid - Ariel\'s Undersea Adventure',
        type: 'show',
        duration: 6,
      },
    ],
  },

  'pixar pier': {
    dining: [
      {
        name: 'Lamplight Lounge',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Gastropub fare, Pixar Ball-shaped desserts',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Angry Dogs',
        type: 'quick-service',
        specialty: 'Hot dogs inspired by Anger from Inside Out',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
      {
        name: 'Adorable Snowman Frosted Treats',
        type: 'snack',
        specialty: 'Soft serve, lemon-flavored treats',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Knick\'s Knacks',
        type: 'merchandise',
        highlights: 'Pixar merchandise, Inside Out items',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Bing Bong\'s Sweet Stuff',
        type: 'specialty',
        highlights: 'Candy, memory orbs, Pixar collectibles',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'grizzly peak': {
    dining: [
      {
        name: 'Smokejumpers Grill',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, BBQ, craft beers',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Rushin\' River Outfitters',
        type: 'merchandise',
        highlights: 'Outdoor gear, Grizzly River Run merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  // ==========================================
  // UNIVERSAL STUDIOS HOLLYWOOD
  // ==========================================

  'upper lot': {
    dining: [
      {
        name: 'Krusty Burger',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Simpsons-themed burgers and snacks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
      {
        name: 'Three Broomsticks',
        type: 'quick-service',
        cuisine: 'British',
        specialty: 'Fish and chips, shepherd\'s pie, butterbeer',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Hog\'s Head',
        type: 'bar',
        specialty: 'Butterbeer, Hog\'s Head Brew',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Ollivanders',
        type: 'specialty',
        highlights: 'Interactive wands, Harry Potter merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Universal Studio Store',
        type: 'merchandise',
        highlights: 'Park merchandise, souvenirs',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'WaterWorld',
        type: 'show',
        duration: 20,
      },
    ],
  },

  'lower lot': {
    dining: [
      {
        name: 'Jurassic Café',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, chicken tenders, dinosaur-themed items',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Jurassic Outfitters',
        type: 'merchandise',
        highlights: 'Jurassic World merchandise, dinosaur toys',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  // ==========================================
  // EPCOT
  // ==========================================

  'world celebration': {
    dining: [
      {
        name: 'Connections Eatery',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Pizza, pasta, salads',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Connections Café',
        type: 'quick-service',
        specialty: 'Starbucks coffee, pastries',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Creations Shop',
        type: 'merchandise',
        highlights: 'EPCOT merchandise, Figment items',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'world nature': {
    dining: [
      {
        name: 'Sunshine Seasons',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Rotisserie chicken, fresh salads, grilled fish',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Garden Grill',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Character dining with Chip & Dale, family-style meal',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Coral Reef Restaurant',
        type: 'table-service',
        cuisine: 'Seafood',
        specialty: 'Fine seafood with aquarium views',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'The Land Cart',
        type: 'merchandise',
        highlights: 'Nature-themed merchandise',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Awesome Planet',
        type: 'show',
        duration: 10,
      },
    ],
  },

  'world discovery': {
    dining: [
      {
        name: 'Space 220 Restaurant',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Fine dining with space station views',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Space 220 Lounge',
        type: 'bar',
        specialty: 'Space-themed cocktails, appetizers',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Mission: SPACE Cargo Bay',
        type: 'merchandise',
        highlights: 'Space and astronaut merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'world showcase': {
    dining: [
      {
        name: 'Le Cellier Steakhouse',
        type: 'table-service',
        cuisine: 'Steakhouse',
        specialty: 'Premium steaks, Canadian cheddar soup',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'San Angel Inn',
        type: 'table-service',
        cuisine: 'Mexican',
        specialty: 'Authentic Mexican inside Mexico pyramid',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
      {
        name: 'Teppan Edo',
        type: 'table-service',
        cuisine: 'Japanese',
        specialty: 'Hibachi dining experience',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Les Halles Boulangerie-Patisserie',
        type: 'quick-service',
        cuisine: 'French',
        specialty: 'Authentic French pastries, sandwiches',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
      {
        name: 'Yorkshire County Fish Shop',
        type: 'quick-service',
        cuisine: 'British',
        specialty: 'Fish and chips',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Mitsukoshi',
        type: 'specialty',
        highlights: 'Japanese goods, pick-a-pearl',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
      {
        name: 'Der Teddybär',
        type: 'specialty',
        highlights: 'German cuckoo clocks, Steiff bears',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Voices of Liberty',
        type: 'show',
        duration: 15,
      },
    ],
  },

  // ==========================================
  // HOLLYWOOD STUDIOS
  // ==========================================

  'hollywood boulevard': {
    dining: [
      {
        name: 'The Hollywood Brown Derby',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Famous Cobb salad, grapefruit cake',
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Catalina Eddie\'s',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Pizza, salads',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Celebrity 5 & 10',
        type: 'merchandise',
        highlights: 'Main gift shop, Hollywood Studios merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Keystone Clothiers',
        type: 'merchandise',
        highlights: 'Disney apparel, accessories',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'sunset boulevard': {
    dining: [
      {
        name: 'Hollywood Scoops',
        type: 'snack',
        specialty: 'Ice cream, sundaes',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
      {
        name: 'Anaheim Produce',
        type: 'snack',
        specialty: 'Fresh fruit, healthy snacks',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Tower Hotel Gifts',
        type: 'merchandise',
        highlights: 'Tower of Terror merchandise',
        image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=300&fit=crop',
      },
      {
        name: 'Rock Around the Shop',
        type: 'merchandise',
        highlights: 'Rock \'n\' Roller Coaster merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Fantasmic!',
        type: 'show',
        duration: 30,
      },
    ],
  },

  'echo lake': {
    dining: [
      {
        name: '50\'s Prime Time Café',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Retro comfort food, mom\'s rules!',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Hollywood & Vine',
        type: 'table-service',
        cuisine: 'American',
        specialty: 'Character dining buffet',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Backlot Express',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, chicken, salads',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Indiana Jones Adventure Outpost',
        type: 'merchandise',
        highlights: 'Indiana Jones merchandise',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Indiana Jones Epic Stunt Spectacular!',
        type: 'show',
        duration: 35,
      },
    ],
  },

  'toy story land': {
    dining: [
      {
        name: 'Woody\'s Lunch Box',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Totchos, grilled cheese, lunch box tarts',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Toy Story Land merchandise cart',
        type: 'merchandise',
        highlights: 'Toy Story character merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  // ==========================================
  // ANIMAL KINGDOM
  // ==========================================

  'discovery island': {
    dining: [
      {
        name: 'Flame Tree Barbecue',
        type: 'quick-service',
        cuisine: 'BBQ',
        specialty: 'Smoked ribs, pulled pork, brisket',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Pizzafari',
        type: 'quick-service',
        cuisine: 'Italian',
        specialty: 'Pizza, pasta, salads',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Island Mercantile',
        type: 'merchandise',
        highlights: 'Main Animal Kingdom gift shop',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
      {
        name: 'Disney Outfitters',
        type: 'merchandise',
        highlights: 'Safari and animal-themed merchandise',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'It\'s Tough to be a Bug!',
        type: 'show',
        duration: 10,
      },
    ],
  },

  'africa': {
    dining: [
      {
        name: 'Tusker House Restaurant',
        type: 'table-service',
        cuisine: 'African',
        specialty: 'Character dining buffet, African flavors',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Harambe Market',
        type: 'quick-service',
        cuisine: 'African',
        specialty: 'Ribs, chicken, sausages from open-air stalls',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Dawa Bar',
        type: 'bar',
        specialty: 'African-inspired cocktails',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Mombasa Marketplace',
        type: 'merchandise',
        highlights: 'African crafts, animal merchandise',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Festival of the Lion King',
        type: 'show',
        duration: 30,
      },
    ],
  },

  'asia': {
    dining: [
      {
        name: 'Yak & Yeti Restaurant',
        type: 'table-service',
        cuisine: 'Asian',
        specialty: 'Pan-Asian cuisine, ahi tuna nachos',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      },
      {
        name: 'Yak & Yeti Local Food Cafes',
        type: 'quick-service',
        cuisine: 'Asian',
        specialty: 'Asian bowls, egg rolls',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Serka Zong Bazaar',
        type: 'merchandise',
        highlights: 'Expedition Everest merchandise',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [
      {
        name: 'Feathered Friends in Flight!',
        type: 'show',
        duration: 25,
      },
    ],
  },

  'pandora - the world of avatar': {
    dining: [
      {
        name: 'Satu\'li Canteen',
        type: 'quick-service',
        cuisine: 'Alien',
        specialty: 'Customizable bowls, unique alien cuisine',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      },
      {
        name: 'Pongu Pongu',
        type: 'bar',
        specialty: 'Night Blossom frozen drink, Mo\'ara Margarita',
        priceRange: '$$',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Windtraders',
        type: 'specialty',
        highlights: 'Banshee adoption, Avatar merchandise, Na\'vi collectibles',
        image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },

  'dinoland u.s.a.': {
    dining: [
      {
        name: 'Restaurantosaurus',
        type: 'quick-service',
        cuisine: 'American',
        specialty: 'Burgers, chicken nuggets, kids meals',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      },
      {
        name: 'Dino-Bite Snacks',
        type: 'snack',
        specialty: 'Churros, pretzels, ice cream',
        priceRange: '$',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
      },
    ],
    shopping: [
      {
        name: 'Chester & Hester\'s Dinosaur Treasures',
        type: 'merchandise',
        highlights: 'Dinosaur toys, DinoLand souvenirs',
        image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop',
      },
    ],
    entertainment: [],
  },
};

/**
 * Get activities for a specific land
 * Uses case-insensitive partial matching
 */
export function getLandActivities(landName: string): LandActivities | null {
  const normalizedLand = landName.toLowerCase().trim();

  // Try exact match first
  for (const [key, activities] of Object.entries(LAND_ACTIVITIES)) {
    if (key.toLowerCase() === normalizedLand) {
      return activities;
    }
  }

  // Try partial match
  for (const [key, activities] of Object.entries(LAND_ACTIVITIES)) {
    if (
      normalizedLand.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(normalizedLand)
    ) {
      return activities;
    }
  }

  return null;
}

/**
 * Get dining suggestions for a land
 */
export function getDiningSuggestions(landName: string): DiningOption[] {
  const activities = getLandActivities(landName);
  return activities?.dining ?? [];
}

/**
 * Get shopping suggestions for a land
 */
export function getShoppingSuggestions(landName: string): ShoppingOption[] {
  const activities = getLandActivities(landName);
  return activities?.shopping ?? [];
}

/**
 * Get entertainment suggestions for a land
 */
export function getEntertainmentSuggestions(
  landName: string
): EntertainmentOption[] {
  const activities = getLandActivities(landName);
  return activities?.entertainment ?? [];
}

/**
 * Format a break suggestion with specific land activities
 */
export function formatBreakSuggestion(
  breakType: 'meal' | 'snack' | 'rest',
  landName: string,
  hour: number
): string {
  const activities = getLandActivities(landName);

  if (!activities) {
    // Generic suggestions if no land data
    if (breakType === 'meal') {
      return hour >= 17
        ? 'Perfect time for dinner while peak crowds thin out.'
        : 'Great time for lunch! Crowds will ease by the time you finish.';
    }
    return 'Take a break and explore the area - grab a snack and browse the shops.';
  }

  const suggestions: string[] = [];

  // Add dining suggestion
  if (activities.dining.length > 0) {
    const dining =
      breakType === 'meal'
        ? activities.dining.find(
            (d) => d.type === 'table-service' || d.type === 'quick-service'
          )
        : activities.dining.find((d) => d.type === 'snack' || d.type === 'bar');

    if (dining) {
      const specialty = dining.specialty ? ` - ${dining.specialty}` : '';
      suggestions.push(`Try ${dining.name}${specialty}`);
    }
  }

  // Add shopping suggestion
  if (activities.shopping.length > 0) {
    const shop = activities.shopping[0];
    const highlights = shop.highlights ? ` for ${shop.highlights}` : '';
    suggestions.push(`Browse ${shop.name}${highlights}`);
  }

  // Add entertainment if rest break
  if (breakType === 'rest' && activities.entertainment.length > 0) {
    const entertainment = activities.entertainment[0];
    suggestions.push(`Check out ${entertainment.name}`);
  }

  if (suggestions.length === 0) {
    return 'Take a break and explore the area.';
  }

  return suggestions.join('. ') + '.';
}
