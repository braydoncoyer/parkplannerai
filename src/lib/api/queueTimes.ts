// Queue-Times.com API Client

const QUEUE_TIMES_BASE_URL = 'https://queue-times.com';

// Target Disney and Universal park operators
const TARGET_OPERATORS = ['Disney', 'Universal'];

interface QueueTimesPark {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
}

interface QueueTimesRide {
  id: string;
  name: string;
  is_open: boolean;
  wait_time: number | null;
  last_updated: string; // ISO 8601 timestamp
}

interface QueueTimesParksResponse {
  [operator: string]: {
    parks: QueueTimesPark[];
  };
}

interface QueueTimesRidesResponse {
  lands: Array<{
    rides: QueueTimesRide[];
  }>;
  last_updated: string;
}

/**
 * Fetch all parks from Queue-Times API
 * Filters for Disney and Universal parks only
 */
export async function fetchAllParks(): Promise<QueueTimesPark[]> {
  try {
    const response = await fetch(`${QUEUE_TIMES_BASE_URL}/parks.json`);

    if (!response.ok) {
      throw new Error(`Queue-Times API error: ${response.status}`);
    }

    const data: QueueTimesParksResponse = await response.json();

    // Filter for Disney and Universal parks
    const parks: QueueTimesPark[] = [];

    for (const operator of TARGET_OPERATORS) {
      if (data[operator] && data[operator].parks) {
        parks.push(...data[operator].parks);
      }
    }

    return parks;
  } catch (error) {
    console.error('Error fetching parks from Queue-Times:', error);
    throw error;
  }
}

/**
 * Fetch wait times for a specific park
 */
export async function fetchParkWaitTimes(
  parkId: string
): Promise<{ rides: QueueTimesRide[]; lastUpdated: string }> {
  try {
    const response = await fetch(
      `${QUEUE_TIMES_BASE_URL}/parks/${parkId}/queue_times.json`
    );

    if (!response.ok) {
      throw new Error(`Queue-Times API error: ${response.status}`);
    }

    const data: QueueTimesRidesResponse = await response.json();

    // Flatten rides from all lands
    const rides: QueueTimesRide[] = [];
    for (const land of data.lands) {
      rides.push(...land.rides);
    }

    return {
      rides,
      lastUpdated: data.last_updated,
    };
  } catch (error) {
    console.error(`Error fetching wait times for park ${parkId}:`, error);
    throw error;
  }
}

/**
 * Determine park operator from park name
 */
export function getParkOperator(parkName: string): string {
  if (parkName.toLowerCase().includes('disney')) {
    return 'Disney';
  }
  if (parkName.toLowerCase().includes('universal')) {
    return 'Universal';
  }
  return 'Unknown';
}

/**
 * Check if a park is a target park (Disney or Universal)
 */
export function isTargetPark(parkName: string): boolean {
  const operator = getParkOperator(parkName);
  return TARGET_OPERATORS.includes(operator);
}
