import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Dual-write flag: Set to false after migration is complete
const DUAL_WRITE_ENABLED = true;

/**
 * Insert a single wait time snapshot
 * Writes to liveWaitTimes (new) and optionally waitTimeSnapshots (legacy)
 */
export const insertSnapshot = internalMutation({
  args: {
    rideId: v.id("rides"),
    parkId: v.id("parks"),
    landId: v.optional(v.id("lands")),
    externalRideId: v.string(),
    externalParkId: v.string(),
    waitTimeMinutes: v.optional(v.number()),
    isOpen: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const data = {
      rideId: args.rideId,
      parkId: args.parkId,
      landId: args.landId,
      externalRideId: args.externalRideId,
      externalParkId: args.externalParkId,
      waitTimeMinutes: args.waitTimeMinutes,
      isOpen: args.isOpen,
      timestamp: args.timestamp,
    };

    // Write to new liveWaitTimes table
    const liveId = await ctx.db.insert("liveWaitTimes", data);

    // Dual-write to legacy table during transition
    if (DUAL_WRITE_ENABLED) {
      await ctx.db.insert("waitTimeSnapshots", data);
    }

    return liveId;
  },
});

/**
 * Batch insert multiple wait time snapshots
 * More efficient for bulk inserts during data collection
 * Writes to liveWaitTimes (new) and optionally waitTimeSnapshots (legacy)
 */
export const batchInsertSnapshots = internalMutation({
  args: {
    snapshots: v.array(
      v.object({
        rideId: v.id("rides"),
        parkId: v.id("parks"),
        landId: v.optional(v.id("lands")),
        externalRideId: v.string(),
        externalParkId: v.string(),
        waitTimeMinutes: v.optional(v.number()),
        isOpen: v.boolean(),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];
    for (const snapshot of args.snapshots) {
      // Write to new liveWaitTimes table
      const liveId = await ctx.db.insert("liveWaitTimes", snapshot);
      insertedIds.push(liveId);

      // Dual-write to legacy table during transition
      if (DUAL_WRITE_ENABLED) {
        await ctx.db.insert("waitTimeSnapshots", snapshot);
      }
    }
    return insertedIds;
  },
});
