"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const QUEUE_TIMES_BASE_URL = "https://queue-times.com";
const TARGET_OPERATORS = ["Disney", "Universal"];

// Only track US parks (Queue-Times park IDs)
const US_PARK_IDS = new Set([
  // Walt Disney World (Florida)
  "6",   // Magic Kingdom
  "5",   // EPCOT
  "7",   // Hollywood Studios
  "8",   // Animal Kingdom
  // Disneyland Resort (California)
  "16",  // Disneyland
  "17",  // Disney California Adventure
  // Universal Orlando (Florida)
  "64",  // Islands of Adventure
  "65",  // Universal Studios Florida
  "334", // Epic Universe
  "67",  // Volcano Bay
  // Universal Hollywood (California)
  "66",  // Universal Studios Hollywood
]);

interface QueueTimesPark {
  id: number;
  name: string;
  country: string;
  continent: string;
  latitude: string;
  longitude: string;
  timezone: string;
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

interface QueueTimesCompany {
  id: number;
  name: string;
  parks: QueueTimesPark[];
}

type QueueTimesParksResponse = QueueTimesCompany[];

interface QueueTimesRidesResponse {
  lands: QueueTimesLand[];
  rides: QueueTimesRide[];
  last_updated: string;
}

/**
 * Fetch all parks from Queue-Times API
 */
async function fetchAllParks(): Promise<(QueueTimesPark & { operator: string })[]> {
  const response = await fetch(`${QUEUE_TIMES_BASE_URL}/parks.json`);
  if (!response.ok) {
    throw new Error(`Queue-Times API error: ${response.status}`);
  }

  const data: QueueTimesParksResponse = await response.json();
  const parks: (QueueTimesPark & { operator: string })[] = [];

  for (const company of data) {
    const matchedOperator = TARGET_OPERATORS.find((op) =>
      company.name.toLowerCase().includes(op.toLowerCase())
    );

    if (matchedOperator && company.parks) {
      parks.push(
        ...company.parks.map((park) => ({
          ...park,
          operator: matchedOperator,
        }))
      );
    }
  }

  return parks;
}

/**
 * Fetch wait times for a specific park
 */
async function fetchParkWaitTimes(parkId: string): Promise<{
  lands: QueueTimesLand[];
  rides: QueueTimesRide[];
  lastUpdated: string;
}> {
  const response = await fetch(
    `${QUEUE_TIMES_BASE_URL}/parks/${parkId}/queue_times.json`
  );

  if (!response.ok) {
    throw new Error(`Queue-Times API error: ${response.status}`);
  }

  const data: QueueTimesRidesResponse = await response.json();

  return {
    lands: data.lands || [],
    rides: data.rides || [],
    lastUpdated: data.last_updated,
  };
}

/**
 * Check if current time is within park operating hours
 * Skip collection between 5:00 UTC and 13:00 UTC (overnight in US)
 */
function isWithinOperatingHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour >= 5 && utcHour < 13) {
    return false;
  }
  return true;
}

// Type for ride mappings returned from query
interface RideMappings {
  parksByExternalId: Record<string, { _id: Id<"parks">; externalId: string; name: string }>;
  ridesByExternalId: Record<string, { _id: Id<"rides">; parkId: Id<"parks">; landId: Id<"lands"> | undefined; externalParkId: string }>;
  hasData: boolean;
  parkCount: number;
  rideCount: number;
}

/**
 * Main wait time collection action (runs every 15 minutes)
 * Uses cached ride data when available, only fetches wait times
 */
export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    skipped?: boolean;
    reason?: string;
    error?: string;
    parksProcessed?: number;
    snapshotsInserted: number;
  }> => {
    // Check if we're within operating hours
    if (!isWithinOperatingHours()) {
      const now = new Date();
      console.log(`[${now.toISOString()}] Skipping - outside park hours (UTC: ${now.getUTCHours()})`);
      return {
        success: true,
        skipped: true,
        reason: "Outside park operating hours",
        snapshotsInserted: 0,
      };
    }

    console.log(`[${new Date().toISOString()}] Starting wait time collection...`);

    // Get cached ride mappings from database
    const mappings: RideMappings = await ctx.runQuery(internal.queries.parks.getRideMappingsInternal);

    // If no data in DB, we need to sync first - but let the daily cron handle that
    // or manually trigger syncParksAndRides. For now, just log and skip.
    if (!mappings.hasData) {
      console.log("No ride data in database - run syncParksAndRides first");
      return {
        success: false,
        error: "No ride data - sync required",
        snapshotsInserted: 0
      };
    }

    return collectWaitTimesOnly(ctx, mappings);
  },
});

/**
 * Collect only wait times using cached ride data
 * This is the efficient path that runs every 15 minutes
 */
async function collectWaitTimesOnly(
  ctx: any,
  mappings: RideMappings
): Promise<{
  success: boolean;
  error?: string;
  parksProcessed: number;
  snapshotsInserted: number;
}> {
  let snapshotsInserted = 0;
  let parksProcessed = 0;
  const collectionTimestamp = Date.now();

  try {
    // Only fetch wait times for parks we have in the database
    const parkExternalIds = Object.keys(mappings.parksByExternalId).filter(id => US_PARK_IDS.has(id));

    for (const parkExternalId of parkExternalIds) {
      const parkInfo = mappings.parksByExternalId[parkExternalId];

      try {
        // Fetch wait times (this is the only API call we need)
        const { lands, rides: standaloneRides } = await fetchParkWaitTimes(parkExternalId);

        // Process rides from lands
        // Skip "Single Rider" entries - these are queue options, not separate rides
        for (const land of lands) {
          const filteredRides = land.rides.filter(
            (ride) => !ride.name.toLowerCase().includes('single rider')
          );

          for (const ride of filteredRides) {
            const rideExternalId = String(ride.id);
            const rideMapping = mappings.ridesByExternalId[rideExternalId];

            if (rideMapping) {
              // We have this ride cached - just insert the snapshot
              await ctx.runMutation(internal.mutations.snapshots.insertSnapshot, {
                rideId: rideMapping._id,
                parkId: rideMapping.parkId,
                landId: rideMapping.landId,
                externalRideId: rideExternalId,
                externalParkId: parkExternalId,
                waitTimeMinutes: ride.wait_time ?? undefined,
                isOpen: ride.is_open,
                timestamp: collectionTimestamp,
              });
              snapshotsInserted++;
            }
            // If ride not in cache, it's new - will be picked up by daily sync
          }
        }

        // Process standalone rides (also skip Single Rider)
        const filteredStandaloneRides = standaloneRides.filter(
          (ride) => !ride.name.toLowerCase().includes('single rider')
        );

        for (const ride of filteredStandaloneRides) {
          const rideExternalId = String(ride.id);
          const rideMapping = mappings.ridesByExternalId[rideExternalId];

          if (rideMapping) {
            await ctx.runMutation(internal.mutations.snapshots.insertSnapshot, {
              rideId: rideMapping._id,
              parkId: rideMapping.parkId,
              landId: rideMapping.landId,
              externalRideId: rideExternalId,
              externalParkId: parkExternalId,
              waitTimeMinutes: ride.wait_time ?? undefined,
              isOpen: ride.is_open,
              timestamp: collectionTimestamp,
            });
            snapshotsInserted++;
          }
        }

        parksProcessed++;
        console.log(`  ✓ ${parkInfo.name}: collected wait times`);
      } catch (error) {
        console.error(`  ✗ Error fetching ${parkInfo.name}:`, error);
      }
    }

    console.log(`[${new Date().toISOString()}] Done! ${snapshotsInserted} snapshots from ${parksProcessed} parks`);

    return {
      success: true,
      parksProcessed,
      snapshotsInserted,
    };
  } catch (error) {
    console.error("Error during wait time collection:", error);
    return {
      success: false,
      error: String(error),
      parksProcessed,
      snapshotsInserted,
    };
  }
}

/**
 * Full sync of parks, lands, and rides
 * Should run daily or on first startup
 */
export const syncParksAndRides = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log(`[${new Date().toISOString()}] Syncing parks, lands, and rides...`);

    let parksProcessed = 0;
    let landsProcessed = 0;
    let ridesProcessed = 0;

    try {
      const parks = await fetchAllParks();
      console.log(`Found ${parks.length} Disney/Universal parks`);

      for (const park of parks) {
        const parkExternalId = String(park.id);

        if (!US_PARK_IDS.has(parkExternalId)) {
          continue;
        }

        try {
          // Upsert park
          const parkId = await ctx.runMutation(internal.mutations.parks.upsertPark, {
            externalId: parkExternalId,
            name: park.name,
            operator: park.operator,
            timezone: park.timezone,
            latitude: parseFloat(String(park.latitude)),
            longitude: parseFloat(String(park.longitude)),
            country: park.country,
            continent: park.continent,
          });
          parksProcessed++;

          // Fetch structure for this park
          const { lands, rides: standaloneRides } = await fetchParkWaitTimes(parkExternalId);

          // Process lands and their rides
          // Filter out "Single Rider" entries - these are queue options, not separate rides
          for (const land of lands) {
            const landExternalId = String(land.id);

            const landId = await ctx.runMutation(internal.mutations.lands.upsertLand, {
              externalId: landExternalId,
              parkId: parkId,
              externalParkId: parkExternalId,
              name: land.name,
            });
            landsProcessed++;

            const filteredRides = land.rides.filter(
              (ride) => !ride.name.toLowerCase().includes('single rider')
            );

            for (const ride of filteredRides) {
              await ctx.runMutation(internal.mutations.rides.upsertRide, {
                externalId: String(ride.id),
                parkId: parkId,
                landId: landId,
                externalParkId: parkExternalId,
                externalLandId: landExternalId,
                name: ride.name,
              });
              ridesProcessed++;
            }
          }

          // Process standalone rides (also filter out Single Rider)
          const filteredStandaloneRides = standaloneRides.filter(
            (ride) => !ride.name.toLowerCase().includes('single rider')
          );

          for (const ride of filteredStandaloneRides) {
            await ctx.runMutation(internal.mutations.rides.upsertRide, {
              externalId: String(ride.id),
              parkId: parkId,
              externalParkId: parkExternalId,
              name: ride.name,
            });
            ridesProcessed++;
          }

          console.log(`  ✓ Synced: ${park.name}`);
        } catch (error) {
          console.error(`  ✗ Error syncing ${park.name}:`, error);
        }
      }

      console.log(`[${new Date().toISOString()}] Sync complete!`);
      console.log(`Stats: ${parksProcessed} parks, ${landsProcessed} lands, ${ridesProcessed} rides`);

      return { success: true, parksProcessed, landsProcessed, ridesProcessed };
    } catch (error) {
      console.error("Fatal error during sync:", error);
      return { success: false, error: String(error) };
    }
  },
});
