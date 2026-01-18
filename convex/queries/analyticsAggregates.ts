import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = [
  "9am", "10am", "11am", "12pm", "1pm", "2pm",
  "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm",
];

/**
 * Internal query to get a batch of snapshots for aggregation
 * Processes in batches to stay under the 32K document limit
 * Note: Convex limits return arrays to 8192 items, so max limit is 8000
 */
export const getSnapshotsBatch = internalQuery({
  args: {
    cutoffTimestamp: v.number(),
    limit: v.number(),
    cursor: v.optional(v.number()), // Timestamp to start from
  },
  handler: async (ctx, args) => {
    const startTimestamp = args.cursor ?? args.cutoffTimestamp;
    // Cap limit at 8000 to stay under Convex's 8192 array return limit
    const safeLimit = Math.min(args.limit, 8000);

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", startTimestamp))
      .take(safeLimit);

    return snapshots;
  },
});

/**
 * Get pre-computed weekly patterns from aggregation table
 * Fast read from pre-computed data
 */
export const getWeeklyAggregates = query({
  args: {},
  handler: async (ctx) => {
    const aggregates = await ctx.db
      .query("weeklyAggregates")
      .withIndex("by_operator")
      .collect();

    if (aggregates.length === 0) {
      return {
        data: [],
        hasEnoughData: false,
        lastUpdated: null,
      };
    }

    // Group by day of week
    const disneyByDay: Record<number, number> = {};
    const universalByDay: Record<number, number> = {};

    for (const agg of aggregates) {
      if (agg.operator === "Disney") {
        disneyByDay[agg.dayOfWeek] = agg.avgWaitTime;
      } else if (agg.operator === "Universal") {
        universalByDay[agg.dayOfWeek] = agg.avgWaitTime;
      }
    }

    // Build chart data starting from Monday
    const data = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + 1) % 7;
      data.push({
        day: DAY_NAMES[dayIndex],
        disney: disneyByDay[dayIndex] ?? 0,
        universal: universalByDay[dayIndex] ?? 0,
      });
    }

    const lastUpdated = Math.max(...aggregates.map((a) => a.lastUpdated));

    return {
      data,
      hasEnoughData: aggregates.length >= 7,
      lastUpdated,
    };
  },
});

/**
 * Get pre-computed hourly patterns from aggregation table
 * Fast read from pre-computed data
 */
export const getHourlyAggregates = query({
  args: {
    dayType: v.optional(v.string()), // "weekday", "weekend", or "all"
  },
  handler: async (ctx, args) => {
    const dayType = args.dayType ?? "all";

    const aggregates = await ctx.db
      .query("hourlyAggregates")
      .withIndex("by_operator_daytype", (q) =>
        q.eq("operator", "all").eq("dayType", dayType)
      )
      .collect();

    if (aggregates.length === 0) {
      return {
        data: [],
        hasEnoughData: false,
        lastUpdated: null,
      };
    }

    // Build chart data
    const data = [];
    for (let hour = 9; hour <= 21; hour++) {
      const agg = aggregates.find((a) => a.hour === hour);
      data.push({
        hour: HOUR_LABELS[hour - 9],
        wait: agg?.avgWaitTime ?? 0,
      });
    }

    const lastUpdated = Math.max(...aggregates.map((a) => a.lastUpdated));

    return {
      data,
      hasEnoughData: aggregates.length >= 5,
      lastUpdated,
    };
  },
});

/**
 * Get pre-computed operator comparison from aggregation table
 * Fast read from pre-computed data
 */
export const getOperatorAggregates = query({
  args: {
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const periodDays = args.periodDays ?? 14;

    const aggregates = await ctx.db
      .query("operatorAggregates")
      .withIndex("by_operator_period")
      .collect();

    // Find aggregates for the requested period
    const disney = aggregates.find(
      (a) => a.operator === "Disney" && a.periodDays === periodDays
    );
    const universal = aggregates.find(
      (a) => a.operator === "Universal" && a.periodDays === periodDays
    );

    if (!disney && !universal) {
      return {
        disney: null,
        universal: null,
        hasEnoughData: false,
        lastUpdated: null,
      };
    }

    return {
      disney: disney
        ? {
            avgWait: disney.avgWaitTime,
            totalSnapshots: disney.totalSnapshots,
            parksTracked: disney.parksTracked,
          }
        : null,
      universal: universal
        ? {
            avgWait: universal.avgWaitTime,
            totalSnapshots: universal.totalSnapshots,
            parksTracked: universal.parksTracked,
          }
        : null,
      hasEnoughData: Boolean(disney || universal),
      lastUpdated: Math.max(
        disney?.lastUpdated ?? 0,
        universal?.lastUpdated ?? 0
      ),
      daysOfData: periodDays,
    };
  },
});

/**
 * Get pre-computed analytics insights from aggregation table
 * Fast read from pre-computed data
 */
export const getInsightsAggregates = query({
  args: {
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const periodDays = args.periodDays ?? 28;

    const insights = await ctx.db
      .query("analyticsInsights")
      .withIndex("by_type")
      .collect();

    // Filter by period
    const relevantInsights = insights.filter(
      (i) => i.periodDays === periodDays
    );

    if (relevantInsights.length === 0) {
      return {
        hasEnoughData: false,
        bestDay: null,
        worstDay: null,
        bestHour: null,
        worstHour: null,
        lastUpdated: null,
      };
    }

    const findInsight = (type: string) =>
      relevantInsights.find((i) => i.insightType === type);

    const bestDay = findInsight("best_day");
    const worstDay = findInsight("worst_day");
    const bestHour = findInsight("best_hour");
    const worstHour = findInsight("worst_hour");

    const lastUpdated = Math.max(...relevantInsights.map((i) => i.lastUpdated));

    return {
      hasEnoughData: relevantInsights.length >= 2,
      bestDay: bestDay
        ? { name: bestDay.value, avgWait: bestDay.metric }
        : null,
      worstDay: worstDay
        ? { name: worstDay.value, avgWait: worstDay.metric }
        : null,
      bestHour: bestHour
        ? { time: bestHour.value, avgWait: bestHour.metric }
        : null,
      worstHour: worstHour
        ? { time: worstHour.value, avgWait: worstHour.metric }
        : null,
      lastUpdated,
    };
  },
});

/**
 * Get aggregation status (when was data last updated)
 */
export const getAggregationStatus = query({
  args: {},
  handler: async (ctx) => {
    // Check weekly aggregates as a proxy for all aggregates
    const weekly = await ctx.db
      .query("weeklyAggregates")
      .order("desc")
      .first();

    const hourly = await ctx.db
      .query("hourlyAggregates")
      .order("desc")
      .first();

    const operator = await ctx.db
      .query("operatorAggregates")
      .order("desc")
      .first();

    const insights = await ctx.db
      .query("analyticsInsights")
      .order("desc")
      .first();

    const timestamps = [
      weekly?.lastUpdated,
      hourly?.lastUpdated,
      operator?.lastUpdated,
      insights?.lastUpdated,
    ].filter(Boolean) as number[];

    const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : null;
    const isStale = lastUpdated
      ? Date.now() - lastUpdated > 48 * 60 * 60 * 1000
      : true;

    return {
      lastUpdated,
      isStale,
      hasData: timestamps.length > 0,
      tablesPopulated: {
        weekly: Boolean(weekly),
        hourly: Boolean(hourly),
        operator: Boolean(operator),
        insights: Boolean(insights),
      },
    };
  },
});
