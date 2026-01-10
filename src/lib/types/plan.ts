// Plan-related TypeScript types for the "Create My Plan" feature

import type { Ride } from './ride';

export interface PlanInput {
  parkIds: string[];
  favoriteRideIds: string[];
  visitDate: string;
  duration: VisitDuration;
  priorities: VisitPriority[];
}

export type VisitDuration = 'half-day' | 'full-day' | 'multi-day';
export type VisitPriority = 'thrill' | 'family' | 'kids' | 'shows' | 'minimal-wait';

export interface ItineraryItem {
  ride: Ride;
  startTime: string; // ISO time string (e.g., "10:00")
  endTime: string;
  expectedWaitTime: number;
  walkingTime: number; // minutes to walk from previous attraction
  reasoning: string; // Why this ride at this time
}

export interface Itinerary {
  id: string;
  parkId: string;
  parkName: string;
  date: string;
  items: ItineraryItem[];
  totalWaitTime: number;
  totalWalkingTime: number;
  mealBreaks: MealBreak[];
  tips: string[];
  alternatives: Alternative[];
}

export interface MealBreak {
  startTime: string;
  endTime: string;
  suggestion: string;
}

export interface Alternative {
  condition: string; // e.g., "If Space Mountain is closed"
  suggestion: string;
}

export interface SavedPlan {
  id: string;
  created_at: string;
  input: PlanInput;
  itineraries: Itinerary[];
}

// Visit duration display labels
export const DURATION_LABELS: Record<VisitDuration, string> = {
  'half-day': 'Half Day (4-5 hours)',
  'full-day': 'Full Day (8-10 hours)',
  'multi-day': 'Multiple Days',
};

// Priority display labels
export const PRIORITY_LABELS: Record<VisitPriority, string> = {
  thrill: 'Thrill Rides',
  family: 'Family Attractions',
  kids: 'Kid-Friendly',
  shows: 'Shows & Entertainment',
  'minimal-wait': 'Minimize Wait Times',
};
