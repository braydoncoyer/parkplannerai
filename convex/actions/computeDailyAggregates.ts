"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// US Federal Holidays and major theme park holidays for 2024-2026
// Format: "MM-DD" for fixed dates, calculated for floating holidays
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "07-04": "Independence Day",
  "11-11": "Veterans Day",
  "12-25": "Christmas Day",
  "12-31": "New Year's Eve",
};

/**
 * Check if a date falls on a major US holiday or theme park peak period
 */
function isHoliday(date: Date): boolean {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Check fixed holidays
  if (FIXED_HOLIDAYS[monthDay]) {
    return true;
  }

  // Thanksgiving (4th Thursday of November)
  if (date.getMonth() === 10) { // November
    const firstDay = new Date(date.getFullYear(), 10, 1).getDay();
    const thanksgivingDate = 22 + ((11 - firstDay) % 7);
    if (date.getDate() === thanksgivingDate || date.getDate() === thanksgivingDate + 1) {
      return true; // Thanksgiving and Black Friday
    }
  }

  // Memorial Day (last Monday of May)
  if (date.getMonth() === 4) { // May
    const lastDay = new Date(date.getFullYear(), 5, 0).getDate();
    const lastDayOfWeek = new Date(date.getFullYear(), 4, lastDay).getDay();
    const memorialDay = lastDay - ((lastDayOfWeek + 6) % 7);
    if (date.getDate() === memorialDay) {
      return true;
    }
  }

  // Labor Day (first Monday of September)
  if (date.getMonth() === 8) { // September
    const firstDay = new Date(date.getFullYear(), 8, 1).getDay();
    const laborDay = 1 + ((8 - firstDay) % 7);
    if (date.getDate() === laborDay) {
      return true;
    }
  }

  // MLK Day (3rd Monday of January)
  if (date.getMonth() === 0) { // January
    const firstDay = new Date(date.getFullYear(), 0, 1).getDay();
    const mlkDay = 15 + ((8 - firstDay) % 7);
    if (date.getDate() === mlkDay) {
      return true;
    }
  }

  // Presidents Day (3rd Monday of February)
  if (date.getMonth() === 1) { // February
    const firstDay = new Date(date.getFullYear(), 1, 1).getDay();
    const presidentsDay = 15 + ((8 - firstDay) % 7);
    if (date.getDate() === presidentsDay) {
      return true;
    }
  }

  // Peak periods (not holidays but high-crowd days)
  // Christmas week: Dec 20-31
  if (date.getMonth() === 11 && date.getDate() >= 20) {
    return true;
  }

  // Spring break approximate: March 15 - April 15
  const month = date.getMonth();
  const day = date.getDate();
  if ((month === 2 && day >= 15) || (month === 3 && day <= 15)) {
    return true; // Treat spring break as "holiday" for crowd purposes
  }

  return false;
}

/**
 * Compute daily aggregates for a specific date
 * Runs after midnight to process the previous day's data
 */
export const run = internalAction({
  args: {
    date: v.optional(v.string()), // ISO date YYYY-MM-DD, defaults to yesterday
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    date: string;
    parksProcessed: number;
    error?: string;
  }> => {
    // Determine the date to process (default: yesterday)
    let targetDate: Date;
    if (args.date) {
      targetDate = new Date(args.date + "T00:00:00Z");
    } else {
      const now = new Date();
      targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    }

    const dateString = targetDate.toISOString().split("T")[0];
    const dayOfWeek = targetDate.getUTCDay();
    const isHolidayFlag = isHoliday(targetDate);

    console.log(`[${new Date().toISOString()}] Computing daily aggregates for ${dateString}...`);
    console.log(`  Day of week: ${dayOfWeek} (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]})`);
    console.log(`  Is holiday/peak: ${isHolidayFlag}`);

    try {
      // Get all parks
      const parks = await ctx.runQuery(internal.queries.parks.getAllParksInternal);

      if (parks.length === 0) {
        console.log("No parks found in database");
        return {
          success: false,
          date: dateString,
          parksProcessed: 0,
          error: "No parks in database",
        };
      }

      // Calculate timestamp range for the target date (UTC)
      const startOfDay = new Date(dateString + "T00:00:00Z").getTime();
      const endOfDay = new Date(dateString + "T23:59:59.999Z").getTime();

      // Get snapshots for this date range
      const snapshots = await ctx.runQuery(internal.queries.dailyAggregates.getSnapshotsForDateRange, {
        startTimestamp: startOfDay,
        endTimestamp: endOfDay,
      });

      console.log(`  Found ${snapshots.length} snapshots for ${dateString}`);

      if (snapshots.length === 0) {
        console.log("  No snapshots found for this date - skipping");
        return {
          success: true,
          date: dateString,
          parksProcessed: 0,
        };
      }

      // Group snapshots by park
      const snapshotsByPark: Record<string, typeof snapshots> = {};
      for (const snapshot of snapshots) {
        const parkIdStr = snapshot.parkId;
        if (!snapshotsByPark[parkIdStr]) {
          snapshotsByPark[parkIdStr] = [];
        }
        snapshotsByPark[parkIdStr].push(snapshot);
      }

      // Process each park
      let parksProcessed = 0;
      for (const park of parks) {
        const parkSnapshots = snapshotsByPark[park._id] || [];

        if (parkSnapshots.length === 0) {
          continue;
        }

        // Filter to only open rides with valid wait times
        const validSnapshots = parkSnapshots.filter(
          (s) => s.isOpen && s.waitTimeMinutes !== undefined && s.waitTimeMinutes !== null
        );

        // Calculate statistics
        let avgWaitTime: number | undefined;
        let maxWaitTime: number | undefined;

        if (validSnapshots.length > 0) {
          const waitTimes = validSnapshots.map((s) => s.waitTimeMinutes!);
          avgWaitTime = Math.round(
            waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          );
          maxWaitTime = Math.max(...waitTimes);
        }

        // Count unique rides that were open at any point
        const uniqueOpenRides = new Set(
          parkSnapshots.filter((s) => s.isOpen).map((s) => s.rideId)
        );
        const totalRidesOpen = uniqueOpenRides.size;

        // Upsert the daily aggregate
        await ctx.runMutation(internal.mutations.dailyAggregates.upsertDailyAggregate, {
          parkId: park._id,
          externalParkId: park.externalId,
          date: dateString,
          avgWaitTime,
          maxWaitTime,
          totalRidesOpen,
          dayOfWeek,
          isHoliday: isHolidayFlag,
        });

        parksProcessed++;
        console.log(`  ✓ ${park.name}: avg=${avgWaitTime ?? "N/A"}min, max=${maxWaitTime ?? "N/A"}min, ridesOpen=${totalRidesOpen}`);
      }

      console.log(`[${new Date().toISOString()}] Done! Processed ${parksProcessed} parks for ${dateString}`);

      return {
        success: true,
        date: dateString,
        parksProcessed,
      };
    } catch (error) {
      console.error("Error computing daily aggregates:", error);
      return {
        success: false,
        date: dateString,
        parksProcessed: 0,
        error: String(error),
      };
    }
  },
});

/**
 * Backfill daily aggregates for a range of dates
 * Useful for processing historical data
 */
export const backfill = internalAction({
  args: {
    startDate: v.string(), // ISO date YYYY-MM-DD
    endDate: v.string(),   // ISO date YYYY-MM-DD
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    daysProcessed: number;
    errors: string[];
  }> => {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);

    console.log(`[${new Date().toISOString()}] Backfilling daily aggregates from ${args.startDate} to ${args.endDate}...`);

    let daysProcessed = 0;
    const errors: string[] = [];

    // Process each day in the range
    const current = new Date(start);
    while (current <= end) {
      const dateString = current.toISOString().split("T")[0];

      try {
        const result = await ctx.runAction(internal.actions.computeDailyAggregates.run, {
          date: dateString,
        });

        if (result.success) {
          daysProcessed++;
        } else if (result.error) {
          errors.push(`${dateString}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${dateString}: ${String(error)}`);
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    console.log(`[${new Date().toISOString()}] Backfill complete! ${daysProcessed} days processed, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      daysProcessed,
      errors,
    };
  },
});
