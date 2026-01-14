import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Delete all snapshots for a park
 */
export const deleteSnapshotsByPark = internalMutation({
  args: {
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_park_time", (q) => q.eq("parkId", args.parkId))
      .collect();

    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    return snapshots.length;
  },
});

/**
 * Delete all rides for a park
 */
export const deleteRidesByPark = internalMutation({
  args: {
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    const rides = await ctx.db
      .query("rides")
      .withIndex("by_park", (q) => q.eq("parkId", args.parkId))
      .collect();

    for (const ride of rides) {
      await ctx.db.delete(ride._id);
    }

    return rides.length;
  },
});

/**
 * Delete all lands for a park
 */
export const deleteLandsByPark = internalMutation({
  args: {
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    const lands = await ctx.db
      .query("lands")
      .withIndex("by_park", (q) => q.eq("parkId", args.parkId))
      .collect();

    for (const land of lands) {
      await ctx.db.delete(land._id);
    }

    return lands.length;
  },
});

/**
 * Delete a park
 */
export const deletePark = internalMutation({
  args: {
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.parkId);
  },
});
