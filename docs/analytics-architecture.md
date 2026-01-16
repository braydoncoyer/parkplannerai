# Analytics Architecture

> **Last Updated**: January 2025
> **Status**: Active

This document describes the architecture for the analytics system in the Theme Park Analytics app, including how data is collected, aggregated, and queried.

---

## Overview

The analytics system uses a **pre-aggregation pattern** to efficiently serve analytics data:

```
Raw Data Collection (every 15 min)
         ↓
    waitTimeSnapshots table (millions of rows over time)
         ↓
Scheduled Aggregation Jobs (daily)
         ↓
    Aggregation Tables (compact, pre-computed)
         ↓
Frontend Queries (fast reads from aggregations)
```

### Why Pre-Aggregation?

1. **Scale**: Raw snapshots grow ~100 rows per 15 minutes per park. Over a year, this is 3+ million rows.
2. **Speed**: Reading 7 rows (weekly averages) vs 100,000+ raw snapshots.
3. **Limits**: Convex has a 32,000 document read limit per query. Pre-aggregation stays well under this.
4. **Cost**: Less compute on every page load; aggregation happens once per day.

---

## Database Schema

### Raw Data Tables

These tables store raw collected data from external APIs:

| Table | Purpose | Growth Rate |
|-------|---------|-------------|
| `parks` | Park metadata | Static (~20 rows) |
| `lands` | Themed areas within parks | Static (~100 rows) |
| `rides` | Ride/attraction metadata | Static (~500 rows) |
| `waitTimeSnapshots` | Historical wait times | ~100 rows / 15 min |
| `parkSchedules` | Operating hours | ~20 rows / day |

### Aggregation Tables

These tables store pre-computed analytics for fast reads:

| Table | Purpose | Updated |
|-------|---------|---------|
| `dailyAggregates` | Daily averages per park | Daily |
| `hourlyAggregates` | Average wait by hour of day | Daily |
| `weeklyAggregates` | Day-of-week patterns | Daily |
| `operatorAggregates` | Disney vs Universal comparison | Daily |

---

## Aggregation Tables Schema

### `hourlyAggregates`
Pre-computed average wait times by hour of day.

```typescript
{
  parkId: Id<"parks">,           // Optional - null for "all parks"
  operator: string,              // "Disney", "Universal", or "all"
  dayType: string,               // "weekday", "weekend", or "all"
  hour: number,                  // 0-23
  avgWaitTime: number,           // Average wait in minutes
  sampleCount: number,           // Number of snapshots used
  lastUpdated: number,           // Unix timestamp
}
```

**Indexes**: `by_operator_daytype`, `by_park`

### `weeklyAggregates`
Pre-computed average wait times by day of week.

```typescript
{
  operator: string,              // "Disney", "Universal", or "all"
  dayOfWeek: number,             // 0-6 (0 = Sunday)
  avgWaitTime: number,
  sampleCount: number,
  lastUpdated: number,
}
```

**Indexes**: `by_operator`

### `operatorAggregates`
Comparison metrics between Disney and Universal.

```typescript
{
  operator: string,              // "Disney" or "Universal"
  periodDays: number,            // 7, 14, 30, etc.
  avgWaitTime: number,
  totalSnapshots: number,
  parksTracked: number,
  lastUpdated: number,
}
```

**Indexes**: `by_operator_period`

### `analyticsInsights`
Pre-computed insights (best day, worst hour, etc.)

```typescript
{
  insightType: string,           // "best_day", "worst_day", "best_hour", etc.
  value: string,                 // The value (e.g., "Tuesday", "9:00 AM")
  metric: number,                // Associated metric (e.g., avg wait)
  periodDays: number,            // Analysis period
  lastUpdated: number,
}
```

**Indexes**: `by_type`

---

## Scheduled Aggregation Jobs

Aggregation jobs run on a schedule via Convex cron jobs.

### Daily Aggregation (`aggregateDaily`)

**Schedule**: Every day at 3:00 AM UTC
**Purpose**: Process all snapshots from the previous day

```typescript
// convex/crons.ts
crons.daily(
  "aggregate analytics",
  { hourUTC: 3, minuteUTC: 0 },
  internal.aggregations.runDailyAggregation
);
```

### Aggregation Process

1. **Batch Processing**: Process snapshots in batches of 5,000 to avoid limits
2. **Incremental Updates**: Only process new data since last aggregation
3. **Idempotent**: Safe to re-run without duplicating data

```typescript
// Pseudocode for aggregation
async function runDailyAggregation() {
  const lastRun = await getLastAggregationTime();
  const cutoff = Date.now();

  // Process in batches
  let cursor = null;
  while (true) {
    const batch = await getSnapshotsBatch(lastRun, cutoff, cursor);
    if (batch.length === 0) break;

    await processHourlyAggregates(batch);
    await processWeeklyAggregates(batch);
    await processOperatorAggregates(batch);

    cursor = batch[batch.length - 1]._id;
  }

  await updateAnalyticsInsights();
  await setLastAggregationTime(cutoff);
}
```

---

## Frontend Queries

Frontend queries read from aggregation tables, NOT raw snapshots.

### Pattern

```typescript
// BAD - Reads raw snapshots (slow, hits limits)
export const getWeeklyPatterns = query({
  handler: async (ctx) => {
    const snapshots = await ctx.db
      .query("waitTimeSnapshots")
      .collect(); // Could be millions of rows!
    // ... process
  }
});

// GOOD - Reads pre-computed aggregates (fast)
export const getWeeklyPatterns = query({
  handler: async (ctx) => {
    const aggregates = await ctx.db
      .query("weeklyAggregates")
      .withIndex("by_operator")
      .collect(); // Always ~14 rows (7 days × 2 operators)
    return aggregates;
  }
});
```

### Available Queries

| Query | Source Table | Typical Rows |
|-------|--------------|--------------|
| `getWeeklyPatterns` | `weeklyAggregates` | 14 |
| `getHourlyPatterns` | `hourlyAggregates` | 39 (13 hours × 3 day types) |
| `getOperatorComparison` | `operatorAggregates` | 2 |
| `getAnalyticsInsights` | `analyticsInsights` | 6 |
| `getHistoricalTrend` | `dailyAggregates` | 30 |

---

## Adding New Analytics

When adding new analytics features, follow this pattern:

### 1. Define the Aggregation Table

Add to `convex/schema.ts`:

```typescript
myNewAggregates: defineTable({
  dimension: v.string(),        // What you're grouping by
  metric: v.number(),           // The computed value
  sampleCount: v.number(),      // For statistical validity
  lastUpdated: v.number(),
}).index("by_dimension", ["dimension"]),
```

### 2. Create the Aggregation Function

Add to `convex/aggregations.ts`:

```typescript
async function aggregateMyNewMetric(
  ctx: MutationCtx,
  snapshots: WaitTimeSnapshot[]
) {
  // Group and compute
  const grouped = groupBy(snapshots, s => s.myDimension);

  for (const [dimension, group] of Object.entries(grouped)) {
    const avg = mean(group.map(s => s.waitTimeMinutes));

    // Upsert the aggregate
    await ctx.db.patch(existingId, { metric: avg, lastUpdated: Date.now() });
    // OR
    await ctx.db.insert("myNewAggregates", { dimension, metric: avg, ... });
  }
}
```

### 3. Add to Daily Aggregation

Update `runDailyAggregation` to call your new function:

```typescript
async function runDailyAggregation(ctx) {
  // ... existing aggregations
  await aggregateMyNewMetric(ctx, batch);
}
```

### 4. Create the Query

Add to `convex/queries/analytics.ts`:

```typescript
export const getMyNewAnalytics = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("myNewAggregates")
      .withIndex("by_dimension")
      .collect();
  }
});
```

### 5. Update the Frontend

Use the new query in your React component:

```typescript
const data = useQuery(api.queries.analytics.getMyNewAnalytics);
```

---

## Data Freshness

| Data Type | Freshness | Notes |
|-----------|-----------|-------|
| Raw snapshots | Real-time | Collected every 15 min |
| Daily aggregates | 24 hours | Updated at 3 AM UTC |
| Hourly/Weekly aggregates | 24 hours | Updated at 3 AM UTC |
| Insights | 24 hours | Updated at 3 AM UTC |

For real-time data needs, query raw snapshots with tight time filters:

```typescript
// Last hour of snapshots (real-time)
const recentSnapshots = await ctx.db
  .query("waitTimeSnapshots")
  .withIndex("by_timestamp", q => q.gte("timestamp", Date.now() - 3600000))
  .take(1000);
```

---

## Monitoring

### Aggregation Health

Check if aggregations are running:

```typescript
export const getAggregationStatus = query({
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("weeklyAggregates")
      .order("desc")
      .first();

    return {
      lastUpdated: latest?.lastUpdated,
      isStale: Date.now() - (latest?.lastUpdated ?? 0) > 48 * 60 * 60 * 1000,
    };
  }
});
```

### Data Volume

Monitor snapshot growth:

```typescript
export const getDataVolume = query({
  handler: async (ctx) => {
    // Sample recent data to estimate total
    const recent = await ctx.db
      .query("waitTimeSnapshots")
      .withIndex("by_timestamp")
      .order("desc")
      .take(1000);

    // Estimate based on time range
    // ...
  }
});
```

---

## Troubleshooting

### "Too many documents read" Error

**Cause**: Query is reading raw snapshots instead of aggregates.

**Solution**:
1. Check if you're querying `waitTimeSnapshots` directly
2. Use aggregation tables instead
3. If raw data is needed, add `.take(limit)` and tight index filters

### Stale Analytics Data

**Cause**: Aggregation cron job failed or didn't run.

**Solution**:
1. Check Convex dashboard for cron job status
2. Manually trigger: `npx convex run aggregations:runDailyAggregation`
3. Check for errors in the aggregation function

### Missing Data for a Day

**Cause**: Data collection failed for that day.

**Solution**:
1. Aggregations will show gaps naturally
2. Consider backfilling if collection service was down

---

## File Locations

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Database schema including aggregation tables |
| `convex/aggregations.ts` | Aggregation computation functions |
| `convex/crons.ts` | Scheduled job definitions |
| `convex/queries/analytics.ts` | Frontend query functions |
| `src/components/analytics/` | React components for analytics UI |
| `docs/analytics-architecture.md` | This document |

---

## Related Documentation

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Scheduled Functions](https://docs.convex.dev/scheduling/cron-jobs)
- `docs/supabase-implementation-plan.md` (deprecated, historical reference)
