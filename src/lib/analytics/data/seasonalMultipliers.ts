// Seasonal Crowd Multipliers
// Adjusts predictions based on time of year

/**
 * Seasonal crowd multipliers by week of year
 * Week 1 = Jan 1-7, Week 52 = Dec 25-31
 *
 * Multiplier of 1.0 = normal crowd level
 * Values > 1.0 indicate busier periods
 * Values < 1.0 indicate quieter periods
 */
export const SEASONAL_MULTIPLIERS: Record<number, number> = {
  // === WINTER HOLIDAYS (very high) ===
  1: 1.5,   // New Year's week (Jan 1-7)
  52: 1.6,  // Christmas week (Dec 25-31)
  51: 1.4,  // Week before Christmas (Dec 18-24)

  // === SPRING BREAK (high) ===
  // Peak spring break season varies but typically March-April
  10: 1.2,  // Early March
  11: 1.3,  // Mid March
  12: 1.4,  // Late March (peak spring break)
  13: 1.5,  // Early April (peak spring break)
  14: 1.4,  // Mid April
  15: 1.3,  // Late April
  16: 1.2,  // Easter weekend often falls here

  // === MEMORIAL DAY (high) ===
  21: 1.2,  // Week before Memorial Day
  22: 1.3,  // Memorial Day week (late May)

  // === SUMMER (high) ===
  23: 1.2,  // Early June - schools letting out
  24: 1.3,  // Mid June
  25: 1.4,  // Late June
  26: 1.5,  // Early July (July 4th week)
  27: 1.5,  // Mid July (peak summer)
  28: 1.4,  // Late July
  29: 1.3,  // Early August
  30: 1.2,  // Mid August
  31: 1.1,  // Late August - schools starting back

  // === LABOR DAY (moderate-high) ===
  35: 1.2,  // Labor Day week (early September)
  36: 1.1,  // Post Labor Day

  // === FALL (moderate) ===
  // Generally quieter period (September-October)
  37: 0.9,  // September
  38: 0.9,
  39: 0.9,
  40: 0.95, // Early October
  41: 1.0,  // Mid October
  42: 1.1,  // Late October (Halloween)
  43: 1.2,  // Halloween week

  // === THANKSGIVING (high) ===
  47: 1.4,  // Thanksgiving week
  48: 1.2,  // Post Thanksgiving

  // Default (unlisted weeks) returns 1.0 via getSeasonalMultiplier
};

/**
 * Get the week number of the year for a date
 * Week 1 starts on January 1st
 */
export function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil((diff + 1) / oneWeek);
}

/**
 * Get seasonal multiplier for a specific date
 */
export function getSeasonalMultiplier(date: Date): number {
  const weekOfYear = getWeekOfYear(date);
  return SEASONAL_MULTIPLIERS[weekOfYear] ?? 1.0;
}

/**
 * Get a description of the season/period for a date
 */
export function getSeasonDescription(date: Date): {
  name: string;
  crowdLevel: 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
  recommendation: string;
} {
  const multiplier = getSeasonalMultiplier(date);
  const weekOfYear = getWeekOfYear(date);

  // Determine period name
  let name = 'Regular Season';

  if (weekOfYear === 52 || weekOfYear === 1) {
    name = 'Christmas/New Year';
  } else if (weekOfYear >= 51) {
    name = 'Holiday Season';
  } else if (weekOfYear >= 11 && weekOfYear <= 16) {
    name = 'Spring Break Season';
  } else if (weekOfYear >= 23 && weekOfYear <= 31) {
    name = 'Summer Season';
  } else if (weekOfYear === 26) {
    name = 'July 4th Week';
  } else if (weekOfYear >= 47 && weekOfYear <= 48) {
    name = 'Thanksgiving';
  } else if (weekOfYear >= 42 && weekOfYear <= 43) {
    name = 'Halloween Season';
  } else if (weekOfYear >= 37 && weekOfYear <= 40) {
    name = 'Fall Off-Season';
  }

  // Determine crowd level
  let crowdLevel: 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
  let recommendation: string;

  if (multiplier >= 1.5) {
    crowdLevel = 'very-high';
    recommendation = 'Expect long waits. Arrive early, use skip-the-line options if available.';
  } else if (multiplier >= 1.3) {
    crowdLevel = 'high';
    recommendation = 'Above average crowds. Plan your must-do rides for early morning or late evening.';
  } else if (multiplier >= 1.1) {
    crowdLevel = 'moderate';
    recommendation = 'Normal to slightly elevated crowds. Standard touring strategy should work.';
  } else if (multiplier >= 0.95) {
    crowdLevel = 'low';
    recommendation = 'Below average crowds. Great time to visit with shorter waits.';
  } else {
    crowdLevel = 'very-low';
    recommendation = 'Off-season with minimal crowds. You can be flexible with your schedule.';
  }

  return {
    name,
    crowdLevel,
    recommendation,
  };
}

/**
 * Check if a date falls in a peak period
 */
export function isPeakSeason(date: Date): boolean {
  const multiplier = getSeasonalMultiplier(date);
  return multiplier >= 1.3;
}

/**
 * Check if a date falls in an off-peak period
 */
export function isOffPeakSeason(date: Date): boolean {
  const multiplier = getSeasonalMultiplier(date);
  return multiplier < 1.0;
}

/**
 * Get the best weeks to visit (lowest seasonal multipliers)
 */
export function getBestWeeksToVisit(): { week: number; multiplier: number; months: string }[] {
  // Find weeks with lowest multipliers
  const allWeeks: { week: number; multiplier: number }[] = [];

  for (let week = 1; week <= 52; week++) {
    allWeeks.push({
      week,
      multiplier: SEASONAL_MULTIPLIERS[week] ?? 1.0,
    });
  }

  // Sort by multiplier ascending
  allWeeks.sort((a, b) => a.multiplier - b.multiplier);

  // Take top 10 and add month descriptions
  return allWeeks.slice(0, 10).map((w) => {
    // Convert week number to approximate month
    const approximateDate = new Date(2025, 0, 1 + (w.week - 1) * 7);
    const monthName = approximateDate.toLocaleString('en-US', { month: 'long' });

    return {
      ...w,
      months: monthName,
    };
  });
}
