// Multi-Day Schedule Optimizer
// Distributes rides across multiple days for optimal wait times

import type {
  RideWithPredictions,
  MultiDaySchedule,
  DaySchedule,
  OptimizationInput,
  ScheduleItem,
  RideDayAssignment,
  DayType,
  RideCategory,
} from '../types';
import { predictRideWaitTimes, getPredictedWaitForHour } from '../prediction/waitTimePredictor';
import { classifyDayType } from '../prediction/dayTypeClassifier';
import {
  analyzeBreakOpportunity,
  createScheduledBreak,
  shouldConsiderBreak,
} from './breakScheduler';
import {
  selectBestRide,
  scoreRideForSlot,
  generateRideReasoning,
} from './rideOrderer';
import {
  formatTime,
  parseArrivalTime,
  calculateDepartureHour,
  addMinutes,
  sum,
} from '../utils/timeUtils';

const WALK_TIME_BETWEEN_RIDES = 10;
const MAX_RIDES_PER_HALF_DAY = 5;
const MAX_RIDES_PER_FULL_DAY = 10;

/**
 * Main multi-day optimization function
 * Distributes rides across days based on predicted wait times
 */
export function optimizeMultiDaySchedule(input: OptimizationInput): MultiDaySchedule {
  const { selectedRides, preferences } = input;
  const numberOfDays = preferences.numberOfDays || 1;

  // Generate dates for each day
  const dates = generateDates(preferences.visitDate, numberOfDays);

  // Enrich all rides with predictions for each day
  const ridesByDay: Map<number, RideWithPredictions[]> = new Map();

  for (let dayNum = 1; dayNum <= numberOfDays; dayNum++) {
    const dayDate = dates[dayNum - 1];
    const ridesWithPredictions = selectedRides.map((ride) =>
      predictRideWaitTimes(
        {
          id: ride.id,
          name: ride.name,
          land: ride.land,
          isOpen: ride.isOpen,
          waitTime: ride.waitTime,
        },
        dayDate
      )
    );
    ridesByDay.set(dayNum, ridesWithPredictions.filter((r) => r.isOpen));
  }

  // Assign rides to optimal days
  const assignments = assignRidesToDays(
    ridesByDay,
    dates,
    preferences.duration,
    preferences.priority
  );

  // Build schedule for each day
  const daySchedules: DaySchedule[] = [];
  let totalWaitTime = 0;
  let totalRidesScheduled = 0;

  for (let dayNum = 1; dayNum <= numberOfDays; dayNum++) {
    const dayDate = dates[dayNum - 1];
    const dayType = classifyDayType(dayDate);
    const dayLabel = formatDayLabel(dayDate, dayNum);

    // Get rides assigned to this day
    const ridesForDay = assignments
      .filter((a) => a.assignedDay === dayNum)
      .map((a) => a.ride);

    if (ridesForDay.length === 0) {
      daySchedules.push(createEmptyDaySchedule(dayDate, dayNum, dayLabel, dayType));
      continue;
    }

    // Build optimized schedule for this day
    const schedule = buildDaySchedule(
      ridesForDay,
      parseArrivalTime(preferences.arrivalTime),
      calculateDepartureHour(parseArrivalTime(preferences.arrivalTime), preferences.duration),
      preferences.priority,
      preferences.includeBreaks
    );

    const rideItems = schedule.filter((item) => item.type === 'ride');
    const dayWaitTime = sum(rideItems.map((item) => item.expectedWait ?? 0));

    daySchedules.push({
      date: dayDate.toISOString().split('T')[0],
      dayNumber: dayNum,
      dayLabel,
      dayType,
      items: schedule,
      totalWaitTime: dayWaitTime,
      totalWalkingTime: rideItems.length * WALK_TIME_BETWEEN_RIDES,
      ridesScheduled: rideItems.length,
      breaksScheduled: schedule.filter((item) => item.type !== 'ride').length,
      insights: generateDayInsights(schedule, ridesForDay, dayType),
    });

    totalWaitTime += dayWaitTime;
    totalRidesScheduled += rideItems.length;
  }

  // Generate headliner strategy explanations
  const headlinerStrategy = generateHeadlinerStrategy(assignments, dates);

  // Generate overall insights
  const overallInsights = generateOverallInsights(
    daySchedules,
    assignments,
    numberOfDays
  );

  // Calculate baseline comparison
  const baselineWait = calculateMultiDayBaseline(ridesByDay, preferences);
  const waitTimeSaved = Math.max(0, baselineWait - totalWaitTime);

  return {
    days: daySchedules,
    totalWaitTime,
    totalRidesScheduled,
    overallInsights,
    headlinerStrategy,
    comparisonToBaseline: {
      waitTimeSaved,
      percentImprovement: baselineWait > 0
        ? Math.round((waitTimeSaved / baselineWait) * 100)
        : 0,
    },
  };
}

/**
 * Generate array of dates starting from visit date
 */
function generateDates(startDate: string, numberOfDays: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Format day label like "Day 1 - Monday, Apr 15"
 */
function formatDayLabel(date: Date, dayNumber: number): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Day ${dayNumber} - ${dayName}, ${dateStr}`;
}

/**
 * Assign rides to optimal days based on wait time predictions
 */
function assignRidesToDays(
  ridesByDay: Map<number, RideWithPredictions[]>,
  dates: Date[],
  duration: 'half-day' | 'full-day',
  priority: 'thrill' | 'family' | 'shows' | 'balanced'
): RideDayAssignment[] {
  const numberOfDays = dates.length;
  const maxRidesPerDay = duration === 'full-day' ? MAX_RIDES_PER_FULL_DAY : MAX_RIDES_PER_HALF_DAY;
  const assignments: RideDayAssignment[] = [];
  const ridesPerDay: Map<number, number> = new Map();

  // Initialize rides per day counter
  for (let i = 1; i <= numberOfDays; i++) {
    ridesPerDay.set(i, 0);
  }

  // Get all unique rides (from day 1 as reference)
  const allRides = ridesByDay.get(1) || [];

  // Sort rides by popularity (headliners first, then popular, etc.)
  const sortedRides = [...allRides].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      headliner: 4,
      popular: 3,
      moderate: 2,
      low: 1,
    };
    return (priorityOrder[b.popularity] || 0) - (priorityOrder[a.popularity] || 0);
  });

  // Assign each ride to its optimal day
  for (const ride of sortedRides) {
    // Calculate average wait time for this ride on each day
    const waitsByDay: { day: number; avgWait: number; dayType: DayType }[] = [];

    for (let dayNum = 1; dayNum <= numberOfDays; dayNum++) {
      const dayRides = ridesByDay.get(dayNum) || [];
      const rideOnDay = dayRides.find((r) => r.id === ride.id);

      if (rideOnDay) {
        // Calculate average wait across reasonable hours (9am-6pm)
        const relevantHours = rideOnDay.hourlyPredictions.slice(0, 10);
        const avgWait = sum(relevantHours) / relevantHours.length;
        const dayType = classifyDayType(dates[dayNum - 1]);

        waitsByDay.push({ day: dayNum, avgWait, dayType });
      }
    }

    // Find the best day (lowest wait AND has capacity)
    waitsByDay.sort((a, b) => a.avgWait - b.avgWait);

    let assignedDay = 1;
    let reason = '';

    for (const option of waitsByDay) {
      const currentCount = ridesPerDay.get(option.day) || 0;
      if (currentCount < maxRidesPerDay) {
        assignedDay = option.day;

        // Generate reason
        if (ride.popularity === 'headliner' || ride.popularity === 'popular') {
          const bestWait = option.avgWait;
          const worstOption = waitsByDay[waitsByDay.length - 1];

          if (worstOption && worstOption.avgWait > bestWait * 1.2) {
            const savings = Math.round(worstOption.avgWait - bestWait);
            reason = `${option.dayType === 'weekday' ? 'Weekday' : option.dayType === 'weekend' ? 'Weekend' : 'Holiday'} has ~${savings} min shorter waits`;
          } else {
            reason = `Best available day for this attraction`;
          }
        } else {
          reason = `Grouped for efficient day planning`;
        }

        break;
      }
    }

    // Update counter
    ridesPerDay.set(assignedDay, (ridesPerDay.get(assignedDay) || 0) + 1);

    // Get the ride predictions for the assigned day
    const dayRides = ridesByDay.get(assignedDay) || [];
    const rideOnDay = dayRides.find((r) => r.id === ride.id) || ride;

    assignments.push({
      ride: rideOnDay,
      assignedDay,
      assignedDate: dates[assignedDay - 1].toISOString().split('T')[0],
      reason,
      predictedWaitOnDay: Math.round(sum(rideOnDay.hourlyPredictions.slice(0, 10)) / 10),
      alternativeWaits: waitsByDay.map((w) => ({ day: w.day, wait: Math.round(w.avgWait) })),
    });
  }

  return assignments;
}

/**
 * Build optimized schedule for a single day
 */
function buildDaySchedule(
  rides: RideWithPredictions[],
  arrivalHour: number,
  departureHour: number,
  priority: 'thrill' | 'family' | 'shows' | 'balanced',
  includeBreaks: boolean
): ScheduleItem[] {
  const schedule: ScheduleItem[] = [];
  const scheduledRideIds = new Set<string | number>();

  let currentHour = arrivalHour;
  let currentMinute = 0;
  let lastCategory: RideCategory | null = null;
  let lastLand: string | null = null;
  let minutesSinceBreak = 0;
  let ridesSinceBreak = 0;

  while (currentHour < departureHour && scheduledRideIds.size < rides.length) {
    const remainingRides = rides.filter((r) => !scheduledRideIds.has(r.id));

    if (remainingRides.length === 0) break;

    // Check for breaks
    if (includeBreaks && shouldConsiderBreak(minutesSinceBreak, ridesSinceBreak)) {
      const breakAnalysis = analyzeBreakOpportunity(remainingRides, currentHour, includeBreaks);

      if (breakAnalysis.shouldBreak) {
        const breakItem = createScheduledBreak(breakAnalysis, currentHour, currentMinute);

        schedule.push({
          time: formatTime(currentHour, currentMinute),
          type: breakAnalysis.breakType === 'meal' ? 'meal' : 'break',
          name: breakAnalysis.breakType === 'meal'
            ? currentHour >= 17 ? 'Dinner Break' : 'Lunch Break'
            : breakAnalysis.breakType === 'rest' ? 'Rest Break' : 'Snack Break',
          duration: breakAnalysis.breakDuration,
          reasoning: breakAnalysis.reason,
          breakInfo: breakItem,
        });

        const newTime = addMinutes(currentHour, currentMinute, breakAnalysis.breakDuration);
        currentHour = newTime.hour;
        currentMinute = newTime.minute;
        minutesSinceBreak = 0;
        ridesSinceBreak = 0;
        continue;
      }
    }

    // Select best ride
    const bestRide = selectBestRide(remainingRides, currentHour, lastCategory, lastLand, priority);

    if (!bestRide) break;

    const score = scoreRideForSlot(bestRide, currentHour, lastCategory, lastLand, priority);
    const reasoning = generateRideReasoning(bestRide, currentHour, score, lastLand);
    const predictedWait = getPredictedWaitForHour(bestRide, currentHour);

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
    lastCategory = bestRide.category;
    lastLand = bestRide.land || null;

    const totalTime = predictedWait + bestRide.duration + WALK_TIME_BETWEEN_RIDES;
    const newTime = addMinutes(currentHour, currentMinute, totalTime);
    currentHour = newTime.hour;
    currentMinute = newTime.minute;

    minutesSinceBreak += totalTime;
    ridesSinceBreak++;
  }

  return schedule;
}

/**
 * Generate insights for a single day
 */
function generateDayInsights(
  schedule: ScheduleItem[],
  rides: RideWithPredictions[],
  dayType: DayType
): string[] {
  const insights: string[] = [];

  const headliners = rides.filter((r) => r.popularity === 'headliner');
  if (headliners.length > 0) {
    insights.push(`${headliners.length} headliner${headliners.length > 1 ? 's' : ''} scheduled for optimal times.`);
  }

  if (dayType === 'weekday') {
    insights.push('Weekday crowds typically lighter than weekends.');
  } else if (dayType === 'holiday') {
    insights.push('Holiday crowds expected - strategic timing is key.');
  }

  // Location grouping insight
  const lands = schedule
    .filter((item) => item.type === 'ride' && item.ride?.land)
    .map((item) => item.ride!.land!);

  if (lands.length >= 3) {
    let groupedCount = 0;
    for (let i = 1; i < lands.length; i++) {
      if (lands[i].toLowerCase() === lands[i - 1].toLowerCase()) {
        groupedCount++;
      }
    }
    if (groupedCount >= 2) {
      insights.push('Rides grouped by location to minimize walking.');
    }
  }

  return insights;
}

/**
 * Generate strategy explanations for headliner placement
 */
function generateHeadlinerStrategy(
  assignments: RideDayAssignment[],
  dates: Date[]
): string[] {
  const strategy: string[] = [];

  const headliners = assignments.filter(
    (a) => a.ride.popularity === 'headliner' || a.ride.popularity === 'popular'
  );

  for (const assignment of headliners) {
    const dayType = classifyDayType(dates[assignment.assignedDay - 1]);
    const dayLabel = dayType === 'weekday' ? 'weekday' : dayType === 'weekend' ? 'weekend' : 'holiday';

    // Check if there were significant savings
    const alternatives = assignment.alternativeWaits;
    if (alternatives.length > 1) {
      const bestWait = assignment.predictedWaitOnDay;
      const worstWait = Math.max(...alternatives.map((a) => a.wait));

      if (worstWait > bestWait * 1.15) {
        strategy.push(
          `${assignment.ride.name} → Day ${assignment.assignedDay} (${dayLabel}): Saves ~${worstWait - bestWait} min vs worst day`
        );
      }
    }
  }

  if (strategy.length === 0 && headliners.length > 0) {
    strategy.push('Headliners distributed across days for balanced experiences.');
  }

  return strategy;
}

/**
 * Generate overall multi-day insights
 */
function generateOverallInsights(
  daySchedules: DaySchedule[],
  assignments: RideDayAssignment[],
  numberOfDays: number
): string[] {
  const insights: string[] = [];

  const totalRides = daySchedules.reduce((sum, day) => sum + day.ridesScheduled, 0);
  const avgRidesPerDay = Math.round(totalRides / numberOfDays);

  insights.push(`${totalRides} rides across ${numberOfDays} days (~${avgRidesPerDay} per day).`);

  // Check for weekday advantage
  const weekdaySchedules = daySchedules.filter((d) => d.dayType === 'weekday');
  if (weekdaySchedules.length > 0 && weekdaySchedules.length < numberOfDays) {
    const weekdayHeadliners = assignments.filter(
      (a) =>
        (a.ride.popularity === 'headliner' || a.ride.popularity === 'popular') &&
        classifyDayType(new Date(a.assignedDate)) === 'weekday'
    );
    if (weekdayHeadliners.length > 0) {
      insights.push(
        `${weekdayHeadliners.length} popular attraction${weekdayHeadliners.length > 1 ? 's' : ''} scheduled on weekdays for lower waits.`
      );
    }
  }

  return insights;
}

/**
 * Calculate baseline wait time without optimization
 */
function calculateMultiDayBaseline(
  ridesByDay: Map<number, RideWithPredictions[]>,
  preferences: OptimizationInput['preferences']
): number {
  let totalWait = 0;
  const arrivalHour = parseArrivalTime(preferences.arrivalTime);

  // Just sum up average waits for all rides
  const allRides = ridesByDay.get(1) || [];
  for (const ride of allRides) {
    const avgWait = sum(ride.hourlyPredictions.slice(0, 10)) / 10;
    totalWait += avgWait;
  }

  return Math.round(totalWait);
}

/**
 * Create empty day schedule
 */
function createEmptyDaySchedule(
  date: Date,
  dayNumber: number,
  dayLabel: string,
  dayType: DayType
): DaySchedule {
  return {
    date: date.toISOString().split('T')[0],
    dayNumber,
    dayLabel,
    dayType,
    items: [],
    totalWaitTime: 0,
    totalWalkingTime: 0,
    ridesScheduled: 0,
    breaksScheduled: 0,
    insights: ['No rides scheduled for this day.'],
  };
}

export { assignRidesToDays, generateHeadlinerStrategy };
