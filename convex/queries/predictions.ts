import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get historical wait times for prediction
 * Returns data grouped by hour for the same day of week
 */
export const getPredictionData = query({
  args: {
    rideExternalId: v.string(),
    targetDate: v.string(), // ISO date YYYY-MM-DD
    targetDayOfWeek: v.number(), // 0-6 (0 = Sunday)
    weeksBack: v.optional(v.number()), // Default 4
  },
  handler: async (ctx, args) => {
    const weeksBack = args.weeksBack ?? 4;

    // Find ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.rideExternalId))
      .unique();

    if (!ride) return null;

    // Calculate cutoff time (weeksBack weeks ago)
    const targetDateObj = new Date(args.targetDate);
    const cutoffTime = targetDateObj.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000;

    // Get all snapshots for this ride within the time range
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) =>
        q.eq("rideId", ride._id).gte("timestamp", cutoffTime)
      )
      .collect();

    // Filter to only snapshots from the same day of week
    const sameDaySnapshots = snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.timestamp);
      return snapshotDate.getDay() === args.targetDayOfWeek;
    });

    // Group by hour and calculate averages
    const hourlyData: Record<number, number[]> = {};
    const datesCovered = new Set<string>();

    for (const snapshot of sameDaySnapshots) {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined) continue;

      const snapshotDate = new Date(snapshot.timestamp);
      const hour = snapshotDate.getHours();

      // Only track hours between 8am and 10pm (typical park hours)
      if (hour < 8 || hour > 22) continue;

      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(snapshot.waitTimeMinutes);

      // Track which dates we have data for
      datesCovered.add(snapshotDate.toISOString().split("T")[0]);
    }

    // Calculate averages for each hour
    const hourlyAverages: Record<number, number> = {};
    let totalSamples = 0;

    for (const [hour, waits] of Object.entries(hourlyData)) {
      const hourNum = parseInt(hour);
      hourlyAverages[hourNum] = Math.round(
        waits.reduce((a, b) => a + b, 0) / waits.length
      );
      totalSamples += waits.length;
    }

    // Determine confidence based on data quality
    const datesCount = datesCovered.size;
    let confidence: "high" | "medium" | "low" | "insufficient" = "insufficient";

    if (datesCount >= 4) {
      confidence = "high";
    } else if (datesCount >= 2) {
      confidence = "medium";
    } else if (datesCount >= 1) {
      confidence = "low";
    }

    return {
      ride: {
        id: ride._id,
        externalId: ride.externalId,
        name: ride.name,
      },
      hourlyAverages,
      sampleCount: totalSamples,
      datesCount,
      datesCovered: Array.from(datesCovered),
      confidence,
    };
  },
});

/**
 * Get same time last year data
 */
export const getYearOverYearData = query({
  args: {
    rideExternalId: v.string(),
    targetDate: v.string(), // ISO date YYYY-MM-DD
    dayRange: v.optional(v.number()), // +/- days to search (default 3)
  },
  handler: async (ctx, args) => {
    const dayRange = args.dayRange ?? 3;

    // Find ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.rideExternalId))
      .unique();

    if (!ride) return null;

    // Calculate same period last year
    const targetDateObj = new Date(args.targetDate);
    const lastYearDate = new Date(targetDateObj);
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);

    // Search range: +/- dayRange days around last year's date
    const startTime =
      lastYearDate.getTime() - dayRange * 24 * 60 * 60 * 1000;
    const endTime =
      lastYearDate.getTime() + dayRange * 24 * 60 * 60 * 1000;

    // Get snapshots from last year's period
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) =>
        q.eq("rideId", ride._id).gte("timestamp", startTime)
      )
      .filter((q) => q.lte(q.field("timestamp"), endTime))
      .collect();

    if (snapshots.length === 0) {
      return null;
    }

    // Filter to same day type (weekday/weekend)
    const targetDayOfWeek = targetDateObj.getDay();
    const isTargetWeekend = targetDayOfWeek === 0 || targetDayOfWeek === 6;

    const matchingSnapshots = snapshots.filter((snapshot) => {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined)
        return false;

      const snapshotDate = new Date(snapshot.timestamp);
      const snapshotDayOfWeek = snapshotDate.getDay();
      const isSnapshotWeekend =
        snapshotDayOfWeek === 0 || snapshotDayOfWeek === 6;

      // Match weekend to weekend, weekday to weekday
      return isTargetWeekend === isSnapshotWeekend;
    });

    if (matchingSnapshots.length === 0) {
      return null;
    }

    // Group by hour and calculate averages
    const hourlyData: Record<number, number[]> = {};

    for (const snapshot of matchingSnapshots) {
      const snapshotDate = new Date(snapshot.timestamp);
      const hour = snapshotDate.getHours();

      if (hour < 8 || hour > 22) continue;

      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(snapshot.waitTimeMinutes!);
    }

    const hourlyAverages: Record<number, number> = {};
    for (const [hour, waits] of Object.entries(hourlyData)) {
      hourlyAverages[parseInt(hour)] = Math.round(
        waits.reduce((a, b) => a + b, 0) / waits.length
      );
    }

    return {
      ride: {
        id: ride._id,
        externalId: ride.externalId,
        name: ride.name,
      },
      hourlyAverages,
      sampleCount: matchingSnapshots.length,
      yearAgoDate: lastYearDate.toISOString().split("T")[0],
      searchRange: {
        start: new Date(startTime).toISOString().split("T")[0],
        end: new Date(endTime).toISOString().split("T")[0],
      },
    };
  },
});

/**
 * Check data availability for a ride
 */
export const getDataAvailability = query({
  args: {
    rideExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.rideExternalId))
      .unique();

    if (!ride) {
      return null;
    }

    // Get all snapshots for this ride (limited to reasonable count)
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) => q.eq("rideId", ride._id))
      .collect();

    if (snapshots.length === 0) {
      return {
        rideId: ride._id,
        rideName: ride.name,
        totalSnapshots: 0,
        totalDaysOfData: 0,
        hasYearOverYearData: false,
        oldestSnapshot: null,
        newestSnapshot: null,
      };
    }

    // Find date range
    const timestamps = snapshots.map((s) => s.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    // Calculate unique days
    const uniqueDays = new Set<string>();
    for (const snapshot of snapshots) {
      uniqueDays.add(new Date(snapshot.timestamp).toISOString().split("T")[0]);
    }

    // Check if we have year-over-year data (365+ days)
    const daysDiff = Math.floor(
      (newestTimestamp - oldestTimestamp) / (24 * 60 * 60 * 1000)
    );
    const hasYearOverYearData = daysDiff >= 365;

    return {
      rideId: ride._id,
      rideName: ride.name,
      totalSnapshots: snapshots.length,
      totalDaysOfData: uniqueDays.size,
      daysCovered: daysDiff,
      hasYearOverYearData,
      oldestSnapshot: new Date(oldestTimestamp).toISOString(),
      newestSnapshot: new Date(newestTimestamp).toISOString(),
    };
  },
});

/**
 * Get data availability summary across all rides
 */
export const getOverallDataAvailability = query({
  args: {},
  handler: async (ctx) => {
    // Get all snapshots to find overall date range
    const allSnapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp")
      .collect();

    if (allSnapshots.length === 0) {
      return {
        totalSnapshots: 0,
        totalDaysOfData: 0,
        totalRidesTracked: 0,
        hasEnoughForPredictions: false,
        oldestData: null,
        newestData: null,
      };
    }

    // Calculate stats
    const timestamps = allSnapshots.map((s) => s.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    const uniqueDays = new Set<string>();
    const uniqueRides = new Set<string>();

    for (const snapshot of allSnapshots) {
      uniqueDays.add(new Date(snapshot.timestamp).toISOString().split("T")[0]);
      uniqueRides.add(snapshot.externalRideId);
    }

    const daysOfData = uniqueDays.size;

    return {
      totalSnapshots: allSnapshots.length,
      totalDaysOfData: daysOfData,
      totalRidesTracked: uniqueRides.size,
      hasEnoughForPredictions: daysOfData >= 14, // 2 weeks minimum
      oldestData: new Date(oldestTimestamp).toISOString(),
      newestData: new Date(newestTimestamp).toISOString(),
      milestones: {
        twoWeeks: daysOfData >= 14,
        fourWeeks: daysOfData >= 28,
        threeMonths: daysOfData >= 90,
        oneYear: daysOfData >= 365,
      },
    };
  },
});
