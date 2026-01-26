/**
 * Theme Park Schedule Optimizer - PlanWizard Adapter
 *
 * Bridges the gap between PlanWizard's current data format
 * and the new scheduler's input/output formats.
 */

import type { ConvexReactClient } from 'convex/react';
import type {
  SchedulerInput,
  SchedulerResult,
  ScheduledItem,
  RideWithPredictions,
  ParkHopperConfig,
  RopeDropConfig,
  SchedulerPreferences,
  ParkHours,
  Entertainment,
} from './types';
import type { DayType } from '../types';
import { createOptimizedScheduleAsync } from './scheduler';
import { formatMinutesToTime, parseTimeToMinutes } from './utils/timeUtils';
import { classifyDayType } from '../prediction/dayTypeClassifier';
import { predictRideWaitTimes, predictMultipleRidesWithHistory } from '../prediction/waitTimePredictor';

// =============================================================================
// LEGACY INPUT TYPES (from current PlanWizard)
// =============================================================================

export interface LegacyOptimizationInput {
  selectedRides: LegacyRide[];
  preferences: {
    visitDate: string;
    arrivalTime: string;
    duration: 'full-day' | 'half-day';
    priority: 'thrill' | 'family' | 'shows' | 'balanced';
    includeBreaks: boolean;
    ropeDropMode?: boolean;
    parkId?: number;
    ropeDropTarget?: string;
    ropeDropTargets?: string[]; // NEW: multiple targets
    parkCloseHour?: number;
    selectedStrategy?: string;
    skipFirstLastEnhancement?: boolean;
  };
  parkHopper?: {
    enabled: boolean;
    park1Id: number;
    park2Id: number;
    park1Name: string;
    park2Name: string;
    transitionTime: string;
    park1Rides: LegacyRide[];
    park2Rides: LegacyRide[];
  };
  entertainment?: LegacyEntertainment[];
}

export interface LegacyRide {
  id: number | string;
  name: string;
  land?: string;
  isOpen?: boolean;
  waitTime?: number | null;
  hourlyPredictions?: number[];
  popularity?: string;
  category?: string;
  duration?: number;
}

export interface LegacyEntertainment {
  id: string;
  name: string;
  category: string;
  showTimes?: Array<{ startTime: string; endTime?: string }>;
  duration?: number;
  location?: string;
}

// =============================================================================
// LEGACY OUTPUT TYPES (expected by current PlanWizard)
// =============================================================================

export interface LegacyOptimizedSchedule {
  items: LegacyScheduleItem[];
  insights: string[];
  totalWaitTime: number;
  ridesScheduled: number;
  headlinersAtOptimal?: number;
  overflow?: LegacyOverflowItem[];
}

export interface LegacyScheduleItem {
  time: string;
  type: 'ride' | 'break' | 'entertainment' | 'walk' | 'transition';
  name: string;
  expectedWait?: number;
  reasoning?: string;
  ride?: LegacyRide;
  land?: string;
  isReride?: boolean;
  breakInfo?: {
    type: string;
    duration: number;
  };
}

export interface LegacyOverflowItem {
  ride: LegacyRide;
  reason: string;
  suggestion: string;
}

// =============================================================================
// INPUT CONVERSION
// =============================================================================

/**
 * Convert legacy rides to new RideWithPredictions format
 * Uses Convex historical data when available for better predictions
 */
async function convertRidesAsync(
  legacyRides: LegacyRide[],
  visitDate: string,
  convex: ConvexReactClient | null
): Promise<RideWithPredictions[]> {
  // Check if any rides need predictions
  const ridesNeedingPredictions = legacyRides.filter(
    ride => !ride.hourlyPredictions || ride.hourlyPredictions.length === 0
  );

  // If we have convex and rides need predictions, use historical data
  let predictedRides: Map<number | string, RideWithPredictions> = new Map();

  if (convex && ridesNeedingPredictions.length > 0) {
    const predictions = await predictMultipleRidesWithHistory(
      convex,
      ridesNeedingPredictions.map(ride => ({
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.isOpen,
        waitTime: ride.waitTime,
      })),
      new Date(visitDate)
    );

    for (const pred of predictions) {
      predictedRides.set(pred.id, pred as RideWithPredictions);
    }
  }

  return legacyRides.map((ride) => {
    // If ride already has predictions, use them
    if (ride.hourlyPredictions && ride.hourlyPredictions.length > 0) {
      return {
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.isOpen,
        waitTime: ride.waitTime,
        popularity: (ride.popularity as any) || 'moderate',
        category: (ride.category as any) || 'family',
        duration: ride.duration || 5,
        hourlyPredictions: ride.hourlyPredictions,
      };
    }

    // Check if we got predictions from convex
    const convexPrediction = predictedRides.get(ride.id);
    if (convexPrediction) {
      return {
        ...convexPrediction,
        duration: ride.duration || convexPrediction.duration || 5,
      };
    }

    // Fall back to basic predictor
    const enriched = predictRideWaitTimes(
      {
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.isOpen,
        waitTime: ride.waitTime,
      },
      new Date(visitDate)
    );

    return {
      ...enriched,
      duration: ride.duration || enriched.duration || 5,
    };
  });
}

/**
 * Convert legacy entertainment to new format
 */
function convertEntertainment(
  legacyEntertainment?: LegacyEntertainment[]
): Entertainment[] {
  if (!legacyEntertainment) return [];

  return legacyEntertainment.map((ent) => ({
    id: ent.id,
    name: ent.name,
    category: ent.category as Entertainment['category'],
    showTimes: ent.showTimes,
    duration: ent.duration,
    location: ent.location,
  }));
}

/**
 * Build rope drop config from legacy preferences
 */
function buildRopeDropConfig(
  legacyPrefs: LegacyOptimizationInput['preferences'],
  rides: RideWithPredictions[]
): RopeDropConfig {
  if (!legacyPrefs.ropeDropMode) {
    return { enabled: false, targets: [] };
  }

  // Get targets - support both single and multiple
  const targetNames: string[] = [];

  if (legacyPrefs.ropeDropTargets && legacyPrefs.ropeDropTargets.length > 0) {
    targetNames.push(...legacyPrefs.ropeDropTargets);
  } else if (legacyPrefs.ropeDropTarget) {
    targetNames.push(legacyPrefs.ropeDropTarget);
  }

  // Find matching rides
  const targets: RideWithPredictions[] = [];

  for (const targetName of targetNames) {
    const normalizedTarget = targetName.toLowerCase();
    const matchingRide = rides.find((ride) => {
      const normalizedRide = ride.name.toLowerCase();
      return (
        normalizedRide === normalizedTarget ||
        normalizedRide.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedRide)
      );
    });

    if (matchingRide) {
      targets.push(matchingRide);
    }
  }

  return {
    enabled: targets.length > 0,
    targets,
  };
}

/**
 * Build park hopper config from legacy format
 */
async function buildParkHopperConfigAsync(
  legacyHopper: LegacyOptimizationInput['parkHopper'],
  visitDate: string,
  convex: ConvexReactClient | null
): Promise<ParkHopperConfig | undefined> {
  if (!legacyHopper?.enabled) {
    return undefined;
  }

  // Parse transition time to minutes
  const transitionMinutes = parseTimeToMinutes(legacyHopper.transitionTime);

  // Default eligibility (11 AM for Disneyland, 2 PM for WDW)
  const eligibilityTime = 660; // 11 AM default

  // Convert rides for both parks in parallel
  const [park1RidesRaw, park2RidesRaw] = await Promise.all([
    convertRidesAsync(legacyHopper.park1Rides, visitDate, convex),
    convertRidesAsync(legacyHopper.park2Rides, visitDate, convex),
  ]);

  // Set parkId on each ride so they get scheduled in the correct park's time blocks
  const park1Rides = park1RidesRaw.map(ride => ({
    ...ride,
    parkId: String(legacyHopper.park1Id),
  }));
  const park2Rides = park2RidesRaw.map(ride => ({
    ...ride,
    parkId: String(legacyHopper.park2Id),
  }));

  return {
    enabled: true,
    park1Id: String(legacyHopper.park1Id),
    park2Id: String(legacyHopper.park2Id),
    park1Name: legacyHopper.park1Name,
    park2Name: legacyHopper.park2Name,
    eligibilityTime,
    travelTime: 15, // Default travel time
    userTransitionTime: transitionMinutes,
    park1Rides,
    park2Rides,
  };
}

/**
 * Build park hopper config from legacy format (sync version)
 */
function buildParkHopperConfigSync(
  legacyHopper: LegacyOptimizationInput['parkHopper'],
  visitDate: string
): ParkHopperConfig | undefined {
  if (!legacyHopper?.enabled) {
    return undefined;
  }

  // Parse transition time to minutes
  const transitionMinutes = parseTimeToMinutes(legacyHopper.transitionTime);

  // Default eligibility (11 AM for Disneyland)
  const eligibilityTime = 660; // 11 AM default

  // Convert rides (sync, using basic predictor)
  const convertRidesSync = (rides: LegacyRide[]): RideWithPredictions[] => {
    return rides.map((ride) => {
      if (ride.hourlyPredictions && ride.hourlyPredictions.length > 0) {
        return {
          id: ride.id,
          name: ride.name,
          land: ride.land,
          isOpen: ride.isOpen,
          waitTime: ride.waitTime,
          popularity: (ride.popularity as any) || 'moderate',
          category: (ride.category as any) || 'family',
          duration: ride.duration || 5,
          hourlyPredictions: ride.hourlyPredictions,
        };
      }
      const enriched = predictRideWaitTimes(
        { id: ride.id, name: ride.name, land: ride.land, isOpen: ride.isOpen, waitTime: ride.waitTime },
        new Date(visitDate)
      );
      return { ...enriched, duration: ride.duration || enriched.duration || 5 };
    });
  };

  const park1RidesRaw = convertRidesSync(legacyHopper.park1Rides);
  const park2RidesRaw = convertRidesSync(legacyHopper.park2Rides);

  // Set parkId on each ride
  const park1Rides = park1RidesRaw.map(ride => ({
    ...ride,
    parkId: String(legacyHopper.park1Id),
  }));
  const park2Rides = park2RidesRaw.map(ride => ({
    ...ride,
    parkId: String(legacyHopper.park2Id),
  }));

  return {
    enabled: true,
    park1Id: String(legacyHopper.park1Id),
    park2Id: String(legacyHopper.park2Id),
    park1Name: legacyHopper.park1Name,
    park2Name: legacyHopper.park2Name,
    eligibilityTime,
    travelTime: 15, // Default travel time
    userTransitionTime: transitionMinutes,
    park1Rides,
    park2Rides,
  };
}

/**
 * Convert legacy input to new SchedulerInput format
 */
export async function convertToSchedulerInputAsync(
  legacy: LegacyOptimizationInput,
  convex: ConvexReactClient | null
): Promise<SchedulerInput> {
  const visitDate = legacy.preferences.visitDate;
  const dayType = classifyDayType(visitDate);

  // Convert rides with predictions using historical data when available
  const selectedRides = await convertRidesAsync(legacy.selectedRides, visitDate, convex);

  // Parse arrival time to determine park open hour
  // PlanWizard already converts 'rope-drop' to actual time like '8am' before passing here
  const arrivalTime = legacy.preferences.arrivalTime;
  let openHour = 9; // Default fallback

  // Try to parse the arrival time to get the opening hour
  const timeMatch = arrivalTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const isPM = timeMatch[3]?.toLowerCase() === 'pm';
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    openHour = hour;
  }

  const closeHour = legacy.preferences.parkCloseHour || 21;

  const parkHours: ParkHours = {
    openHour, // Use actual park opening time from arrival
    closeHour,
  };

  // Build preferences - pass through actual arrival time
  const preferences: SchedulerPreferences = {
    arrivalTime: arrivalTime,
    includeBreaks: legacy.preferences.includeBreaks,
    priority: legacy.preferences.priority,
    allowRerides: false, // Controlled by trip-level logic
  };

  // Build park hopper config first (so we can use rides with parkId set)
  const parkHopper = await buildParkHopperConfigAsync(legacy.parkHopper, visitDate, convex);

  // For park hopper mode, use the rides from parkHopper config (which have parkId set)
  // This ensures rides are scheduled in the correct park's time blocks
  const finalSelectedRides = parkHopper?.enabled
    ? [...parkHopper.park1Rides, ...parkHopper.park2Rides]
    : selectedRides;

  // Build rope drop config using the final rides
  const ropeDrop = buildRopeDropConfig(legacy.preferences, finalSelectedRides);

  return {
    selectedRides: finalSelectedRides,
    parkHours,
    entertainment: convertEntertainment(legacy.entertainment),
    preferences,
    ropeDrop,
    parkHopper,
    dayType,
    parkId: legacy.preferences.parkId ? String(legacy.preferences.parkId) : undefined,
  };
}

/**
 * Convert legacy input to new SchedulerInput format (sync version for backward compat)
 * @deprecated Use convertToSchedulerInputAsync for better predictions
 */
export function convertToSchedulerInput(
  legacy: LegacyOptimizationInput
): SchedulerInput {
  const visitDate = legacy.preferences.visitDate;
  const dayType = classifyDayType(visitDate);

  // Convert rides with predictions (sync, no historical data)
  const selectedRides = legacy.selectedRides.map((ride) => {
    if (ride.hourlyPredictions && ride.hourlyPredictions.length > 0) {
      return {
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.isOpen,
        waitTime: ride.waitTime,
        popularity: (ride.popularity as any) || 'moderate',
        category: (ride.category as any) || 'family',
        duration: ride.duration || 5,
        hourlyPredictions: ride.hourlyPredictions,
      };
    }
    const enriched = predictRideWaitTimes(
      { id: ride.id, name: ride.name, land: ride.land, isOpen: ride.isOpen, waitTime: ride.waitTime },
      new Date(visitDate)
    );
    return { ...enriched, duration: ride.duration || enriched.duration || 5 };
  });

  // Parse arrival time to get open hour
  const arrivalTime = legacy.preferences.arrivalTime;
  let openHour = 9;
  const timeMatch = arrivalTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const isPM = timeMatch[3]?.toLowerCase() === 'pm';
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    openHour = hour;
  }

  const closeHour = legacy.preferences.parkCloseHour || 21;
  const parkHours: ParkHours = { openHour, closeHour };
  const preferences: SchedulerPreferences = {
    arrivalTime: arrivalTime,
    includeBreaks: legacy.preferences.includeBreaks,
    priority: legacy.preferences.priority,
    allowRerides: false,
  };

  // Build park hopper config if enabled (sync version)
  const parkHopper = buildParkHopperConfigSync(legacy.parkHopper, visitDate);

  // For park hopper mode, use rides with parkId set
  const finalSelectedRides = parkHopper?.enabled
    ? [...parkHopper.park1Rides, ...parkHopper.park2Rides]
    : selectedRides;

  const ropeDrop = buildRopeDropConfig(legacy.preferences, finalSelectedRides);

  return {
    selectedRides: finalSelectedRides,
    parkHours,
    entertainment: convertEntertainment(legacy.entertainment),
    preferences,
    ropeDrop,
    parkHopper,
    dayType,
    parkId: legacy.preferences.parkId ? String(legacy.preferences.parkId) : undefined,
  };
}

// =============================================================================
// OUTPUT CONVERSION
// =============================================================================

/**
 * Convert new ScheduledItem to legacy format
 */
function convertScheduledItem(item: ScheduledItem): LegacyScheduleItem {
  return {
    time: formatMinutesToTime(item.scheduledTime),
    type: item.type,
    name: item.ride?.name || item.entertainment?.name || getItemName(item),
    expectedWait: item.expectedWait,
    reasoning: item.reasoning,
    ride: item.ride ? {
      id: item.ride.id,
      name: item.ride.name,
      land: item.ride.land,
      isOpen: item.ride.isOpen,
      waitTime: item.ride.waitTime,
      hourlyPredictions: item.ride.hourlyPredictions,
      popularity: item.ride.popularity,
      category: item.ride.category,
      duration: item.ride.duration,
    } : undefined,
    land: item.land,
    isReride: item.isReride,
    breakInfo: item.type === 'break' ? {
      type: 'meal',
      duration: item.duration,
    } : undefined,
  };
}

/**
 * Get display name for non-ride items
 */
function getItemName(item: ScheduledItem): string {
  switch (item.type) {
    case 'entertainment':
      return item.entertainment?.name || 'Entertainment';
    case 'break':
      return 'Break';
    case 'walk':
      return 'Walk';
    case 'transition':
      return 'Park Transition';
    default:
      return 'Item';
  }
}

/**
 * Convert new SchedulerResult to legacy format
 */
export function convertFromSchedulerResult(
  result: SchedulerResult
): LegacyOptimizedSchedule {
  return {
    items: result.items.map(convertScheduledItem),
    insights: result.insights,
    totalWaitTime: result.stats.totalWaitTime,
    ridesScheduled: result.stats.ridesScheduled,
    headlinersAtOptimal: result.stats.headlinersAtOptimal,
    overflow: result.overflow.map((item) => ({
      ride: {
        id: item.ride.id,
        name: item.ride.name,
        land: item.ride.land,
        hourlyPredictions: item.ride.hourlyPredictions,
        popularity: item.ride.popularity,
      },
      reason: item.reason,
      suggestion: item.suggestion,
    })),
  };
}

// =============================================================================
// MAIN ADAPTER FUNCTION
// =============================================================================

/**
 * Drop-in replacement for the legacy optimizeScheduleAsync function
 *
 * This adapter allows the new scheduler to be used with the existing
 * PlanWizard code without major refactoring.
 *
 * @param legacyInput - The legacy optimization input format
 * @param convex - Optional Convex client for historical predictions
 * @returns Promise resolving to legacy-format optimized schedule
 */
export async function optimizeScheduleWithNewScheduler(
  legacyInput: LegacyOptimizationInput,
  convex: ConvexReactClient | null = null
): Promise<LegacyOptimizedSchedule> {
  // Convert input using historical data when convex is available
  const schedulerInput = await convertToSchedulerInputAsync(legacyInput, convex);

  // Run new scheduler
  const result = await createOptimizedScheduleAsync(schedulerInput);

  // Convert output
  return convertFromSchedulerResult(result);
}

/**
 * Check if new scheduler should be used
 * Can be controlled via feature flag or preference
 */
export function shouldUseNewScheduler(): boolean {
  // For now, always use new scheduler
  // Could be controlled by localStorage flag or user preference
  if (typeof window !== 'undefined') {
    return localStorage.getItem('useNewScheduler') !== 'false';
  }
  return true;
}
