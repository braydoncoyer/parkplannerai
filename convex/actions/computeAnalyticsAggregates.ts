"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Type for park data
interface ParkData {
  _id: string;
  operator: string;
  name: string;
  externalId: string;
  timezone?: string;
}

/**
 * Convert a UTC timestamp to local hour in a given timezone
 * Uses UTC offset calculation for common US timezones
 */
function getLocalHour(timestamp: number, timezone: string | undefined): number {
  // Default to US Eastern if timezone unknown
  const tz = timezone || "America/New_York";

  // Get UTC hour
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();

  // Calculate offset based on timezone
  // Note: This is a simplified calculation that doesn't account for DST precisely
  // but is good enough for aggregate statistics
  let offset = -5; // Default to Eastern (UTC-5)

  if (tz.includes("Los_Angeles") || tz.includes("Pacific")) {
    offset = -8; // Pacific (UTC-8)
  } else if (tz.includes("Chicago") || tz.includes("Central")) {
    offset = -6; // Central (UTC-6)
  } else if (tz.includes("Denver") || tz.includes("Mountain")) {
    offset = -7; // Mountain (UTC-7)
  } else if (tz.includes("New_York") || tz.includes("Eastern")) {
    offset = -5; // Eastern (UTC-5)
  }

  // Apply offset and handle wrap-around
  let localHour = utcHour + offset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;

  return localHour;
}

/**
 * Get day of week in local timezone
 */
function getLocalDayOfWeek(timestamp: number, timezone: string | undefined): number {
  const tz = timezone || "America/New_York";
  const date = new Date(timestamp);
  const utcDay = date.getUTCDay();
  const utcHour = date.getUTCHours();

  let offset = -5;
  if (tz.includes("Los_Angeles") || tz.includes("Pacific")) {
    offset = -8;
  } else if (tz.includes("Chicago") || tz.includes("Central")) {
    offset = -6;
  } else if (tz.includes("Denver") || tz.includes("Mountain")) {
    offset = -7;
  }

  // Check if the offset pushes us to a different day
  const localHour = utcHour + offset;
  if (localHour < 0) {
    // We crossed midnight backwards
    return utcDay === 0 ? 6 : utcDay - 1;
  }

  return utcDay;
}

// Type for snapshot data
interface SnapshotData {
  timestamp: number;
  parkId: string;
  waitTimeMinutes?: number;
  isOpen: boolean;
}

/**
 * Main analytics aggregation job
 * Computes hourly, weekly, operator, and insight aggregates
 * Run daily after the data collection window
 */
export const run = internalAction({
  args: {
    periodDays: v.optional(v.number()), // How many days of data to analyze (default 28)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    hourlyUpdated: number;
    weeklyUpdated: number;
    operatorUpdated: number;
    insightsUpdated: number;
    snapshotsProcessed: number;
    error?: string;
  }> => {
    const periodDays = args.periodDays ?? 28;
    const cutoffTime = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    // Calculate start of today (UTC) to exclude partial day data
    const now = new Date();
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    console.log(`[${new Date().toISOString()}] Computing analytics aggregates for last ${periodDays} days (excluding today)...`);

    try {
      // Get all parks
      const parks: ParkData[] = await ctx.runQuery(internal.queries.parks.getAllParksInternal);

      if (parks.length === 0) {
        console.log("No parks found in database");
        return {
          success: false,
          hourlyUpdated: 0,
          weeklyUpdated: 0,
          operatorUpdated: 0,
          insightsUpdated: 0,
          snapshotsProcessed: 0,
          error: "No parks in database",
        };
      }

      // Build park lookup maps
      const disneyParkIds = new Set<string>(
        parks.filter((p: ParkData) => p.operator === "Disney").map((p: ParkData) => p._id)
      );
      const universalParkIds = new Set<string>(
        parks.filter((p: ParkData) => p.operator === "Universal").map((p: ParkData) => p._id)
      );

      // Build timezone lookup map
      const parkTimezones = new Map<string, string>();
      for (const park of parks) {
        if (park.timezone) {
          parkTimezones.set(park._id, park.timezone);
        }
      }

      console.log(`  Found ${parks.length} parks (${disneyParkIds.size} Disney, ${universalParkIds.size} Universal)`);

      // Collect all snapshots in batches (Convex limits return arrays to 8192 items)
      const BATCH_SIZE = 8000;
      let allSnapshots: Array<{
        timestamp: number;
        parkId: string;
        waitTimeMinutes?: number;
        isOpen: boolean;
      }> = [];

      let cursor: number | undefined = undefined;
      let batchCount = 0;

      while (true) {
        const batch: SnapshotData[] = await ctx.runQuery(internal.queries.analyticsAggregates.getSnapshotsBatch, {
          cutoffTimestamp: cutoffTime,
          limit: BATCH_SIZE,
          cursor,
        });

        if (batch.length === 0) break;

        // Filter to valid snapshots only, excluding today's partial data
        const validSnapshots = batch.filter(
          (s: SnapshotData) =>
            s.isOpen &&
            s.waitTimeMinutes !== undefined &&
            s.waitTimeMinutes !== null &&
            s.timestamp < startOfTodayUTC // Exclude today's partial data
        );

        allSnapshots.push(...validSnapshots.map((s: SnapshotData) => ({
          timestamp: s.timestamp,
          parkId: s.parkId,
          waitTimeMinutes: s.waitTimeMinutes,
          isOpen: s.isOpen,
        })));

        batchCount++;

        // Set cursor for next batch
        const lastTimestamp: number = batch[batch.length - 1].timestamp;
        if (cursor !== undefined && lastTimestamp <= cursor) {
          // Safety check: avoid infinite loop
          break;
        }
        cursor = lastTimestamp;

        // Limit total snapshots to avoid memory issues
        if (allSnapshots.length >= 50000) {
          console.log(`  Reached 50,000 snapshot limit for aggregation`);
          break;
        }

        if (batch.length < BATCH_SIZE) break;
      }

      console.log(`  Collected ${allSnapshots.length} valid snapshots in ${batchCount} batches`);

      if (allSnapshots.length < 100) {
        console.log("  Not enough data for meaningful aggregation");
        return {
          success: true,
          hourlyUpdated: 0,
          weeklyUpdated: 0,
          operatorUpdated: 0,
          insightsUpdated: 0,
          snapshotsProcessed: allSnapshots.length,
        };
      }

      // Compute all aggregates (passing timezone map for local time conversion)
      const hourlyUpdated = await computeHourlyAggregates(ctx, allSnapshots, parkTimezones);
      const weeklyUpdated = await computeWeeklyAggregates(ctx, allSnapshots, disneyParkIds, universalParkIds, parkTimezones);
      const operatorUpdated = await computeOperatorAggregates(ctx, allSnapshots, disneyParkIds, universalParkIds, periodDays, parks.length);
      const insightsUpdated = await computeInsights(ctx, allSnapshots, periodDays, parkTimezones);

      console.log(`[${new Date().toISOString()}] Analytics aggregation complete!`);
      console.log(`  Hourly: ${hourlyUpdated}, Weekly: ${weeklyUpdated}, Operator: ${operatorUpdated}, Insights: ${insightsUpdated}`);

      return {
        success: true,
        hourlyUpdated,
        weeklyUpdated,
        operatorUpdated,
        insightsUpdated,
        snapshotsProcessed: allSnapshots.length,
      };
    } catch (error) {
      console.error("Error computing analytics aggregates:", error);
      return {
        success: false,
        hourlyUpdated: 0,
        weeklyUpdated: 0,
        operatorUpdated: 0,
        insightsUpdated: 0,
        snapshotsProcessed: 0,
        error: String(error),
      };
    }
  },
});

/**
 * Compute hourly aggregates (average wait by hour of day)
 * Uses local park time for accurate hourly patterns
 */
async function computeHourlyAggregates(
  ctx: any,
  snapshots: Array<{ timestamp: number; parkId: string; waitTimeMinutes?: number }>,
  parkTimezones: Map<string, string>
): Promise<number> {
  console.log("  Computing hourly aggregates (using local park time)...");

  // Group by hour and day type
  const hourlyData: Record<string, { total: number; count: number }> = {};

  for (const snapshot of snapshots) {
    const timezone = parkTimezones.get(snapshot.parkId);
    const localHour = getLocalHour(snapshot.timestamp, timezone);
    const localDayOfWeek = getLocalDayOfWeek(snapshot.timestamp, timezone);
    const isWeekend = localDayOfWeek === 0 || localDayOfWeek === 6;

    if (localHour < 9 || localHour > 21) continue; // Only park hours (9am - 9pm local)

    // Update for "all" day type
    const allKey = `all-${localHour}`;
    if (!hourlyData[allKey]) hourlyData[allKey] = { total: 0, count: 0 };
    hourlyData[allKey].total += snapshot.waitTimeMinutes ?? 0;
    hourlyData[allKey].count++;

    // Update for specific day type
    const dayType = isWeekend ? "weekend" : "weekday";
    const dayTypeKey = `${dayType}-${localHour}`;
    if (!hourlyData[dayTypeKey]) hourlyData[dayTypeKey] = { total: 0, count: 0 };
    hourlyData[dayTypeKey].total += snapshot.waitTimeMinutes ?? 0;
    hourlyData[dayTypeKey].count++;
  }

  // Upsert hourly aggregates
  let updated = 0;
  for (const [key, data] of Object.entries(hourlyData)) {
    if (data.count === 0) continue;

    const [dayType, hourStr] = key.split("-");
    const hour = parseInt(hourStr, 10);
    const avgWaitTime = Math.round(data.total / data.count);

    await ctx.runMutation(internal.mutations.analyticsAggregates.upsertHourlyAggregate, {
      parkId: undefined, // null for "all parks"
      operator: "all",
      dayType,
      hour,
      avgWaitTime,
      sampleCount: data.count,
    });

    updated++;
  }

  return updated;
}

/**
 * Compute weekly aggregates (average wait by day of week)
 * Uses local park time for accurate day-of-week patterns
 */
async function computeWeeklyAggregates(
  ctx: any,
  snapshots: Array<{ timestamp: number; parkId: string; waitTimeMinutes?: number }>,
  disneyParkIds: Set<string>,
  universalParkIds: Set<string>,
  parkTimezones: Map<string, string>
): Promise<number> {
  console.log("  Computing weekly aggregates (using local park time)...");

  // Group by day of week and operator
  const weeklyData: Record<string, { total: number; count: number }> = {};

  for (const snapshot of snapshots) {
    const timezone = parkTimezones.get(snapshot.parkId);
    const dayOfWeek = getLocalDayOfWeek(snapshot.timestamp, timezone);

    // Determine operator
    let operator = "all";
    if (disneyParkIds.has(snapshot.parkId)) {
      operator = "Disney";
    } else if (universalParkIds.has(snapshot.parkId)) {
      operator = "Universal";
    }

    // Update for operator
    const key = `${operator}-${dayOfWeek}`;
    if (!weeklyData[key]) weeklyData[key] = { total: 0, count: 0 };
    weeklyData[key].total += snapshot.waitTimeMinutes ?? 0;
    weeklyData[key].count++;

    // Also update "all" operator
    if (operator !== "all") {
      const allKey = `all-${dayOfWeek}`;
      if (!weeklyData[allKey]) weeklyData[allKey] = { total: 0, count: 0 };
      weeklyData[allKey].total += snapshot.waitTimeMinutes ?? 0;
      weeklyData[allKey].count++;
    }
  }

  // Upsert weekly aggregates
  let updated = 0;
  for (const [key, data] of Object.entries(weeklyData)) {
    if (data.count === 0) continue;

    const [operator, dayStr] = key.split("-");
    const dayOfWeek = parseInt(dayStr, 10);
    const avgWaitTime = Math.round(data.total / data.count);

    await ctx.runMutation(internal.mutations.analyticsAggregates.upsertWeeklyAggregate, {
      operator,
      dayOfWeek,
      avgWaitTime,
      sampleCount: data.count,
    });

    updated++;
  }

  return updated;
}

/**
 * Compute operator aggregates (Disney vs Universal comparison)
 */
async function computeOperatorAggregates(
  ctx: any,
  snapshots: Array<{ parkId: string; waitTimeMinutes?: number }>,
  disneyParkIds: Set<string>,
  universalParkIds: Set<string>,
  periodDays: number,
  totalParks: number
): Promise<number> {
  console.log("  Computing operator aggregates...");

  const disneySnapshots = snapshots.filter((s) => disneyParkIds.has(s.parkId));
  const universalSnapshots = snapshots.filter((s) => universalParkIds.has(s.parkId));

  let updated = 0;

  if (disneySnapshots.length > 0) {
    const disneyTotal = disneySnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0);
    const disneyAvg = Math.round(disneyTotal / disneySnapshots.length);

    await ctx.runMutation(internal.mutations.analyticsAggregates.upsertOperatorAggregate, {
      operator: "Disney",
      periodDays,
      avgWaitTime: disneyAvg,
      totalSnapshots: disneySnapshots.length,
      parksTracked: disneyParkIds.size,
    });
    updated++;
  }

  if (universalSnapshots.length > 0) {
    const universalTotal = universalSnapshots.reduce((a, b) => a + (b.waitTimeMinutes ?? 0), 0);
    const universalAvg = Math.round(universalTotal / universalSnapshots.length);

    await ctx.runMutation(internal.mutations.analyticsAggregates.upsertOperatorAggregate, {
      operator: "Universal",
      periodDays,
      avgWaitTime: universalAvg,
      totalSnapshots: universalSnapshots.length,
      parksTracked: universalParkIds.size,
    });
    updated++;
  }

  return updated;
}

/**
 * Compute analytics insights (best/worst day, best/worst hour)
 * Uses local park time for accurate insights
 */
async function computeInsights(
  ctx: any,
  snapshots: Array<{ timestamp: number; parkId: string; waitTimeMinutes?: number }>,
  periodDays: number,
  parkTimezones: Map<string, string>
): Promise<number> {
  console.log("  Computing analytics insights (using local park time)...");

  // Calculate by day of week
  const dayTotals: Record<number, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayTotals[i] = { total: 0, count: 0 };
  }

  // Calculate by hour
  const hourTotals: Record<number, { total: number; count: number }> = {};
  for (let h = 9; h <= 21; h++) {
    hourTotals[h] = { total: 0, count: 0 };
  }

  for (const snapshot of snapshots) {
    const timezone = parkTimezones.get(snapshot.parkId);
    const dayOfWeek = getLocalDayOfWeek(snapshot.timestamp, timezone);
    const hour = getLocalHour(snapshot.timestamp, timezone);

    dayTotals[dayOfWeek].total += snapshot.waitTimeMinutes ?? 0;
    dayTotals[dayOfWeek].count++;

    if (hour >= 9 && hour <= 21) {
      hourTotals[hour].total += snapshot.waitTimeMinutes ?? 0;
      hourTotals[hour].count++;
    }
  }

  // Find best/worst day
  let bestDay = { day: 0, avg: Infinity };
  let worstDay = { day: 0, avg: 0 };

  for (let i = 0; i < 7; i++) {
    if (dayTotals[i].count > 0) {
      const avg = dayTotals[i].total / dayTotals[i].count;
      if (avg < bestDay.avg) {
        bestDay = { day: i, avg };
      }
      if (avg > worstDay.avg) {
        worstDay = { day: i, avg };
      }
    }
  }

  // Find best/worst hour
  let bestHour = { hour: 9, avg: Infinity };
  let worstHour = { hour: 12, avg: 0 };

  for (let h = 9; h <= 21; h++) {
    if (hourTotals[h].count > 0) {
      const avg = hourTotals[h].total / hourTotals[h].count;
      if (avg < bestHour.avg) {
        bestHour = { hour: h, avg };
      }
      if (avg > worstHour.avg) {
        worstHour = { hour: h, avg };
      }
    }
  }

  // Format hour for display
  const formatHour = (hour: number) => {
    const h = hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? "PM" : "AM";
    return `${h}:00 ${period}`;
  };

  // Upsert insights
  let updated = 0;

  await ctx.runMutation(internal.mutations.analyticsAggregates.upsertAnalyticsInsight, {
    insightType: "best_day",
    value: DAY_NAMES[bestDay.day],
    metric: Math.round(bestDay.avg),
    periodDays,
  });
  updated++;

  await ctx.runMutation(internal.mutations.analyticsAggregates.upsertAnalyticsInsight, {
    insightType: "worst_day",
    value: DAY_NAMES[worstDay.day],
    metric: Math.round(worstDay.avg),
    periodDays,
  });
  updated++;

  await ctx.runMutation(internal.mutations.analyticsAggregates.upsertAnalyticsInsight, {
    insightType: "best_hour",
    value: formatHour(bestHour.hour),
    metric: Math.round(bestHour.avg),
    periodDays,
  });
  updated++;

  await ctx.runMutation(internal.mutations.analyticsAggregates.upsertAnalyticsInsight, {
    insightType: "worst_hour",
    value: formatHour(worstHour.hour),
    metric: Math.round(worstHour.avg),
    periodDays,
  });
  updated++;

  return updated;
}

/**
 * Manual trigger to rebuild all analytics aggregates
 * Useful for initial setup or after schema changes
 */
export const rebuild = internalAction({
  args: {
    periodDays: v.optional(v.number()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    hourlyUpdated: number;
    weeklyUpdated: number;
    operatorUpdated: number;
    insightsUpdated: number;
    snapshotsProcessed: number;
    error?: string;
  }> => {
    const periodDays = args.periodDays ?? 28;
    const clearExisting = args.clearExisting ?? true;

    console.log(`[${new Date().toISOString()}] Rebuilding analytics aggregates...`);

    if (clearExisting) {
      console.log("  Clearing existing aggregates...");
      await ctx.runMutation(internal.mutations.analyticsAggregates.clearAllAnalyticsAggregates, {});
    }

    // Run the main aggregation
    return await ctx.runAction(internal.actions.computeAnalyticsAggregates.run, {
      periodDays,
    });
  },
});
