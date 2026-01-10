-- Theme Park Analytics Database Schema
-- PostgreSQL Database

-- Parks table (mirrors queue-times data)
CREATE TABLE IF NOT EXISTS parks (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  operator VARCHAR(100),
  timezone VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id VARCHAR(50) PRIMARY KEY,
  park_id VARCHAR(50) NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- thrill, family, kids, show
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wait time snapshots (collected every 10 minutes)
CREATE TABLE IF NOT EXISTS wait_time_snapshots (
  id SERIAL PRIMARY KEY,
  ride_id VARCHAR(50) NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  park_id VARCHAR(50) NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  wait_time_minutes INTEGER, -- NULL if closed
  is_open BOOLEAN DEFAULT true,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily aggregates (pre-computed for faster queries)
CREATE TABLE IF NOT EXISTS daily_aggregates (
  id SERIAL PRIMARY KEY,
  park_id VARCHAR(50) NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_wait_time DECIMAL(5, 2),
  max_wait_time INTEGER,
  total_rides_open INTEGER,
  day_of_week INTEGER, -- 0-6 (0 = Sunday)
  is_holiday BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(park_id, date)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_park_time ON wait_time_snapshots(park_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_ride_time ON wait_time_snapshots(ride_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON wait_time_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aggregates_park_date ON daily_aggregates(park_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_aggregates_dow ON daily_aggregates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_rides_park ON rides(park_id);

-- Comments for documentation
COMMENT ON TABLE parks IS 'Theme parks tracked by the system';
COMMENT ON TABLE rides IS 'Rides/attractions within each park';
COMMENT ON TABLE wait_time_snapshots IS 'Historical wait time data collected every 10 minutes';
COMMENT ON TABLE daily_aggregates IS 'Pre-computed daily statistics for faster analytics queries';
