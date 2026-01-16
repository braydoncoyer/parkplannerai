import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert hourly aggregate records
 * Used for pre-computing average wait by hour of day
 */
export const upsertHourlyAggregate = internalMutation({
  args: {
    parkId: v.optional(v.id("parks")),
    operator: v.string(),
    dayType: v.string(),
    hour: v.number(),
    avgWaitTime: v.number(),
    sampleCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if record exists - need to find by all unique key fields
    const existing = await ctx.db
      .query("hourlyAggregates")
      .withIndex("by_operator_daytype", (q) =>
        q.eq("operator", args.operator).eq("dayType", args.dayType)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("hour"), args.hour),
          args.parkId
            ? q.eq(q.field("parkId"), args.parkId)
            : q.eq(q.field("parkId"), undefined)
        )
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        avgWaitTime: args.avgWaitTime,
        sampleCount: args.sampleCount,
        lastUpdated: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("hourlyAggregates", {
      parkId: args.parkId,
      operator: args.operator,
      dayType: args.dayType,
      hour: args.hour,
      avgWaitTime: args.avgWaitTime,
      sampleCount: args.sampleCount,
      lastUpdated: now,
    });
  },
});

/**
 * Upsert weekly aggregate records
 * Used for pre-computing average wait by day of week
 */
export const upsertWeeklyAggregate = internalMutation({
  args: {
    operator: v.string(),
    dayOfWeek: v.number(),
    avgWaitTime: v.number(),
    sampleCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("weeklyAggregates")
      .withIndex("by_operator", (q) => q.eq("operator", args.operator))
      .filter((q) => q.eq(q.field("dayOfWeek"), args.dayOfWeek))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        avgWaitTime: args.avgWaitTime,
        sampleCount: args.sampleCount,
        lastUpdated: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("weeklyAggregates", {
      operator: args.operator,
      dayOfWeek: args.dayOfWeek,
      avgWaitTime: args.avgWaitTime,
      sampleCount: args.sampleCount,
      lastUpdated: now,
    });
  },
});

/**
 * Upsert operator aggregate records
 * Used for Disney vs Universal comparison
 */
export const upsertOperatorAggregate = internalMutation({
  args: {
    operator: v.string(),
    periodDays: v.number(),
    avgWaitTime: v.number(),
    totalSnapshots: v.number(),
    parksTracked: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("operatorAggregates")
      .withIndex("by_operator_period", (q) =>
        q.eq("operator", args.operator).eq("periodDays", args.periodDays)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        avgWaitTime: args.avgWaitTime,
        totalSnapshots: args.totalSnapshots,
        parksTracked: args.parksTracked,
        lastUpdated: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("operatorAggregates", {
      operator: args.operator,
      periodDays: args.periodDays,
      avgWaitTime: args.avgWaitTime,
      totalSnapshots: args.totalSnapshots,
      parksTracked: args.parksTracked,
      lastUpdated: now,
    });
  },
});

/**
 * Upsert analytics insight records
 * Used for best day, worst hour, etc.
 */
export const upsertAnalyticsInsight = internalMutation({
  args: {
    insightType: v.string(),
    value: v.string(),
    metric: v.number(),
    periodDays: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("analyticsInsights")
      .withIndex("by_type", (q) => q.eq("insightType", args.insightType))
      .filter((q) => q.eq(q.field("periodDays"), args.periodDays))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        metric: args.metric,
        lastUpdated: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("analyticsInsights", {
      insightType: args.insightType,
      value: args.value,
      metric: args.metric,
      periodDays: args.periodDays,
      lastUpdated: now,
    });
  },
});

/**
 * Clear all analytics aggregates (for rebuilding)
 */
export const clearAllAnalyticsAggregates = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear hourly aggregates
    const hourly = await ctx.db.query("hourlyAggregates").collect();
    for (const doc of hourly) {
      await ctx.db.delete(doc._id);
    }

    // Clear weekly aggregates
    const weekly = await ctx.db.query("weeklyAggregates").collect();
    for (const doc of weekly) {
      await ctx.db.delete(doc._id);
    }

    // Clear operator aggregates
    const operator = await ctx.db.query("operatorAggregates").collect();
    for (const doc of operator) {
      await ctx.db.delete(doc._id);
    }

    // Clear insights
    const insights = await ctx.db.query("analyticsInsights").collect();
    for (const doc of insights) {
      await ctx.db.delete(doc._id);
    }

    return {
      hourlyDeleted: hourly.length,
      weeklyDeleted: weekly.length,
      operatorDeleted: operator.length,
      insightsDeleted: insights.length,
    };
  },
});
