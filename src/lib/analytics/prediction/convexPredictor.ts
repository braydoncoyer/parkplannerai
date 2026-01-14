// Convex-Powered Wait Time Predictor
// Uses historical data from Convex to make intelligent predictions

import type { ConvexReactClient } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type {
  DayType,
  RidePopularity,
  PredictionConfidence,
  PredictionSource,
} from "../types";
import { classifyDayType } from "./dayTypeClassifier";
import {
  getHourlyPredictions as getHardcodedPredictions,
  BASE_WAIT_BY_POPULARITY,
} from "../data/historicalPatterns";
import { getSeasonalMultiplier } from "../data/seasonalMultipliers";

// Minimum data requirements
const MIN_WEEKS_FOR_CONVEX = 2;
const MIN_SAMPLES_PER_HOUR = 3;

// Blending weights for different data sources
const WEIGHTS = {
  SAME_DAY_OF_WEEK: 0.5, // 50% - Same day of week (last 4 weeks)
  YEAR_OVER_YEAR: 0.25, // 25% - Same time last year
  LIVE_DATA: 0.15, // 15% - Current live wait time
  HARDCODED: 0.1, // 10% - Hardcoded patterns as baseline
};

export interface ConvexPredictionResult {
  hourlyPredictions: number[];
  confidence: PredictionConfidence;
  dataSource: PredictionSource;
  reasoning: string;
  metadata?: {
    datesUsed: string[];
    sampleCount: number;
    hasYearOverYearData: boolean;
  };
}

interface SameDayData {
  hourlyAverages: Record<number, number>;
  sampleCount: number;
  datesCount: number;
  datesCovered: string[];
  confidence: "high" | "medium" | "low" | "insufficient";
}

interface YearOverYearData {
  hourlyAverages: Record<number, number>;
  sampleCount: number;
}

/**
 * Get predictions using Convex historical data
 * Falls back to hardcoded patterns when insufficient data
 */
export async function getConvexPredictions(
  convex: ConvexReactClient,
  rideExternalId: string,
  visitDate: Date | string,
  popularity: RidePopularity,
  currentWaitTime?: number | null
): Promise<ConvexPredictionResult> {
  try {
    // 1. Check data availability
    const availability = await convex.query(
      api.queries.predictions.getDataAvailability,
      { rideExternalId }
    );

    // 2. If no data or ride not found, use hardcoded fallback
    if (!availability || availability.totalDaysOfData < MIN_WEEKS_FOR_CONVEX * 7) {
      return fallbackToHardcoded(popularity, visitDate, currentWaitTime);
    }

    const targetDate =
      typeof visitDate === "string" ? new Date(visitDate) : visitDate;
    const dayOfWeek = targetDate.getDay();
    const dayType = classifyDayType(visitDate);

    // 3. Get same day-of-week data (last 4 weeks)
    const sameDayData = await convex.query(
      api.queries.predictions.getPredictionData,
      {
        rideExternalId,
        targetDate: targetDate.toISOString().split("T")[0],
        targetDayOfWeek: dayOfWeek,
        weeksBack: 4,
      }
    );

    // 4. Get year-over-year data if available
    let yearOverYearData: YearOverYearData | null = null;
    if (availability.hasYearOverYearData) {
      const yoyResult = await convex.query(
        api.queries.predictions.getYearOverYearData,
        {
          rideExternalId,
          targetDate: targetDate.toISOString().split("T")[0],
        }
      );
      if (yoyResult) {
        yearOverYearData = {
          hourlyAverages: yoyResult.hourlyAverages,
          sampleCount: yoyResult.sampleCount,
        };
      }
    }

    // 5. If no same-day data, fall back to hardcoded
    if (!sameDayData || sameDayData.sampleCount === 0) {
      return fallbackToHardcoded(popularity, visitDate, currentWaitTime);
    }

    // 6. Calculate blended predictions
    return blendPredictions({
      sameDayData: {
        hourlyAverages: sameDayData.hourlyAverages,
        sampleCount: sameDayData.sampleCount,
        datesCount: sameDayData.datesCount,
        datesCovered: sameDayData.datesCovered,
        confidence: sameDayData.confidence,
      },
      yearOverYearData,
      currentWaitTime: currentWaitTime ?? null,
      dayType,
      popularity,
      targetDate,
    });
  } catch (error) {
    console.warn("Convex prediction failed, using fallback:", error);
    return fallbackToHardcoded(popularity, visitDate, currentWaitTime);
  }
}

/**
 * Fallback to hardcoded patterns when insufficient Convex data
 */
function fallbackToHardcoded(
  popularity: RidePopularity,
  visitDate: Date | string,
  currentWaitTime?: number | null
): ConvexPredictionResult {
  const dayType = classifyDayType(visitDate);
  const hourlyPredictions = getHardcodedPredictions(
    popularity,
    dayType,
    currentWaitTime
  );

  return {
    hourlyPredictions,
    confidence: "fallback",
    dataSource: "hardcoded",
    reasoning:
      "Using pattern-based predictions. Historical data is still being collected.",
  };
}

/**
 * Blend multiple data sources into final prediction
 */
function blendPredictions(sources: {
  sameDayData: SameDayData;
  yearOverYearData: YearOverYearData | null;
  currentWaitTime: number | null;
  dayType: DayType;
  popularity: RidePopularity;
  targetDate: Date;
}): ConvexPredictionResult {
  const {
    sameDayData,
    yearOverYearData,
    currentWaitTime,
    dayType,
    popularity,
    targetDate,
  } = sources;

  // Get seasonal multiplier for the target date
  const seasonalMultiplier = getSeasonalMultiplier(targetDate);

  // Get hardcoded predictions as baseline
  const hardcodedPredictions = getHardcodedPredictions(
    popularity,
    dayType,
    null // Don't pass current wait to hardcoded, we blend it separately
  );

  // Build hourly predictions (9am - 9pm = hours 9-21)
  const hourlyPredictions: number[] = [];

  for (let hour = 9; hour <= 21; hour++) {
    let prediction = 0;
    let totalWeight = 0;

    // 1. Same day-of-week data (50% weight)
    if (sameDayData.hourlyAverages[hour] !== undefined) {
      prediction += sameDayData.hourlyAverages[hour] * WEIGHTS.SAME_DAY_OF_WEEK;
      totalWeight += WEIGHTS.SAME_DAY_OF_WEEK;
    }

    // 2. Year-over-year data (25% weight) - only if available
    if (yearOverYearData && yearOverYearData.hourlyAverages[hour] !== undefined) {
      prediction +=
        yearOverYearData.hourlyAverages[hour] * WEIGHTS.YEAR_OVER_YEAR;
      totalWeight += WEIGHTS.YEAR_OVER_YEAR;
    }

    // 3. Live data adjustment (15% weight) - if current wait is available
    if (currentWaitTime !== null && currentWaitTime > 0) {
      // Calculate expected current wait from patterns
      const currentHour = new Date().getHours();
      const expectedCurrentFromHistory =
        sameDayData.hourlyAverages[currentHour] ??
        hardcodedPredictions[currentHour - 9];

      if (expectedCurrentFromHistory > 0) {
        // Calculate how much current differs from expected
        const currentFactor = currentWaitTime / expectedCurrentFromHistory;
        // Adjust this hour's prediction based on current deviation
        const adjustedPrediction =
          (sameDayData.hourlyAverages[hour] ??
            hardcodedPredictions[hour - 9]) * currentFactor;
        prediction += adjustedPrediction * WEIGHTS.LIVE_DATA;
        totalWeight += WEIGHTS.LIVE_DATA;
      }
    }

    // 4. Hardcoded patterns (10% weight) - always included as baseline
    const hardcodedForHour = hardcodedPredictions[hour - 9] ?? 30;
    prediction += hardcodedForHour * WEIGHTS.HARDCODED;
    totalWeight += WEIGHTS.HARDCODED;

    // Normalize by total weight
    if (totalWeight > 0) {
      prediction = prediction / totalWeight;
    } else {
      // Fallback to hardcoded if no weights applied
      prediction = hardcodedForHour;
    }

    // Apply seasonal multiplier
    prediction = prediction * seasonalMultiplier;

    // Round and ensure non-negative
    hourlyPredictions.push(Math.max(0, Math.round(prediction)));
  }

  // Determine confidence level
  let confidence: PredictionConfidence = "low";
  if (
    sameDayData.datesCount >= 4 &&
    yearOverYearData &&
    currentWaitTime !== null
  ) {
    confidence = "high";
  } else if (sameDayData.datesCount >= 2) {
    confidence = "medium";
  }

  // Determine data source
  const dataSource: PredictionSource =
    yearOverYearData || currentWaitTime !== null ? "blended" : "convex";

  // Generate reasoning
  const reasoningParts: string[] = [];
  reasoningParts.push(
    `Based on ${sameDayData.datesCount} ${getDayName(targetDate.getDay())}s of historical data`
  );
  if (yearOverYearData) {
    reasoningParts.push("with year-over-year comparison");
  }
  if (currentWaitTime !== null) {
    reasoningParts.push("adjusted for current conditions");
  }
  if (seasonalMultiplier !== 1.0) {
    const seasonDesc =
      seasonalMultiplier > 1 ? "busier season" : "quieter season";
    reasoningParts.push(`(${seasonDesc})`);
  }

  return {
    hourlyPredictions,
    confidence,
    dataSource,
    reasoning: reasoningParts.join(" ") + ".",
    metadata: {
      datesUsed: sameDayData.datesCovered,
      sampleCount: sameDayData.sampleCount,
      hasYearOverYearData: yearOverYearData !== null,
    },
  };
}

/**
 * Get day name from day number
 */
function getDayName(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek];
}

/**
 * Check if Convex predictions should be used for a given ride
 * Returns false if insufficient data, true otherwise
 */
export async function shouldUseConvexPredictions(
  convex: ConvexReactClient,
  rideExternalId: string
): Promise<boolean> {
  try {
    const availability = await convex.query(
      api.queries.predictions.getDataAvailability,
      { rideExternalId }
    );

    return (
      availability !== null &&
      availability.totalDaysOfData >= MIN_WEEKS_FOR_CONVEX * 7
    );
  } catch {
    return false;
  }
}

/**
 * Get overall prediction system status
 */
export async function getPredictionSystemStatus(
  convex: ConvexReactClient
): Promise<{
  isActive: boolean;
  dataAge: number;
  milestone: string;
  nextMilestone: string;
}> {
  try {
    const availability = await convex.query(
      api.queries.predictions.getOverallDataAvailability,
      {}
    );

    if (!availability || availability.totalDaysOfData === 0) {
      return {
        isActive: false,
        dataAge: 0,
        milestone: "No data collected yet",
        nextMilestone: "2 weeks - Basic predictions",
      };
    }

    const days = availability.totalDaysOfData;

    let milestone = "Collecting data";
    if (days >= 365) {
      milestone = "Full year-over-year predictions";
    } else if (days >= 90) {
      milestone = "Seasonal patterns available";
    } else if (days >= 28) {
      milestone = "Monthly patterns available";
    } else if (days >= 14) {
      milestone = "Basic predictions active";
    }

    let nextMilestone = "Complete!";
    if (days < 14) {
      nextMilestone = `${14 - days} days to basic predictions`;
    } else if (days < 28) {
      nextMilestone = `${28 - days} days to monthly patterns`;
    } else if (days < 90) {
      nextMilestone = `${90 - days} days to seasonal patterns`;
    } else if (days < 365) {
      nextMilestone = `${365 - days} days to year-over-year`;
    }

    return {
      isActive: days >= 14,
      dataAge: days,
      milestone,
      nextMilestone,
    };
  } catch {
    return {
      isActive: false,
      dataAge: 0,
      milestone: "Error checking status",
      nextMilestone: "Unknown",
    };
  }
}
