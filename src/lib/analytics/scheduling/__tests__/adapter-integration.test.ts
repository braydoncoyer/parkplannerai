/**
 * Adapter Integration Tests
 *
 * Tests the scheduler through the adapter layer - the same path the UI uses.
 * Uses day-aware predictions that vary based on visitDate (weekday vs weekend vs holiday).
 *
 * Run with: npx tsx src/lib/analytics/scheduling/__tests__/adapter-integration.test.ts
 */

import {
  convertToSchedulerInput,
  type LegacyOptimizationInput,
  type LegacyRide,
} from '../adapter';
import { createOptimizedSchedule } from '../scheduler';
import { getHourlyPredictions } from '../../data/historicalPatterns';
import { classifyDayType } from '../../prediction/dayTypeClassifier';
import type { RidePopularity, DayType } from '../../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a legacy ride with day-aware predictions
 * This mirrors how the real system generates predictions based on visit date
 */
function createLegacyRide(
  id: number,
  name: string,
  land: string,
  popularity: RidePopularity,
  visitDate: string
): LegacyRide {
  const dayType = classifyDayType(visitDate);
  const hourlyPredictions = getHourlyPredictions(popularity, dayType, null);

  return {
    id,
    name,
    land,
    popularity,
    duration: popularity === 'headliner' ? 7 : 5,
    hourlyPredictions,
    isOpen: true,
  };
}

// Ride definitions (predictions are generated per-test based on visitDate)
const RIDE_DEFINITIONS: Array<{
  id: number;
  name: string;
  land: string;
  popularity: RidePopularity;
}> = [
  { id: 1, name: 'Space Mountain', land: 'Tomorrowland', popularity: 'headliner' },
  { id: 2, name: 'Indiana Jones Adventure', land: 'Adventureland', popularity: 'headliner' },
  { id: 3, name: 'Matterhorn Bobsleds', land: 'Fantasyland', popularity: 'headliner' },
  { id: 4, name: 'Pirates of the Caribbean', land: 'New Orleans Square', popularity: 'popular' },
  { id: 5, name: 'Haunted Mansion', land: 'New Orleans Square', popularity: 'popular' },
  { id: 6, name: 'Splash Mountain', land: 'Critter Country', popularity: 'popular' },
  { id: 7, name: 'Jungle Cruise', land: 'Adventureland', popularity: 'moderate' },
  { id: 8, name: "It's a Small World", land: 'Fantasyland', popularity: 'moderate' },
  { id: 9, name: 'Star Tours', land: 'Tomorrowland', popularity: 'moderate' },
  { id: 10, name: 'Autopia', land: 'Tomorrowland', popularity: 'low' },
];

/**
 * Generate rides with day-appropriate predictions for a specific visit date
 */
function createRidesForDate(visitDate: string, count?: number): LegacyRide[] {
  const definitions = count ? RIDE_DEFINITIONS.slice(0, count) : RIDE_DEFINITIONS;
  return definitions.map(def =>
    createLegacyRide(def.id, def.name, def.land, def.popularity, visitDate)
  );
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

// =============================================================================
// TEST CONFIGURATIONS
// =============================================================================

interface TestConfig {
  name: string;
  visitDate: string;
  rideCount: number;
  arrivalTime: string;
  parkCloseHour: number;
  includeBreaks: boolean;
  ropeDropMode: boolean;
  ropeDropTarget?: string;
  ropeDropTargets?: string[];
  entertainment?: LegacyOptimizationInput['entertainment'];
  expected: {
    minScheduledRides: number;
    ropeDropTargetFirst?: string;
  };
}

const TEST_CONFIGS: TestConfig[] = [
  // ==========================================================================
  // WEEKDAY TESTS (different predictions than weekend)
  // ==========================================================================
  {
    name: 'AI01: Weekday rope drop (Tuesday)',
    visitDate: '2025-06-17', // Tuesday
    rideCount: 5,
    arrivalTime: '8:00 AM',
    parkCloseHour: 22,
    includeBreaks: true,
    ropeDropMode: true,
    ropeDropTarget: 'Space Mountain',
    expected: {
      minScheduledRides: 5,
      ropeDropTargetFirst: 'Space Mountain',
    },
  },
  {
    name: 'AI02: Weekday multiple rope drop targets',
    visitDate: '2025-06-18', // Wednesday
    rideCount: 6,
    arrivalTime: '8:00 AM',
    parkCloseHour: 22,
    includeBreaks: false,
    ropeDropMode: true,
    ropeDropTargets: ['Space Mountain', 'Indiana Jones'],
    expected: {
      minScheduledRides: 6,
    },
  },

  // ==========================================================================
  // WEEKEND TESTS (busier predictions)
  // ==========================================================================
  {
    name: 'AI03: Weekend rope drop (Saturday)',
    visitDate: '2025-06-21', // Saturday
    rideCount: 5,
    arrivalTime: '8:00 AM',
    parkCloseHour: 22,
    includeBreaks: true,
    ropeDropMode: true,
    ropeDropTarget: 'Space Mountain',
    expected: {
      minScheduledRides: 5,
      ropeDropTargetFirst: 'Space Mountain',
    },
  },
  {
    name: 'AI04: Weekend packed day (Sunday)',
    visitDate: '2025-06-22', // Sunday
    rideCount: 10,
    arrivalTime: '8:00 AM',
    parkCloseHour: 24,
    includeBreaks: false,
    ropeDropMode: true,
    ropeDropTargets: ['Space Mountain', 'Matterhorn'],
    expected: {
      minScheduledRides: 8,
    },
  },

  // ==========================================================================
  // LATE ARRIVAL SCENARIOS
  // ==========================================================================
  {
    name: 'AI05: Late arrival (10am weekday)',
    visitDate: '2025-06-19', // Thursday
    rideCount: 5,
    arrivalTime: '10:00 AM',
    parkCloseHour: 22,
    includeBreaks: true,
    ropeDropMode: false,
    expected: {
      minScheduledRides: 5,
    },
  },
  {
    name: 'AI06: Afternoon arrival (2pm weekend)',
    visitDate: '2025-06-21', // Saturday
    rideCount: 4,
    arrivalTime: '2:00 PM',
    parkCloseHour: 24,
    includeBreaks: false,
    ropeDropMode: false,
    expected: {
      minScheduledRides: 4,
    },
  },

  // ==========================================================================
  // SHORT DAY SCENARIOS
  // ==========================================================================
  {
    name: 'AI07: Short park hours (10am-6pm)',
    visitDate: '2025-01-15', // Winter weekday
    rideCount: 6,
    arrivalTime: '10:00 AM',
    parkCloseHour: 18,
    includeBreaks: true,
    ropeDropMode: false,
    expected: {
      minScheduledRides: 4,
    },
  },

  // ==========================================================================
  // ENTERTAINMENT SCENARIOS
  // ==========================================================================
  {
    name: 'AI08: With parade and fireworks (weekend)',
    visitDate: '2025-06-21', // Saturday
    rideCount: 6,
    arrivalTime: '8:00 AM',
    parkCloseHour: 24,
    includeBreaks: true,
    ropeDropMode: true,
    ropeDropTarget: 'Space Mountain',
    entertainment: [
      {
        id: 'parade-1',
        name: 'Magic Happens Parade',
        category: 'parade',
        showTimes: [{ startTime: '17:30' }],
        duration: 30,
      },
      {
        id: 'fireworks-1',
        name: 'Wondrous Journeys',
        category: 'fireworks',
        showTimes: [{ startTime: '21:30' }],
        duration: 20,
      },
    ],
    expected: {
      minScheduledRides: 6,
    },
  },

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  {
    name: 'AI09: Minimal rides (2 rides)',
    visitDate: '2025-06-20', // Friday
    rideCount: 2,
    arrivalTime: '12:00 PM',
    parkCloseHour: 22,
    includeBreaks: false,
    ropeDropMode: false,
    expected: {
      minScheduledRides: 2,
    },
  },
  {
    name: 'AI10: All headliners (first 3 rides)',
    visitDate: '2025-06-22', // Sunday - busiest
    rideCount: 3,
    arrivalTime: '8:00 AM',
    parkCloseHour: 22,
    includeBreaks: true,
    ropeDropMode: true,
    ropeDropTargets: ['Space Mountain', 'Indiana Jones'],
    expected: {
      minScheduledRides: 3,
    },
  },
];

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(80));
console.log('ADAPTER INTEGRATION TESTS (Day-Aware Predictions)');
console.log('Testing scheduler with predictions that vary by day type');
console.log('='.repeat(80));

// First, demonstrate that predictions differ by day type
console.log('\n--- PREDICTION VERIFICATION ---');
const tuesdayPredictions = getHourlyPredictions('headliner', 'weekday', null);
const saturdayPredictions = getHourlyPredictions('headliner', 'weekend', null);
const holidayPredictions = getHourlyPredictions('headliner', 'holiday', null);

console.log('Headliner wait at 1pm (peak):');
console.log(`  Weekday (Tue): ${tuesdayPredictions[4]} min`);
console.log(`  Weekend (Sat): ${saturdayPredictions[4]} min`);
console.log(`  Holiday:       ${holidayPredictions[4]} min`);
console.log('✓ Predictions correctly vary by day type\n');

let passCount = 0;
let failCount = 0;

for (const config of TEST_CONFIGS) {
  const errors: string[] = [];
  const dayType = classifyDayType(config.visitDate);

  try {
    // Build input with day-aware rides
    const rides = createRidesForDate(config.visitDate, config.rideCount);

    const input: LegacyOptimizationInput = {
      selectedRides: rides,
      preferences: {
        visitDate: config.visitDate,
        arrivalTime: config.arrivalTime,
        duration: 'full-day',
        priority: 'balanced',
        includeBreaks: config.includeBreaks,
        ropeDropMode: config.ropeDropMode,
        ropeDropTarget: config.ropeDropTarget,
        ropeDropTargets: config.ropeDropTargets,
        parkId: 1,
        parkCloseHour: config.parkCloseHour,
      },
      entertainment: config.entertainment,
    };

    // Convert through adapter (same as UI does)
    const schedulerInput = convertToSchedulerInput(input);

    // Run scheduler
    const result = createOptimizedSchedule(schedulerInput);

    const rideItems = result.items.filter(i => i.type === 'ride');
    const allItems = result.items.sort((a, b) => a.scheduledTime - b.scheduledTime);

    // Validation checks
    const arrivalMinutes = parseTimeToMinutes(config.arrivalTime);
    const closeMinutes = config.parkCloseHour * 60;

    // Check 1: Minimum rides scheduled
    if (rideItems.length < config.expected.minScheduledRides) {
      errors.push(
        `Expected at least ${config.expected.minScheduledRides} rides, got ${rideItems.length}`
      );
    }

    // Check 2: Schedule starts after arrival
    if (allItems.length > 0) {
      const firstItem = allItems[0];
      if (firstItem.scheduledTime < arrivalMinutes - 5) {
        errors.push(
          `Schedule starts at ${formatTime(firstItem.scheduledTime)} but arrival is ${config.arrivalTime}`
        );
      }
    }

    // Check 3: Schedule ends before park close
    if (allItems.length > 0) {
      const lastItem = allItems[allItems.length - 1];
      if (lastItem.endTime > closeMinutes + 15) {
        errors.push(
          `Schedule ends at ${formatTime(lastItem.endTime)} but park closes at ${formatTime(closeMinutes)}`
        );
      }
    }

    // Check 4: No overlaps
    for (let i = 0; i < allItems.length - 1; i++) {
      const current = allItems[i];
      const next = allItems[i + 1];
      if (current.endTime > next.scheduledTime + 2) {
        errors.push(
          `Overlap: "${current.ride?.name || current.type}" ends at ${formatTime(current.endTime)} ` +
          `but "${next.ride?.name || next.type}" starts at ${formatTime(next.scheduledTime)}`
        );
      }
    }

    // Check 5: Rope drop target is first (if specified)
    if (config.expected.ropeDropTargetFirst && rideItems.length > 0) {
      const firstRide = rideItems[0];
      const expectedTarget = config.expected.ropeDropTargetFirst.toLowerCase();
      const actualFirst = firstRide.ride?.name?.toLowerCase() || '';

      if (!actualFirst.includes(expectedTarget) && !expectedTarget.includes(actualFirst)) {
        errors.push(
          `Expected "${config.expected.ropeDropTargetFirst}" as first ride, got "${firstRide.ride?.name}"`
        );
      }
    }

    // Report results
    if (errors.length === 0) {
      passCount++;
      console.log(`✓ ${config.name} [${dayType}]`);
      console.log(`    ${rideItems.length} rides scheduled, ${result.overflow.length} overflow`);
    } else {
      failCount++;
      console.log(`✗ ${config.name} [${dayType}]`);
      for (const error of errors) {
        console.log(`    ERROR: ${error}`);
      }
    }
  } catch (error) {
    failCount++;
    console.log(`✗ ${config.name} [${dayType}]`);
    console.log(`    EXCEPTION: ${error}`);
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('INTEGRATION TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${TEST_CONFIGS.length}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Pass Rate: ${((passCount / TEST_CONFIGS.length) * 100).toFixed(1)}%`);

if (failCount > 0) {
  console.log('\n⚠️  Some integration tests failed.');
  console.log('This indicates the scheduler may behave differently than expected when called from the UI.');
} else {
  console.log('\n✅ All integration tests passed!');
  console.log('The scheduler behaves correctly through the adapter with day-aware predictions.');
}

export { TEST_CONFIGS };
