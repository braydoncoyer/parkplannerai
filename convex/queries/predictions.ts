import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Calculate dates for the last N weeks of a specific day of week
 */
function getLastNWeeksDates(targetDate: string, targetDayOfWeek: number, weeksBack: number): string[] {
  const dates: string[] = [];
  const target = new Date(targetDate);

  for (let i = 1; i <= weeksBack; i++) {
    const pastDate = new Date(target);
    pastDate.setDate(target.getDate() - i * 7);

    // Ensure it's the same day of week
    while (pastDate.getDay() !== targetDayOfWeek) {
      pastDate.setDate(pastDate.getDate() - 1);
    }

    const year = pastDate.getFullYear();
    const month = String(pastDate.getMonth() + 1).padStart(2, "0");
    const day = String(pastDate.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Get historical wait times for prediction
 * Returns data grouped by hour for the same day of week
 * Uses hourlyRideWaits for historical data (pre-aggregated, faster)
 * Falls back to liveWaitTimes + waitTimeSnapshots if hourlyRideWaits not available
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

    // Calculate target dates for the last N weeks
    const targetDates = getLastNWeeksDates(args.targetDate, args.targetDayOfWeek, weeksBack);

    // Try to get data from hourlyRideWaits (preferred - pre-aggregated)
    const hourlyData = await ctx.db
      .query("hourlyRideWaits")
      .withIndex("by_ride_dayofweek", (q) =>
        q.eq("rideId", ride._id).eq("dayOfWeek", args.targetDayOfWeek)
      )
      .filter((q) => {
        // Filter to target dates
        let filter = q.eq(q.field("date"), targetDates[0]);
        for (let i = 1; i < targetDates.length; i++) {
          filter = q.or(filter, q.eq(q.field("date"), targetDates[i]));
        }
        return filter;
      })
      .collect();

    // If we have hourlyRideWaits data, use it
    if (hourlyData.length > 0) {
      const hourlyAverages: Record<number, number> = {};
      const hourlyDataByHour: Record<number, number[]> = {};
      const datesCovered = new Set<string>();

      for (const entry of hourlyData) {
        const hour = entry.hour;
        if (hour < 8 || hour > 22) continue;

        if (!hourlyDataByHour[hour]) {
          hourlyDataByHour[hour] = [];
        }
        hourlyDataByHour[hour].push(entry.avgWaitMinutes);
        datesCovered.add(entry.date);
      }

      let totalSamples = 0;
      for (const [hour, waits] of Object.entries(hourlyDataByHour)) {
        const hourNum = parseInt(hour);
        hourlyAverages[hourNum] = Math.round(
          waits.reduce((a, b) => a + b, 0) / waits.length
        );
        totalSamples += waits.length;
      }

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
        source: "hourlyRideWaits",
      };
    }

    // Fallback: Use legacy waitTimeSnapshots if hourlyRideWaits not available
    const targetDateObj = new Date(args.targetDate);
    const cutoffTime = targetDateObj.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000;

    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_ride_time", (q) =>
        q.eq("rideId", ride._id).gte("timestamp", cutoffTime)
      )
      .collect();

    const sameDaySnapshots = snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.timestamp);
      return snapshotDate.getDay() === args.targetDayOfWeek;
    });

    const hourlyDataLegacy: Record<number, number[]> = {};
    const datesCovered = new Set<string>();

    for (const snapshot of sameDaySnapshots) {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined) continue;

      const snapshotDate = new Date(snapshot.timestamp);
      const hour = snapshotDate.getHours();

      if (hour < 8 || hour > 22) continue;

      if (!hourlyDataLegacy[hour]) {
        hourlyDataLegacy[hour] = [];
      }
      hourlyDataLegacy[hour].push(snapshot.waitTimeMinutes);
      datesCovered.add(snapshotDate.toISOString().split("T")[0]);
    }

    const hourlyAverages: Record<number, number> = {};
    let totalSamples = 0;

    for (const [hour, waits] of Object.entries(hourlyDataLegacy)) {
      const hourNum = parseInt(hour);
      hourlyAverages[hourNum] = Math.round(
        waits.reduce((a, b) => a + b, 0) / waits.length
      );
      totalSamples += waits.length;
    }

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
      source: "waitTimeSnapshots",
    };
  },
});

/**
 * Get same time last year data
 * Uses hourlyRideWaits for historical data (pre-aggregated, faster)
 * Falls back to waitTimeSnapshots if hourlyRideWaits not available
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

    // Generate date range strings
    const dateStrings: string[] = [];
    for (let i = -dayRange; i <= dayRange; i++) {
      const date = new Date(lastYearDate);
      date.setDate(lastYearDate.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dateStrings.push(`${year}-${month}-${day}`);
    }

    const startDateStr = dateStrings[0];
    const endDateStr = dateStrings[dateStrings.length - 1];

    // Try to get data from hourlyRideWaits first
    const hourlyData = await ctx.db
      .query("hourlyRideWaits")
      .withIndex("by_ride_date", (q) =>
        q.eq("rideId", ride._id).gte("date", startDateStr).lte("date", endDateStr)
      )
      .collect();

    const targetDayOfWeek = targetDateObj.getDay();
    const isTargetWeekend = targetDayOfWeek === 0 || targetDayOfWeek === 6;

    if (hourlyData.length > 0) {
      // Filter to same day type (weekday/weekend)
      const matchingData = hourlyData.filter((entry) => {
        const isEntryWeekend = entry.dayOfWeek === 0 || entry.dayOfWeek === 6;
        return isTargetWeekend === isEntryWeekend;
      });

      if (matchingData.length === 0) {
        return null;
      }

      // Group by hour and calculate averages
      const hourlyDataByHour: Record<number, number[]> = {};

      for (const entry of matchingData) {
        const hour = entry.hour;
        if (hour < 8 || hour > 22) continue;

        if (!hourlyDataByHour[hour]) {
          hourlyDataByHour[hour] = [];
        }
        hourlyDataByHour[hour].push(entry.avgWaitMinutes);
      }

      const hourlyAverages: Record<number, number> = {};
      for (const [hour, waits] of Object.entries(hourlyDataByHour)) {
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
        sampleCount: matchingData.reduce((sum, d) => sum + d.sampleCount, 0),
        yearAgoDate: lastYearDate.toISOString().split("T")[0],
        searchRange: {
          start: startDateStr,
          end: endDateStr,
        },
        source: "hourlyRideWaits",
      };
    }

    // Fallback: Use legacy waitTimeSnapshots
    const startTime = lastYearDate.getTime() - dayRange * 24 * 60 * 60 * 1000;
    const endTime = lastYearDate.getTime() + dayRange * 24 * 60 * 60 * 1000;

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

    const matchingSnapshots = snapshots.filter((snapshot) => {
      if (!snapshot.isOpen || snapshot.waitTimeMinutes === undefined)
        return false;

      const snapshotDate = new Date(snapshot.timestamp);
      const snapshotDayOfWeek = snapshotDate.getDay();
      const isSnapshotWeekend = snapshotDayOfWeek === 0 || snapshotDayOfWeek === 6;

      return isTargetWeekend === isSnapshotWeekend;
    });

    if (matchingSnapshots.length === 0) {
      return null;
    }

    const hourlyDataLegacy: Record<number, number[]> = {};

    for (const snapshot of matchingSnapshots) {
      const snapshotDate = new Date(snapshot.timestamp);
      const hour = snapshotDate.getHours();

      if (hour < 8 || hour > 22) continue;

      if (!hourlyDataLegacy[hour]) {
        hourlyDataLegacy[hour] = [];
      }
      hourlyDataLegacy[hour].push(snapshot.waitTimeMinutes!);
    }

    const hourlyAverages: Record<number, number> = {};
    for (const [hour, waits] of Object.entries(hourlyDataLegacy)) {
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
      source: "waitTimeSnapshots",
    };
  },
});

/**
 * Check data availability for a ride
 * Uses both liveWaitTimes and hourlyRideWaits to determine data availability
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

    // Get hourly data for this ride (more efficient than raw snapshots)
    const hourlyData = await ctx.db
      .query("hourlyRideWaits")
      .withIndex("by_ride_date", (q) => q.eq("rideId", ride._id))
      .collect();

    // Get live data for recent counts
    const liveData = await ctx.db
      .query("liveWaitTimes")
      .withIndex("by_ride_time", (q) => q.eq("rideId", ride._id))
      .collect();

    if (hourlyData.length === 0 && liveData.length === 0) {
      // Fallback to legacy waitTimeSnapshots
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

      const timestamps = snapshots.map((s) => s.timestamp);
      const oldestTimestamp = Math.min(...timestamps);
      const newestTimestamp = Math.max(...timestamps);

      const uniqueDays = new Set<string>();
      for (const snapshot of snapshots) {
        uniqueDays.add(new Date(snapshot.timestamp).toISOString().split("T")[0]);
      }

      const daysDiff = Math.floor(
        (newestTimestamp - oldestTimestamp) / (24 * 60 * 60 * 1000)
      );

      return {
        rideId: ride._id,
        rideName: ride.name,
        totalSnapshots: snapshots.length,
        totalDaysOfData: uniqueDays.size,
        daysCovered: daysDiff,
        hasYearOverYearData: daysDiff >= 365,
        oldestSnapshot: new Date(oldestTimestamp).toISOString(),
        newestSnapshot: new Date(newestTimestamp).toISOString(),
        source: "waitTimeSnapshots",
      };
    }

    // Calculate from new tables
    const uniqueDays = new Set<string>();
    for (const entry of hourlyData) {
      uniqueDays.add(entry.date);
    }
    for (const entry of liveData) {
      uniqueDays.add(new Date(entry.timestamp).toISOString().split("T")[0]);
    }

    // Find oldest and newest dates
    const hourlyDates = hourlyData.map((h) => h.date).sort();
    const liveDates = liveData.map((l) => new Date(l.timestamp).toISOString().split("T")[0]).sort();

    let oldestDate: string | null = null;
    let newestDate: string | null = null;

    if (hourlyDates.length > 0) {
      oldestDate = hourlyDates[0];
      newestDate = hourlyDates[hourlyDates.length - 1];
    }
    if (liveDates.length > 0) {
      if (!oldestDate || liveDates[0] < oldestDate) {
        oldestDate = liveDates[0];
      }
      if (!newestDate || liveDates[liveDates.length - 1] > newestDate) {
        newestDate = liveDates[liveDates.length - 1];
      }
    }

    // Calculate estimated snapshot count (hourly records * 4 samples + live)
    const estimatedSnapshots = hourlyData.reduce((sum, h) => sum + h.sampleCount, 0) + liveData.length;

    // Check if we have year-over-year data
    let daysDiff = 0;
    if (oldestDate && newestDate) {
      const oldest = new Date(oldestDate);
      const newest = new Date(newestDate);
      daysDiff = Math.floor((newest.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000));
    }

    return {
      rideId: ride._id,
      rideName: ride.name,
      totalSnapshots: estimatedSnapshots,
      totalDaysOfData: uniqueDays.size,
      daysCovered: daysDiff,
      hasYearOverYearData: daysDiff >= 365,
      oldestSnapshot: oldestDate ? `${oldestDate}T00:00:00.000Z` : null,
      newestSnapshot: newestDate ? `${newestDate}T23:59:59.999Z` : null,
      source: "hourlyRideWaits+liveWaitTimes",
    };
  },
});

/**
 * Get data availability summary across all rides
 * Uses both new tables and legacy table for comprehensive stats
 */
export const getOverallDataAvailability = query({
  args: {},
  handler: async (ctx) => {
    // Get counts from new tables
    const hourlyData = await ctx.db.query("hourlyRideWaits").collect();
    const liveData = await ctx.db.query("liveWaitTimes").collect();

    // If new tables have data, use them
    if (hourlyData.length > 0 || liveData.length > 0) {
      const uniqueDays = new Set<string>();
      const uniqueRides = new Set<string>();

      for (const entry of hourlyData) {
        uniqueDays.add(entry.date);
        uniqueRides.add(entry.rideId);
      }
      for (const entry of liveData) {
        uniqueDays.add(new Date(entry.timestamp).toISOString().split("T")[0]);
        uniqueRides.add(entry.rideId);
      }

      // Find date range
      const hourlyDates = hourlyData.map((h) => h.date).sort();
      const liveDates = liveData
        .map((l) => new Date(l.timestamp).toISOString().split("T")[0])
        .sort();

      let oldestDate: string | null = null;
      let newestDate: string | null = null;

      if (hourlyDates.length > 0) {
        oldestDate = hourlyDates[0];
        newestDate = hourlyDates[hourlyDates.length - 1];
      }
      if (liveDates.length > 0) {
        if (!oldestDate || liveDates[0] < oldestDate) {
          oldestDate = liveDates[0];
        }
        if (!newestDate || liveDates[liveDates.length - 1] > newestDate) {
          newestDate = liveDates[liveDates.length - 1];
        }
      }

      // Estimate total snapshots
      const estimatedSnapshots =
        hourlyData.reduce((sum, h) => sum + h.sampleCount, 0) + liveData.length;

      const daysOfData = uniqueDays.size;

      return {
        totalSnapshots: estimatedSnapshots,
        totalDaysOfData: daysOfData,
        totalRidesTracked: uniqueRides.size,
        hasEnoughForPredictions: daysOfData >= 14,
        oldestData: oldestDate ? `${oldestDate}T00:00:00.000Z` : null,
        newestData: newestDate ? `${newestDate}T23:59:59.999Z` : null,
        milestones: {
          twoWeeks: daysOfData >= 14,
          fourWeeks: daysOfData >= 28,
          threeMonths: daysOfData >= 90,
          oneYear: daysOfData >= 365,
        },
        source: "hourlyRideWaits+liveWaitTimes",
      };
    }

    // Fallback to legacy waitTimeSnapshots
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
      hasEnoughForPredictions: daysOfData >= 14,
      oldestData: new Date(oldestTimestamp).toISOString(),
      newestData: new Date(newestTimestamp).toISOString(),
      milestones: {
        twoWeeks: daysOfData >= 14,
        fourWeeks: daysOfData >= 28,
        threeMonths: daysOfData >= 90,
        oneYear: daysOfData >= 365,
      },
      source: "waitTimeSnapshots",
    };
  },
});
