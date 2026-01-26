/**
 * Distribution Phase Tests
 *
 * Tests for verifying ride distribution behavior across multi-day trips.
 * Run with: npx tsx src/lib/analytics/scheduling/__tests__/distribution.test.ts
 */

import { distributeRidesAcrossDays, getRidesForDay } from '../phases/distributionPhase';
import type { TripSchedulerInput, RideWithPredictions, SchedulerInput } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockRide(
  id: string,
  name: string,
  popularity: 'headliner' | 'popular' | 'moderate' | 'low' = 'moderate',
  land: string = 'Fantasyland'
): RideWithPredictions {
  return {
    id,
    name,
    land,
    popularity,
    duration: 5,
    hourlyPredictions: [30, 35, 45, 60, 75, 80, 85, 80, 70, 60, 50, 40, 30],
  };
}

function createMockDayInput(date: Date): { date: Date; input: SchedulerInput } {
  return {
    date,
    input: {
      selectedRides: [], // Will be populated by distributor
      parkHours: { openHour: 8, closeHour: 22 },
      entertainment: [],
      preferences: {
        arrivalTime: '08:00',
        includeBreaks: true,
        priority: 'balanced',
        allowRerides: true,
      },
      dayType: 'weekday',
      parkId: 'disneyland',
    },
  };
}

function createTripInput(
  rides: RideWithPredictions[],
  numDays: number,
  allowRerides: boolean = true
): TripSchedulerInput {
  const days = [];
  for (let i = 0; i < numDays; i++) {
    const date = new Date(2026, 0, 27 + i); // Jan 27, 28, 29...
    days.push(createMockDayInput(date));
  }

  return {
    days,
    allSelectedRides: rides,
    allowRerides,
  };
}

// =============================================================================
// TEST CASES
// =============================================================================

console.log('='.repeat(80));
console.log('DISTRIBUTION PHASE TESTS');
console.log('='.repeat(80));

// -----------------------------------------------------------------------------
// TEST 1: Light intensity (4 rides) across 2 days
// Expected (per user): Day 1 should get ALL rides, Day 2 should be empty (for re-rides)
// Actual: Even distribution
// -----------------------------------------------------------------------------

console.log('\n--- TEST 1: 2 Days, 4 Rides (Light Intensity) ---');

const lightRides = [
  createMockRide('1', 'Space Mountain', 'headliner', 'Tomorrowland'),
  createMockRide('2', 'Star Wars: Rise of the Resistance', 'headliner', 'Star Wars: Galaxy\'s Edge'),
  createMockRide('3', 'Buzz Lightyear', 'popular', 'Tomorrowland'),
  createMockRide('4', 'Matterhorn', 'headliner', 'Fantasyland'),
];

const lightInput = createTripInput(lightRides, 2);
const lightDistribution = distributeRidesAcrossDays(lightInput);

console.log('Input: 4 rides across 2 days');
console.log('Day 1 rides:', getRidesForDay(lightDistribution, 0).map(r => r.name));
console.log('Day 2 rides:', getRidesForDay(lightDistribution, 1).map(r => r.name));
console.log('');
console.log('USER EXPECTATION (Headliner Rush): Day 1 = all 4 rides, Day 2 = empty (re-rides only)');
console.log('ACTUAL BEHAVIOR: Rides distributed evenly');
console.log('POTENTIAL BUG: Distribution does not consider strategy type');

// -----------------------------------------------------------------------------
// TEST 2: Medium intensity (8 rides) across 2 days
// -----------------------------------------------------------------------------

console.log('\n--- TEST 2: 2 Days, 8 Rides (Medium Intensity) ---');

const mediumRides = [
  createMockRide('1', 'Space Mountain', 'headliner', 'Tomorrowland'),
  createMockRide('2', 'Star Wars: Rise of the Resistance', 'headliner', 'Star Wars: Galaxy\'s Edge'),
  createMockRide('3', 'Indiana Jones', 'headliner', 'Adventureland'),
  createMockRide('4', 'Matterhorn', 'headliner', 'Fantasyland'),
  createMockRide('5', 'Buzz Lightyear', 'popular', 'Tomorrowland'),
  createMockRide('6', 'Pirates of the Caribbean', 'popular', 'New Orleans Square'),
  createMockRide('7', 'Haunted Mansion', 'popular', 'New Orleans Square'),
  createMockRide('8', 'Splash Mountain', 'popular', 'Critter Country'),
];

const mediumInput = createTripInput(mediumRides, 2);
const mediumDistribution = distributeRidesAcrossDays(mediumInput);

console.log('Input: 8 rides across 2 days');
console.log('Day 1 rides:', getRidesForDay(mediumDistribution, 0).map(r => r.name));
console.log('Day 2 rides:', getRidesForDay(mediumDistribution, 1).map(r => r.name));
console.log('');
console.log('Note: Headliners should be split evenly (2 each day)');

// -----------------------------------------------------------------------------
// TEST 3: Packed intensity (15 rides) across 2 days
// -----------------------------------------------------------------------------

console.log('\n--- TEST 3: 2 Days, 15 Rides (Packed Intensity) ---');

const packedRides = [
  createMockRide('1', 'Space Mountain', 'headliner', 'Tomorrowland'),
  createMockRide('2', 'Star Wars: Rise of the Resistance', 'headliner', 'Star Wars: Galaxy\'s Edge'),
  createMockRide('3', 'Indiana Jones', 'headliner', 'Adventureland'),
  createMockRide('4', 'Matterhorn', 'headliner', 'Fantasyland'),
  createMockRide('5', 'Buzz Lightyear', 'popular', 'Tomorrowland'),
  createMockRide('6', 'Pirates of the Caribbean', 'popular', 'New Orleans Square'),
  createMockRide('7', 'Haunted Mansion', 'popular', 'New Orleans Square'),
  createMockRide('8', 'Splash Mountain', 'popular', 'Critter Country'),
  createMockRide('9', 'Big Thunder Mountain', 'popular', 'Frontierland'),
  createMockRide('10', 'Star Tours', 'moderate', 'Tomorrowland'),
  createMockRide('11', 'Jungle Cruise', 'moderate', 'Adventureland'),
  createMockRide('12', 'It\'s a Small World', 'moderate', 'Fantasyland'),
  createMockRide('13', 'Peter Pan', 'moderate', 'Fantasyland'),
  createMockRide('14', 'Mr. Toad', 'low', 'Fantasyland'),
  createMockRide('15', 'Autopia', 'low', 'Tomorrowland'),
];

const packedInput = createTripInput(packedRides, 2);
const packedDistribution = distributeRidesAcrossDays(packedInput);

console.log('Input: 15 rides across 2 days');
console.log('Day 1 rides:', getRidesForDay(packedDistribution, 0).length, 'rides');
console.log('Day 2 rides:', getRidesForDay(packedDistribution, 1).length, 'rides');
console.log('Day 1:', getRidesForDay(packedDistribution, 0).map(r => r.name));
console.log('Day 2:', getRidesForDay(packedDistribution, 1).map(r => r.name));

// -----------------------------------------------------------------------------
// TEST 4: 3 Days with varying intensity
// -----------------------------------------------------------------------------

console.log('\n--- TEST 4: 3 Days, 6 Rides ---');

const threeDayRides = [
  createMockRide('1', 'Space Mountain', 'headliner', 'Tomorrowland'),
  createMockRide('2', 'Star Wars: Rise of the Resistance', 'headliner', 'Star Wars: Galaxy\'s Edge'),
  createMockRide('3', 'Indiana Jones', 'headliner', 'Adventureland'),
  createMockRide('4', 'Matterhorn', 'popular', 'Fantasyland'),
  createMockRide('5', 'Buzz Lightyear', 'moderate', 'Tomorrowland'),
  createMockRide('6', 'Pirates', 'moderate', 'New Orleans Square'),
];

const threeDayInput = createTripInput(threeDayRides, 3);
const threeDayDistribution = distributeRidesAcrossDays(threeDayInput);

console.log('Input: 6 rides across 3 days');
console.log('Day 1 rides:', getRidesForDay(threeDayDistribution, 0).map(r => r.name));
console.log('Day 2 rides:', getRidesForDay(threeDayDistribution, 1).map(r => r.name));
console.log('Day 3 rides:', getRidesForDay(threeDayDistribution, 2).map(r => r.name));

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------

console.log('\n' + '='.repeat(80));
console.log('FINDINGS SUMMARY');
console.log('='.repeat(80));
console.log(`
Key Finding: The distribution phase ALWAYS distributes rides evenly across days.

Missing Feature: The distribution does NOT consider:
1. Strategy type (Headliner Rush vs Family First vs Wave Rider)
2. Whether front-loading Day 1 makes sense for light trips

Potential Fix Options:
1. Add strategy parameter to distributeRidesAcrossDays()
2. For Headliner Rush + Light: Front-load Day 1, leave Day 2 for re-rides
3. For Family First: Keep even distribution (current behavior)

Current Behavior:
- Headliners: Round-robin evenly across days
- Popular: Grouped by land, balanced across days
- Others: Land affinity with load balancing
`);
