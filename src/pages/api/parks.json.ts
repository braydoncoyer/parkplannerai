import type { APIRoute } from 'astro';
import { getParkHours, getDefaultParkHours, PARK_TIMEZONES, type ParkHours } from '../../lib/api/parkHours';
import { isParkCurrentlyOpen } from '../../lib/utils/parkStatus';

const QUEUE_TIMES_BASE_URL = 'https://queue-times.com';

// Timeout wrapper for fetch calls to prevent hanging
const fetchWithTimeout = async (url: string, timeoutMs: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

interface QueueTimesPark {
  id: number;
  name: string;
  country: string;
  continent: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

interface QueueTimesGroup {
  id: number;
  name: string;
  parks: QueueTimesPark[];
}

interface ParkWithStats {
  id: number;
  name: string;
  operator: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
  stats: {
    avgWaitTime: number;
    maxWaitTime: number;
    ridesOpen: number;
    totalRides: number;
    crowdLevel: 'low' | 'moderate' | 'high' | 'very-high';
  };
  lastUpdated: string;
  isOpen: boolean;
  hours: {
    openingTime: string;
    closingTime: string;
  } | null;
}

interface QueueTimesRide {
  id: number;
  name: string;
  is_open: boolean;
  wait_time: number | null;
  last_updated: string;
}

interface QueueTimesLand {
  id: number;
  name: string;
  rides: QueueTimesRide[];
}

interface QueueTimesResponse {
  lands: QueueTimesLand[];
}

function getCrowdLevel(avgWaitTime: number): 'low' | 'moderate' | 'high' | 'very-high' {
  if (avgWaitTime < 20) return 'low';
  if (avgWaitTime < 40) return 'moderate';
  if (avgWaitTime < 60) return 'high';
  return 'very-high';
}

async function fetchParkWaitTimes(parkId: number): Promise<{
  avgWaitTime: number;
  maxWaitTime: number;
  ridesOpen: number;
  totalRides: number;
  lastUpdated: string;
}> {
  try {
    const response = await fetchWithTimeout(
      `${QUEUE_TIMES_BASE_URL}/parks/${parkId}/queue_times.json`,
      8000 // 8 second timeout
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch wait times for park ${parkId}`);
    }

    const data: QueueTimesResponse = await response.json();

    // Flatten all rides from all lands
    const allRides: QueueTimesRide[] = [];
    for (const land of data.lands || []) {
      allRides.push(...(land.rides || []));
    }

    const openRides = allRides.filter((r) => r.is_open && r.wait_time !== null);
    const waitTimes = openRides.map((r) => r.wait_time || 0);

    const avgWaitTime =
      waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0;

    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // Find most recent update time
    const lastUpdated =
      allRides.length > 0
        ? allRides.reduce((latest, ride) => {
            const rideTime = new Date(ride.last_updated).getTime();
            return rideTime > new Date(latest).getTime()
              ? ride.last_updated
              : latest;
          }, allRides[0].last_updated)
        : new Date().toISOString();

    return {
      avgWaitTime,
      maxWaitTime,
      ridesOpen: openRides.length,
      totalRides: allRides.length,
      lastUpdated,
    };
  } catch (error) {
    console.error(`Error fetching wait times for park ${parkId}:`, error);
    return {
      avgWaitTime: 0,
      maxWaitTime: 0,
      ridesOpen: 0,
      totalRides: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const GET: APIRoute = async () => {
  try {
    // Fetch all parks with timeout
    const response = await fetchWithTimeout(`${QUEUE_TIMES_BASE_URL}/parks.json`, 10000);

    if (!response.ok) {
      throw new Error('Failed to fetch parks from Queue-Times');
    }

    const groups: QueueTimesGroup[] = await response.json();

    // Filter for Disney and Universal parks only
    const targetOperators = ['Walt Disney World Resort', 'Disneyland Resort', 'Disney', 'Universal'];
    const disneyUniversalGroups = groups.filter((group) =>
      targetOperators.some(
        (op) =>
          group.name.toLowerCase().includes(op.toLowerCase()) ||
          group.name.includes('Disney') ||
          group.name.includes('Universal')
      )
    );

    // Get all US parks from these groups
    const allParks: Array<QueueTimesPark & { operator: string }> = [];
    for (const group of disneyUniversalGroups) {
      for (const park of group.parks) {
        // Only include US parks
        if (park.country === 'United States') {
          allParks.push({
            ...park,
            operator: group.name.includes('Disney') ? 'Disney' : 'Universal',
          });
        }
      }
    }

    // Fetch wait times and park hours for each park (in parallel)
    const parksWithStats: ParkWithStats[] = await Promise.all(
      allParks.slice(0, 12).map(async (park) => {
        // Fetch wait times and park hours in parallel
        // getParkHours() includes fallback to default hours if API fails
        const [stats, parkHours] = await Promise.all([
          fetchParkWaitTimes(park.id),
          getParkHours(park.id).catch(() => getDefaultParkHours(park.id)),
        ]);

        const parkTimezone = PARK_TIMEZONES[park.id] || park.timezone || 'America/New_York';
        const isOpen = isParkCurrentlyOpen(parkHours, park.id, stats.ridesOpen);

        return {
          id: park.id,
          name: park.name,
          operator: park.operator,
          country: park.country,
          timezone: parkTimezone,
          latitude: parseFloat(park.latitude),
          longitude: parseFloat(park.longitude),
          stats: {
            ...stats,
            crowdLevel: getCrowdLevel(stats.avgWaitTime),
          },
          lastUpdated: stats.lastUpdated,
          isOpen,
          hours: parkHours
            ? {
                openingTime: parkHours.openingTimeFormatted,
                closingTime: parkHours.closingTimeFormatted,
              }
            : null,
        };
      })
    );

    // Sort by crowd level (highest first for visibility)
    parksWithStats.sort((a, b) => b.stats.avgWaitTime - a.stats.avgWaitTime);

    return new Response(
      JSON.stringify({
        parks: parksWithStats,
        meta: {
          totalParks: parksWithStats.length,
          avgWaitTimeAcrossParks:
            parksWithStats.length > 0
              ? Math.round(
                  parksWithStats.reduce((sum, p) => sum + p.stats.avgWaitTime, 0) /
                    parksWithStats.length
                )
              : 0,
          totalRidesOpen: parksWithStats.reduce(
            (sum, p) => sum + p.stats.ridesOpen,
            0
          ),
          fetchedAt: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('Error in parks API:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch park data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
