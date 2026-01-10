// Park-related TypeScript types

export interface Park {
  id: string;
  name: string;
  operator: string;
  timezone: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}

export interface ParkWithStats extends Park {
  avgWaitTime: number;
  maxWaitTime: number;
  totalRidesOpen: number;
  totalRides: number;
  crowdLevel: CrowdLevel;
}

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'very-high';

export interface DailyAggregate {
  id: number;
  park_id: string;
  date: string;
  avg_wait_time: number;
  max_wait_time: number;
  total_rides_open: number;
  day_of_week: number;
  is_holiday: boolean;
}

// Crowd level thresholds
export const CROWD_THRESHOLDS = {
  low: 20,
  moderate: 40,
  high: 60,
} as const;

export function getCrowdLevel(avgWaitTime: number): CrowdLevel {
  if (avgWaitTime < CROWD_THRESHOLDS.low) return 'low';
  if (avgWaitTime < CROWD_THRESHOLDS.moderate) return 'moderate';
  if (avgWaitTime < CROWD_THRESHOLDS.high) return 'high';
  return 'very-high';
}
