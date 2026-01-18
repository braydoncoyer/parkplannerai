import { query } from "../_generated/server";
import { v } from "convex/values";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = [
  "9am", "10am", "11am", "12pm", "1pm", "2pm",
  "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm",
];

/**
 * Convert a UTC timestamp to local hour in a given timezone
 * Uses simplified offset calculation (doesn't account for DST)
 */
function getLocalHour(timestamp: number, timezone: string | undefined): number {
  const tz = timezone || "America/New_York";
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();

  // Simplified timezone offset (doesn't account for DST)
  let offset = -5; // Default to Eastern (UTC-5)
  if (tz.includes("Los_Angeles") || tz.includes("Pacific")) {
    offset = -8;
  } else if (tz.includes("Chicago") || tz.includes("Central")) {
    offset = -6;
  } else if (tz.includes("Denver") || tz.includes("Mountain")) {
    offset = -7;
  }

  let localHour = utcHour + offset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;
  return localHour;
}

/**
 * Get average wait times by day of week
 * Returns data for weekly trend chart
 * Uses pre-computed aggregates for fast reads, falls back to real-time if not available
 */
export const getWeeklyPatterns = query({
  args: {
    weeks: v.optional(v.number()), // How many weeks of data (default 4)
  },
  handler: async (ctx, args) => {
    // Try to use pre-computed aggregates first
    const aggregates = await ctx.db
      .query("weeklyAggregates")
      .withIndex("by_operator")
      .collect();

    if (aggregates.length >= 7) {
      // Use pre-computed data
      const disneyByDay: Record<number, number> = {};
      const universalByDay: Record<number, number> = {};

      for (const agg of aggregates) {
        if (agg.operator === "Disney") {
          disneyByDay[agg.dayOfWeek] = agg.avgWaitTime;
        } else if (agg.operator === "Universal") {
          universalByDay[agg.dayOfWeek] = agg.avgWaitTime;
        }
      }

      const weeklyData = [];
      for (let i = 0; i < 7; i++) {
        const dayIndex = (i + 1) % 7;
        weeklyData.push({
          day: DAY_NAMES[dayIndex],
          disney: disneyByDay[dayIndex] ?? 0,
          universal: universalByDay[dayIndex] ?? 0,
        });
      }

      const sampleCount = aggregates.reduce((sum, a) => sum + a.sampleCount, 0);
      const lastUpdated = Math.max(...aggregates.map((a) => a.lastUpdated));

      return {
        data: weeklyData,
        totalDataPoints: sampleCount,
        weeksOfData: args.weeks ?? 4,
        hasEnoughData: true,
        source: "precomputed",
        lastUpdated,
      };
    }

    // Fall back to real-time computation if aggregates not available
    const weeks = args.weeks ?? 4;
    const cutoffTime = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;

    // Calculate start of today (UTC) to exclude partial day data
    const now = new Date();
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const parks = await ctx.db.query("parks").collect();

    const disneyParkIds = new Set(
      parks.filter((p) => p.operator === "Disney").map((p) => p._id)
    );
    const universalParkIds = new Set(
      parks.filter((p) => p.operator === "Universal").map((p) => p._id)
    );

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .take(25000);

    const disneyByDay: Record<number, number[]> = {};
    const universalByDay: Record<number, number[]> = {};

    for (let i = 0; i < 7; i++) {
      disneyByDay[i] = [];
      universalByDay[i] = [];
    }

    for (const snapshot of snapshots) {
      // Exclude today's partial data to avoid skewing averages
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined || snapshot.timestamp >= startOfTodayUTC) continue;

      const dayOfWeek = new Date(snapshot.timestamp).getDay();

      if (disneyParkIds.has(snapshot.parkId)) {
        disneyByDay[dayOfWeek].push(snapshot.waitTimeMinutes);
      } else if (universalParkIds.has(snapshot.parkId)) {
        universalByDay[dayOfWeek].push(snapshot.waitTimeMinutes);
      }
    }

    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + 1) % 7;
      const disneyWaits = disneyByDay[dayIndex];
      const universalWaits = universalByDay[dayIndex];

      weeklyData.push({
        day: DAY_NAMES[dayIndex],
        disney:
          disneyWaits.length > 0
            ? Math.round(
                disneyWaits.reduce((a, b) => a + b, 0) / disneyWaits.length
              )
            : 0,
        universal:
          universalWaits.length > 0
            ? Math.round(
                universalWaits.reduce((a, b) => a + b, 0) / universalWaits.length
              )
            : 0,
      });
    }

    const totalDataPoints = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined
    ).length;

    return {
      data: weeklyData,
      totalDataPoints,
      weeksOfData: weeks,
      hasEnoughData: totalDataPoints >= 100,
      source: "realtime",
    };
  },
});

/**
 * Get hourly patterns (average wait by hour of day)
 * Returns data for hourly pattern chart
 * Uses pre-computed aggregates for fast reads, falls back to real-time if not available
 */
export const getHourlyPatterns = query({
  args: {
    parkExternalId: v.optional(v.string()), // Specific park or all
    days: v.optional(v.number()), // Days of data (default 14)
    dayType: v.optional(v.string()), // weekday/weekend/all
  },
  handler: async (ctx, args) => {
    const dayTypeFilter = args.dayType ?? "all";

    // Try to use pre-computed aggregates first (only for "all parks" queries)
    if (!args.parkExternalId) {
      const aggregates = await ctx.db
        .query("hourlyAggregates")
        .withIndex("by_operator_daytype", (q) =>
          q.eq("operator", "all").eq("dayType", dayTypeFilter)
        )
        .collect();

      if (aggregates.length >= 5) {
        // Use pre-computed data
        const data = [];
        for (let hour = 9; hour <= 21; hour++) {
          const agg = aggregates.find((a) => a.hour === hour);
          data.push({
            hour: HOUR_LABELS[hour - 9],
            wait: agg?.avgWaitTime ?? 0,
          });
        }

        const sampleCount = aggregates.reduce((sum, a) => sum + a.sampleCount, 0);
        const lastUpdated = Math.max(...aggregates.map((a) => a.lastUpdated));

        return {
          data,
          totalDataPoints: sampleCount,
          daysOfData: args.days ?? 14,
          hasEnoughData: true,
          source: "precomputed",
          lastUpdated,
          timezone: undefined, // All parks use mixed timezones
        };
      }
    }

    // Fall back to real-time computation
    const days = args.days ?? 14;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Calculate start of today (UTC) to exclude partial day data
    const now = new Date();
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let parkId = null;
    let parkTimezone: string | undefined = undefined;
    if (args.parkExternalId !== undefined) {
      const externalId = args.parkExternalId;
      const park = await ctx.db
        .query("parks")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", externalId)
        )
        .unique();
      if (park) {
        parkId = park._id;
        parkTimezone = park.timezone;
      }
    }

    let snapshots;
    if (parkId) {
      snapshots = await ctx.db
        .query("waitTimeSnapshots")
        .withIndex("by_park_time", (q) =>
          q.eq("parkId", parkId).gte("timestamp", cutoffTime)
        )
        .take(20000);
    } else {
      snapshots = await ctx.db
        .query("waitTimeSnapshots")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
        .take(20000);
    }

    // Exclude today's partial data to avoid skewing averages
    const filteredSnapshots = snapshots.filter((snapshot) => {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined || snapshot.timestamp >= startOfTodayUTC)
        return false;

      if (args.dayType && args.dayType !== "all") {
        const dayOfWeek = new Date(snapshot.timestamp).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (args.dayType === "weekday" && isWeekend) return false;
        if (args.dayType === "weekend" && !isWeekend) return false;
      }

      return true;
    });

    const hourlyData: Record<number, number[]> = {};
    for (let hour = 9; hour <= 21; hour++) {
      hourlyData[hour] = [];
    }

    for (const snapshot of filteredSnapshots) {
      // Use local park time when a specific park is selected
      const hour = parkTimezone
        ? getLocalHour(snapshot.timestamp, parkTimezone)
        : new Date(snapshot.timestamp).getUTCHours();
      if (hour >= 9 && hour <= 21) {
        hourlyData[hour].push(snapshot.waitTimeMinutes!);
      }
    }

    const data = [];
    for (let hour = 9; hour <= 21; hour++) {
      const waits = hourlyData[hour];
      data.push({
        hour: HOUR_LABELS[hour - 9],
        wait:
          waits.length > 0
            ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
            : 0,
      });
    }

    return {
      data,
      totalDataPoints: filteredSnapshots.length,
      daysOfData: days,
      hasEnoughData: filteredSnapshots.length >= 50,
      source: "realtime",
      timezone: parkTimezone,
    };
  },
});

/**
 * Get analytics insights summary
 * Uses pre-computed aggregates for fast reads, falls back to real-time if not available
 */
export const getAnalyticsInsights = query({
  args: {},
  handler: async (ctx) => {
    // Try to use pre-computed insights first
    const insights = await ctx.db
      .query("analyticsInsights")
      .withIndex("by_type")
      .collect();

    const relevantInsights = insights.filter((i) => i.periodDays === 28);

    if (relevantInsights.length >= 4) {
      const findInsight = (type: string) =>
        relevantInsights.find((i) => i.insightType === type);

      const bestDay = findInsight("best_day");
      const worstDay = findInsight("worst_day");
      const bestHour = findInsight("best_hour");
      const worstHour = findInsight("worst_hour");

      const lastUpdated = Math.max(...relevantInsights.map((i) => i.lastUpdated));

      return {
        hasEnoughData: true,
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
        weekOverWeekTrend: null, // TODO: Add to aggregation if needed
        totalDataPoints: 0, // Not tracked in aggregates
        source: "precomputed",
        lastUpdated,
      };
    }

    // Fall back to real-time computation
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    // Calculate start of today (UTC) to exclude partial day data
    const now = new Date();
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", fourWeeksAgo))
      .take(25000);

    // Exclude today's partial data to avoid skewing averages
    const validSnapshots = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined && s.timestamp < startOfTodayUTC
    );

    if (validSnapshots.length < 50) {
      return {
        hasEnoughData: false,
        bestDay: null,
        worstDay: null,
        bestHour: null,
        worstHour: null,
        weekOverWeekTrend: null,
        totalDataPoints: validSnapshots.length,
        source: "realtime",
      };
    }

    const dayAverages: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayAverages[i] = { total: 0, count: 0 };
    }

    const hourAverages: Record<number, { total: number; count: number }> = {};
    for (let h = 9; h <= 21; h++) {
      hourAverages[h] = { total: 0, count: 0 };
    }

    const recentSnapshots = validSnapshots.filter(
      (s) => s.timestamp >= twoWeeksAgo
    );
    const olderSnapshots = validSnapshots.filter(
      (s) => s.timestamp < twoWeeksAgo
    );

    for (const snapshot of validSnapshots) {
      const date = new Date(snapshot.timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      dayAverages[dayOfWeek].total += snapshot.waitTimeMinutes!;
      dayAverages[dayOfWeek].count++;

      if (hour >= 9 && hour <= 21) {
        hourAverages[hour].total += snapshot.waitTimeMinutes!;
        hourAverages[hour].count++;
      }
    }

    let bestDay = { day: 0, avg: Infinity };
    let worstDay = { day: 0, avg: 0 };

    for (let i = 0; i < 7; i++) {
      if (dayAverages[i].count > 0) {
        const avg = dayAverages[i].total / dayAverages[i].count;
        if (avg < bestDay.avg) {
          bestDay = { day: i, avg };
        }
        if (avg > worstDay.avg) {
          worstDay = { day: i, avg };
        }
      }
    }

    let bestHour = { hour: 9, avg: Infinity };
    let worstHour = { hour: 12, avg: 0 };

    for (let h = 9; h <= 21; h++) {
      if (hourAverages[h].count > 0) {
        const avg = hourAverages[h].total / hourAverages[h].count;
        if (avg < bestHour.avg) {
          bestHour = { hour: h, avg };
        }
        if (avg > worstHour.avg) {
          worstHour = { hour: h, avg };
        }
      }
    }

    const recentAvg =
      recentSnapshots.length > 0
        ? recentSnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0) /
          recentSnapshots.length
        : 0;
    const olderAvg =
      olderSnapshots.length > 0
        ? olderSnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0) /
          olderSnapshots.length
        : 0;

    let weekOverWeekTrend = null;
    if (olderSnapshots.length > 0 && recentSnapshots.length > 0) {
      const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
      weekOverWeekTrend = {
        percentChange: Math.round(percentChange),
        direction:
          percentChange > 5 ? "up" : percentChange < -5 ? "down" : "stable",
        recentAvg: Math.round(recentAvg),
        previousAvg: Math.round(olderAvg),
      };
    }

    const formatHour = (hour: number) => {
      const h = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      return `${h}:00 ${period}`;
    };

    return {
      hasEnoughData: true,
      bestDay: {
        name: DAY_NAMES[bestDay.day],
        avgWait: Math.round(bestDay.avg),
      },
      worstDay: {
        name: DAY_NAMES[worstDay.day],
        avgWait: Math.round(worstDay.avg),
      },
      bestHour: {
        time: formatHour(bestHour.hour),
        avgWait: Math.round(bestHour.avg),
      },
      worstHour: {
        time: formatHour(worstHour.hour),
        avgWait: Math.round(worstHour.avg),
      },
      weekOverWeekTrend,
      totalDataPoints: validSnapshots.length,
      source: "realtime",
    };
  },
});

/**
 * Get operator comparison (Disney vs Universal)
 * Uses pre-computed aggregates for fast reads, falls back to real-time if not available
 */
export const getOperatorComparison = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 14;

    // Try to use pre-computed aggregates first
    const aggregates = await ctx.db
      .query("operatorAggregates")
      .withIndex("by_operator_period")
      .collect();

    const disney = aggregates.find(
      (a) => a.operator === "Disney" && a.periodDays === days
    );
    const universal = aggregates.find(
      (a) => a.operator === "Universal" && a.periodDays === days
    );

    if (disney || universal) {
      return {
        disney: disney
          ? {
              avgWait: disney.avgWaitTime,
              totalSnapshots: disney.totalSnapshots,
              parksTracked: disney.parksTracked,
            }
          : { avgWait: 0, totalSnapshots: 0, parksTracked: 0 },
        universal: universal
          ? {
              avgWait: universal.avgWaitTime,
              totalSnapshots: universal.totalSnapshots,
              parksTracked: universal.parksTracked,
            }
          : { avgWait: 0, totalSnapshots: 0, parksTracked: 0 },
        daysOfData: days,
        source: "precomputed",
        lastUpdated: Math.max(
          disney?.lastUpdated ?? 0,
          universal?.lastUpdated ?? 0
        ),
      };
    }

    // Fall back to real-time computation
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Calculate start of today (UTC) to exclude partial day data
    const now = new Date();
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const parks = await ctx.db.query("parks").collect();

    const disneyParkIds = new Set(
      parks.filter((p) => p.operator === "Disney").map((p) => p._id)
    );
    const universalParkIds = new Set(
      parks.filter((p) => p.operator === "Universal").map((p) => p._id)
    );

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .take(20000);

    // Exclude today's partial data to avoid skewing averages
    const disneySnapshots = snapshots.filter(
      (s) =>
        disneyParkIds.has(s.parkId) &&
        s.isOpen &&
        s.waitTimeMinutes !== undefined &&
        s.timestamp < startOfTodayUTC
    );
    const universalSnapshots = snapshots.filter(
      (s) =>
        universalParkIds.has(s.parkId) &&
        s.isOpen &&
        s.waitTimeMinutes !== undefined &&
        s.timestamp < startOfTodayUTC
    );

    const disneyAvg =
      disneySnapshots.length > 0
        ? disneySnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0) /
          disneySnapshots.length
        : 0;
    const universalAvg =
      universalSnapshots.length > 0
        ? universalSnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0) /
          universalSnapshots.length
        : 0;

    return {
      disney: {
        avgWait: Math.round(disneyAvg),
        totalSnapshots: disneySnapshots.length,
        parksTracked: disneyParkIds.size,
      },
      universal: {
        avgWait: Math.round(universalAvg),
        totalSnapshots: universalSnapshots.length,
        parksTracked: universalParkIds.size,
      },
      daysOfData: days,
      source: "realtime",
    };
  },
});

/**
 * Get data collection status for display
 */
/**
 * Get historical trend of wait times over days
 * Returns daily averages for plotting a historical trend line chart
 */
export const getHistoricalTrend = query({
  args: {
    days: v.optional(v.number()), // Number of days to include (default 30)
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all parks
    const parks = await ctx.db.query("parks").collect();

    const disneyParkIds = new Set(
      parks.filter((p) => p.operator === "Disney").map((p) => p._id)
    );
    const universalParkIds = new Set(
      parks.filter((p) => p.operator === "Universal").map((p) => p._id)
    );

    // Get snapshots in the time range with limit
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .take(25000);

    // Group by date and operator
    const disneyByDate: Record<string, number[]> = {};
    const universalByDate: Record<string, number[]> = {};

    for (const snapshot of snapshots) {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined) continue;

      const dateStr = new Date(snapshot.timestamp).toISOString().split("T")[0];

      if (disneyParkIds.has(snapshot.parkId)) {
        if (!disneyByDate[dateStr]) disneyByDate[dateStr] = [];
        disneyByDate[dateStr].push(snapshot.waitTimeMinutes);
      } else if (universalParkIds.has(snapshot.parkId)) {
        if (!universalByDate[dateStr]) universalByDate[dateStr] = [];
        universalByDate[dateStr].push(snapshot.waitTimeMinutes);
      }
    }

    // Get all unique dates and sort
    const allDates = new Set([
      ...Object.keys(disneyByDate),
      ...Object.keys(universalByDate),
    ]);
    const sortedDates = Array.from(allDates).sort();

    // Format date for display (e.g., "Jan 5")
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };

    // Build chart data
    const data = sortedDates.map((dateStr) => {
      const disneyWaits = disneyByDate[dateStr] || [];
      const universalWaits = universalByDate[dateStr] || [];

      return {
        date: formatDate(dateStr),
        fullDate: dateStr,
        disney:
          disneyWaits.length > 0
            ? Math.round(disneyWaits.reduce((a, b) => a + b, 0) / disneyWaits.length)
            : null,
        universal:
          universalWaits.length > 0
            ? Math.round(universalWaits.reduce((a, b) => a + b, 0) / universalWaits.length)
            : null,
      };
    });

    const totalDataPoints = snapshots.filter(
      (s) => s.isOpen && s.waitTimeMinutes !== undefined
    ).length;

    return {
      data,
      totalDataPoints,
      daysOfData: sortedDates.length,
      hasEnoughData: sortedDates.length >= 3,
    };
  },
});

export const getDataCollectionStatus = query({
  args: {},
  handler: async (ctx) => {
    // Get overall stats
    const parks = await ctx.db.query("parks").collect();
    const rides = await ctx.db.query("rides").collect();

    // Get snapshot count and date range - use order and limit for efficiency
    // We only need oldest/newest timestamps and count, so get a sample
    const recentSnapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp")
      .order("desc")
      .take(10000);

    const oldestSnapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp")
      .order("asc")
      .take(100);

    // Combine for analysis (recentSnapshots contains recent data, oldestSnapshots gives us the oldest timestamp)
    const allSnapshots = recentSnapshots;

    if (allSnapshots.length === 0 && oldestSnapshots.length === 0) {
      return {
        totalSnapshots: 0,
        totalRides: rides.length,
        totalParks: parks.length,
        daysOfData: 0,
        oldestData: null,
        newestData: null,
        milestones: {
          oneWeek: false,
          twoWeeks: false,
          fourWeeks: false,
          threeMonths: false,
          oneYear: false,
        },
        currentMilestone: "Collecting data...",
        nextMilestone: "1 week",
      };
    }

    // Get oldest from the asc query, newest from the desc query
    const oldestTimestamp = oldestSnapshots.length > 0 ? oldestSnapshots[0].timestamp : allSnapshots[allSnapshots.length - 1]?.timestamp ?? Date.now();
    const newestTimestamp = allSnapshots.length > 0 ? allSnapshots[0].timestamp : Date.now();

    // Calculate unique days from both sample sets
    const uniqueDays = new Set<string>();
    for (const snapshot of allSnapshots) {
      uniqueDays.add(new Date(snapshot.timestamp).toISOString().split("T")[0]);
    }
    for (const snapshot of oldestSnapshots) {
      uniqueDays.add(new Date(snapshot.timestamp).toISOString().split("T")[0]);
    }

    const daysOfData = uniqueDays.size;

    const milestones = {
      oneWeek: daysOfData >= 7,
      twoWeeks: daysOfData >= 14,
      fourWeeks: daysOfData >= 28,
      threeMonths: daysOfData >= 90,
      oneYear: daysOfData >= 365,
    };

    let currentMilestone = "Collecting data...";
    let nextMilestone = "1 week";

    if (milestones.oneYear) {
      currentMilestone = "Full year of data!";
      nextMilestone = "Complete!";
    } else if (milestones.threeMonths) {
      currentMilestone = "3 months of data";
      nextMilestone = `${365 - daysOfData} days to 1 year`;
    } else if (milestones.fourWeeks) {
      currentMilestone = "1 month of data";
      nextMilestone = `${90 - daysOfData} days to 3 months`;
    } else if (milestones.twoWeeks) {
      currentMilestone = "2 weeks of data";
      nextMilestone = `${28 - daysOfData} days to 1 month`;
    } else if (milestones.oneWeek) {
      currentMilestone = "1 week of data";
      nextMilestone = `${14 - daysOfData} days to 2 weeks`;
    } else {
      nextMilestone = `${7 - daysOfData} days to 1 week`;
    }

    return {
      totalSnapshots: allSnapshots.length,
      totalRides: rides.length,
      totalParks: parks.length,
      daysOfData,
      oldestData: new Date(oldestTimestamp).toISOString(),
      newestData: new Date(newestTimestamp).toISOString(),
      milestones,
      currentMilestone,
      nextMilestone,
    };
  },
});

/**
 * Get land comparison data for a specific park
 * Compares average wait times across themed areas
 */
export const getLandComparison = query({
  args: {
    parkExternalId: v.optional(v.string()), // Specific park or all Disney parks
    days: v.optional(v.number()), // Days of data (default 14)
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 14;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get park filter if specified
    let parkIds: Set<string> = new Set();
    if (args.parkExternalId !== undefined) {
      const externalId = args.parkExternalId;
      const park = await ctx.db
        .query("parks")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .unique();
      if (park) {
        parkIds.add(park._id);
      }
    } else {
      // Default to Disney parks (they have more detailed land data)
      const disneyParks = await ctx.db.query("parks").collect();
      for (const park of disneyParks.filter((p) => p.operator === "Disney")) {
        parkIds.add(park._id);
      }
    }

    if (parkIds.size === 0) {
      return { data: [], hasEnoughData: false, totalDataPoints: 0 };
    }

    // Get all lands for the selected parks
    const allLands = await ctx.db.query("lands").collect();
    const relevantLands = allLands.filter((land) =>
      parkIds.has(land.parkId)
    );

    if (relevantLands.length === 0) {
      return { data: [], hasEnoughData: false, totalDataPoints: 0 };
    }

    // Create a map of land IDs to land info
    const landMap = new Map(relevantLands.map((land) => [land._id, land]));

    // Get snapshots with land data (with limit)
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .take(20000);

    // Filter to relevant parks and valid snapshots with land data
    const relevantSnapshots = snapshots.filter(
      (s) =>
        parkIds.has(s.parkId) &&
        s.landId &&
        landMap.has(s.landId) &&
        s.isOpen &&
        s.waitTimeMinutes !== undefined
    );

    // Group by land
    const landWaits: Record<string, { name: string; waits: number[] }> = {};

    for (const snapshot of relevantSnapshots) {
      const land = landMap.get(snapshot.landId!);
      if (!land) continue;

      if (!landWaits[land._id]) {
        landWaits[land._id] = { name: land.name, waits: [] };
      }
      landWaits[land._id].waits.push(snapshot.waitTimeMinutes!);
    }

    // Helper to shorten land names intelligently
    const shortenName = (name: string): string => {
      // Remove common suffixes
      let short = name
        .replace(/\s*Land$/i, "")
        .replace(/\s*Area$/i, "")
        .replace(/\s*Square$/i, "")
        .replace(/\s*Boulevard$/i, " Blvd")
        .replace(/\s*Pavilion$/i, "")
        .trim();

      // If still too long, take first two words
      if (short.length > 14) {
        const words = short.split(" ");
        if (words.length > 2) {
          short = words.slice(0, 2).join(" ");
        }
      }

      return short;
    };

    // Calculate averages and build chart data
    const allData = Object.entries(landWaits)
      .map(([_, landData]) => ({
        land: shortenName(landData.name),
        fullName: landData.name,
        avgWait: Math.round(
          landData.waits.reduce((a, b) => a + b, 0) / landData.waits.length
        ),
        samples: landData.waits.length,
      }))
      .filter((d) => d.samples >= 10) // Only include lands with enough data
      .sort((a, b) => a.avgWait - b.avgWait); // Sort by wait time (lowest first)

    // Limit to 8 lands for better readability
    const data = allData.slice(0, 8);

    return {
      data,
      hasEnoughData: allData.length >= 2,
      totalDataPoints: relevantSnapshots.length,
      daysOfData: days,
    };
  },
});

/**
 * Get park operating hours analysis
 * Analyzes schedule patterns, extended hours, etc.
 */
export const getParkHoursAnalysis = query({
  args: {
    days: v.optional(v.number()), // Days of data (default 30)
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;

    // Calculate date range
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Get all schedules in range
    const allSchedules = await ctx.db
      .query("parkSchedules")
      .withIndex("by_date", (q) => q.gte("date", cutoffDateStr))
      .collect();

    if (allSchedules.length === 0) {
      return {
        data: [],
        summary: null,
        hasEnoughData: false,
        totalSchedules: 0,
      };
    }

    // Get parks for names
    const parks = await ctx.db.query("parks").collect();
    const parkMap = new Map(parks.map((p) => [p._id, p]));

    // Group by day of week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hoursByDay: Record<number, number[]> = {};
    const extendedByDay: Record<number, number> = {};

    for (let i = 0; i < 7; i++) {
      hoursByDay[i] = [];
      extendedByDay[i] = 0;
    }

    // Calculate operating hours for each schedule
    for (const schedule of allSchedules) {
      if (schedule.scheduleType !== "OPERATING") continue;

      const date = new Date(schedule.date);
      const dayOfWeek = date.getDay();

      // Calculate hours open
      let hoursOpen = schedule.closeHour - schedule.openHour;
      if (hoursOpen < 0) hoursOpen += 24; // Handle overnight schedules
      hoursOpen += (schedule.closeMinute - schedule.openMinute) / 60;

      hoursByDay[dayOfWeek].push(hoursOpen);

      if (schedule.hasExtendedHours) {
        extendedByDay[dayOfWeek]++;
      }
    }

    // Build chart data by day of week
    const data = [];
    for (let i = 0; i < 7; i++) {
      // Start from Monday (1) and wrap around
      const dayIndex = (i + 1) % 7;
      const hours = hoursByDay[dayIndex];
      const extendedCount = extendedByDay[dayIndex];

      data.push({
        day: dayNames[dayIndex],
        avgHours:
          hours.length > 0
            ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
            : 0,
        extendedDays: extendedCount,
        totalDays: hours.length,
      });
    }

    // Calculate summary stats
    const allHours = Object.values(hoursByDay).flat();
    const totalExtended = Object.values(extendedByDay).reduce((a, b) => a + b, 0);

    const summary = {
      avgHoursPerDay:
        allHours.length > 0
          ? Math.round((allHours.reduce((a, b) => a + b, 0) / allHours.length) * 10) / 10
          : 0,
      longestDay: allHours.length > 0 ? Math.round(Math.max(...allHours) * 10) / 10 : 0,
      shortestDay: allHours.length > 0 ? Math.round(Math.min(...allHours) * 10) / 10 : 0,
      extendedHoursDays: totalExtended,
      totalSchedules: allSchedules.filter((s) => s.scheduleType === "OPERATING").length,
      parksTracked: new Set(allSchedules.map((s) => s.parkId)).size,
    };

    return {
      data,
      summary,
      hasEnoughData: allSchedules.length >= 7,
      totalSchedules: allSchedules.length,
    };
  },
});
