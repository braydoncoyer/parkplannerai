import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Insert a single wait time snapshot
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
    return await ctx.db.insert("waitTimeSnapshots", {
      rideId: args.rideId,
      parkId: args.parkId,
      landId: args.landId,
      externalRideId: args.externalRideId,
      externalParkId: args.externalParkId,
      waitTimeMinutes: args.waitTimeMinutes,
      isOpen: args.isOpen,
      timestamp: args.timestamp,
    });
  },
});

/**
 * Batch insert multiple wait time snapshots
 * More efficient for bulk inserts during data collection
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
      const id = await ctx.db.insert("waitTimeSnapshots", snapshot);
      insertedIds.push(id);
    }
    return insertedIds;
  },
});
