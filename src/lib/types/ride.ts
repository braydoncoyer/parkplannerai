// Ride-related TypeScript types

export interface Ride {
  id: string;
  park_id: string;
  name: string;
  category: RideCategory | null;
  last_seen: string;
}

export type RideCategory = 'thrill' | 'family' | 'kids' | 'show' | 'other';

export interface RideWithWaitTime extends Ride {
  wait_time_minutes: number | null;
  is_open: boolean;
  last_updated: string;
}

export interface WaitTimeSnapshot {
  id: number;
  ride_id: string;
  park_id: string;
  wait_time_minutes: number | null;
  is_open: boolean;
  timestamp: string;
}

export type RideStatus = 'open' | 'closed' | 'delayed' | 'unknown';

export function getRideStatus(ride: RideWithWaitTime): RideStatus {
  if (!ride.is_open) return 'closed';
  if (ride.wait_time_minutes === null) return 'unknown';
  return 'open';
}

// Category display labels
export const CATEGORY_LABELS: Record<RideCategory, string> = {
  thrill: 'Thrill Rides',
  family: 'Family Attractions',
  kids: "Kids' Rides",
  show: 'Shows & Entertainment',
  other: 'Other Attractions',
};
