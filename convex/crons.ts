import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Collect wait times every 15 minutes
// Uses cached park/ride data, only fetches wait times
// Skips collection during overnight hours (5-13 UTC)
crons.interval(
  "collect-wait-times",
  { minutes: 15 },
  internal.actions.collectWaitTimes.run
);

// Sync parks, lands, and rides daily at 5 AM UTC
// This ensures new rides are picked up and data stays fresh
// Runs before parks open to have latest structure ready
crons.daily(
  "sync-parks-and-rides",
  { hourUTC: 5, minuteUTC: 0 },
  internal.actions.collectWaitTimes.syncParksAndRides
);

// Collect park schedules daily at 6 AM UTC
// This fetches operating hours for the next 7 days
crons.daily(
  "collect-park-schedules",
  { hourUTC: 6, minuteUTC: 0 },
  internal.actions.collectParkSchedules.run
);

// Compute daily aggregates at 14:00 UTC (after overnight collection window ends)
// Processes the previous day's snapshots into summary statistics
crons.daily(
  "compute-daily-aggregates",
  { hourUTC: 14, minuteUTC: 0 },
  internal.actions.computeDailyAggregates.run,
  {}
);

export default crons;
