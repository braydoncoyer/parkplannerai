/**
 * Data Collection Script
 *
 * This script polls the Queue-Times API and stores wait time data in PostgreSQL.
 * Should be run as a cron job every 10 minutes.
 *
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

import { fetchAllParks, fetchParkWaitTimes, isTargetPark } from '../src/lib/api/queueTimes';

// Note: In production, you'll need to install and configure a PostgreSQL client
// For now, this is a template showing the structure
interface DatabaseClient {
  query: (text: string, values?: any[]) => Promise<any>;
  end: () => Promise<void>;
}

let db: DatabaseClient | null = null;

// Initialize database connection
// async function initDatabase(): Promise<DatabaseClient> {
//   // Example with 'pg' library:
//   // const { Pool } = require('pg');
//   // const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//   // return pool;
//
//   throw new Error('Database client not configured. Install pg or @vercel/postgres');
// }

/**
 * Upsert park data into database
 */
async function upsertPark(
  parkId: string,
  name: string,
  operator: string,
  timezone: string,
  latitude: number,
  longitude: number
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const query = `
    INSERT INTO parks (id, name, operator, timezone, latitude, longitude, last_updated)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      operator = EXCLUDED.operator,
      timezone = EXCLUDED.timezone,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      last_updated = NOW()
  `;

  await db.query(query, [parkId, name, operator, timezone, latitude, longitude]);
}

/**
 * Upsert ride data into database
 */
async function upsertRide(
  rideId: string,
  parkId: string,
  name: string,
  category: string | null = null
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const query = `
    INSERT INTO rides (id, park_id, name, category, last_seen)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      last_seen = NOW()
  `;

  await db.query(query, [rideId, parkId, name, category]);
}

/**
 * Insert wait time snapshot
 */
async function insertWaitTimeSnapshot(
  rideId: string,
  parkId: string,
  waitTime: number | null,
  isOpen: boolean,
  timestamp: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const query = `
    INSERT INTO wait_time_snapshots (ride_id, park_id, wait_time_minutes, is_open, timestamp)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await db.query(query, [rideId, parkId, waitTime, isOpen, timestamp]);
}

/**
 * Main data collection function
 */
async function collectData(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting data collection...`);

  try {
    // Fetch all parks
    console.log('Fetching parks from Queue-Times API...');
    const parks = await fetchAllParks();
    console.log(`Found ${parks.length} Disney/Universal parks`);

    let totalRidesProcessed = 0;

    // Process each park
    for (const park of parks) {
      try {
        console.log(`Processing park: ${park.name} (${park.id})`);

        // Determine operator
        const operator = isTargetPark(park.name) ?
          (park.name.toLowerCase().includes('disney') ? 'Disney' : 'Universal') :
          'Unknown';

        // Upsert park data
        await upsertPark(
          park.id,
          park.name,
          operator,
          park.timezone,
          park.location.latitude,
          park.location.longitude
        );

        // Fetch and process wait times
        const { rides, lastUpdated } = await fetchParkWaitTimes(park.id);
        console.log(`  Found ${rides.length} rides`);

        for (const ride of rides) {
          // Upsert ride data
          await upsertRide(ride.id, park.id, ride.name);

          // Insert wait time snapshot
          await insertWaitTimeSnapshot(
            ride.id,
            park.id,
            ride.wait_time,
            ride.is_open,
            ride.last_updated
          );

          totalRidesProcessed++;
        }

        console.log(`  ✓ Processed ${rides.length} rides from ${park.name}`);
      } catch (error) {
        console.error(`  ✗ Error processing park ${park.name}:`, error);
        // Continue with next park
      }
    }

    console.log(`[${new Date().toISOString()}] Data collection complete!`);
    console.log(`Total rides processed: ${totalRidesProcessed}`);
  } catch (error) {
    console.error('Fatal error during data collection:', error);
    throw error;
  }
}

/**
 * Run the script
 */
async function main() {
  try {
    // Uncomment when database is configured:
    // db = await initDatabase();

    // For now, just test the API connection
    console.log('Testing Queue-Times API connection...');
    const parks = await fetchAllParks();
    console.log(`Successfully fetched ${parks.length} parks`);
    console.log('Sample parks:');
    parks.slice(0, 3).forEach((park) => {
      console.log(`  - ${park.name} (${park.id})`);
    });

    // Uncomment when database is configured:
    // await collectData();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (db) {
      await db.end();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { collectData };
