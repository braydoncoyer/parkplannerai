import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get wait time history for a specific ride
 */
export const getRideHistory = query({
  args: {
    rideExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // First find the ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.rideExternalId))
      .unique();

    if (!ride) {
      return { ride: null, snapshots: [], stats: null };
    }

    // Get snapshots for this ride
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) =>
        q.eq("rideId", ride._id).gte("timestamp", cutoffTime)
      )
      .collect();

    // Calculate stats
    const openSnapshots = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined
    );
    const waitTimes = openSnapshots.map((s) => s.waitTimeMinutes!);

    const stats =
      waitTimes.length > 0
        ? {
            avgWaitTime: waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length,
            maxWaitTime: Math.max(...waitTimes),
            minWaitTime: Math.min(...waitTimes),
            totalSnapshots: snapshots.length,
            openSnapshots: openSnapshots.length,
          }
        : null;

    return { ride, snapshots, stats };
  },
});

/**
 * Get ride statistics
 */
export const getRideStats = query({
  args: {
    rideExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const ride = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.rideExternalId))
      .unique();

    if (!ride) {
      return null;
    }

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) =>
        q.eq("rideId", ride._id).gte("timestamp", cutoffTime)
      )
      .collect();

    const openSnapshots = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined
    );
    const waitTimes = openSnapshots.map((s) => s.waitTimeMinutes!);

    if (waitTimes.length === 0) {
      return {
        rideName: ride.name,
        avgWaitTime: null,
        maxWaitTime: null,
        minWaitTime: null,
        totalSnapshots: snapshots.length,
        openSnapshots: 0,
      };
    }

    return {
      rideName: ride.name,
      avgWaitTime: waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length,
      maxWaitTime: Math.max(...waitTimes),
      minWaitTime: Math.min(...waitTimes),
      totalSnapshots: snapshots.length,
      openSnapshots: openSnapshots.length,
    };
  },
});

/**
 * Get daily aggregates for a park
 */
export const getParkHistory = query({
  args: {
    parkExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;

    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return { park: null, aggregates: [] };
    }

    // Get daily aggregates for this park
    const aggregates = await ctx.db
      .query("dailyAggregates")
      .withIndex("by_park_date", (q) => q.eq("parkId", park._id))
      .order("desc")
      .take(days);

    return { park, aggregates };
  },
});

/**
 * Get wait time history for a land (themed area)
 */
export const getLandHistory = query({
  args: {
    landExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const land = await ctx.db
      .query("lands")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.landExternalId))
      .unique();

    if (!land) {
      return { land: null, snapshots: [], stats: null };
    }

    // Get snapshots for rides in this land
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_land_time", (q) =>
        q.eq("landId", land._id).gte("timestamp", cutoffTime)
      )
      .collect();

    // Calculate stats
    const openSnapshots = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined
    );
    const waitTimes = openSnapshots.map((s) => s.waitTimeMinutes!);

    const stats =
      waitTimes.length > 0
        ? {
            avgWaitTime: waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length,
            maxWaitTime: Math.max(...waitTimes),
            minWaitTime: Math.min(...waitTimes),
            totalSnapshots: snapshots.length,
            openSnapshots: openSnapshots.length,
          }
        : null;

    return { land, snapshots, stats };
  },
});

/**
 * Compare wait times across all lands in a park
 */
export const getLandComparison = query({
  args: {
    parkExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return { park: null, lands: [] };
    }

    // Get all lands for this park
    const lands = await ctx.db
      .query("lands")
      .withIndex("by_park", (q) => q.eq("parkId", park._id))
      .collect();

    // Calculate stats for each land
    const landStats = await Promise.all(
      lands.map(async (land) => {
        const snapshots = await ctx.db
          .query("waitTimeSnapshots")
          .withIndex("by_land_time", (q) =>
            q.eq("landId", land._id).gte("timestamp", cutoffTime)
          )
          .collect();

        const openSnapshots = snapshots.filter(
          (s) => s.isOpen && s.waitTimeMinutes !== undefined
        );
        const waitTimes = openSnapshots.map((s) => s.waitTimeMinutes!);

        return {
          landId: land._id,
          landName: land.name,
          avgWaitTime:
            waitTimes.length > 0
              ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
              : null,
          maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : null,
          minWaitTime: waitTimes.length > 0 ? Math.min(...waitTimes) : null,
          totalSnapshots: snapshots.length,
          openSnapshots: openSnapshots.length,
        };
      })
    );

    return { park, lands: landStats };
  },
});

/**
 * Get recent snapshots for a park (for real-time display)
 */
export const getRecentParkSnapshots = query({
  args: {
    parkExternalId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return [];
    }

    return await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_park_time", (q) => q.eq("parkId", park._id))
      .order("desc")
      .take(limit);
  },
});
