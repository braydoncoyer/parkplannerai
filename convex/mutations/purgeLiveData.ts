import { internalMutation } from "../_generated/server";

/**
 * Purge old live wait time data
 * Deletes liveWaitTimes records older than 48 hours
 * Runs every 6 hours to keep the table small and fast
 */
export const purgeLiveData = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    deleted: number;
    oldestRemainingTimestamp: number | null;
  }> => {
    const now = Date.now();
    // Keep 48 hours of data
    const cutoffTime = now - 48 * 60 * 60 * 1000;
    const batchSize = 1000;

    console.log(`[${new Date().toISOString()}] Starting live data purge...`);
    console.log(`Deleting data older than ${new Date(cutoffTime).toISOString()}`);

    let totalDeleted = 0;
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    // Delete in batches to avoid timeout
    while (iterations < maxIterations) {
      const oldSnapshots = await ctx.db
        .query("liveWaitTimes")
        .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffTime))
        .take(batchSize);

      if (oldSnapshots.length === 0) {
        break;
      }

      for (const snapshot of oldSnapshots) {
        await ctx.db.delete(snapshot._id);
      }

      totalDeleted += oldSnapshots.length;
      iterations++;

      console.log(`Deleted batch ${iterations}: ${oldSnapshots.length} records (total: ${totalDeleted})`);
    }

    // Get oldest remaining timestamp for verification
    const oldestRemaining = await ctx.db
      .query("liveWaitTimes")
      .withIndex("by_timestamp")
      .order("asc")
      .first();

    console.log(
      `[${new Date().toISOString()}] Purge complete: ${totalDeleted} records deleted`
    );

    if (oldestRemaining) {
      console.log(
        `Oldest remaining data: ${new Date(oldestRemaining.timestamp).toISOString()}`
      );
    }

    return {
      success: true,
      deleted: totalDeleted,
      oldestRemainingTimestamp: oldestRemaining?.timestamp ?? null,
    };
  },
});
