/**
 * Multi-Day Trip Validation Tests
 *
 * Tests for validating multi-day trip scheduling, distribution, and re-rides.
 * Run with: npx tsx src/lib/analytics/scheduling/__tests__/multi-day-validation.test.ts
 */

import { createOptimizedTrip } from '../scheduler';
import type {
  TripSchedulerInput,
  TripSchedulerResult,
  RideWithPredictions,
  SchedulerInput,
  ScheduledItem,
} from '../types';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

interface MultiDayTestConfig {
  name: string;
  days: number;
  rideCount: number;
  rideTypes: ('headliner' | 'popular' | 'moderate' | 'low')[];
  allowRerides: boolean;
  arrivalTimes: string[]; // One per day
  includeBreaks: boolean;
}

interface MultiDayValidationResult {
  testName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  dayStats: Array<{
    day: number;
    scheduledRides: number;
    rerides: number;
    uniqueRides: string[];
    scheduleStart: string;
    scheduleEnd: string;
    totalWait: number;
  }>;
  tripStats: {
    totalDays: number;
    totalRidesScheduled: number;
    totalRerides: number;
    allUserRidesScheduled: boolean;
    uniqueRidesAcrossTrip: number;
    rideDistribution: string; // e.g., "4/3/2" for 3 days
  };
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

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

function generateHourlyPredictions(popularity: string): number[] {
  const baseWaits: Record<string, number[]> = {
    headliner: [45, 55, 70, 85, 95, 100, 105, 100, 90, 75, 60, 50, 40],
    popular: [25, 35, 45, 55, 60, 65, 70, 65, 55, 45, 35, 25, 20],
    moderate: [15, 20, 30, 40, 45, 50, 55, 50, 40, 30, 20, 15, 10],
    low: [5, 10, 15, 20, 25, 30, 35, 30, 25, 15, 10, 5, 5],
  };
  return baseWaits[popularity] || baseWaits.moderate;
}

function createRides(count: number, types: ('headliner' | 'popular' | 'moderate' | 'low')[]): RideWithPredictions[] {
  const rides: RideWithPredictions[] = [];
  let id = 1;

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
        hourlyPredictions: generateHourlyPredictions(type),
        isOpen: true,
      });
    }
  }

  return rides;
}

function createTripInput(config: MultiDayTestConfig): TripSchedulerInput {
  const allRides = createRides(config.rideCount, config.rideTypes);

  const days: Array<{ date: Date; input: SchedulerInput }> = [];

  for (let i = 0; i < config.days; i++) {
    const date = new Date(2026, 0, 27 + i); // Jan 27, 28, 29...
    const arrivalTime = config.arrivalTimes[i] || config.arrivalTimes[0] || '08:00';

    days.push({
      date,
      input: {
        selectedRides: [], // Will be populated by distributor
        parkHours: { openHour: 8, closeHour: 22 },
        entertainment: [],
        preferences: {
          arrivalTime,
          includeBreaks: config.includeBreaks,
          priority: 'balanced',
          allowRerides: config.allowRerides,
        },
        ropeDrop: arrivalTime === '08:00' ? {
          enabled: true,
          targets: allRides.filter(r => r.popularity === 'headliner').slice(0, 3),
        } : undefined,
        dayType: 'weekday',
        parkId: 'disneyland',
      },
    });
  }

  return {
    days,
    allSelectedRides: allRides,
    allowRerides: config.allowRerides,
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

function validateMultiDayTrip(result: TripSchedulerResult, input: TripSchedulerInput, testName: string): MultiDayValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dayStats: MultiDayValidationResult['dayStats'] = [];

  // Track all scheduled ride IDs across trip
  const allScheduledRideIds = new Set<string>();
  const selectedRideIds = new Set(input.allSelectedRides.map(r => String(r.id)));
  let totalRerides = 0;

  // ==========================================================================
  // PER-DAY VALIDATION
  // ==========================================================================

  for (let dayIndex = 0; dayIndex < result.days.length; dayIndex++) {
    const dayResult = result.days[dayIndex];
    const rideItems = dayResult.result.items.filter(item => item.type === 'ride');

    const uniqueRides: string[] = [];
    let dayRerides = 0;

    for (const item of rideItems) {
      if (item.ride) {
        const rideId = String(item.ride.id);

        if (item.isReride) {
          dayRerides++;
          totalRerides++;
        } else {
          uniqueRides.push(item.ride.name);
          allScheduledRideIds.add(rideId);
        }
      }
    }

    // Get schedule bounds
    const allItems = dayResult.result.items.sort((a, b) => a.scheduledTime - b.scheduledTime);
    const scheduleStart = allItems.length > 0 ? allItems[0].scheduledTime : 0;
    const scheduleEnd = allItems.length > 0 ? allItems[allItems.length - 1].endTime : 0;

    dayStats.push({
      day: dayIndex + 1,
      scheduledRides: rideItems.length,
      rerides: dayRerides,
      uniqueRides,
      scheduleStart: formatTime(scheduleStart),
      scheduleEnd: formatTime(scheduleEnd),
      totalWait: dayResult.result.stats.totalWaitTime,
    });

    // Check for overlaps
    for (let i = 0; i < allItems.length - 1; i++) {
      const current = allItems[i];
      const next = allItems[i + 1];

      if (current.endTime > next.scheduledTime + 2) {
        errors.push(`Day ${dayIndex + 1}: Overlap - "${current.ride?.name || current.type}" ends after "${next.ride?.name || next.type}" starts`);
      }
    }
  }

  // ==========================================================================
  // TRIP-WIDE VALIDATION
  // ==========================================================================

  // Check all user rides are scheduled
  for (const ride of input.allSelectedRides) {
    if (!allScheduledRideIds.has(String(ride.id))) {
      const inOverflow = result.days.some(d =>
        d.result.overflow.some(o => String(o.ride.id) === String(ride.id))
      );

      if (!inOverflow) {
        errors.push(`Ride "${ride.name}" neither scheduled nor in overflow`);
      }
    }
  }

  // Check re-rides only appear after all selections scheduled
  if (totalRerides > 0 && !result.tripStats.allUserRidesScheduled) {
    errors.push(`Re-rides scheduled (${totalRerides}) but not all user rides were scheduled first`);
  }

  // Check distribution balance
  const rideDistribution = dayStats.map(d => d.uniqueRides.length).join('/');
  const maxRidesOnDay = Math.max(...dayStats.map(d => d.uniqueRides.length));
  const minRidesOnDay = Math.min(...dayStats.map(d => d.uniqueRides.length));

  if (maxRidesOnDay > minRidesOnDay * 2 && input.allSelectedRides.length > input.days.length * 2) {
    warnings.push(`Unbalanced distribution: ${rideDistribution} (max ${maxRidesOnDay}, min ${minRidesOnDay})`);
  }

  // ==========================================================================
  // RERIDE LOGIC VALIDATION
  // ==========================================================================

  if (input.allowRerides) {
    // If all rides scheduled and light day, expect re-rides
    const avgRidesPerDay = input.allSelectedRides.length / input.days.length;

    if (avgRidesPerDay < 5 && totalRerides === 0) {
      warnings.push(`Light trip (${avgRidesPerDay.toFixed(1)} rides/day) with re-rides enabled but no re-rides scheduled`);
    }
  }

  // ==========================================================================
  // COMPILE RESULTS
  // ==========================================================================

  return {
    testName,
    passed: errors.length === 0,
    errors,
    warnings,
    dayStats,
    tripStats: {
      totalDays: result.days.length,
      totalRidesScheduled: result.tripStats.totalRidesScheduled,
      totalRerides: totalRerides,
      allUserRidesScheduled: result.tripStats.allUserRidesScheduled,
      uniqueRidesAcrossTrip: allScheduledRideIds.size,
      rideDistribution,
    },
  };
}

// =============================================================================
// TEST DEFINITIONS
// =============================================================================

const TEST_CONFIGS: MultiDayTestConfig[] = [
  // -------------------------------------------------------------------------
  // 2-DAY TESTS
  // -------------------------------------------------------------------------
  {
    name: 'MD01: 2 Days, Light (4 rides), With Rerides',
    days: 2,
    rideCount: 4,
    rideTypes: ['headliner', 'popular'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD02: 2 Days, Light (4 rides), No Rerides',
    days: 2,
    rideCount: 4,
    rideTypes: ['headliner', 'popular'],
    allowRerides: false,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD03: 2 Days, Medium (8 rides), With Rerides',
    days: 2,
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD04: 2 Days, Medium (8 rides), No Rerides',
    days: 2,
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    allowRerides: false,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD05: 2 Days, Packed (15 rides)',
    days: 2,
    rideCount: 15,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD06: 2 Days, Different Arrival Times',
    days: 2,
    rideCount: 8,
    rideTypes: ['headliner', 'popular', 'moderate'],
    allowRerides: true,
    arrivalTimes: ['08:00', '10:00'],
    includeBreaks: true,
  },
  {
    name: 'MD07: 2 Days, All Headliners',
    days: 2,
    rideCount: 5,
    rideTypes: ['headliner'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD08: 2 Days, All Family/Low Rides',
    days: 2,
    rideCount: 8,
    rideTypes: ['low'],
    allowRerides: true,
    arrivalTimes: ['10:00', '10:00'],
    includeBreaks: true,
  },

  // -------------------------------------------------------------------------
  // 3-DAY TESTS
  // -------------------------------------------------------------------------
  {
    name: 'MD09: 3 Days, Light (6 rides), With Rerides',
    days: 3,
    rideCount: 6,
    rideTypes: ['headliner', 'popular'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD10: 3 Days, Medium (12 rides)',
    days: 3,
    rideCount: 12,
    rideTypes: ['headliner', 'popular', 'moderate'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD11: 3 Days, Packed (18 rides)',
    days: 3,
    rideCount: 18,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD12: 3 Days, Varying Arrival Times',
    days: 3,
    rideCount: 10,
    rideTypes: ['headliner', 'popular', 'moderate'],
    allowRerides: true,
    arrivalTimes: ['08:00', '10:00', '12:00'],
    includeBreaks: true,
  },

  // -------------------------------------------------------------------------
  // EDGE CASES
  // -------------------------------------------------------------------------
  {
    name: 'MD13: 2 Days, Minimum (2 rides)',
    days: 2,
    rideCount: 2,
    rideTypes: ['headliner'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD14: 3 Days, Minimum (3 rides)',
    days: 3,
    rideCount: 3,
    rideTypes: ['headliner'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00', '08:00'],
    includeBreaks: true,
  },
  {
    name: 'MD15: 2 Days, More Rides Than Fit (20 rides)',
    days: 2,
    rideCount: 20,
    rideTypes: ['headliner', 'popular', 'moderate', 'low'],
    allowRerides: false,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },

  // -------------------------------------------------------------------------
  // FAMILY SCENARIOS
  // -------------------------------------------------------------------------
  {
    name: 'MD16: 2 Days, Family Trip (moderate, late start)',
    days: 2,
    rideCount: 6,
    rideTypes: ['moderate', 'low'],
    allowRerides: true,
    arrivalTimes: ['10:00', '10:00'],
    includeBreaks: true,
  },
  {
    name: 'MD17: 3 Days, Family Trip with Mixed Schedule',
    days: 3,
    rideCount: 9,
    rideTypes: ['popular', 'moderate', 'low'],
    allowRerides: true,
    arrivalTimes: ['10:00', '09:00', '11:00'],
    includeBreaks: true,
  },

  // -------------------------------------------------------------------------
  // THRILL SEEKER SCENARIOS
  // -------------------------------------------------------------------------
  {
    name: 'MD18: 2 Days, Thrill Seeker (no breaks)',
    days: 2,
    rideCount: 10,
    rideTypes: ['headliner', 'popular'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: false,
  },
  {
    name: 'MD19: 3 Days, Thrill Seeker Marathon',
    days: 3,
    rideCount: 15,
    rideTypes: ['headliner', 'popular'],
    allowRerides: true,
    arrivalTimes: ['08:00', '08:00', '08:00'],
    includeBreaks: false,
  },

  // -------------------------------------------------------------------------
  // DISTRIBUTION TESTS
  // -------------------------------------------------------------------------
  {
    name: 'MD20: 2 Days, Exactly 2 Rides (1 per day expected)',
    days: 2,
    rideCount: 2,
    rideTypes: ['headliner'],
    allowRerides: false,
    arrivalTimes: ['08:00', '08:00'],
    includeBreaks: true,
  },
];

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(80));
console.log('MULTI-DAY TRIP VALIDATION TESTS');
console.log(`Running ${TEST_CONFIGS.length} test configurations...`);
console.log('='.repeat(80));

const results: MultiDayValidationResult[] = [];
let passCount = 0;
let failCount = 0;

for (const config of TEST_CONFIGS) {
  try {
    const input = createTripInput(config);
    const result = createOptimizedTrip(input);
    const validation = validateMultiDayTrip(result, input, config.name);

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

// Show distribution analysis
console.log('\n--- DISTRIBUTION ANALYSIS ---');
console.log('Test Name | Days | Rides | Distribution | Rerides | All Scheduled');
console.log('-'.repeat(90));
for (const result of results) {
  const s = result.tripStats;
  console.log(
    `${result.testName.substring(0, 45).padEnd(45)} | ` +
    `${String(s.totalDays).padStart(4)} | ` +
    `${String(s.uniqueRidesAcrossTrip).padStart(5)} | ` +
    `${s.rideDistribution.padStart(12)} | ` +
    `${String(s.totalRerides).padStart(7)} | ` +
    `${s.allUserRidesScheduled ? 'Yes' : 'NO'}`
  );
}

// Show per-day breakdown for interesting cases
console.log('\n--- PER-DAY BREAKDOWN (Selected Tests) ---');
const interestingTests = ['MD01', 'MD09', 'MD13', 'MD14', 'MD20'];
for (const result of results.filter(r => interestingTests.some(t => r.testName.includes(t)))) {
  console.log(`\n${result.testName}:`);
  for (const day of result.dayStats) {
    console.log(`  Day ${day.day}: ${day.scheduledRides} rides (${day.rerides} rerides), ` +
      `${day.scheduleStart} - ${day.scheduleEnd}, Wait: ${day.totalWait} min`);
    console.log(`    Rides: ${day.uniqueRides.join(', ') || '(none)'}`);
  }
}

export { TEST_CONFIGS, results };
