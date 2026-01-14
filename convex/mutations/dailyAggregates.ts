import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert a daily aggregate record for a park
 * If a record exists for this park+date, update it; otherwise insert
 */
export const upsertDailyAggregate = internalMutation({
  args: {
    parkId: v.id("parks"),
    externalParkId: v.string(),
    date: v.string(), // ISO date YYYY-MM-DD
    avgWaitTime: v.optional(v.number()),
    maxWaitTime: v.optional(v.number()),
    totalRidesOpen: v.number(),
    dayOfWeek: v.number(), // 0-6 (0 = Sunday)
    isHoliday: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if aggregate already exists for this park+date
    const existing = await ctx.db
      .query("dailyAggregates")
      .withIndex("by_park_date", (q) =>
        q.eq("parkId", args.parkId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        avgWaitTime: args.avgWaitTime,
        maxWaitTime: args.maxWaitTime,
        totalRidesOpen: args.totalRidesOpen,
        dayOfWeek: args.dayOfWeek,
        isHoliday: args.isHoliday,
      });
      return existing._id;
    }

    // Insert new record
    return await ctx.db.insert("dailyAggregates", {
      parkId: args.parkId,
      externalParkId: args.externalParkId,
      date: args.date,
      avgWaitTime: args.avgWaitTime,
      maxWaitTime: args.maxWaitTime,
      totalRidesOpen: args.totalRidesOpen,
      dayOfWeek: args.dayOfWeek,
      isHoliday: args.isHoliday,
    });
  },
});

/**
 * Batch upsert multiple daily aggregates
 */
export const batchUpsertDailyAggregates = internalMutation({
  args: {
    aggregates: v.array(
      v.object({
        parkId: v.id("parks"),
        externalParkId: v.string(),
        date: v.string(),
        avgWaitTime: v.optional(v.number()),
        maxWaitTime: v.optional(v.number()),
        totalRidesOpen: v.number(),
        dayOfWeek: v.number(),
        isHoliday: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const agg of args.aggregates) {
      // Check if aggregate already exists
      const existing = await ctx.db
        .query("dailyAggregates")
        .withIndex("by_park_date", (q) =>
          q.eq("parkId", agg.parkId).eq("date", agg.date)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          avgWaitTime: agg.avgWaitTime,
          maxWaitTime: agg.maxWaitTime,
          totalRidesOpen: agg.totalRidesOpen,
          dayOfWeek: agg.dayOfWeek,
          isHoliday: agg.isHoliday,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("dailyAggregates", agg);
        results.push(id);
      }
    }
    return results;
  },
});
