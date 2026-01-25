// Analytics Types for Smart Itinerary Optimization

export type DayType = 'weekday' | 'weekend' | 'holiday';
export type RidePopularity = 'headliner' | 'popular' | 'moderate' | 'low';
export type RideCategory = 'thrill' | 'family' | 'kids' | 'show' | 'other';
export type BreakType = 'meal' | 'snack' | 'rest';

// Hourly wait time patterns
export interface HourlyPattern {
  hour: number;
  multiplier: number;
}

// Ride metadata for popularity classification
export interface RideMetadata {
  namePatterns: string[]; // Patterns to match ride names
  popularity: RidePopularity;
  category: RideCategory;
  duration: number; // Minutes for ride experience
  minHeight?: number; // Minimum height requirement in inches (null = no requirement)
}

// Prediction confidence level
export type PredictionConfidence = 'high' | 'medium' | 'low' | 'fallback';

// Prediction data source
export type PredictionSource = 'convex' | 'hardcoded' | 'blended';

// Ride with predictions
export interface RideWithPredictions {
  id: number | string;
  name: string;
  land?: string;
  isOpen: boolean;
  currentWaitTime: number | null;
  popularity: RidePopularity;
  category: RideCategory;
  duration: number;
  hourlyPredictions: number[]; // Predicted wait for each hour (9am-9pm)
  // New fields for Convex-powered predictions
  predictionConfidence?: PredictionConfidence;
  predictionSource?: PredictionSource;
}

// Prediction result
export interface PredictedWaitTime {
  rideId: number | string;
  rideName: string;
  hour: number;
  predictedWait: number;
  confidence: 'high' | 'medium' | 'low';
  isOptimalWindow: boolean;
  isPeakTime: boolean;
  reasoning: string;
}

// Break analysis result
export interface BreakAnalysis {
  shouldBreak: boolean;
  reason: string;
  breakType: BreakType;
  breakDuration: number; // minutes
  resumeAtHour: number;
  waitTimeSavings: number; // minutes saved by taking break
  suggestion: string;
}

// Scheduled break in itinerary
export interface ScheduledBreak {
  type: BreakType;
  startTime: string;
  endTime: string;
  duration: number;
  reason: string;
  suggestion: string;
  waitTimeSavings: number;
}

// Ride scoring breakdown
export interface RideScore {
  ride: RideWithPredictions;
  hour: number;
  totalScore: number;
  breakdown: {
    waitTimeScore: number;
    priorityScore: number;
    varietyScore: number;
    efficiencyScore: number;
    proximityScore: number;
    rideWeightScore?: number; // From ride weights data
  };
}

// Scheduled item (ride or break)
export interface ScheduleItem {
  time: string;
  type: 'ride' | 'break' | 'meal';
  name: string;
  expectedWait?: number;
  duration?: number;
  reasoning: string;
  ride?: RideWithPredictions;
  breakInfo?: ScheduledBreak;
}

// Optimized schedule result (single day)
export interface OptimizedSchedule {
  items: ScheduleItem[];
  totalWaitTime: number;
  totalWalkingTime: number;
  totalDuration: number;
  ridesScheduled: number;
  breaksScheduled: number;
  insights: string[];
  comparisonToBaseline: {
    waitTimeSaved: number;
    percentImprovement: number;
  };
}

// Single day schedule in multi-day plan
export interface DaySchedule {
  date: string;
  dayNumber: number;
  dayLabel: string;
  dayType: DayType;
  items: ScheduleItem[];
  totalWaitTime: number;
  totalWalkingTime: number;
  ridesScheduled: number;
  breaksScheduled: number;
  insights: string[];
}

// Multi-day optimized schedule
export interface MultiDaySchedule {
  days: DaySchedule[];
  totalWaitTime: number;
  totalRidesScheduled: number;
  overallInsights: string[];
  headlinerStrategy: string[]; // Explains which headliners on which days
  comparisonToBaseline: {
    waitTimeSaved: number;
    percentImprovement: number;
  };
}

// Ride assigned to a specific day with reasoning
export interface RideDayAssignment {
  ride: RideWithPredictions;
  assignedDay: number; // 1-based day number
  assignedDate: string;
  reason: string;
  predictedWaitOnDay: number;
  alternativeWaits: { day: number; wait: number }[];
}

// Input for schedule optimization
export interface OptimizationInput {
  selectedRides: Array<{
    id: number | string;
    name: string;
    land?: string;
    isOpen: boolean;
    waitTime: number | null;
  }>;
  preferences: {
    visitDate: string;
    numberOfDays?: number;
    arrivalTime: string;
    duration: 'half-day' | 'full-day';
    priority: 'thrill' | 'family' | 'shows' | 'balanced';
    includeBreaks: boolean;
    ropeDropMode?: boolean; // Optimize for rope drop strategy
    parkId?: number; // Queue-Times park ID for rope drop/entertainment data
    ropeDropTarget?: string; // User's selected ride to prioritize at rope drop
    selectedStrategy?: string; // User's selected rope drop strategy ID (e.g., 'headliner-rush')
    parkCloseHour?: number; // Park closing hour (e.g., 21 for 9 PM) - used to cap schedule
    skipFirstLastEnhancement?: boolean; // Skip "kick off your day" / "wrap up" messages (for park hopper)
  };
}

// Entertainment schedule item
export interface EntertainmentItem {
  type: 'fireworks' | 'parade' | 'show';
  name: string;
  time: string;
  duration: number; // minutes
  priority: 'must-see' | 'recommended' | 'optional';
  notes?: string;
}
