"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// US parks to KEEP (Queue-Times park IDs)
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

/**
 * One-time cleanup to remove non-US park data
 * Run this manually from the dashboard, then delete this file
 */
export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting cleanup of non-US park data...");

    // Get all parks
    const allParks = await ctx.runQuery(internal.queries.parks.getAllParksInternal);

    let parksDeleted = 0;
    let landsDeleted = 0;
    let ridesDeleted = 0;
    let snapshotsDeleted = 0;

    for (const park of allParks) {
      // Skip US parks - we want to keep those
      if (US_PARK_IDS.has(park.externalId)) {
        console.log(`Keeping US park: ${park.name}`);
        continue;
      }

      console.log(`Deleting non-US park: ${park.name} (${park.externalId})`);

      // Delete all snapshots for this park
      const snapshots = await ctx.runMutation(internal.mutations.cleanup.deleteSnapshotsByPark, {
        parkId: park._id,
      });
      snapshotsDeleted += snapshots;

      // Delete all rides for this park
      const rides = await ctx.runMutation(internal.mutations.cleanup.deleteRidesByPark, {
        parkId: park._id,
      });
      ridesDeleted += rides;

      // Delete all lands for this park
      const lands = await ctx.runMutation(internal.mutations.cleanup.deleteLandsByPark, {
        parkId: park._id,
      });
      landsDeleted += lands;

      // Delete the park itself
      await ctx.runMutation(internal.mutations.cleanup.deletePark, {
        parkId: park._id,
      });
      parksDeleted++;
    }

    console.log("Cleanup complete!");
    console.log(`Deleted: ${parksDeleted} parks, ${landsDeleted} lands, ${ridesDeleted} rides, ${snapshotsDeleted} snapshots`);

    return {
      success: true,
      parksDeleted,
      landsDeleted,
      ridesDeleted,
      snapshotsDeleted,
    };
  },
});
