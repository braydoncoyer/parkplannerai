// Schedule Optimizer - Main Orchestrator
// Combines prediction, break scheduling, and ride ordering

import type {
  RideWithPredictions,
  OptimizedSchedule,
  OptimizationInput,
  ScheduleItem,
  RideCategory,
} from '../types';
import type { ConvexReactClient } from 'convex/react';
import { predictRideWaitTimes, getPredictedWaitForHour, predictMultipleRidesWithHistory } from '../prediction/waitTimePredictor';
import {
  analyzeBreakOpportunity,
  createScheduledBreak,
  shouldConsiderBreak,
} from './breakScheduler';
import {
  selectBestRide,
  scoreRideForSlot,
  generateRideReasoning,
  prioritizeRides,
  getWalkTimeBetweenLands,
} from './rideOrderer';
import {
  formatTime,
  parseArrivalTime,
  calculateDepartureHour,
  addMinutes,
  sum,
  average,
} from '../utils/timeUtils';
import {
  getRopeDropStrategy,
  isRopeDropTarget,
  getRopeDropWaitEstimate,
  type RopeDropTarget,
} from '../data/ropeDropStrategy';
import { getAdjustedWeight } from '../data/rideWeights';
import { getStrategyRideOrder } from './strategyGenerator';

const WALK_TIME_BETWEEN_RIDES = 10; // minutes
const ROPE_DROP_WINDOW_HOURS = 2; // First 2 hours for rope drop optimization
const GAP_THRESHOLD_MINUTES = 20; // Minimum gap to suggest a break

/**
 * Parse a time string like "9:00 AM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

/**
 * Convert minutes since midnight to formatted time string
 */
function minutesToTimeString(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Add special wording for first and last rides of the day
 * Skips "Kick off your day" for rope drop targets since they already have special messaging
 */
function enhanceFirstLastRideReasoning(schedule: ScheduleItem[]): ScheduleItem[] {
  const rideItems = schedule.filter(item => item.type === 'ride');
  if (rideItems.length === 0) return schedule;

  const firstRide = rideItems[0];
  const lastRide = rideItems[rideItems.length - 1];

  return schedule.map(item => {
    if (item.type !== 'ride') return item;

    if (item === firstRide) {
      // Skip "Kick off your day" if this is already a rope drop priority (has 🎯)
      if (item.reasoning?.includes('🎯')) {
        return item;
      }
      return {
        ...item,
        reasoning: `🌅 Kick off your day with this ride! ${item.reasoning}`,
      };
    }

    if (item === lastRide && lastRide !== firstRide) {
      return {
        ...item,
        reasoning: `🌙 Wrap up your adventure with this ride! ${item.reasoning}`,
      };
    }

    return item;
  });
}

/**
 * Detect gaps > 20 minutes between rides and insert rest/exploration suggestions
 */
function addGapFillSuggestions(schedule: ScheduleItem[]): ScheduleItem[] {
  if (schedule.length < 2) return schedule;

  const result: ScheduleItem[] = [];

  for (let i = 0; i < schedule.length; i++) {
    const currentItem = schedule[i];
    result.push(currentItem);

    // Check gap to next item
    if (i < schedule.length - 1) {
      const nextItem = schedule[i + 1];

      // Calculate when current item ends
      const currentStartMinutes = parseTimeToMinutes(currentItem.time);
      const currentDuration = (currentItem.expectedWait ?? 0) + (currentItem.duration ?? 0);
      const currentEndMinutes = currentStartMinutes + currentDuration;

      // Next item start
      const nextStartMinutes = parseTimeToMinutes(nextItem.time);

      // Gap between current end and next start
      const gapMinutes = nextStartMinutes - currentEndMinutes;

      // If gap is significant, add a suggestion (but not if there's already a break)
      if (gapMinutes >= GAP_THRESHOLD_MINUTES && currentItem.type === 'ride' && nextItem.type === 'ride') {
        const gapStartTime = minutesToTimeString(currentEndMinutes);
        const gapEndTime = minutesToTimeString(nextStartMinutes);

        // Determine suggestion type based on time of day
        const hour = Math.floor(currentEndMinutes / 60);
        let suggestion: string;
        let icon: string;

        if (hour >= 10 && hour < 14) {
          // Late morning to early afternoon - shops or snacks
          suggestion = 'Perfect time to explore nearby shops or grab a snack!';
          icon = '🛍️';
        } else if (hour >= 14 && hour < 17) {
          // Afternoon - rest or cooling off
          suggestion = 'Take a breather - explore the area or cool off with a treat!';
          icon = '☕';
        } else if (hour >= 17 && hour < 20) {
          // Evening - casual exploration
          suggestion = 'Enjoy the atmosphere! Browse shops or find a good spot for photos.';
          icon = '📸';
        } else {
          // Other times
          suggestion = 'Free time to explore, rest, or grab a quick bite!';
          icon = '✨';
        }

        result.push({
          time: gapStartTime,
          type: 'break',
          name: 'Explore & Relax',
          duration: gapMinutes,
          reasoning: `${icon} ${Math.round(gapMinutes)} minutes until your next ride. ${suggestion}`,
        });
      }
    }
  }

  return result;
}

/**
 * Main optimization function
 * Generates an optimized schedule for the selected rides
 */
export function optimizeSchedule(input: OptimizationInput): OptimizedSchedule {
  const { selectedRides, preferences } = input;

  // Parse timing
  const arrivalHour = parseArrivalTime(preferences.arrivalTime);
  const departureHour = calculateDepartureHour(
    arrivalHour,
    preferences.duration,
    preferences.parkCloseHour // Use actual park close hour if provided
  );
  const visitDate = new Date(preferences.visitDate);

  // Enrich rides with predictions
  const ridesWithPredictions: RideWithPredictions[] = selectedRides.map((ride) =>
    predictRideWaitTimes(
      {
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.isOpen,
        waitTime: ride.waitTime,
      },
      visitDate
    )
  );

  // Filter to only open rides
  const availableRides = ridesWithPredictions.filter((r) => r.isOpen);

  if (availableRides.length === 0) {
    return createEmptySchedule('No open rides available');
  }

  // Build the optimized schedule
  let schedule = buildSchedule(
    availableRides,
    arrivalHour,
    departureHour,
    preferences.priority,
    preferences.includeBreaks,
    preferences.ropeDropMode ?? false,
    preferences.parkId,
    preferences.ropeDropTarget,
    preferences.selectedStrategy
  );

  // Post-process: Add special wording for first and last rides (skip for park hopper sub-schedules)
  if (!preferences.skipFirstLastEnhancement) {
    schedule = enhanceFirstLastRideReasoning(schedule);
  }

  // Post-process: Detect large gaps and add exploration/rest suggestions
  schedule = addGapFillSuggestions(schedule);

  // Calculate totals
  const rideItems = schedule.filter((item) => item.type === 'ride');
  const breakItems = schedule.filter((item) => item.type !== 'ride');

  const totalWaitTime = sum(rideItems.map((item) => item.expectedWait ?? 0));
  const totalWalkingTime = rideItems.length * WALK_TIME_BETWEEN_RIDES;
  const totalDuration = calculateTotalDuration(schedule, arrivalHour);

  // Calculate comparison to baseline (naive approach)
  const baselineWait = calculateBaselineWait(availableRides, arrivalHour);
  const waitTimeSaved = Math.max(0, baselineWait - totalWaitTime);
  const percentImprovement = baselineWait > 0
    ? Math.round((waitTimeSaved / baselineWait) * 100)
    : 0;

  // Generate insights
  const insights = generateInsights(
    schedule,
    availableRides,
    waitTimeSaved,
    percentImprovement,
    {
      includeBreaks: preferences.includeBreaks,
      duration: preferences.duration,
      ropeDropMode: preferences.ropeDropMode,
      parkId: preferences.parkId,
    }
  );

  return {
    items: schedule,
    totalWaitTime,
    totalWalkingTime,
    totalDuration,
    ridesScheduled: rideItems.length,
    breaksScheduled: breakItems.length,
    insights,
    comparisonToBaseline: {
      waitTimeSaved,
      percentImprovement,
    },
  };
}

/**
 * Check if a ride has a significantly better time later in the day
 * Returns true if we should defer this ride to a better time
 *
 * NEVER defer:
 * - User-selected rides (user explicitly chose these)
 * - Rope drop targets during the rope drop window
 */
function shouldDeferRide(
  ride: RideWithPredictions,
  currentHour: number,
  departureHour: number,
  options: {
    isUserSelected?: boolean;
    isRopeDropTarget?: boolean;
    isRopeDropWindow?: boolean;
  } = {}
): { shouldDefer: boolean; bestLaterHour: number; currentWait: number; bestLaterWait: number } {
  const currentWait = getPredictedWaitForHour(ride, currentHour);

  // NEVER defer user-selected rides - they explicitly chose these
  if (options.isUserSelected) {
    return { shouldDefer: false, bestLaterHour: currentHour, currentWait, bestLaterWait: currentWait };
  }

  // NEVER defer rope drop targets during the rope drop window
  if (options.isRopeDropWindow && options.isRopeDropTarget) {
    return { shouldDefer: false, bestLaterHour: currentHour, currentWait, bestLaterWait: currentWait };
  }

  // Find the best wait time available in remaining hours
  let bestLaterWait = currentWait;
  let bestLaterHour = currentHour;

  for (let hour = currentHour + 1; hour < departureHour; hour++) {
    const laterWait = getPredictedWaitForHour(ride, hour);
    if (laterWait < bestLaterWait) {
      bestLaterWait = laterWait;
      bestLaterHour = hour;
    }
  }

  // Defer if:
  // 1. Current wait is 2x or more than the best later wait, OR
  // 2. Current wait is 45+ min higher than best later wait (for high-wait rides)
  const waitRatio = currentWait / Math.max(bestLaterWait, 1);
  const waitDifference = currentWait - bestLaterWait;

  const shouldDefer = (waitRatio >= 2.0 && waitDifference >= 30) ||
                      (waitDifference >= 45 && currentWait >= 60);

  return { shouldDefer, bestLaterHour, currentWait, bestLaterWait };
}

/**
 * Get the delta (midday wait - rope drop wait) for a ride
 * Used for comparing rides during rope drop prioritization
 */
function getRideDeltaForComparison(
  ride: RideWithPredictions,
  ropeDropStrategy: { targets: RopeDropTarget[] } | null
): number {
  // First check if it's a known rope drop target with defined delta
  if (ropeDropStrategy) {
    const rideName = ride.name.toLowerCase();
    for (const target of ropeDropStrategy.targets) {
      const targetName = target.rideName.toLowerCase();
      const matchesMain = rideName === targetName || rideName.includes(targetName) || targetName.includes(rideName);
      const matchesAlias = target.rideNameAliases?.some(alias => {
        const aliasLower = alias.toLowerCase();
        return rideName === aliasLower || rideName.includes(aliasLower) || aliasLower.includes(rideName);
      });

      if (matchesMain || matchesAlias) {
        return target.typicalMiddayWait - target.typicalRopeDropWait;
      }
    }
  }

  // Fall back to calculating delta from hourlyPredictions
  if (ride.hourlyPredictions && ride.hourlyPredictions.length > 0) {
    const ropeDropWait = ride.hourlyPredictions[0] || 30;
    const peakWait = Math.max(...ride.hourlyPredictions);
    return peakWait - ropeDropWait;
  }

  // Last resort: estimate based on current wait time
  return (ride.currentWaitTime || 30) * 0.5;
}

/**
 * Build the optimized schedule using smart algorithm
 * Key improvement: Defers rides to better times if current wait is much higher
 * Rope drop mode: Prioritizes high-value targets in the first 2 hours
 * Selected strategy: Uses strategy's ride order for first 2-3 rides
 */
function buildSchedule(
  rides: RideWithPredictions[],
  arrivalHour: number,
  departureHour: number,
  priority: 'thrill' | 'family' | 'shows' | 'balanced',
  includeBreaks: boolean,
  ropeDropMode: boolean = false,
  parkId?: number,
  ropeDropTarget?: string,
  selectedStrategy?: string
): ScheduleItem[] {
  const schedule: ScheduleItem[] = [];
  const scheduledRideIds = new Set<string | number>();
  const deferredRides = new Set<string | number>(); // Track rides we're waiting on for better times
  const unschedulableRides = new Set<string | number>(); // Track rides that can't fit in remaining time

  let currentHour = arrivalHour;
  let currentMinute = 0;
  let lastCategory: RideCategory | null = null;
  let lastLand: string | null = null;
  let minutesSinceBreak = 0;
  let ridesSinceBreak = 0;

  // Get rope drop strategy if enabled
  const ropeDropStrategy = ropeDropMode && parkId ? getRopeDropStrategy(parkId) : null;
  const ropeDropEndHour = arrivalHour + ROPE_DROP_WINDOW_HOURS;

  // Prioritize rides based on mode
  let prioritizedRides: RideWithPredictions[];

  if (ropeDropMode && ropeDropStrategy) {
    // In rope drop mode, prioritize rope drop targets first
    // If user selected a specific strategy, use that strategy's ride order
    // If user selected a specific target, that goes first
    prioritizedRides = prioritizeRidesForRopeDrop(rides, ropeDropStrategy, priority, ropeDropTarget, parkId, selectedStrategy);
  } else {
    // Standard prioritization (headliners first)
    prioritizedRides = prioritizeRides(rides, priority);
  }

  while (currentHour < departureHour && scheduledRideIds.size < rides.length) {
    // Get remaining rides (excluding scheduled and unschedulable, but including deferred for re-check)
    const remainingRides = prioritizedRides.filter(
      (r) => !scheduledRideIds.has(r.id) && !unschedulableRides.has(r.id)
    );

    if (remainingRides.length === 0) break;

    // Check if we should consider a break
    if (
      includeBreaks &&
      shouldConsiderBreak(minutesSinceBreak, ridesSinceBreak)
    ) {
      const breakAnalysis = analyzeBreakOpportunity(
        remainingRides,
        currentHour,
        includeBreaks,
        lastLand // Pass current land for location-specific suggestions
      );

      if (breakAnalysis.shouldBreak) {
        // Add break to schedule
        const breakItem = createScheduledBreak(
          breakAnalysis,
          currentHour,
          currentMinute
        );

        schedule.push({
          time: formatTime(currentHour, currentMinute),
          type: breakAnalysis.breakType === 'meal' ? 'meal' : 'break',
          name:
            breakAnalysis.breakType === 'meal'
              ? currentHour >= 17
                ? 'Dinner Break'
                : 'Lunch Break'
              : breakAnalysis.breakType === 'rest'
              ? 'Rest Break'
              : 'Snack Break',
          duration: breakAnalysis.breakDuration,
          reasoning: breakAnalysis.reason,
          breakInfo: breakItem,
        });

        // Update time
        const newTime = addMinutes(
          currentHour,
          currentMinute,
          breakAnalysis.breakDuration
        );
        currentHour = newTime.hour;
        currentMinute = newTime.minute;

        // Reset break counters
        minutesSinceBreak = 0;
        ridesSinceBreak = 0;

        continue;
      }
    }

    // Check if we're in the rope drop window (first 2 hours after arrival)
    const isInRopeDropWindow = ropeDropMode && currentHour < ropeDropEndHour;

    // Filter out rides that should be deferred to better times
    // But only defer if we have other rides to do in the meantime
    // NEVER defer: user-selected rides or rope drop targets during rope drop window
    const ridesForNow: RideWithPredictions[] = [];
    const ridesToDefer: Array<{ ride: RideWithPredictions; deferInfo: ReturnType<typeof shouldDeferRide> }> = [];

    for (const ride of remainingRides) {
      // Check if this is a known rope drop target
      const rideIsRopeDropTarget = parkId ? !!isRopeDropTarget(ride.name, parkId) : false;

      // ALL rides in this loop are user-selected (they come from selectedRides in the wizard)
      // We should NEVER defer user-selected rides - the user explicitly chose them
      const deferCheck = shouldDeferRide(ride, currentHour, departureHour, {
        isUserSelected: true, // All rides here are user-selected from the wizard
        isRopeDropTarget: rideIsRopeDropTarget,
        isRopeDropWindow: isInRopeDropWindow,
      });

      if (deferCheck.shouldDefer) {
        ridesToDefer.push({ ride, deferInfo: deferCheck });
      } else {
        ridesForNow.push(ride);
      }
    }

    // If ALL remaining rides should be deferred, pick the one with best current value
    // (we can't defer everything or we'd be stuck)
    const candidateRides = ridesForNow.length > 0 ? ridesForNow : remainingRides;

    // During rope drop window with a user-selected target, prioritize that target first
    // Don't let the scoring algorithm override the user's explicit choice
    let bestRide: RideWithPredictions | null = null;

    // Check if we have any rides scheduled yet (breaks don't count)
    const hasScheduledRides = schedule.some(item => item.type === 'ride');

    if (isInRopeDropWindow && ropeDropTarget && !hasScheduledRides) {
      // First ride of the day during rope drop - use user's selected target
      // Search in ALL remaining rides, not just candidateRides, because the target
      // may have been filtered out by the "should defer" logic, but the user's
      // explicit rope drop choice should override deferral decisions
      const userTargetNormalized = ropeDropTarget.toLowerCase();
      bestRide = remainingRides.find(ride => {
        const rideName = ride.name.toLowerCase();
        return rideName === userTargetNormalized ||
               rideName.includes(userTargetNormalized) ||
               userTargetNormalized.includes(rideName);
      }) ?? null;
    }

    // During rope drop window: respect the prioritized order (sorted by delta)
    // But also consider land proximity for efficiency after the first ride
    if (!bestRide && isInRopeDropWindow && ropeDropMode) {
      // candidateRides is already sorted by prioritizeRidesForRopeDrop (highest delta first)
      const highestDeltaRide = candidateRides[0] ?? null;

      if (!hasScheduledRides || !lastLand || !highestDeltaRide) {
        // First ride of the day - just pick highest delta
        bestRide = highestDeltaRide;
      } else {
        // Subsequent rides - balance delta with land proximity
        // Find the best ride in the SAME land as where we currently are
        const currentLandName: string = lastLand!.toLowerCase().trim(); // lastLand is guaranteed non-null here
        const sameLandRides: RideWithPredictions[] = candidateRides.filter(r =>
          r.land?.toLowerCase().trim() === currentLandName
        );
        const bestSameLandRide: RideWithPredictions | null = sameLandRides[0] ?? null; // Already sorted by delta

        if (bestSameLandRide) {
          // Compare deltas: is staying in the same land worth it?
          // Get deltas for comparison
          const highestDelta: number = getRideDeltaForComparison(highestDeltaRide, ropeDropStrategy);
          const sameLandDelta: number = getRideDeltaForComparison(bestSameLandRide, ropeDropStrategy);

          // If same-land ride's delta is within 20 min of the best, stay in the land
          // This saves walking time while still being efficient
          const deltaThreshold = 20;
          if (highestDelta - sameLandDelta <= deltaThreshold) {
            bestRide = bestSameLandRide;
          } else {
            // The highest delta ride is significantly better - worth walking
            bestRide = highestDeltaRide;
          }
        } else {
          // No rides in the same land - pick highest delta
          bestRide = highestDeltaRide;
        }
      }
    }

    // Outside rope drop window: use standard scoring-based selection
    if (!bestRide) {
      bestRide = selectBestRide(
        candidateRides,
        currentHour,
        lastCategory,
        lastLand,
        priority
      );
    }

    if (!bestRide) break;

    // Score the ride for reasoning
    const score = scoreRideForSlot(bestRide, currentHour, lastCategory, lastLand, priority);
    let reasoning = generateRideReasoning(bestRide, currentHour, score, lastLand);

    // Use rope drop wait estimate if in rope drop window
    let predictedWait: number;

    if (isInRopeDropWindow && parkId) {
      const ropeDropTargetData = isRopeDropTarget(bestRide.name, parkId);

      // Check if this is the user's selected rope drop target
      const isUserSelectedTarget = ropeDropTarget && (() => {
        const userTargetNormalized = ropeDropTarget.toLowerCase();
        const rideName = bestRide.name.toLowerCase();
        return rideName === userTargetNormalized ||
               rideName.includes(userTargetNormalized) ||
               userTargetNormalized.includes(rideName);
      })();

      if (isUserSelectedTarget && ropeDropTargetData) {
        // This is the user's chosen rope drop target - show special messaging
        predictedWait = ropeDropTargetData.typicalRopeDropWait;
        const savings = ropeDropTargetData.typicalMiddayWait - ropeDropTargetData.typicalRopeDropWait;
        reasoning = `🎯 Your rope drop priority! Hitting this first saves ~${savings} min vs midday.`;
      } else if (ropeDropTargetData) {
        // Known rope drop target but not selected by user - use rope drop wait estimate but standard reasoning
        predictedWait = ropeDropTargetData.typicalRopeDropWait;
        // Keep the original reasoning, no rope drop mention
      } else {
        // Non-target ride, estimate 40% of normal wait at rope drop
        const normalWait = getPredictedWaitForHour(bestRide, currentHour);
        predictedWait = getRopeDropWaitEstimate(bestRide.name, parkId, normalWait);
        // Keep the original reasoning, no rope drop mention
      }
    } else {
      predictedWait = getPredictedWaitForHour(bestRide, currentHour);
    }

    // Check if this ride would START or EXTEND past park closing
    const departureMinutes = departureHour * 60;
    const currentMinutes = currentHour * 60 + currentMinute;

    // If ride would start after park close, stop immediately
    if (currentMinutes >= departureMinutes) {
      break;
    }

    // Check if ride would COMPLETE before park closes
    const estimatedWalkTime = getWalkTimeBetweenLands(lastLand, bestRide.land);
    const rideEndTime = addMinutes(currentHour, currentMinute, predictedWait + bestRide.duration + estimatedWalkTime);
    const rideEndMinutes = rideEndTime.hour * 60 + rideEndTime.minute;

    if (rideEndMinutes > departureMinutes) {
      // This ride doesn't fit - mark it as unschedulable and try others
      // Don't break entirely - there may be other rides with shorter waits that fit
      unschedulableRides.add(bestRide.id);
      continue;
    }

    // Check if this ride was previously considered for deferral
    const wasDeferred = deferredRides.has(bestRide.id);
    if (wasDeferred) {
      reasoning = `Now optimal time for this ride. ${reasoning}`;
    }

    // If we're scheduling a deferred ride, note it in reasoning
    const deferInfo = ridesToDefer.find(d => d.ride.id === bestRide.id);
    if (deferInfo && ridesForNow.length === 0) {
      reasoning = `Best option available right now. ${reasoning}`;
    }

    // Add ride to schedule
    schedule.push({
      time: formatTime(currentHour, currentMinute),
      type: 'ride',
      name: bestRide.name,
      expectedWait: predictedWait,
      duration: bestRide.duration,
      reasoning,
      ride: bestRide,
    });

    scheduledRideIds.add(bestRide.id);
    deferredRides.delete(bestRide.id); // Remove from deferred if it was there

    // Calculate dynamic walk time based on land change
    // This is the walk time TO the next ride (from this ride's land)
    // We use an estimate - same land = short, different = longer
    const previousLand = lastLand;
    lastCategory = bestRide.category;
    lastLand = bestRide.land || null;

    // Update time (wait + ride duration + walk to next location)
    // Walk time is estimated based on current land - if we stay, it's short; if we move, it's longer
    // We use the walk time FROM the previous land TO this ride's land
    const walkTime = getWalkTimeBetweenLands(previousLand, bestRide.land);
    const totalTime = predictedWait + bestRide.duration + walkTime;
    const newTime = addMinutes(currentHour, currentMinute, totalTime);
    currentHour = newTime.hour;
    currentMinute = newTime.minute;

    // Update break counters
    minutesSinceBreak += totalTime;
    ridesSinceBreak++;

    // Mark deferred rides so we remember them
    for (const { ride } of ridesToDefer) {
      if (!scheduledRideIds.has(ride.id)) {
        deferredRides.add(ride.id);
      }
    }
  }

  return schedule;
}

/**
 * Calculate what the total wait would be with naive approach
 * (rides in order they were selected, no optimization)
 */
function calculateBaselineWait(
  rides: RideWithPredictions[],
  startHour: number
): number {
  let totalWait = 0;
  let currentHour = startHour;

  for (const ride of rides) {
    const wait = getPredictedWaitForHour(ride, Math.min(currentHour, 21));
    totalWait += wait;

    // Rough time advancement
    currentHour += Math.ceil((wait + ride.duration + WALK_TIME_BETWEEN_RIDES) / 60);
  }

  return totalWait;
}

/**
 * Calculate total duration of the schedule
 */
function calculateTotalDuration(
  schedule: ScheduleItem[],
  arrivalHour: number
): number {
  if (schedule.length === 0) return 0;

  // Parse the last item's time to estimate end time
  const lastItem = schedule[schedule.length - 1];
  const lastDuration = lastItem.expectedWait ?? 0 + (lastItem.duration ?? 0);

  // Rough calculation based on number of items
  return schedule.reduce((total, item) => {
    if (item.type === 'ride') {
      return total + (item.expectedWait ?? 0) + (item.duration ?? 5) + WALK_TIME_BETWEEN_RIDES;
    }
    return total + (item.duration ?? 30);
  }, 0);
}

/**
 * Generate insights about the optimized schedule
 */
function generateInsights(
  schedule: ScheduleItem[],
  rides: RideWithPredictions[],
  waitTimeSaved: number,
  percentImprovement: number,
  preferences: { includeBreaks: boolean; duration: string; ropeDropMode?: boolean; parkId?: number }
): string[] {
  const insights: string[] = [];

  // Rope drop insight
  if (preferences.ropeDropMode && preferences.parkId) {
    const strategy = getRopeDropStrategy(preferences.parkId);
    if (strategy) {
      const ropeDropRides = schedule.filter(item =>
        item.type === 'ride' && item.reasoning?.includes('Rope drop target')
      );
      if (ropeDropRides.length > 0) {
        const totalSavings = ropeDropRides.reduce((sum, item) => {
          const match = item.reasoning?.match(/Save ~(\d+) min/);
          return sum + (match ? parseInt(match[1]) : 0);
        }, 0);
        insights.push(
          `🎯 Rope drop strategy: ${ropeDropRides.length} high-value targets, ~${totalSavings} min saved vs midday.`
        );
      }
    }
  }

  // Wait time savings insight
  if (waitTimeSaved > 15) {
    insights.push(
      `Optimized order saves ~${waitTimeSaved} min of waiting (${percentImprovement}% improvement).`
    );
  }

  // Headliner timing insight
  const headliners = rides.filter((r) => r.popularity === 'headliner');
  if (headliners.length > 0) {
    const headlinerItems = schedule.filter(
      (item) =>
        item.type === 'ride' &&
        headliners.some((h) => h.name === item.name)
    );

    if (headlinerItems.length > 0) {
      insights.push(
        `Headliner attractions scheduled during lower-wait windows.`
      );
    }
  }

  // Break insight
  const breaks = schedule.filter((item) => item.type !== 'ride');
  if (breaks.length > 0) {
    const breakSavings = sum(
      breaks.map((b) => b.breakInfo?.waitTimeSavings ?? 0)
    );
    if (breakSavings > 0) {
      insights.push(
        `Strategic breaks save ~${breakSavings} min while crowds thin out.`
      );
    }
  }

  // Location grouping insight - key optimization factor
  const lands = schedule
    .filter((item) => item.type === 'ride' && item.ride?.land)
    .map((item) => item.ride!.land!);

  if (lands.length >= 3) {
    // Count consecutive rides in same land
    let groupedCount = 0;
    for (let i = 1; i < lands.length; i++) {
      if (lands[i].toLowerCase() === lands[i - 1].toLowerCase()) {
        groupedCount++;
      }
    }
    const groupingPercent = Math.round((groupedCount / (lands.length - 1)) * 100);
    if (groupedCount >= 2) {
      insights.push(
        `${groupingPercent}% of rides grouped by location - minimizes walking time.`
      );
    }
  }

  // Below average wait insight
  const rideItemsForWait = schedule.filter((item) => item.type === 'ride' && item.ride);
  const belowAverageCount = rideItemsForWait.filter((item) => {
    if (!item.ride) return false;
    const avgWait = item.ride.hourlyPredictions.reduce((a, b) => a + b, 0) / item.ride.hourlyPredictions.length;
    return (item.expectedWait || 0) < avgWait;
  }).length;

  if (belowAverageCount > rideItemsForWait.length * 0.6) {
    insights.push(
      `${belowAverageCount} of ${rideItemsForWait.length} rides scheduled at below-average wait times.`
    );
  }

  // Early start insight
  const rideItems = schedule.filter((item) => item.type === 'ride');
  if (rideItems.length > 0) {
    const firstRide = rideItems[0];
    if (firstRide.time?.includes('9:') || firstRide.time?.includes('10:')) {
      insights.push(
        `Arriving early captures the lowest wait times of the day.`
      );
    }
  }

  return insights;
}

/**
 * Create an empty schedule with a message
 */
function createEmptySchedule(message: string): OptimizedSchedule {
  return {
    items: [],
    totalWaitTime: 0,
    totalWalkingTime: 0,
    totalDuration: 0,
    ridesScheduled: 0,
    breaksScheduled: 0,
    insights: [message],
    comparisonToBaseline: {
      waitTimeSaved: 0,
      percentImprovement: 0,
    },
  };
}

/**
 * Prioritize rides for rope drop mode
 * Orders rides by: 1) Selected strategy order, 2) User's selected target, 3) Rope drop targets by priority, 4) Then standard priority
 */
function prioritizeRidesForRopeDrop(
  rides: RideWithPredictions[],
  ropeDropStrategy: { targets: RopeDropTarget[]; suggestedOrder: string[] },
  userPriority: 'thrill' | 'family' | 'shows' | 'balanced',
  userSelectedTarget?: string,
  parkId?: number,
  selectedStrategy?: string
): RideWithPredictions[] {
  // If a strategy was selected, get the strategy's ride order
  const strategyRideOrder = selectedStrategy && parkId
    ? getStrategyRideOrder(selectedStrategy, parkId)
    : [];
  const strategyRideSet = new Set(strategyRideOrder.map(name => name.toLowerCase()));
  // Create a map of rope drop target priorities
  const targetPriorities = new Map<string, number>();
  // Create a map of rope drop target DELTAS (midday - rope drop = time saved by rope dropping)
  // Higher delta = ride "hurts more to skip" at rope drop
  const targetDeltas = new Map<string, number>();
  for (const target of ropeDropStrategy.targets) {
    // Lower number = higher priority (1 is highest)
    targetPriorities.set(target.rideName.toLowerCase(), target.priority);
    // Calculate delta (time saved by rope dropping)
    const delta = target.typicalMiddayWait - target.typicalRopeDropWait;
    targetDeltas.set(target.rideName.toLowerCase(), delta);
    // Also map aliases
    if (target.rideNameAliases) {
      for (const alias of target.rideNameAliases) {
        targetPriorities.set(alias.toLowerCase(), target.priority);
        targetDeltas.set(alias.toLowerCase(), delta);
      }
    }
  }

  // Also use suggested order for fine-tuning (fallback only)
  const suggestedOrderMap = new Map<string, number>();
  ropeDropStrategy.suggestedOrder.forEach((name, index) => {
    suggestedOrderMap.set(name.toLowerCase(), index);
  });

  // Helper to get delta for a ride (from targets or calculated from predictions)
  const getRideDelta = (ride: RideWithPredictions): number => {
    const rideName = ride.name.toLowerCase();
    // First check if it's a known rope drop target with defined delta
    if (targetDeltas.has(rideName)) {
      return targetDeltas.get(rideName)!;
    }
    // Check aliases
    const aliasMatch = [...targetDeltas.entries()].find(([key]) => rideName.includes(key));
    if (aliasMatch) {
      return aliasMatch[1];
    }
    // Fall back to calculating delta from hourlyPredictions
    // Peak is typically around noon-2pm (indices 3-5 for 9am start), rope drop is index 0
    if (ride.hourlyPredictions && ride.hourlyPredictions.length > 0) {
      const ropeDropWait = ride.hourlyPredictions[0] || 30;
      const peakWait = Math.max(...ride.hourlyPredictions);
      return peakWait - ropeDropWait;
    }
    // Last resort: estimate based on current wait time
    return (ride.currentWaitTime || 30) * 0.5;
  };

  // Normalize user's selected target for comparison
  const userTargetNormalized = userSelectedTarget?.toLowerCase();

  // Helper to check if a ride matches the user's selected target
  const isUserSelectedTarget = (rideName: string): boolean => {
    if (!userTargetNormalized) return false;
    const normalized = rideName.toLowerCase();
    return normalized === userTargetNormalized ||
           normalized.includes(userTargetNormalized) ||
           userTargetNormalized.includes(normalized);
  };

  // Helper to check if a ride matches a strategy ride name
  const getStrategyRideIndex = (rideName: string): number => {
    const normalized = rideName.toLowerCase();
    // Check for exact match first
    const exactIndex = strategyRideOrder.findIndex(name => name.toLowerCase() === normalized);
    if (exactIndex >= 0) return exactIndex;
    // Check for partial match (e.g., "Space Mountain" matches "Space Mountain Magic Kingdom")
    return strategyRideOrder.findIndex(name => {
      const strategyName = name.toLowerCase();
      return normalized.includes(strategyName) || strategyName.includes(normalized);
    });
  };

  return [...rides].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // HIGHEST PRIORITY: Selected strategy's ride order
    // If user selected a strategy, those rides come first in that specific order
    if (strategyRideOrder.length > 0) {
      const aStrategyIdx = getStrategyRideIndex(a.name);
      const bStrategyIdx = getStrategyRideIndex(b.name);
      const aInStrategy = aStrategyIdx >= 0;
      const bInStrategy = bStrategyIdx >= 0;

      // Strategy rides come before non-strategy rides
      if (aInStrategy && !bInStrategy) return -1;
      if (!aInStrategy && bInStrategy) return 1;

      // Both in strategy - maintain strategy order
      if (aInStrategy && bInStrategy) {
        return aStrategyIdx - bStrategyIdx;
      }
    }

    // SECOND PRIORITY: User's selected rope drop target always comes first
    const aIsUserTarget = isUserSelectedTarget(a.name);
    const bIsUserTarget = isUserSelectedTarget(b.name);
    if (aIsUserTarget && !bIsUserTarget) return -1;
    if (!aIsUserTarget && bIsUserTarget) return 1;

    // Second, check if either is a rope drop target
    const aIsTarget = targetPriorities.has(aName) ||
      [...targetPriorities.keys()].some(key => aName.includes(key));
    const bIsTarget = targetPriorities.has(bName) ||
      [...targetPriorities.keys()].some(key => bName.includes(key));

    // Rope drop targets come first
    if (aIsTarget && !bIsTarget) return -1;
    if (!aIsTarget && bIsTarget) return 1;

    // Both are rope drop targets - sort by target priority, then by delta
    if (aIsTarget && bIsTarget) {
      const aPriority = targetPriorities.get(aName) ??
        [...targetPriorities.entries()].find(([key]) => aName.includes(key))?.[1] ?? 99;
      const bPriority = targetPriorities.get(bName) ??
        [...targetPriorities.entries()].find(([key]) => bName.includes(key))?.[1] ?? 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority number = comes first
      }

      // Same priority - sort by DELTA (higher delta = "hurts more to skip" = comes first)
      const aDelta = getRideDelta(a);
      const bDelta = getRideDelta(b);
      return bDelta - aDelta; // Higher delta comes first
    }

    // Neither are rope drop targets - use delta-based sorting
    // The ride that "hurts most to skip" at rope drop should still come first
    const aDelta = getRideDelta(a);
    const bDelta = getRideDelta(b);
    if (Math.abs(aDelta - bDelta) > 10) {
      // Significant difference - use delta
      return bDelta - aDelta;
    }

    // Similar deltas - fall back to ride weights
    const weightA = getAdjustedWeight(a.name, userPriority);
    const weightB = getAdjustedWeight(b.name, userPriority);

    return weightB - weightA;
  });
}

/**
 * Async version of optimizeSchedule that uses Convex historical data for predictions
 * Falls back to hardcoded patterns when Convex client is null or insufficient data
 *
 * @param input - Optimization input with rides and preferences
 * @param convex - Optional Convex client for historical predictions
 * @returns Promise resolving to optimized schedule
 */
export async function optimizeScheduleAsync(
  input: OptimizationInput,
  convex: ConvexReactClient | null
): Promise<OptimizedSchedule> {
  const { selectedRides, preferences } = input;

  // Parse timing
  const arrivalHour = parseArrivalTime(preferences.arrivalTime);
  const departureHour = calculateDepartureHour(
    arrivalHour,
    preferences.duration,
    preferences.parkCloseHour
  );
  const visitDate = new Date(preferences.visitDate);

  // Enrich rides with predictions using Convex data when available
  const ridesWithPredictions: RideWithPredictions[] = await predictMultipleRidesWithHistory(
    convex,
    selectedRides.map((ride) => ({
      id: ride.id,
      name: ride.name,
      land: ride.land,
      isOpen: ride.isOpen,
      waitTime: ride.waitTime,
    })),
    visitDate
  );

  // Filter to only open rides
  const availableRides = ridesWithPredictions.filter((r) => r.isOpen);

  if (availableRides.length === 0) {
    return createEmptySchedule('No open rides available');
  }

  // Build the optimized schedule
  let schedule = buildSchedule(
    availableRides,
    arrivalHour,
    departureHour,
    preferences.priority,
    preferences.includeBreaks,
    preferences.ropeDropMode ?? false,
    preferences.parkId,
    preferences.ropeDropTarget,
    preferences.selectedStrategy
  );

  // Post-process: Add special wording for first and last rides (skip for park hopper sub-schedules)
  if (!preferences.skipFirstLastEnhancement) {
    schedule = enhanceFirstLastRideReasoning(schedule);
  }

  // Post-process: Detect large gaps and add exploration/rest suggestions
  schedule = addGapFillSuggestions(schedule);

  // Calculate totals
  const rideItems = schedule.filter((item) => item.type === 'ride');
  const breakItems = schedule.filter((item) => item.type !== 'ride');

  const totalWaitTime = sum(rideItems.map((item) => item.expectedWait ?? 0));
  const totalWalkingTime = rideItems.length * WALK_TIME_BETWEEN_RIDES;
  const totalDuration = calculateTotalDuration(schedule, arrivalHour);

  // Calculate comparison to baseline (naive approach)
  const baselineWait = calculateBaselineWait(availableRides, arrivalHour);
  const waitTimeSaved = Math.max(0, baselineWait - totalWaitTime);
  const percentImprovement = baselineWait > 0
    ? Math.round((waitTimeSaved / baselineWait) * 100)
    : 0;

  // Generate insights
  const insights = generateInsights(
    schedule,
    availableRides,
    waitTimeSaved,
    percentImprovement,
    {
      includeBreaks: preferences.includeBreaks,
      duration: preferences.duration,
      ropeDropMode: preferences.ropeDropMode,
      parkId: preferences.parkId,
    }
  );

  // Add prediction source insight if using Convex data
  const convexPoweredRides = ridesWithPredictions.filter(
    (r) => r.predictionSource === 'convex' || r.predictionSource === 'blended'
  );
  if (convexPoweredRides.length > 0) {
    insights.unshift(
      `Predictions powered by ${convexPoweredRides.length} rides with historical data.`
    );
  }

  return {
    items: schedule,
    totalWaitTime,
    totalWalkingTime,
    totalDuration,
    ridesScheduled: rideItems.length,
    breaksScheduled: breakItems.length,
    insights,
    comparisonToBaseline: {
      waitTimeSaved,
      percentImprovement,
    },
  };
}

export {
  buildSchedule,
  calculateBaselineWait,
  generateInsights,
  prioritizeRidesForRopeDrop,
};
