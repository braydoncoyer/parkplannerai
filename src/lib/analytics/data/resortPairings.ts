// Resort Pairings - Configuration for Park Hopper support

export interface ResortPark {
  id: number; // Queue-Times park ID
  name: string;
  shortName: string;
}

export interface ResortConfig {
  resortId: string;
  resortName: string;
  parks: ResortPark[];
  transitionTime: number; // Minutes to travel between parks
}

export const RESORT_CONFIGS: ResortConfig[] = [
  {
    resortId: 'disneyland-resort',
    resortName: 'Disneyland Resort',
    parks: [
      { id: 16, name: 'Disneyland', shortName: 'DL' },
      { id: 17, name: 'Disney California Adventure', shortName: 'DCA' },
    ],
    transitionTime: 15, // Walking distance between parks
  },
  {
    resortId: 'walt-disney-world',
    resortName: 'Walt Disney World',
    parks: [
      { id: 6, name: 'Magic Kingdom', shortName: 'MK' },
      { id: 5, name: 'EPCOT', shortName: 'EP' },
      { id: 7, name: "Hollywood Studios", shortName: 'HS' },
      { id: 8, name: "Animal Kingdom", shortName: 'AK' },
    ],
    transitionTime: 30, // Bus/monorail travel between parks
  },
  {
    resortId: 'universal-orlando',
    resortName: 'Universal Orlando Resort',
    parks: [
      { id: 65, name: 'Universal Studios Florida', shortName: 'USF' },
      { id: 64, name: 'Islands of Adventure', shortName: 'IOA' },
      { id: 334, name: 'Epic Universe', shortName: 'EU' },
    ],
    transitionTime: 20, // Walking/shuttle between parks
  },
  {
    resortId: 'universal-hollywood',
    resortName: 'Universal Hollywood',
    parks: [
      { id: 66, name: 'Universal Studios Hollywood', shortName: 'USH' },
    ],
    transitionTime: 0, // Single park resort
  },
];

/**
 * Get the resort configuration for a given park ID
 */
export function getResortForPark(parkId: number): ResortConfig | null {
  return (
    RESORT_CONFIGS.find((resort) =>
      resort.parks.some((park) => park.id === parkId)
    ) || null
  );
}

/**
 * Get other parks in the same resort (excluding the given park)
 */
export function getOtherParksInResort(parkId: number): ResortPark[] {
  const resort = getResortForPark(parkId);
  if (!resort) return [];
  return resort.parks.filter((park) => park.id !== parkId);
}

/**
 * Check if a park supports park hopper (is in a multi-park resort)
 */
export function supportsParkHopper(parkId: number): boolean {
  const resort = getResortForPark(parkId);
  return resort !== null && resort.parks.length > 1;
}

/**
 * Get park short name by ID
 */
export function getParkShortName(parkId: number): string {
  for (const resort of RESORT_CONFIGS) {
    const park = resort.parks.find((p) => p.id === parkId);
    if (park) return park.shortName;
  }
  return '';
}

/**
 * Get transition time between two parks
 */
export function getTransitionTime(parkId1: number, parkId2: number): number {
  const resort1 = getResortForPark(parkId1);
  const resort2 = getResortForPark(parkId2);

  // Both parks must be in the same resort
  if (!resort1 || !resort2 || resort1.resortId !== resort2.resortId) {
    return 30; // Default fallback
  }

  return resort1.transitionTime;
}

/**
 * Transition time options for park hopper
 */
export const TRANSITION_TIME_OPTIONS = [
  { value: '10:30 AM', label: '10:30 AM' },
  { value: '11:00 AM', label: '11:00 AM' },
  { value: '11:30 AM', label: '11:30 AM' },
];
