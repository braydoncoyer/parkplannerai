// Park geographic locations for weather and other location-based features

export interface ParkLocation {
  parkId: number;
  name: string;
  latitude: number;
  longitude: number;
  region: 'florida' | 'california';
  city: string;
}

// Geographic coordinates for each park
export const PARK_LOCATIONS: Record<number, ParkLocation> = {
  // Walt Disney World Resort - Orlando, Florida
  6: {
    parkId: 6,
    name: 'Magic Kingdom',
    latitude: 28.4177,
    longitude: -81.5812,
    region: 'florida',
    city: 'Orlando, FL',
  },
  5: {
    parkId: 5,
    name: 'EPCOT',
    latitude: 28.3747,
    longitude: -81.5494,
    region: 'florida',
    city: 'Orlando, FL',
  },
  7: {
    parkId: 7,
    name: 'Hollywood Studios',
    latitude: 28.3575,
    longitude: -81.5583,
    region: 'florida',
    city: 'Orlando, FL',
  },
  8: {
    parkId: 8,
    name: 'Animal Kingdom',
    latitude: 28.3553,
    longitude: -81.5901,
    region: 'florida',
    city: 'Orlando, FL',
  },

  // Disneyland Resort - Anaheim, California
  16: {
    parkId: 16,
    name: 'Disneyland',
    latitude: 33.8121,
    longitude: -117.9190,
    region: 'california',
    city: 'Anaheim, CA',
  },
  17: {
    parkId: 17,
    name: 'Disney California Adventure',
    latitude: 33.8087,
    longitude: -117.9187,
    region: 'california',
    city: 'Anaheim, CA',
  },

  // Universal Orlando Resort - Orlando, Florida
  64: {
    parkId: 64,
    name: 'Universal Studios Florida',
    latitude: 28.4794,
    longitude: -81.4686,
    region: 'florida',
    city: 'Orlando, FL',
  },
  65: {
    parkId: 65,
    name: 'Islands of Adventure',
    latitude: 28.4712,
    longitude: -81.4701,
    region: 'florida',
    city: 'Orlando, FL',
  },
  334: {
    parkId: 334,
    name: 'Epic Universe',
    latitude: 28.4729,
    longitude: -81.4434,
    region: 'florida',
    city: 'Orlando, FL',
  },
};

/**
 * Get location data for a specific park
 */
export function getParkLocation(parkId: number): ParkLocation | null {
  return PARK_LOCATIONS[parkId] || null;
}

/**
 * Get all parks in a specific region
 */
export function getParksByRegion(region: 'florida' | 'california'): ParkLocation[] {
  return Object.values(PARK_LOCATIONS).filter(park => park.region === region);
}

/**
 * Check if a park is in Florida (for weather purposes)
 */
export function isFloridaPark(parkId: number): boolean {
  const location = PARK_LOCATIONS[parkId];
  return location?.region === 'florida';
}

/**
 * Check if a park is in California (for weather purposes)
 */
export function isCaliforniaPark(parkId: number): boolean {
  const location = PARK_LOCATIONS[parkId];
  return location?.region === 'california';
}
