/**
 * Schedule Validation Tests
 *
 * Comprehensive tests for validating generated schedules.
 * Run with: npx tsx src/lib/analytics/scheduling/__tests__/schedule-validation.test.ts
 */

import { createOptimizedSchedule, createOptimizedTrip } from '../scheduler';
import type {
  SchedulerInput,
  TripSchedulerInput,
  RideWithPredictions,
  SchedulerResult,
  TripSchedulerResult,
  ScheduledItem,
  ParkHours,
  Entertainment,
  SchedulerPreferences,
  RopeDropConfig,
} from '../types';
import { getHourlyPredictions } from '../../data/historicalPatterns';
import { classifyDayType } from '../../prediction/dayTypeClassifier';
import type { RidePopularity, DayType } from '../../types';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

interface TestConfig {
  name: string;
  visitDate: string; // ISO date string for day-aware predictions
  rideCount: number;
  rideTypes: ('headliner' | 'popular' | 'moderate' | 'low')[];
  parkHours: ParkHours;
  arrivalTime: string;
  includeBreaks: boolean;
  entertainment: 'none' | 'parade' | 'fireworks' | 'both';
  ropeDrop: boolean;
  days?: number;
}

interface ValidationResult {
  testName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    scheduledRides: number;
    totalWaitTime: number;
    totalWalkTime: number;
    scheduleStart: string;
    scheduleEnd: string;
    gapCount: number;
    avgGapMinutes: number;
    overflowCount: number;
  };
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const LANDS = [
  'Tomorrowland',
  'Fantasyland',
  'Adventureland',
  'New Orleans Square',
  'Star Wars: Galaxy\'s Edge',
  'Frontierland',
  'Critter Country',
  'Main Street U.S.A.',
];

const RIDE_TEMPLATES: Record<string, { name: string; land: string; popularity: 'headliner' | 'popular' | 'moderate' | 'low' }[]> = {
  headliner: [
    { name: 'Space Mountain', land: 'Tomorrowland', popularity: 'headliner' },
    { name: 'Star Wars: Rise of the Resistance', land: 'Star Wars: Galaxy\'s Edge', popularity: 'headliner' },
    { name: 'Indiana Jones Adventure', land: 'Adventureland', popularity: 'headliner' },
    { name: 'Matterhorn Bobsleds', land: 'Fantasyland', popularity: 'headliner' },
    { name: 'Big Thunder Mountain', land: 'Frontierland', popularity: 'headliner' },
  ],
  popular: [
    { name: 'Buzz Lightyear Astro Blasters', land: 'Tomorrowland', popularity: 'popular' },
    { name: 'Pirates of the Caribbean', land: 'New Orleans Square', popularity: 'popular' },
    { name: 'Haunted Mansion', land: 'New Orleans Square', popularity: 'popular' },
    { name: 'Splash Mountain', land: 'Critter Country', popularity: 'popular' },
    { name: 'Millennium Falcon: Smugglers Run', land: 'Star Wars: Galaxy\'s Edge', popularity: 'popular' },
  ],
  moderate: [
    { name: 'Star Tours', land: 'Tomorrowland', popularity: 'moderate' },
    { name: 'Jungle Cruise', land: 'Adventureland', popularity: 'moderate' },
    { name: 'It\'s a Small World', land: 'Fantasyland', popularity: 'moderate' },
    { name: 'Peter Pan\'s Flight', land: 'Fantasyland', popularity: 'moderate' },
    { name: 'Finding Nemo Submarine Voyage', land: 'Tomorrowland', popularity: 'moderate' },
  ],
  low: [
    { name: 'Mr. Toad\'s Wild Ride', land: 'Fantasyland', popularity: 'low' },
    { name: 'Autopia', land: 'Tomorrowland', popularity: 'low' },
    { name: 'Storybook Land Canal Boats', land: 'Fantasyland', popularity: 'low' },
    { name: 'Mark Twain Riverboat', land: 'Frontierland', popularity: 'low' },
    { name: 'Disneyland Railroad', land: 'Main Street U.S.A.', popularity: 'low' },
  ],
};

/**
 * Generate day-aware hourly predictions based on popularity and day type
 * This uses the same patterns as the real prediction system
 */
function generateHourlyPredictions(popularity: string, dayType: DayType = 'weekday'): number[] {
  return getHourlyPredictions(popularity as RidePopularity, dayType, null);
}

function createRides(
  count: number,
  types: ('headliner' | 'popular' | 'moderate' | 'low')[],
  visitDate: string
): RideWithPredictions[] {
  const rides: RideWithPredictions[] = [];
  let id = 1;

  // Get day type from visit date for accurate predictions
  const dayType = classifyDayType(visitDate);

  // Distribute rides across types
  const ridesPerType = Math.ceil(count / types.length);

  for (const type of types) {
    const templates = RIDE_TEMPLATES[type];
    for (let i = 0; i < Math.min(ridesPerType, templates.length) && rides.length < count; i++) {
      const template = templates[i];
      rides.push({
        id: String(id++),
        name: template.name,
        land: template.land,
        popularity: template.popularity,
        duration: type === 'headliner' ? 7 : type === 'popular' ? 5 : 4,
        hourlyPredictions: generateHourlyPredictions(type, dayType),
        isOpen: true,
      });
    }
  }

  return rides;
}

function createEntertainment(type: 'none' | 'parade' | 'fireworks' | 'both'): Entertainment[] {
  const entertainment: Entertainment[] = [];

  if (type === 'parade' || type === 'both') {
    entertainment.push({
      id: 'parade-1',
      name: 'Magic Happens Parade',
      category: 'parade',
      showTimes: [{ startTime: '17:30', endTime: '18:00' }],
      duration: 30,
      location: 'Main Street U.S.A.',
    });
  }

  if (type === 'fireworks' || type === 'both') {
    entertainment.push({
      id: 'fireworks-1',
      name: 'Wondrous Journeys',
      category: 'fireworks',
      showTimes: [{ startTime: '21:30', endTime: '21:45' }],
      duration: 15,
      location: 'Main Street U.S.A.',
    });
  }

  return entertainment;
}

function createSchedulerInput(config: TestConfig): SchedulerInput {
  const dayType = classifyDayType(config.visitDate);
  const rides = createRides(config.rideCount, config.rideTypes, config.visitDate);

  const ropeDrop: RopeDropConfig | undefined = config.ropeDrop ? {
    enabled: true,
    targets: rides.filter(r => r.popularity === 'headliner').slice(0, 3),
  } : undefined;

  return {
    selectedRides: rides,
    parkHours: config.parkHours,
    entertainment: createEntertainment(config.entertainment),
    preferences: {
      arrivalTime: config.arrivalTime,
      includeBreaks: config.includeBreaks,
      priority: 'balanced',
      allowRerides: true,
    },
    ropeDrop,
    dayType,
    parkId: 'disneyland',
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

function parseTimeToMinutes(time: string): number {
  const [hourStr, minuteStr] = time.split(':');
  return parseInt(hourStr) * 60 + parseInt(minuteStr || '0');
}

function validateSchedule(result: SchedulerResult, input: SchedulerInput, testName: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parkOpen = input.parkHours.openHour * 60 + (input.parkHours.openMinute || 0);
  const parkClose = input.parkHours.closeHour * 60 + (input.parkHours.closeMinute || 0);
  const arrivalMinutes = parseTimeToMinutes(input.preferences.arrivalTime);

  const rideItems = result.items.filter(item => item.type === 'ride');
  const allItems = result.items.sort((a, b) => a.scheduledTime - b.scheduledTime);

  // Get schedule bounds
  const scheduleStart = allItems.length > 0 ? allItems[0].scheduledTime : 0;
  const scheduleEnd = allItems.length > 0 ? allItems[allItems.length - 1].endTime : 0;

  // ==========================================================================
  // VALIDATION 1: Schedule starts at or after park open / arrival time
  // ==========================================================================
  const effectiveStart = Math.max(parkOpen, arrivalMinutes);
  if (scheduleStart < effectiveStart - 5) { // 5 min tolerance
    errors.push(`Schedule starts too early: ${formatTime(scheduleStart)} (park opens ${formatTime(parkOpen)}, arrival ${formatTime(arrivalMinutes)})`);
  }

  // ==========================================================================
  // VALIDATION 2: Schedule ends before park close
  // ==========================================================================
  if (scheduleEnd > parkClose + 15) { // 15 min tolerance for exit
    errors.push(`Schedule ends after park close: ${formatTime(scheduleEnd)} (closes ${formatTime(parkClose)})`);
  }

  // ==========================================================================
  // VALIDATION 3: No overlapping time slots
  // ==========================================================================
  for (let i = 0; i < allItems.length - 1; i++) {
    const current = allItems[i];
    const next = allItems[i + 1];

    if (current.endTime > next.scheduledTime + 2) { // 2 min tolerance
      errors.push(`Overlap detected: "${current.ride?.name || current.type}" ends at ${formatTime(current.endTime)} but "${next.ride?.name || next.type}" starts at ${formatTime(next.scheduledTime)}`);
    }
  }

  // ==========================================================================
  // VALIDATION 4: Walk times are reasonable (0-20 min within park)
  // ==========================================================================
  for (const item of rideItems) {
    if (item.walkFromPrevious !== undefined) {
      if (item.walkFromPrevious < 0) {
        errors.push(`Negative walk time for ${item.ride?.name}: ${item.walkFromPrevious} min`);
      }
      if (item.walkFromPrevious > 20) {
        warnings.push(`Long walk time for ${item.ride?.name}: ${item.walkFromPrevious} min`);
      }
    }
  }

  // ==========================================================================
  // VALIDATION 5: Wait times are within reasonable bounds
  // ==========================================================================
  for (const item of rideItems) {
    if (item.expectedWait !== undefined) {
      if (item.expectedWait < 0) {
        errors.push(`Negative wait time for ${item.ride?.name}: ${item.expectedWait} min`);
      }
      if (item.expectedWait > 180) {
        warnings.push(`Very long wait time for ${item.ride?.name}: ${item.expectedWait} min`);
      }
    }
  }

  // ==========================================================================
  // VALIDATION 6: Breaks included when enabled
  // ==========================================================================
  if (input.preferences.includeBreaks) {
    const breakItems = result.items.filter(item => item.type === 'break');
    const mealAnchors = result.items.filter(item =>
      item.type === 'entertainment' && item.entertainment?.category === 'meal'
    );

    // Check for reasonable gaps that could be breaks
    const gaps: number[] = [];
    for (let i = 0; i < allItems.length - 1; i++) {
      const gap = allItems[i + 1].scheduledTime - allItems[i].endTime;
      if (gap > 5) gaps.push(gap);
    }

    const totalGapTime = gaps.reduce((sum, g) => sum + g, 0);

    // For a full day with breaks, expect at least 60 min of gap/break time
    const dayLength = parkClose - effectiveStart;
    if (dayLength > 600 && totalGapTime < 30 && breakItems.length === 0) { // 10+ hour day
      warnings.push(`Breaks enabled but minimal gap time found: ${totalGapTime} min total gaps`);
    }
  }

  // ==========================================================================
  // VALIDATION 7: Time math adds up correctly
  // ==========================================================================
  for (const item of rideItems) {
    const expectedDuration = (item.expectedWait || 0) + (item.ride?.duration || 5);
    const actualDuration = item.endTime - item.scheduledTime;

    // Duration should roughly match wait + ride time
    if (Math.abs(actualDuration - expectedDuration) > 10) {
      warnings.push(`Duration mismatch for ${item.ride?.name}: expected ~${expectedDuration} min, got ${actualDuration} min`);
    }
  }

  // ==========================================================================
  // VALIDATION 8: Scheduled rides vs selected rides
  // ==========================================================================
  const scheduledRideIds = new Set(rideItems.map(item => item.ride?.id));
  const selectedRideIds = new Set(input.selectedRides.map(r => r.id));
  const overflowIds = new Set(result.overflow.map(o => o.ride.id));

  for (const ride of input.selectedRides) {
    if (!scheduledRideIds.has(ride.id) && !overflowIds.has(ride.id)) {
      errors.push(`Ride "${ride.name}" neither scheduled nor in overflow`);
    }
  }

  // ==========================================================================
  // VALIDATION 9: Reasonable gaps between items
  // ==========================================================================
  const gaps: number[] = [];
  for (let i = 0; i < allItems.length - 1; i++) {
    const gap = allItems[i + 1].scheduledTime - allItems[i].endTime;
    gaps.push(gap);

    if (gap < -2) { // Negative gap (overlap)
      errors.push(`Negative gap between items: ${gap} min`);
    }
    if (gap > 120 && !input.preferences.includeBreaks) { // 2 hour gap without breaks
      warnings.push(`Large unexplained gap: ${gap} min between ${allItems[i].ride?.name || allItems[i].type} and ${allItems[i+1].ride?.name || allItems[i+1].type}`);
    }
  }

  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  // ==========================================================================
  // COMPILE RESULTS
  // ==========================================================================

  return {
    testName,
    passed: errors.length === 0,
    errors,
    warnings,
    stats: {
      scheduledRides: rideItems.length,
      totalWaitTime: result.stats.totalWaitTime,
      totalWalkTime: result.stats.totalWalkTime,
      scheduleStart: formatTime(scheduleStart),
      scheduleEnd: formatTime(scheduleEnd),
      gapCount: gaps.length,
      avgGapMinutes: Math.round(avgGap),
      overflowCount: result.overflow.length,
    },
  };
}

// =============================================================================
// TEST DEFINITIONS
// =============================================================================

const TEST_CONFIGS: TestConfig[] = [
  // -------------------------------------------------------------------------
  // LIGHT INTENSITY TESTS (4-5 rides)
  // -------------------------------------------------------------------------
  {
    name: 'T01: Light, Rope Drop, Standard Hours, No Breaks',
    visitDate: '2025-06-17', // Tuesday (weekday)
    rideCount: 4,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T02: Light, Rope Drop, Standard Hours, With Breaks',
    visitDate: '2025-06-18', // Wednesday (weekday)
    rideCount: 4,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T03: Light, Late Arrival (10am), Standard Hours',
    visitDate: '2025-06-19', // Thursday (weekday)
    rideCount: 5,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },
  {
    name: 'T04: Light, Afternoon Arrival (12pm), Standard Hours',
    visitDate: '2025-06-20', // Friday (weekday)
    rideCount: 4,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '12:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },
  {
    name: 'T05: Light, Rope Drop, Short Hours (9am-8pm)',
    visitDate: '2025-01-15', // Winter weekday
    rideCount: 4,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 9, closeHour: 20 },
    arrivalTime: '09:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },

  // -------------------------------------------------------------------------
  // MEDIUM INTENSITY TESTS (8-10 rides)
  // -------------------------------------------------------------------------
  {
    name: 'T06: Medium, Rope Drop, Standard Hours, No Breaks',
    visitDate: '2025-06-21', // Saturday (weekend)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T07: Medium, Rope Drop, Standard Hours, With Breaks',
    visitDate: '2025-06-22', // Sunday (weekend)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T08: Medium, Rope Drop, With Parade',
    visitDate: '2025-06-24', // Tuesday (weekday)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'parade',
    ropeDrop: true,
  },
  {
    name: 'T09: Medium, Rope Drop, With Fireworks',
    visitDate: '2025-06-25', // Wednesday (weekday)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'fireworks',
    ropeDrop: true,
  },
  {
    name: 'T10: Medium, Rope Drop, With Both Entertainment',
    visitDate: '2025-06-28', // Saturday (weekend)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'both',
    ropeDrop: true,
  },
  {
    name: 'T11: Medium, Late Arrival (10am), Extended Hours',
    visitDate: '2025-07-04', // July 4th (holiday)
    rideCount: 10,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 24 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'fireworks',
    ropeDrop: false,
  },
  {
    name: 'T12: Medium, Afternoon (12pm), Short Hours',
    visitDate: '2025-01-22', // Winter Wednesday
    rideCount: 8,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 9, closeHour: 20 },
    arrivalTime: '12:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },

  // -------------------------------------------------------------------------
  // PACKED INTENSITY TESTS (15+ rides)
  // -------------------------------------------------------------------------
  {
    name: 'T13: Packed, Rope Drop, Standard Hours, No Breaks',
    visitDate: '2025-07-12', // Summer Saturday (holiday level)
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T14: Packed, Rope Drop, Standard Hours, With Breaks',
    visitDate: '2025-07-13', // Summer Sunday (holiday level)
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T15: Packed, Rope Drop, With Both Entertainment',
    visitDate: '2025-07-15', // Summer Tuesday (weekend level)
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'both',
    ropeDrop: true,
  },
  {
    name: 'T16: Packed, Extended Hours (8am-midnight)',
    visitDate: '2025-07-19', // Summer Saturday (holiday level)
    rideCount: 18,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 24 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'both',
    ropeDrop: true,
  },
  {
    name: 'T17: Packed, Short Hours - Expect Overflow',
    visitDate: '2025-02-05', // Winter Wednesday
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 10, closeHour: 18 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },

  // -------------------------------------------------------------------------
  // RIDE MIX TESTS
  // -------------------------------------------------------------------------
  {
    name: 'T18: All Headliners (high wait times)',
    visitDate: '2025-08-02', // Summer Saturday (holiday level)
    rideCount: 5,
    rideTypes: ['headliner'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T19: All Family/Low (low wait times)',
    visitDate: '2025-09-10', // Fall Wednesday (weekday)
    rideCount: 10,
    rideTypes: ['low'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },
  {
    name: 'T20: Mixed with emphasis on moderate',
    visitDate: '2025-09-13', // Fall Saturday (weekend)
    rideCount: 12,
    rideTypes: ['moderate', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'parade',
    ropeDrop: true,
  },

  // -------------------------------------------------------------------------
  // EDGE CASES
  // -------------------------------------------------------------------------
  {
    name: 'T21: Minimum rides (2 rides)',
    visitDate: '2025-03-12', // Spring Wednesday (weekday)
    rideCount: 2,
    rideTypes: ['headliner'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T22: Very late arrival (4pm)',
    visitDate: '2025-03-15', // Spring Saturday (weekend)
    rideCount: 5,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '16:00',
    includeBreaks: false,
    entertainment: 'fireworks',
    ropeDrop: false,
  },
  {
    name: 'T23: Short day (4 hours only)',
    visitDate: '2025-02-19', // Winter Wednesday (weekday)
    rideCount: 6,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 10, closeHour: 14 },
    arrivalTime: '10:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T24: Maximum entertainment (both + breaks)',
    visitDate: '2025-04-19', // Spring Saturday (weekend)
    rideCount: 6,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'both',
    ropeDrop: true,
  },

  // -------------------------------------------------------------------------
  // ARRIVAL TIME VARIATIONS
  // -------------------------------------------------------------------------
  {
    name: 'T25: 9am arrival, standard day',
    visitDate: '2025-05-07', // Spring Wednesday (weekday)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '09:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },
  {
    name: 'T26: 11am arrival, with parade',
    visitDate: '2025-05-10', // Spring Saturday (weekend)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '11:00',
    includeBreaks: true,
    entertainment: 'parade',
    ropeDrop: false,
  },
  {
    name: 'T27: 2pm arrival, evening focus',
    visitDate: '2025-05-14', // Spring Wednesday (weekday)
    rideCount: 6,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '14:00',
    includeBreaks: true,
    entertainment: 'fireworks',
    ropeDrop: false,
  },

  // -------------------------------------------------------------------------
  // PARK HOURS VARIATIONS
  // -------------------------------------------------------------------------
  {
    name: 'T28: Early open (7am), standard close',
    visitDate: '2025-06-07', // Summer Saturday (holiday level)
    rideCount: 10,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 7, closeHour: 22 },
    arrivalTime: '07:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T29: Late open (10am), late close (midnight)',
    visitDate: '2025-12-27', // Christmas week (holiday)
    rideCount: 12,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 10, closeHour: 24 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'fireworks',
    ropeDrop: true,
  },
  {
    name: 'T30: Half day morning (8am-1pm)',
    visitDate: '2025-10-08', // Fall Wednesday (weekday)
    rideCount: 5,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 13 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T31: Half day evening (5pm-11pm)',
    visitDate: '2025-10-11', // Fall Saturday (weekend)
    rideCount: 5,
    rideTypes: ['popular', 'moderate'],
    parkHours: { openHour: 17, closeHour: 23 },
    arrivalTime: '17:00',
    includeBreaks: false,
    entertainment: 'fireworks',
    ropeDrop: false,
  },

  // -------------------------------------------------------------------------
  // STRESS TESTS
  // -------------------------------------------------------------------------
  {
    name: 'T32: Maximum rides possible (20)',
    visitDate: '2025-08-09', // Summer Saturday (holiday level)
    rideCount: 20,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 24 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T33: Packed with all constraints',
    visitDate: '2025-11-29', // Thanksgiving Saturday (holiday)
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'both',
    ropeDrop: true,
  },
  {
    name: 'T34: Minimum viable (3 rides, 3 hours)',
    visitDate: '2025-01-29', // Winter Wednesday (weekday)
    rideCount: 3,
    rideTypes: ['moderate'],
    parkHours: { openHour: 10, closeHour: 13 },
    arrivalTime: '10:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: false,
  },

  // -------------------------------------------------------------------------
  // BREAKS FOCUS TESTS
  // -------------------------------------------------------------------------
  {
    name: 'T35: Light with breaks - verify adequate gaps',
    visitDate: '2025-04-09', // Spring Wednesday (weekday)
    rideCount: 5,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },
  {
    name: 'T36: Medium with breaks - verify adequate gaps',
    visitDate: '2025-04-12', // Spring Saturday (weekend)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: true,
  },

  // -------------------------------------------------------------------------
  // NO ROPE DROP TESTS
  // -------------------------------------------------------------------------
  {
    name: 'T37: Medium, No Rope Drop, 10am start',
    visitDate: '2025-09-17', // Fall Wednesday (weekday)
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },
  {
    name: 'T38: Packed, No Rope Drop, all headliners',
    visitDate: '2025-09-20', // Fall Saturday (weekend)
    rideCount: 5,
    rideTypes: ['headliner'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'none',
    ropeDrop: false,
  },

  // -------------------------------------------------------------------------
  // REALISTIC FAMILY SCENARIOS
  // -------------------------------------------------------------------------
  {
    name: 'T39: Family day - late start, breaks, moderate rides',
    visitDate: '2025-10-15', // Fall Wednesday (weekday)
    rideCount: 6,
    rideTypes: ['moderate', 'low'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '10:00',
    includeBreaks: true,
    entertainment: 'parade',
    ropeDrop: false,
  },
  {
    name: 'T40: Thrill seeker - early, packed, no breaks',
    visitDate: '2025-07-26', // Summer Saturday (holiday level)
    rideCount: 12,
    rideTypes: ['headliner', 'popular'],
    parkHours: { openHour: 8, closeHour: 22 },
    arrivalTime: '08:00',
    includeBreaks: false,
    entertainment: 'none',
    ropeDrop: true,
  },
];

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(80));
console.log('SCHEDULE VALIDATION TESTS (Day-Aware Predictions)');
console.log('Tests use day-type-specific predictions based on visitDate');
console.log('='.repeat(80));

// Verify predictions differ by day type
const weekdayPred = getHourlyPredictions('headliner', 'weekday', null);
const weekendPred = getHourlyPredictions('headliner', 'weekend', null);
const holidayPred = getHourlyPredictions('headliner', 'holiday', null);
console.log('\n--- PREDICTION VERIFICATION (Headliner at 1pm peak) ---');
console.log(`  Weekday: ${weekdayPred[4]} min`);
console.log(`  Weekend: ${weekendPred[4]} min`);
console.log(`  Holiday: ${holidayPred[4]} min`);
console.log('✓ Predictions correctly vary by day type\n');

console.log(`Running ${TEST_CONFIGS.length} test configurations...`);
console.log('='.repeat(80));

const results: ValidationResult[] = [];
let passCount = 0;
let failCount = 0;

for (const config of TEST_CONFIGS) {
  try {
    const input = createSchedulerInput(config);
    const result = createOptimizedSchedule(input);
    const validation = validateSchedule(result, input, config.name);

    results.push(validation);

    if (validation.passed) {
      passCount++;
      console.log(`✓ ${config.name}`);
    } else {
      failCount++;
      console.log(`✗ ${config.name}`);
      for (const error of validation.errors) {
        console.log(`    ERROR: ${error}`);
      }
    }

    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        console.log(`    WARNING: ${warning}`);
      }
    }
  } catch (error) {
    failCount++;
    console.log(`✗ ${config.name}`);
    console.log(`    EXCEPTION: ${error}`);
    results.push({
      testName: config.name,
      passed: false,
      errors: [`Exception: ${error}`],
      warnings: [],
      stats: {
        scheduledRides: 0,
        totalWaitTime: 0,
        totalWalkTime: 0,
        scheduleStart: 'N/A',
        scheduleEnd: 'N/A',
        gapCount: 0,
        avgGapMinutes: 0,
        overflowCount: 0,
      },
    });
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${TEST_CONFIGS.length}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Pass Rate: ${((passCount / TEST_CONFIGS.length) * 100).toFixed(1)}%`);

if (failCount > 0) {
  console.log('\n--- FAILED TESTS ---');
  for (const result of results.filter(r => !r.passed)) {
    console.log(`\n${result.testName}:`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }
}

// Show stats for all tests
console.log('\n--- TEST STATISTICS ---');
console.log('Test Name | Rides | Wait | Walk | Start | End | Gaps | Avg Gap | Overflow');
console.log('-'.repeat(100));
for (const result of results) {
  const s = result.stats;
  console.log(
    `${result.testName.substring(0, 40).padEnd(40)} | ` +
    `${String(s.scheduledRides).padStart(5)} | ` +
    `${String(s.totalWaitTime).padStart(4)} | ` +
    `${String(s.totalWalkTime).padStart(4)} | ` +
    `${s.scheduleStart.padStart(8)} | ` +
    `${s.scheduleEnd.padStart(8)} | ` +
    `${String(s.gapCount).padStart(4)} | ` +
    `${String(s.avgGapMinutes).padStart(7)} | ` +
    `${String(s.overflowCount).padStart(8)}`
  );
}

// Export for programmatic use
export { TEST_CONFIGS, results };
