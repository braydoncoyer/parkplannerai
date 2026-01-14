import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get snapshots within a timestamp range
 * Used by computeDailyAggregates action
 */
export const getSnapshotsForDateRange = internalQuery({
  args: {
    startTimestamp: v.number(),
    endTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Query snapshots in the time range
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startTimestamp).lte("timestamp", args.endTimestamp)
      )
      .collect();

    return snapshots;
  },
});

/**
 * Get daily aggregates for a specific park
 */
export const getDailyAggregatesByPark = query({
  args: {
    parkExternalId: v.string(),
    days: v.optional(v.number()), // Number of days to fetch (default 30)
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;

    // Find the park
    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return { aggregates: [], park: null };
    }

    // Get aggregates for this park, sorted by date descending
    const aggregates = await ctx.db
      .query("dailyAggregates")
      .withIndex("by_park_date", (q) => q.eq("parkId", park._id))
      .order("desc")
      .take(days);

    return {
      aggregates: aggregates.reverse(), // Return in chronological order
      park: {
        _id: park._id,
        name: park.name,
        operator: park.operator,
      },
    };
  },
});

/**
 * Get daily aggregates by day of week (for pattern analysis)
 */
export const getAggregatesByDayOfWeek = query({
  args: {
    dayOfWeek: v.number(), // 0-6 (0 = Sunday)
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const aggregates = await ctx.db
      .query("dailyAggregates")
      .withIndex("by_day_of_week", (q) => q.eq("dayOfWeek", args.dayOfWeek))
      .order("desc")
      .take(limit);

    return aggregates;
  },
});

/**
 * Get aggregates comparing holidays vs non-holidays
 */
export const getHolidayComparison = query({
  args: {
    parkExternalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates;

    if (args.parkExternalId) {
      const externalId = args.parkExternalId;
      const park = await ctx.db
        .query("parks")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .unique();

      if (!park) {
        return { holiday: null, nonHoliday: null };
      }

      aggregates = await ctx.db
        .query("dailyAggregates")
        .withIndex("by_park_date", (q) => q.eq("parkId", park._id))
        .collect();
    } else {
      aggregates = await ctx.db.query("dailyAggregates").collect();
    }

    const holidayAggs = aggregates.filter((a) => a.isHoliday && a.avgWaitTime !== undefined);
    const nonHolidayAggs = aggregates.filter((a) => !a.isHoliday && a.avgWaitTime !== undefined);

    const holidayAvg =
      holidayAggs.length > 0
        ? Math.round(
            holidayAggs.reduce((sum, a) => sum + (a.avgWaitTime ?? 0), 0) / holidayAggs.length
          )
        : null;

    const nonHolidayAvg =
      nonHolidayAggs.length > 0
        ? Math.round(
            nonHolidayAggs.reduce((sum, a) => sum + (a.avgWaitTime ?? 0), 0) / nonHolidayAggs.length
          )
        : null;

    return {
      holiday: {
        avgWaitTime: holidayAvg,
        sampleCount: holidayAggs.length,
      },
      nonHoliday: {
        avgWaitTime: nonHolidayAvg,
        sampleCount: nonHolidayAggs.length,
      },
      percentIncrease:
        holidayAvg !== null && nonHolidayAvg !== null && nonHolidayAvg > 0
          ? Math.round(((holidayAvg - nonHolidayAvg) / nonHolidayAvg) * 100)
          : null,
    };
  },
});

/**
 * Get overall daily aggregates summary
 */
export const getDailyAggregatesSummary = query({
  args: {},
  handler: async (ctx) => {
    const aggregates = await ctx.db.query("dailyAggregates").collect();

    if (aggregates.length === 0) {
      return {
        totalDays: 0,
        parksWithData: 0,
        dateRange: null,
        overallAvgWait: null,
        overallMaxWait: null,
      };
    }

    // Get date range
    const dates = aggregates.map((a) => a.date).sort();
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];

    // Get unique parks
    const uniqueParks = new Set(aggregates.map((a) => a.parkId));

    // Calculate overall averages
    const validAggs = aggregates.filter((a) => a.avgWaitTime !== undefined);
    const overallAvgWait =
      validAggs.length > 0
        ? Math.round(
            validAggs.reduce((sum, a) => sum + (a.avgWaitTime ?? 0), 0) / validAggs.length
          )
        : null;

    const maxWaits = aggregates
      .filter((a) => a.maxWaitTime !== undefined)
      .map((a) => a.maxWaitTime!);
    const overallMaxWait = maxWaits.length > 0 ? Math.max(...maxWaits) : null;

    return {
      totalDays: new Set(dates).size,
      parksWithData: uniqueParks.size,
      dateRange: {
        oldest: oldestDate,
        newest: newestDate,
      },
      overallAvgWait,
      overallMaxWait,
      totalRecords: aggregates.length,
    };
  },
});
