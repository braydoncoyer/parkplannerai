export { renderers } from '../../../renderers.mjs';

const prerender = false;
const QUEUE_TIMES_BASE_URL = "https://queue-times.com";
const GET = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Park ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const response = await fetch(
      `${QUEUE_TIMES_BASE_URL}/parks/${id}/queue_times.json`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch park data: ${response.status}`);
    }
    const data = await response.json();
    const allRides = [];
    const lands = [];
    for (const land of data.lands || []) {
      lands.push({ name: land.name, rideCount: land.rides.length });
      for (const ride of land.rides || []) {
        allRides.push({
          id: ride.id,
          name: ride.name,
          land: land.name,
          isOpen: ride.is_open,
          waitTime: ride.wait_time,
          lastUpdated: ride.last_updated,
          status: !ride.is_open ? "closed" : ride.wait_time === null ? "down" : "open"
        });
      }
    }
    const openRides = allRides.filter((r) => r.status === "open");
    const waitTimes = openRides.map((r) => r.waitTime).filter((w) => w !== null);
    const avgWaitTime = waitTimes.length > 0 ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;
    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
    const minWaitTime = waitTimes.length > 0 ? Math.min(...waitTimes) : 0;
    allRides.sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      if (a.status === "open" && b.status === "open") {
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
          ridesClosed: allRides.filter((r) => r.status === "closed").length,
          ridesDown: allRides.filter((r) => r.status === "down").length,
          avgWaitTime,
          maxWaitTime,
          minWaitTime
        },
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        }
      }
    );
  } catch (error) {
    console.error(`Error fetching park ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch park data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
