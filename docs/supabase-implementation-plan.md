# Supabase Database Persistence for Ride Wait Times

> **DEPRECATED**: This implementation plan has been superseded by Convex.
> See the new implementation in `convex/` directory.
> This document is kept for historical reference only.

---

## Overview
Add Supabase (hosted PostgreSQL) to persist ride wait time data every 15 minutes, enabling historical queries like "what were wait times last week?"

## Files to Create

### 1. Supabase Client
**`src/lib/db/supabase.ts`**
- Server client using `SUPABASE_SERVICE_ROLE_KEY` (for writes)
- Public client using `SUPABASE_ANON_KEY` (for reads)
- Singleton pattern for connection reuse

### 2. Database Types
**`src/lib/db/database.types.ts`**
- TypeScript interfaces matching `db/schema.sql`
- Tables: `parks`, `rides`, `wait_time_snapshots`, `daily_aggregates`

### 3. Data Collection Service
**`src/lib/db/waitTimeCollector.ts`**
- Reuse existing `fetchAllParks()` and `fetchParkWaitTimes()` from `src/lib/api/queueTimes.ts`
- Upsert parks and rides, insert wait time snapshots
- Adapt logic from existing `scripts/collect-data.ts`

### 4. Cron Endpoint
**`src/pages/api/cron/collect-wait-times.ts`**
- POST endpoint protected by `CRON_SECRET` header
- Calls `collectWaitTimeData()` and returns stats
- Support GET for manual testing

### 5. Historical Query APIs
**`src/pages/api/history/rides/[rideId].json.ts`**
- Query params: `days` (default 7), `from`, `to`
- Returns snapshots + calculated stats (avg/max/min wait)

**`src/pages/api/history/parks/[parkId].json.ts`**
- Returns daily aggregates and hourly patterns
- Useful for park-wide trend analysis

### 6. Environment Setup
**`.env.example`**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-secret
```

### 7. Cron Scheduling
**`vercel.json`** (if using Vercel)
```json
{
  "crons": [{
    "path": "/api/cron/collect-wait-times",
    "schedule": "*/15 * * * *"
  }]
}
```

## Files to Modify

### `package.json`
- Add dependency: `@supabase/supabase-js`

### `db/schema.sql`
- Add Row Level Security (RLS) policies for Supabase
- Update comment from "every 10 minutes" to "every 15 minutes"

### `src/lib/types/ride.ts`
- Add `WaitTimeHistoryQuery` and `WaitTimeHistoryResponse` interfaces

## Database Schema (Already Exists)
Use existing `db/schema.sql` in Supabase SQL editor:
- `parks` - Park metadata
- `rides` - Ride/attraction data
- `wait_time_snapshots` - Historical wait times (every 15 min)
- `daily_aggregates` - Pre-computed daily stats

Add RLS policies:
```sql
ALTER TABLE parks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON parks FOR SELECT USING (true);
CREATE POLICY "Service write" ON parks FOR ALL USING (auth.role() = 'service_role');
-- Repeat for rides, wait_time_snapshots, daily_aggregates
```

## Implementation Order

1. **Setup Supabase project** - Create project, run schema, copy credentials
2. **Install dependency** - `npm install @supabase/supabase-js`
3. **Create `.env`** - Add Supabase credentials
4. **Create db client** - `src/lib/db/supabase.ts` + types
5. **Create collector** - `src/lib/db/waitTimeCollector.ts`
6. **Create cron endpoint** - `src/pages/api/cron/collect-wait-times.ts`
7. **Create history APIs** - `src/pages/api/history/rides/[rideId].json.ts` and parks
8. **Configure cron** - `vercel.json` or GitHub Actions
9. **Test end-to-end**

## Verification

1. **Manual collection test**
   ```bash
   curl http://localhost:4321/api/cron/collect-wait-times
   ```
   Expected: JSON with `parksProcessed`, `ridesProcessed`, `snapshotsInserted`

2. **Check Supabase dashboard**
   - Verify rows in `wait_time_snapshots` table

3. **Query historical data**
   ```bash
   curl "http://localhost:4321/api/history/rides/123?days=7"
   ```
   Expected: JSON with `snapshots` array and `stats` object

4. **Verify cron scheduling**
   - Deploy to Vercel, check cron logs after 15 minutes
   - Or trigger GitHub Action manually

## Not Included (per requirements)
- Show schedules
- Dining/shopping data
- Entertainment data
- Attendance/ticket sales (skipped for now)

---

## Future Extensibility: Attendance Tracking

The schema is designed to easily add attendance data later. Here's how:

### Option 1: Add to `daily_aggregates` table
```sql
ALTER TABLE daily_aggregates
  ADD COLUMN estimated_attendance INTEGER,
  ADD COLUMN attendance_source VARCHAR(50); -- 'estimated', 'manual', 'api'
```
This keeps attendance with other daily metrics.

### Option 2: Separate `park_attendance` table (recommended)
```sql
CREATE TABLE park_attendance (
  id SERIAL PRIMARY KEY,
  park_id VARCHAR(50) REFERENCES parks(id),
  date DATE NOT NULL,
  attendance INTEGER,
  source VARCHAR(50) NOT NULL, -- 'estimated', 'manual', 'tea_report', 'api'
  confidence VARCHAR(20), -- 'high', 'medium', 'low'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(park_id, date, source)
);
```

**Why a separate table?**
- Attendance data has different sources (estimates vs actual)
- Multiple sources can exist for same date (estimated + official)
- Doesn't bloat wait time queries
- Can track confidence levels and source metadata

### Estimation Algorithm (for future)
We can estimate attendance from wait time data using:
1. **Average wait times** - correlates with crowd levels
2. **Rides operating** - capacity indicator
3. **Historical patterns** - day-of-week, holiday multipliers
4. **Published capacity** - Magic Kingdom ~90k, EPCOT ~110k, etc.

### API Endpoint Pattern (future)
```
GET /api/history/parks/[parkId]/attendance.json?days=30
```

### Code Structure (future)
```
src/lib/db/
  attendanceCollector.ts    # Future: estimation logic
  attendanceTypes.ts        # Future: attendance interfaces
```

The current implementation keeps the door open by:
1. Using a modular `src/lib/db/` folder structure
2. Keeping park/ride/snapshot tables separate from future attendance
3. Using the `daily_aggregates` table which can join with attendance data

---

## Automatic Handling of Park & Ride Changes

The system automatically adapts to changes in parks and rides through the **upsert pattern**.

### How It Works

Every 15 minutes when data is collected:

1. **Parks are upserted** (INSERT or UPDATE on conflict)
   - New parks from Queue-Times API → automatically added
   - Existing parks → `last_updated` timestamp refreshed
   - Parks no longer in API → remain in DB with stale `last_updated`

2. **Rides are upserted** (INSERT or UPDATE on conflict)
   - New rides (e.g., Tiana's Bayou Adventure opens) → automatically added
   - Existing rides → `last_seen` timestamp refreshed
   - Removed/renamed rides → remain in DB with stale `last_seen`

### Database Design Supports This

```sql
-- Parks: upsert on every collection
INSERT INTO parks (id, name, ..., last_updated)
VALUES ($1, $2, ..., NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  last_updated = NOW();

-- Rides: upsert on every collection
INSERT INTO rides (id, park_id, name, last_seen)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  last_seen = NOW();
```

### Tracking Ride Lifecycle

The `last_seen` timestamp on rides enables:

```sql
-- Find rides not seen in 30+ days (likely removed/renamed)
SELECT * FROM rides
WHERE last_seen < NOW() - INTERVAL '30 days';

-- Find newly added rides (first seen in last 7 days)
SELECT * FROM rides
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Handling Ride Renames

When a ride is renamed (e.g., "Splash Mountain" → "Tiana's Bayou Adventure"):
- Queue-Times API assigns a **new ID** → new ride record created
- Old ride stays in DB with stale `last_seen`
- Historical data for old ride is preserved
- No manual intervention needed

### Handling New Parks

If Disney or Universal opens a new park:
1. Queue-Times adds it to their API
2. Our `fetchAllParks()` picks it up automatically
3. Next collection cycle upserts the new park
4. Rides start being tracked immediately

### Optional: Soft Delete for Removed Rides

If you want cleaner data, we can add:

```sql
ALTER TABLE rides ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Mark rides inactive if not seen in 30 days (run periodically)
UPDATE rides SET is_active = false
WHERE last_seen < NOW() - INTERVAL '30 days';
```

### Summary

| Scenario | Handling |
|----------|----------|
| New park opens | Auto-added on next collection |
| New ride opens | Auto-added on next collection |
| Ride renamed | New record created, old preserved |
| Ride permanently closed | Stays in DB, `last_seen` goes stale |
| Park metadata changes | Auto-updated via upsert |

**No manual intervention required** - the system discovers and tracks changes automatically through the Queue-Times API.
