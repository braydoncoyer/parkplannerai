import type { APIRoute } from 'astro';

// Disable prerendering for dynamic API route
export const prerender = false;

const QUEUE_TIMES_BASE_URL = 'https://queue-times.com';

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

interface RideWithLand {
  id: number;
  name: string;
  land: string;
  isOpen: boolean;
  waitTime: number | null;
  lastUpdated: string;
  status: 'open' | 'closed' | 'down';
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Park ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch park queue times
    const response = await fetch(
      `${QUEUE_TIMES_BASE_URL}/parks/${id}/queue_times.json`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch park data: ${response.status}`);
    }

    const data: QueueTimesResponse = await response.json();

    // Process rides by land
    // Filter out "Single Rider" entries - these are queue options, not separate rides
    const allRides: RideWithLand[] = [];
    const lands: { name: string; rideCount: number }[] = [];

    for (const land of data.lands || []) {
      const filteredRides = (land.rides || []).filter(
        (ride) => !ride.name.toLowerCase().includes('single rider')
      );

      lands.push({ name: land.name, rideCount: filteredRides.length });

      for (const ride of filteredRides) {
        allRides.push({
          id: ride.id,
          name: ride.name,
          land: land.name,
          isOpen: ride.is_open,
          waitTime: ride.wait_time,
          lastUpdated: ride.last_updated,
          status: !ride.is_open
            ? 'closed'
            : ride.wait_time === null
            ? 'down'
            : 'open',
        });
      }
    }

    // Calculate stats
    const openRides = allRides.filter((r) => r.status === 'open');
    const waitTimes = openRides
      .map((r) => r.waitTime)
      .filter((w): w is number => w !== null);

    const avgWaitTime =
      waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0;
    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
    const minWaitTime = waitTimes.length > 0 ? Math.min(...waitTimes) : 0;

    // Sort rides: open first (by wait time desc), then closed
    allRides.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      if (a.status === 'open' && b.status === 'open') {
        return (b.waitTime || 0) - (a.waitTime || 0);
      }
      return a.name.localeCompare(b.name);
    });

    return new Response(
      JSON.stringify({
        parkId: id,
        rides: allRides,
        lands,
        stats: {
          totalRides: allRides.length,
          ridesOpen: openRides.length,
          ridesClosed: allRides.filter((r) => r.status === 'closed').length,
          ridesDown: allRides.filter((r) => r.status === 'down').length,
          avgWaitTime,
          maxWaitTime,
          minWaitTime,
        },
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error(`Error fetching park ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch park data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
