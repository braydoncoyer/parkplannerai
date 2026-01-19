import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Get local date and hour from a UTC timestamp for a given timezone
 */
function getLocalDateTime(timestamp: number, timezone: string): { date: string; hour: number; dayOfWeek: number } {
  const tz = timezone || "America/New_York";

  // Simplified timezone offset (doesn't account for DST)
  let offset = -5; // Default to Eastern (UTC-5)
  if (tz.includes("Los_Angeles") || tz.includes("Pacific")) {
    offset = -8;
  } else if (tz.includes("Chicago") || tz.includes("Central")) {
    offset = -6;
  } else if (tz.includes("Denver") || tz.includes("Mountain")) {
    offset = -7;
  }

  // Apply offset
  const localTimestamp = timestamp + offset * 60 * 60 * 1000;
  const localDate = new Date(localTimestamp);

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localDate.getUTCDate()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    hour: localDate.getUTCHours(),
    dayOfWeek: localDate.getUTCDay(),
  };
}

interface AggregationKey {
  rideId: Id<"rides">;
  parkId: Id<"parks">;
  landId: Id<"lands"> | undefined;
  date: string;
  hour: number;
  dayOfWeek: number;
}

interface AggregationData {
  waitTimes: number[];
  openCount: number;
  totalCount: number;
}

/**
 * Backfill hourlyRideWaits from waitTimeSnapshots
 * Processes data in batches to avoid timeout
 *
 * Run this migration to populate hourlyRideWaits from historical data:
 * npx convex run migrations/backfillHourlyData:runBackfill
 */
export const processBackfillBatch = internalMutation({
  args: {
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    created: number;
    updated: number;
    lastTimestamp: number | null;
    hasMore: boolean;
  }> => {
    const batchSize = args.batchSize ?? 5000;

    console.log(`Processing batch: ${new Date(args.startTimestamp).toISOString()} to ${new Date(args.endTimestamp).toISOString()}`);

    // Get all parks for timezone lookup
    const parks = await ctx.db.query("parks").collect();
    const parkTimezones = new Map<string, string>();
    for (const park of parks) {
      parkTimezones.set(park._id, park.timezone);
    }

    // Get snapshots in range
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startTimestamp).lte("timestamp", args.endTimestamp)
      )
      .take(batchSize);

    if (snapshots.length === 0) {
      return {
        processed: 0,
        created: 0,
        updated: 0,
        lastTimestamp: null,
        hasMore: false,
      };
    }

    console.log(`Found ${snapshots.length} snapshots to process`);

    // Group snapshots by ride + date + hour
    const aggregations = new Map<string, { key: AggregationKey; data: AggregationData }>();

    for (const snapshot of snapshots) {
      const timezone = parkTimezones.get(snapshot.parkId) || "America/New_York";
      const { date, hour, dayOfWeek } = getLocalDateTime(snapshot.timestamp, timezone);

      const aggregationKey = `${snapshot.rideId}-${date}-${hour}`;

      if (!aggregations.has(aggregationKey)) {
        aggregations.set(aggregationKey, {
          key: {
            rideId: snapshot.rideId,
            parkId: snapshot.parkId,
            landId: snapshot.landId,
            date,
            hour,
            dayOfWeek,
          },
          data: {
            waitTimes: [],
            openCount: 0,
            totalCount: 0,
          },
        });
      }

      const agg = aggregations.get(aggregationKey)!;
      agg.data.totalCount++;

      if (snapshot.isOpen) {
        agg.data.openCount++;
        if (snapshot.waitTimeMinutes !== undefined) {
          agg.data.waitTimes.push(snapshot.waitTimeMinutes);
        }
      }
    }

    console.log(`Grouped into ${aggregations.size} unique ride-hour combinations`);

    // Process each aggregation
    let created = 0;
    let updated = 0;

    for (const [, { key, data }] of aggregations) {
      if (data.waitTimes.length === 0) {
        continue;
      }

      const avgWait = Math.round(
        data.waitTimes.reduce((a, b) => a + b, 0) / data.waitTimes.length
      );
      const maxWait = Math.max(...data.waitTimes);
      const minWait = Math.min(...data.waitTimes);
      const openPercent = Math.round((data.openCount / data.totalCount) * 100);

      // Check if record already exists
      const existing = await ctx.db
        .query("hourlyRideWaits")
        .withIndex("by_ride_date_hour", (q) =>
          q.eq("rideId", key.rideId).eq("date", key.date).eq("hour", key.hour)
        )
        .unique();

      if (existing) {
        // Update existing record (merge data)
        const totalSamples = existing.sampleCount + data.waitTimes.length;
        const mergedAvg = Math.round(
          (existing.avgWaitMinutes * existing.sampleCount +
            data.waitTimes.reduce((a, b) => a + b, 0)) /
            totalSamples
        );

        await ctx.db.patch(existing._id, {
          avgWaitMinutes: mergedAvg,
          maxWaitMinutes: Math.max(existing.maxWaitMinutes, maxWait),
          minWaitMinutes: Math.min(existing.minWaitMinutes, minWait),
          sampleCount: totalSamples,
          openPercent: Math.round((existing.openPercent + openPercent) / 2),
        });
        updated++;
      } else {
        // Insert new record
        await ctx.db.insert("hourlyRideWaits", {
          rideId: key.rideId,
          parkId: key.parkId,
          landId: key.landId,
          date: key.date,
          dayOfWeek: key.dayOfWeek,
          hour: key.hour,
          avgWaitMinutes: avgWait,
          maxWaitMinutes: maxWait,
          minWaitMinutes: minWait,
          sampleCount: data.waitTimes.length,
          openPercent: openPercent,
        });
        created++;
      }
    }

    const lastTimestamp = snapshots[snapshots.length - 1].timestamp;
    const hasMore = snapshots.length === batchSize;

    console.log(`Batch complete: ${created} created, ${updated} updated, hasMore: ${hasMore}`);

    return {
      processed: snapshots.length,
      created,
      updated,
      lastTimestamp,
      hasMore,
    };
  },
});

/**
 * Run the full backfill process
 * This is the main entry point for the migration
 *
 * Usage: npx convex run migrations/backfillHourlyData:runBackfill
 */
export const runBackfill = internalAction({
  args: {
    daysBack: v.optional(v.number()), // How many days of history to backfill (default: all)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    totalProcessed: number;
    totalCreated: number;
    totalUpdated: number;
    batches: number;
  }> => {
    console.log("Starting hourlyRideWaits backfill...");

    // Determine time range
    const now = Date.now();
    const endTimestamp = now;
    let startTimestamp: number;

    if (args.daysBack) {
      startTimestamp = now - args.daysBack * 24 * 60 * 60 * 1000;
      console.log(`Backfilling last ${args.daysBack} days`);
    } else {
      // Start from Unix epoch (will only find actual data)
      startTimestamp = 0;
      console.log("Backfilling all historical data");
    }

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let batches = 0;
    let currentStart = startTimestamp;

    // Process in batches
    while (true) {
      const result = await ctx.runMutation(internal.migrations.backfillHourlyData.processBackfillBatch, {
        startTimestamp: currentStart,
        endTimestamp: endTimestamp,
        batchSize: 5000,
      });

      totalProcessed += result.processed;
      totalCreated += result.created;
      totalUpdated += result.updated;
      batches++;

      console.log(`Progress: ${totalProcessed} snapshots processed, ${totalCreated} hourly records created, ${totalUpdated} updated`);

      if (!result.hasMore || result.lastTimestamp === null) {
        break;
      }

      // Move start to after last processed timestamp
      currentStart = result.lastTimestamp + 1;
    }

    console.log("Backfill complete!");
    console.log(`Total: ${totalProcessed} snapshots → ${totalCreated} created, ${totalUpdated} updated in ${batches} batches`);

    return {
      success: true,
      totalProcessed,
      totalCreated,
      totalUpdated,
      batches,
    };
  },
});

/**
 * Clear all hourlyRideWaits data (use with caution!)
 * Useful for re-running the backfill from scratch
 *
 * Usage: npx convex run migrations/backfillHourlyData:clearHourlyData
 */
export const clearHourlyData = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ deleted: number }> => {
    console.log("Clearing hourlyRideWaits table...");

    const batchSize = 1000;
    let totalDeleted = 0;

    while (true) {
      const batch = await ctx.db.query("hourlyRideWaits").take(batchSize);

      if (batch.length === 0) {
        break;
      }

      for (const doc of batch) {
        await ctx.db.delete(doc._id);
      }

      totalDeleted += batch.length;
      console.log(`Deleted ${totalDeleted} records...`);
    }

    console.log(`Cleared ${totalDeleted} hourlyRideWaits records`);
    return { deleted: totalDeleted };
  },
});
