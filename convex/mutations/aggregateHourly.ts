import { internalMutation } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

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
 * Aggregate hourly data from liveWaitTimes into hourlyRideWaits
 * Runs at :05 past each hour to process the previous hour's data
 *
 * This processes data from 2+ hours ago to ensure completeness
 * (avoids race conditions with data still being collected)
 */
export const aggregateHourlyData = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    hoursProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    snapshotsProcessed: number;
  }> => {
    const now = Date.now();
    // Process data from 2+ hours ago (to ensure the hour is complete)
    const cutoffTime = now - 2 * 60 * 60 * 1000;
    // Don't process data older than 48 hours (it should already be aggregated)
    const oldestTime = now - 48 * 60 * 60 * 1000;

    console.log(`[${new Date().toISOString()}] Starting hourly aggregation...`);

    // Get all parks for timezone lookup and per-park processing
    const parks = await ctx.db.query("parks").collect();
    const parkTimezones = new Map<string, string>();
    for (const park of parks) {
      parkTimezones.set(park._id, park.timezone);
    }

    // Process data per park to avoid 32k document limit
    // Instead of querying all liveWaitTimes at once, iterate per park
    let totalSnapshotsProcessed = 0;
    const aggregations = new Map<string, { key: AggregationKey; data: AggregationData }>();

    for (const park of parks) {
      // Query liveWaitTimes for this park within the time window
      const parkSnapshots = await ctx.db
        .query("liveWaitTimes")
        .withIndex("by_park_time", (q) =>
          q.eq("parkId", park._id).gte("timestamp", oldestTime).lte("timestamp", cutoffTime)
        )
        .collect();

      if (parkSnapshots.length === 0) continue;

      totalSnapshotsProcessed += parkSnapshots.length;
      const timezone = park.timezone || "America/New_York";

      for (const snapshot of parkSnapshots) {
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
    }

    if (totalSnapshotsProcessed === 0) {
      console.log("No snapshots to aggregate");
      return {
        success: true,
        hoursProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        snapshotsProcessed: 0,
      };
    }

    console.log(`Processing ${totalSnapshotsProcessed} snapshots from ${parks.length} parks`);
    console.log(`Found ${aggregations.size} unique ride-hour combinations`);

    // Process each aggregation
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const hoursProcessed = new Set<string>();

    for (const [, { key, data }] of aggregations) {
      if (data.waitTimes.length === 0) {
        // No valid wait times, skip but still track the hour
        hoursProcessed.add(`${key.date}-${key.hour}`);
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
        recordsUpdated++;
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
        recordsCreated++;
      }

      hoursProcessed.add(`${key.date}-${key.hour}`);
    }

    console.log(
      `[${new Date().toISOString()}] Aggregation complete: ${recordsCreated} created, ${recordsUpdated} updated`
    );

    return {
      success: true,
      hoursProcessed: hoursProcessed.size,
      recordsCreated,
      recordsUpdated,
      snapshotsProcessed: totalSnapshotsProcessed,
    };
  },
});
