/**
 * Theme Park Schedule Optimizer - Slot Scorer
 *
 * Multi-factor scoring algorithm for determining the best time slot for a ride.
 * Weights: Wait Time (40%) + Proximity to Previous (30%) + Proximity to Next (20%) + Importance (10%)
 */

import type {
  RideWithPredictions,
  ScheduleGap,
  SlotCandidate,
  SlotScore,
  SchedulingContext,
} from '../types';
import {
  SLOT_SCORING_WEIGHTS,
  OPTIMAL_HOUR_BONUS,
  PEAK_HOUR_PENALTY,
  RIDE_IMPORTANCE_SCORES,
  DEFAULT_RIDE_DURATION,
  DISTANT_LAND_WALK_TIME,
  ADJACENT_LAND_WALK_TIME,
  DISTANT_LAND_NET_BENEFIT_THRESHOLD,
  ADJACENT_LAND_NET_BENEFIT_THRESHOLD,
  WALK_TIME_FRICTION,
} from '../constants';
import { calculateSavingsDelta } from '../utils/timeUtils';
import {
  getInterpolatedWaitTime,
  findOptimalPredictionHour,
  findPeakPredictionHour,
  getHourFromMinutes,
} from '../utils/timeUtils';
import { calculateWalkTime, calculateProximityScore } from './proximityCalculator';
import { getItemBefore, getItemAfter } from './timeBlockManager';

// =============================================================================
// NET BENEFIT CALCULATION
// =============================================================================

/**
 * Information about the net benefit of scheduling a ride at a specific slot
 */
interface NetBenefitInfo {
  waitAtSlot: number;       // Wait time at this slot
  averageWait: number;      // Average wait across all hours
  waitSavings: number;      // How much wait time saved vs average
  walkFromPrev: number;     // Walk time from previous ride
  walkCost: number;         // Walk cost with friction applied
  netBenefit: number;       // Wait savings - walk cost (in minutes)
  netBenefitScore: number;  // Normalized 0-100 score
}

/**
 * Calculate the net benefit of scheduling a ride at a specific slot.
 *
 * Net Benefit = Wait Time Savings - (Walk Time Cost × Friction)
 *
 * This explicitly compares the wait time saved by this slot vs the
 * walk time cost to get there, ensuring we don't suggest walking
 * across the park for minimal wait savings.
 */
function calculateNetBenefit(
  ride: RideWithPredictions,
  gap: ScheduleGap,
  _context: SchedulingContext
): NetBenefitInfo {
  const predictions = ride.hourlyPredictions ?? [];
  const waitAtSlot = getInterpolatedWaitTime(gap.start, predictions);

  // Calculate average wait (baseline for savings calculation)
  const averageWait = predictions.length > 0
    ? predictions.reduce((a, b) => a + b, 0) / predictions.length
    : waitAtSlot;

  // Wait savings = how much better than average this slot is
  const waitSavings = Math.max(0, averageWait - waitAtSlot);

  // Calculate walk time from previous ride
  const walkFromPrev = calculateWalkTime(gap.previousLand, ride.land);

  // Apply friction: walking feels worse than waiting in line
  const walkCost = walkFromPrev * WALK_TIME_FRICTION;

  // Net benefit in minutes (positive = good, negative = bad trade-off)
  const netBenefit = waitSavings - walkCost;

  // Normalize to 0-100 score
  // +20 min net benefit = 100, -10 min = 0, linear between
  const netBenefitScore = Math.max(0, Math.min(100,
    ((netBenefit + 10) / 30) * 100
  ));

  return {
    waitAtSlot,
    averageWait,
    waitSavings,
    walkFromPrev,
    walkCost,
    netBenefit,
    netBenefitScore,
  };
}

/**
 * Calculate pure proximity score based on walk distance.
 * This is independent of wait time savings - closer is always better.
 *
 * Same land (0-3 min): 100
 * Adjacent (4-7 min): 70-85
 * Moderate (8-11 min): 40-60
 * Distant (12+ min): 0-35
 */
function calculatePureProximityScore(walkTime: number): number {
  if (walkTime <= 3) {
    // Same land - excellent
    return 100;
  }
  if (walkTime <= 5) {
    // Adjacent land - very good
    return 85;
  }
  if (walkTime <= 8) {
    // Nearby - good
    return 65;
  }
  if (walkTime <= 12) {
    // Moderate distance
    return 40;
  }
  // Distant - poor
  // Linear falloff from 35 at 12 min to 0 at 20 min
  return Math.max(0, 35 - (walkTime - 12) * 4.375);
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculate delta-adjusted scoring weights based on ride's savings potential.
 *
 * High delta rides (>30 min): prioritize wait time (they benefit most from good timing)
 * Low delta rides (<15 min): prioritize proximity (routing efficiency matters more)
 *
 * We use TWO location-related scores:
 * - proximity: Pure "closer is better" regardless of time (0-100)
 * - netBenefit: "Is the walk worth the savings?" (can be negative during peak)
 */
function getDeltaAdjustedWeights(delta: number): {
  waitTime: number;
  proximity: number;
  netBenefit: number;
  importance: number;
} {
  // High delta (>30 min): this ride REALLY benefits from good timing
  // Still consider routing, but wait time is primary concern
  if (delta > 30) {
    return {
      waitTime: 0.50,      // Prioritize getting good wait times
      proximity: 0.20,     // Still prefer nearby, but not critical
      netBenefit: 0.20,    // Consider if walk is worth the savings
      importance: 0.10,
    };
  }

  // Low delta (<15 min): timing barely matters, focus on routing efficiency
  // Don't walk across the park for minimal wait savings
  if (delta < 15) {
    return {
      waitTime: 0.10,      // Don't fight for optimal times
      proximity: 0.50,     // Heavily prioritize staying nearby
      netBenefit: 0.30,    // Also consider net benefit for trade-offs
      importance: 0.10,
    };
  }

  // Medium delta (15-30 min): balanced approach
  return {
    waitTime: 0.30,
    proximity: 0.35,
    netBenefit: 0.25,
    importance: 0.10,
  };
}

/**
 * Score a slot for a specific ride
 * Higher score = better slot
 *
 * Uses delta-adjusted weights with net benefit scoring:
 * - High delta rides prioritize wait time (timing matters most)
 * - Low delta rides prioritize net benefit (routing efficiency matters)
 *
 * Net benefit = wait savings - walk cost, ensuring we don't suggest
 * walking across the park for minimal wait savings.
 *
 * @param ride The ride to score
 * @param gap The gap being considered
 * @param context Current scheduling context
 * @returns Complete score with breakdown
 */
export function scoreSlotForRide(
  ride: RideWithPredictions,
  gap: ScheduleGap,
  context: SchedulingContext
): SlotScore {
  const predictions = ride.hourlyPredictions ?? [];

  // Calculate wait time at this slot
  const waitTime = getInterpolatedWaitTime(gap.start, predictions);

  // Find optimal and peak for comparison
  const optimal = findOptimalPredictionHour(predictions);
  const peak = findPeakPredictionHour(predictions);

  // Calculate the ride's delta (peak - optimal) to determine how much it benefits from good timing
  const delta = peak.wait - optimal.wait;

  // Calculate net benefit (wait savings vs walk cost)
  const netBenefitInfo = calculateNetBenefit(ride, gap, context);

  // Calculate individual score components
  const waitTimeScore = calculateWaitTimeScore(waitTime, optimal.wait, peak.wait);
  const importanceScore = calculateImportanceScore(ride);

  // Calculate pure proximity score (closer = better, regardless of wait savings)
  // This ensures we prefer nearby rides even during peak hours
  const proximityScore = calculatePureProximityScore(netBenefitInfo.walkFromPrev);

  // Determine if this is the ride's optimal hour
  const slotHour = getHourFromMinutes(gap.start);
  const isOptimalHour = slotHour === optimal.hour;

  // Apply bonuses/penalties (scaled by delta - high delta rides get bigger bonuses)
  let bonusScore = 0;
  const deltaMultiplier = Math.min(delta / 30, 1.5);
  if (isOptimalHour) {
    bonusScore += OPTIMAL_HOUR_BONUS * deltaMultiplier;
  }
  if (slotHour === peak.hour) {
    bonusScore += PEAK_HOUR_PENALTY * deltaMultiplier;
  }

  // Apply penalty for distant walks with poor net benefit
  // This discourages walking across the park when savings don't justify it
  if (netBenefitInfo.netBenefit < 0 && netBenefitInfo.walkFromPrev >= DISTANT_LAND_WALK_TIME) {
    bonusScore -= 20 * Math.abs(netBenefitInfo.netBenefit / 10);
  }

  // Use delta-adjusted weights
  const weights = getDeltaAdjustedWeights(delta);

  // Calculate weighted total with both proximity and net benefit
  const total =
    waitTimeScore * weights.waitTime +
    proximityScore * weights.proximity +
    netBenefitInfo.netBenefitScore * weights.netBenefit +
    importanceScore * weights.importance +
    bonusScore;

  // Generate reasoning with net benefit context
  const reasoning = generateScoreReasoningWithNetBenefit(
    ride,
    waitTime,
    optimal,
    isOptimalHour,
    netBenefitInfo
  );

  return {
    total: Math.round(total),
    waitTimeScore: Math.round(waitTimeScore * weights.waitTime),
    proximityToPrevScore: Math.round(proximityScore * weights.proximity),
    proximityToNextScore: Math.round(proximityScore * weights.proximity),
    importanceScore: Math.round(importanceScore * weights.importance),
    isOptimalHour,
    reasoning,
  };
}

// =============================================================================
// SCORE COMPONENT CALCULATIONS
// =============================================================================

/**
 * Calculate wait time score (0-100)
 * Lower wait = higher score
 */
function calculateWaitTimeScore(
  waitTime: number,
  optimalWait: number,
  peakWait: number
): number {
  // Normalize wait time to 0-100 scale
  // At optimal wait = 100, at peak wait = 0
  const range = peakWait - optimalWait;

  if (range <= 0) {
    return waitTime <= optimalWait ? 100 : 50;
  }

  // Linear interpolation
  const normalized = 1 - (waitTime - optimalWait) / range;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

/**
 * Calculate proximity score to previous item (0-100)
 * Closer = higher score
 */
function calculateProximityToPrevScore(
  gap: ScheduleGap,
  context: SchedulingContext
): number {
  // Get the item scheduled before this gap
  const prevItem = getItemBefore(context, gap.start);

  if (!prevItem) {
    // First item of the day - neutral score
    return 50;
  }

  // Use gap's previousLand if available, otherwise get from item
  const prevLand = gap.previousLand || prevItem.land;

  return calculateProximityScore(prevLand, gap.timeBlock.parkId);
}

/**
 * Calculate proximity score to next item (0-100)
 * Closer = higher score
 */
function calculateProximityToNextScore(
  gap: ScheduleGap,
  context: SchedulingContext
): number {
  // Get the item scheduled after this gap
  const nextItem = getItemAfter(context, gap.end);

  if (!nextItem) {
    // No item after - neutral score
    return 50;
  }

  // Use gap's nextLand if available, otherwise get from item
  const nextLand = gap.nextLand || nextItem.land;

  return calculateProximityScore(nextLand, gap.timeBlock.parkId);
}

/**
 * Calculate importance score based on ride popularity (0-100)
 */
function calculateImportanceScore(ride: RideWithPredictions): number {
  const popularity = ride.popularity ?? 'moderate';
  const baseScore = RIDE_IMPORTANCE_SCORES[popularity] ?? 40;
  return baseScore;
}

// =============================================================================
// CANDIDATE GENERATION
// =============================================================================

/**
 * Generate slot candidates for a ride across all available gaps
 *
 * Filters out options where the walk time cost exceeds the wait time savings
 * (poor net benefit), unless it's a high-delta ride where timing is critical.
 */
export function generateSlotCandidates(
  ride: RideWithPredictions,
  gaps: ScheduleGap[],
  context: SchedulingContext
): SlotCandidate[] {
  const candidates: SlotCandidate[] = [];
  const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;
  const predictions = ride.hourlyPredictions ?? [];

  // Calculate ride's delta to determine how strictly we filter
  const delta = calculateSavingsDelta(predictions);

  for (const gap of gaps) {
    // Calculate walk time to this ride
    const walkFromPrev = calculateWalkTime(gap.previousLand, ride.land);
    const walkToNext = calculateWalkTime(ride.land, gap.nextLand);

    // Calculate scheduled start time (after walking from previous)
    const scheduledTime = gap.start + walkFromPrev;

    // Calculate wait time at the ACTUAL scheduled time (not gap.start)
    // This prevents rides from extending past gap end when waits increase
    const waitTime = getInterpolatedWaitTime(scheduledTime, predictions);

    const totalTimeNeeded = waitTime + rideDuration;
    const timeAvailableAfterWalk = gap.duration - walkFromPrev;

    if (totalTimeNeeded > timeAvailableAfterWalk) {
      // Ride doesn't fit in this gap after accounting for walk time
      continue;
    }

    // Calculate net benefit for scoring (not hard filtering)
    // Hard filtering was removed because during peak hours, waitSavings is 0
    // and netBenefit becomes negative, causing ALL candidates to be filtered.
    // Instead, we rely on the scoring penalty in scoreSlotForRide() to
    // discourage poor net benefit options without eliminating them entirely.
    const netBenefitInfo = calculateNetBenefit(ride, gap, context);

    // Score this slot
    const score = scoreSlotForRide(ride, gap, context);

    candidates.push({
      gap,
      score: score.total,
      scheduledTime,
      waitTime,
      walkTime: walkFromPrev,
      walkToNext,
      netBenefit: netBenefitInfo.netBenefit, // For debugging/insights
    });
  }

  // Sort by score (highest first)
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Find the best slot for a ride
 */
export function findBestSlot(
  ride: RideWithPredictions,
  gaps: ScheduleGap[],
  context: SchedulingContext
): SlotCandidate | null {
  const candidates = generateSlotCandidates(ride, gaps, context);
  return candidates.length > 0 ? candidates[0] : null;
}

// =============================================================================
// BATCH SCORING
// =============================================================================

/**
 * Score multiple rides for a single gap
 * Returns rides sorted by their score for this gap
 */
export function scoreRidesForGap(
  rides: RideWithPredictions[],
  gap: ScheduleGap,
  context: SchedulingContext
): Array<{ ride: RideWithPredictions; score: SlotScore; candidate: SlotCandidate }> {
  const results: Array<{ ride: RideWithPredictions; score: SlotScore; candidate: SlotCandidate }> = [];

  for (const ride of rides) {
    const rideDuration = ride.duration ?? DEFAULT_RIDE_DURATION;
    const predictions = ride.hourlyPredictions ?? [];
    const waitTime = getInterpolatedWaitTime(gap.start, predictions);
    const walkFromPrev = calculateWalkTime(gap.previousLand, ride.land);
    const walkToNext = calculateWalkTime(ride.land, gap.nextLand);

    const totalTimeNeeded = walkFromPrev + waitTime + rideDuration;

    if (totalTimeNeeded > gap.duration) {
      continue;
    }

    const score = scoreSlotForRide(ride, gap, context);
    const scheduledTime = gap.start + walkFromPrev;

    results.push({
      ride,
      score,
      candidate: {
        gap,
        score: score.total,
        scheduledTime,
        waitTime,
        walkTime: walkFromPrev,
        walkToNext,
      },
    });
  }

  // Sort by score (highest first)
  return results.sort((a, b) => b.score.total - a.score.total);
}

/**
 * Find the best ride for each gap, creating optimal ride-gap assignments
 */
export function assignRidesToGaps(
  rides: RideWithPredictions[],
  gaps: ScheduleGap[],
  context: SchedulingContext
): Map<string, { ride: RideWithPredictions; candidate: SlotCandidate }> {
  const assignments = new Map<string, { ride: RideWithPredictions; candidate: SlotCandidate }>();
  const assignedRides = new Set<string | number>();

  // For each gap, find the best unassigned ride
  for (const gap of gaps) {
    const unassignedRides = rides.filter((r) => !assignedRides.has(r.id));

    if (unassignedRides.length === 0) {
      break;
    }

    const scoredRides = scoreRidesForGap(unassignedRides, gap, context);

    if (scoredRides.length > 0) {
      const best = scoredRides[0];
      assignments.set(gap.id ?? `gap_${gap.start}`, {
        ride: best.ride,
        candidate: best.candidate,
      });
      assignedRides.add(best.ride.id);
    }
  }

  return assignments;
}

// =============================================================================
// REASONING GENERATION
// =============================================================================

/**
 * Generate reasoning that explains net benefit (wait savings vs walk cost)
 */
function generateScoreReasoningWithNetBenefit(
  ride: RideWithPredictions,
  waitTime: number,
  optimal: { hour: number; wait: number },
  isOptimalHour: boolean,
  netBenefitInfo: NetBenefitInfo
): string {
  const reasons: string[] = [];

  // Wait time reasoning
  if (isOptimalHour) {
    reasons.push(`Optimal time - lowest wait (~${waitTime} min)`);
  } else if (waitTime <= optimal.wait * 1.2) {
    reasons.push(`Near-optimal wait (~${waitTime} min)`);
  } else {
    reasons.push(`~${waitTime} min wait`);
  }

  // Net benefit reasoning - explain the trade-off
  if (netBenefitInfo.netBenefit >= 15) {
    reasons.push(`Saves ${Math.round(netBenefitInfo.waitSavings)} min with ${netBenefitInfo.walkFromPrev} min walk`);
  } else if (netBenefitInfo.netBenefit >= 5) {
    reasons.push('Good routing efficiency');
  } else if (netBenefitInfo.walkFromPrev <= 3) {
    reasons.push('Convenient nearby location');
  } else if (netBenefitInfo.netBenefit < 0 && netBenefitInfo.walkFromPrev >= DISTANT_LAND_WALK_TIME) {
    reasons.push(`${netBenefitInfo.walkFromPrev} min walk offsets some savings`);
  }

  // Headliner-specific
  if (ride.popularity === 'headliner' && isOptimalHour) {
    reasons.push('Best window for this headliner');
  }

  return reasons.join('. ') + '.';
}

/**
 * Generate human-readable reasoning for a score
 * @deprecated Use generateScoreReasoningWithNetBenefit for net benefit context
 */
function generateScoreReasoning(
  ride: RideWithPredictions,
  waitTime: number,
  optimal: { hour: number; wait: number },
  isOptimalHour: boolean,
  proximityToPrevScore: number,
  _proximityToNextScore: number
): string {
  const reasons: string[] = [];

  // Wait time reasoning
  if (isOptimalHour) {
    reasons.push(`Optimal time - lowest wait (~${waitTime} min)`);
  } else if (waitTime <= optimal.wait * 1.2) {
    reasons.push(`Near-optimal wait (~${waitTime} min)`);
  } else {
    const avgWait =
      (ride.hourlyPredictions?.reduce((a, b) => a + b, 0) ?? 0) /
      (ride.hourlyPredictions?.length ?? 1);
    if (waitTime < avgWait) {
      reasons.push(`Below average wait (~${waitTime} min)`);
    } else {
      reasons.push(`~${waitTime} min wait`);
    }
  }

  // Proximity reasoning
  if (proximityToPrevScore >= 90) {
    reasons.push('Same area - minimal walking');
  } else if (proximityToPrevScore >= 60) {
    reasons.push('Adjacent area');
  }

  // Headliner-specific
  if (ride.popularity === 'headliner' && isOptimalHour) {
    reasons.push('Best window for this headliner');
  }

  return reasons.join('. ') + '.';
}

/**
 * Generate detailed reasoning for a scheduled item
 */
export function generateScheduledItemReasoning(
  ride: RideWithPredictions,
  candidate: SlotCandidate,
  context: SchedulingContext
): string {
  const score = scoreSlotForRide(ride, candidate.gap, context);
  return score.reasoning;
}
