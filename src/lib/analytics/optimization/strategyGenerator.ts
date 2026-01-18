/**
 * Strategy Generator for Rope Drop Comparison
 * Generates 2-3 different rope drop strategies for a given park
 * to help users compare approaches
 */

import { ROPE_DROP_STRATEGIES, type RopeDropTarget } from '../data/ropeDropStrategy';
import { predictRideWaitTimes, getPredictedWaitForHour } from '../prediction/waitTimePredictor';
import type { RideWithPredictions } from '../types';

export interface StrategyRide {
  name: string;
  waitTime: number;       // Estimated wait at rope drop
  timeSaved: number;      // Minutes saved vs midday
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  rides: StrategyRide[];
  totalWaitTime: number;
  totalTimeSaved: number;
  badge?: 'recommended' | 'family' | 'efficient';
  badgeText?: string;
}

export interface StrategyGeneratorResult {
  strategies: Strategy[];
  parkName: string;
  isUsingFallbackData: boolean;
}

/**
 * Strategy templates for different approach types
 */
interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  badge?: 'recommended' | 'family' | 'efficient';
  badgeText?: string;
  // Function to select and order rides from available targets
  selectRides: (targets: RopeDropTarget[], parkId: number) => RopeDropTarget[];
}

/**
 * Predefined strategy templates
 */
const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'headliner-rush',
    name: 'Headliner Rush',
    description: 'Hit the biggest rides first while waits are shortest',
    badge: 'recommended',
    badgeText: 'Recommended',
    selectRides: (targets) => {
      // Sort by priority, then by wait time delta (biggest savings first)
      // Rope drop the rides that "hurt the most to skip" - i.e., rides with
      // the highest midday waits should be hit first at rope drop
      return [...targets]
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          // Higher delta = more time saved by rope dropping = should go first
          const deltaA = a.typicalMiddayWait - a.typicalRopeDropWait;
          const deltaB = b.typicalMiddayWait - b.typicalRopeDropWait;
          return deltaB - deltaA;
        })
        .slice(0, 3);
    },
  },
  {
    id: 'wave-rider',
    name: 'Wave Rider',
    description: 'Skip the initial rush, hit secondary rides first',
    selectRides: (targets) => {
      // Start with priority 2 rides, then add priority 1
      const priority2 = targets.filter(t => t.priority === 2);
      const priority1 = targets.filter(t => t.priority === 1);

      // Take 2 from priority 2, then 1 from priority 1
      const selected = [
        ...priority2.slice(0, 2),
        ...priority1.slice(0, 1),
      ];

      // If we don't have enough, fill with remaining
      if (selected.length < 3) {
        const remaining = targets.filter(t => !selected.includes(t));
        selected.push(...remaining.slice(0, 3 - selected.length));
      }

      return selected.slice(0, 3);
    },
  },
  {
    id: 'family-first',
    name: 'Family First',
    description: 'Start with shorter queues, perfect for families with kids',
    badge: 'family',
    badgeText: 'Best for Families',
    selectRides: (targets, parkId) => {
      // For family strategy, prioritize rides that:
      // 1. Have shorter typical rope drop waits
      // 2. Are generally family-friendly (by name heuristics)
      const familyFriendlyKeywords = [
        'peter pan', 'jungle', 'safari', 'navi', 'frozen', 'remy',
        'toy story', 'slinky', 'runaway', 'mine train', 'thunder',
        'incredicoaster', 'donkey kong', 'mario'
      ];

      // Score rides by family-friendliness
      const scored = targets.map(t => {
        let familyScore = 0;
        const lowerName = t.rideName.toLowerCase();

        // Check for family-friendly keywords
        if (familyFriendlyKeywords.some(kw => lowerName.includes(kw))) {
          familyScore += 10;
        }

        // Prefer shorter waits
        familyScore += (60 - t.typicalRopeDropWait) / 10;

        return { target: t, familyScore };
      });

      // Sort by family score
      return scored
        .sort((a, b) => b.familyScore - a.familyScore)
        .map(s => s.target)
        .slice(0, 3);
    },
  },
];

/**
 * Generate rope drop strategies for a given park
 */
export function generateStrategies(
  parkId: number,
  visitDate: Date | string,
): StrategyGeneratorResult {
  const ropeDropData = ROPE_DROP_STRATEGIES[parkId];

  if (!ropeDropData) {
    // Park not supported - return empty
    return {
      strategies: [],
      parkName: 'Unknown Park',
      isUsingFallbackData: true,
    };
  }

  const strategies: Strategy[] = [];

  for (const template of STRATEGY_TEMPLATES) {
    const selectedTargets = template.selectRides(ropeDropData.targets, parkId);

    if (selectedTargets.length === 0) continue;

    const rides: StrategyRide[] = selectedTargets.map(target => ({
      name: target.rideName,
      waitTime: target.typicalRopeDropWait,
      timeSaved: target.typicalMiddayWait - target.typicalRopeDropWait,
    }));

    const totalWaitTime = rides.reduce((sum, r) => sum + r.waitTime, 0);
    const totalTimeSaved = rides.reduce((sum, r) => sum + r.timeSaved, 0);

    strategies.push({
      id: template.id,
      name: template.name,
      description: template.description,
      badge: template.badge,
      badgeText: template.badgeText,
      rides,
      totalWaitTime,
      totalTimeSaved,
    });
  }

  // Add relative comparison badges
  if (strategies.length > 0) {
    // Find the strategy with lowest total wait time
    const lowestWait = Math.min(...strategies.map(s => s.totalWaitTime));

    strategies.forEach(strategy => {
      if (strategy.totalWaitTime === lowestWait && !strategy.badge) {
        strategy.badge = 'efficient';
        strategy.badgeText = 'Most Efficient';
      }
    });
  }

  return {
    strategies,
    parkName: ropeDropData.parkName,
    // For now, we're using the hardcoded rope drop data
    // which is essentially curated fallback data
    isUsingFallbackData: true,
  };
}

/**
 * Get strategy ride names for use in schedule optimization
 * Returns the ride names in order for the selected strategy
 */
export function getStrategyRideOrder(strategyId: string, parkId: number): string[] {
  const ropeDropData = ROPE_DROP_STRATEGIES[parkId];
  if (!ropeDropData) return [];

  const template = STRATEGY_TEMPLATES.find(t => t.id === strategyId);
  if (!template) return [];

  const selectedTargets = template.selectRides(ropeDropData.targets, parkId);
  return selectedTargets.map(t => t.rideName);
}

/**
 * Check if a park has rope drop strategy support
 */
export function hasStrategySupport(parkId: number): boolean {
  return parkId in ROPE_DROP_STRATEGIES;
}

/**
 * Get all supported park IDs for strategy comparison
 */
export function getSupportedParkIds(): number[] {
  return Object.keys(ROPE_DROP_STRATEGIES).map(Number);
}
