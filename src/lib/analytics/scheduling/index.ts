/**
 * Theme Park Schedule Optimizer
 *
 * A clean, phased scheduling algorithm for theme park visits.
 *
 * Key Features:
 * - Anchor-based scheduling with entertainment as fixed points
 * - Headliners placed at their optimal (lowest wait) times
 * - Rope drop strategy with delta-based ordering
 * - Multi-factor slot scoring for remaining rides
 * - Park hopper support with eligibility rules
 * - Multi-day trip scheduling with ride distribution
 * - Re-rides only after ALL user selections are scheduled
 *
 * Usage:
 * ```typescript
 * import { createOptimizedScheduleAsync } from '@/lib/analytics/scheduling';
 *
 * const result = await createOptimizedScheduleAsync({
 *   selectedRides: ridesWithPredictions,
 *   parkHours: { openHour: 9, closeHour: 21 },
 *   entertainment: selectedEntertainment,
 *   preferences: {
 *     arrivalTime: '9:00 AM',
 *     includeBreaks: true,
 *     priority: 'balanced',
 *   },
 *   dayType: 'weekday',
 * });
 * ```
 */

// =============================================================================
// MAIN EXPORTS - Primary API
// =============================================================================

// Main scheduler functions
export {
  createOptimizedSchedule,
  createOptimizedScheduleAsync,
  createOptimizedTrip,
  createOptimizedTripAsync,
  estimateRideCapacity,
  isReasonableForOneDay,
} from './scheduler';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Input types
  RideWithPredictions,
  ParkHours,
  Entertainment,
  SchedulerPreferences,
  RopeDropConfig,
  ParkHopperConfig,
  SchedulerInput,
  TripSchedulerInput,

  // Internal types
  TimeBlock,
  Anchor,
  TimeSlot,
  ScheduleGap,
  SlotCandidate,
  SlotScore,

  // Output types
  ScheduledItem,
  OverflowItem,
  OverflowReason,
  ScheduleValidation,
  ScheduleStats,
  SchedulerResult,
  TripSchedulerResult,

  // Context types
  SchedulingContext,
  TripContext,
} from './types';

// =============================================================================
// UTILITY EXPORTS - For advanced usage
// =============================================================================

// Time utilities
export {
  parseTimeToMinutes,
  parseParkHours,
  formatMinutesToTime,
  formatDuration,
  formatTimeRange,
  getHourFromMinutes,
  calculateDuration,
  isTimeInRange,
  doRangesOverlap,
  getInterpolatedWaitTime,
  findOptimalPredictionHour,
  findPeakPredictionHour,
  calculateSavingsDelta,
} from './utils/timeUtils';

// Proximity utilities
export {
  calculateWalkTime,
  calculateProximityScore,
  areLandsAdjacent,
  normalizeLandName,
  optimizeForProximity,
} from './core/proximityCalculator';

// Trip tracking
export {
  createTripContext,
  updateTripContextAfterDay,
  isRideScheduledInTrip,
  areReridesAllowed,
  getAvailableRerides,
} from './utils/tripTracker';

// =============================================================================
// CONSTANTS EXPORTS
// =============================================================================

export {
  DEFAULT_RIDE_DURATION,
  PARK_CLOSE_BUFFER,
  MAX_RIDES_PER_DAY,
  ENTERTAINMENT_ARRIVAL_BUFFERS,
  PARK_HOP_ELIGIBILITY,
  SLOT_SCORING_WEIGHTS,
  RIDE_IMPORTANCE_SCORES,
} from './constants';

// =============================================================================
// PHASE EXPORTS - For testing and customization
// =============================================================================

// Setup phase
export {
  initializeSchedulingContext,
  finalizeContextSetup,
  validateContext,
  getTotalSchedulableTime,
} from './phases/setupPhase';

// Anchor phase
export {
  createEntertainmentAnchors,
  createMealAnchors,
  createParkHopperAnchor,
  anchorsToScheduledItems,
} from './phases/anchorPhase';

// Rope drop phase
export {
  processRopeDrop,
  getRopeDropTargetIds,
  validateRopeDropConfig,
  calculateRopeDropDuration,
} from './phases/ropeDropPhase';

// Headliner phase
export {
  processHeadliners,
  identifyHeadliners,
  sortHeadlinersByPriority,
  canAccommodateAllHeadliners,
} from './phases/headlinerPhase';

// Fill phase
export {
  fillRemainingRides,
  fillWithRerides,
  analyzeRemainingGaps,
  estimateRemainingCapacity as estimateFillCapacity,
} from './phases/fillPhase';

// Validation phase
export {
  validateSchedule,
  createOverflowItems,
  calculateStats,
  calculateComparison,
  generateInsights,
  buildSchedulerResult,
} from './phases/validationPhase';

// Distribution phase
export {
  distributeRidesAcrossDays,
  estimateDayCapacities,
  canFitAllRides,
  validateDistribution,
  getRidesForDay,
} from './phases/distributionPhase';

// =============================================================================
// CORE EXPORTS - For advanced customization
// =============================================================================

// Time block management
export {
  createTimeBlocks,
  findGapsInBlock,
  findAllGaps,
  hasConflict,
  reserveSlot,
  releaseSlot,
  findBestFittingGap,
  findBlockAtTime,
  getTotalAvailableTime,
  addItemToContext,
  getLastScheduledItem,
  getItemBefore,
  getItemAfter,
} from './core/timeBlockManager';

// Conflict resolution
export {
  resolveHeadlinerConflict,
  resolveHeadlinerVsEntertainment,
  findAlternativeTimes,
  findNextBestHour,
  haveOverlappingOptimalTimes,
  findHeadlinerConflicts,
  conflictsWithAnchor,
  resolveAllHeadlinerConflicts,
} from './core/conflictResolver';

// Slot scoring
export {
  scoreSlotForRide,
  generateSlotCandidates,
  findBestSlot,
  scoreRidesForGap,
  assignRidesToGaps,
  generateScheduledItemReasoning,
} from './core/slotScorer';

// Park hopper management
export {
  getParkHopEligibilityTime,
  getParkTravelTime,
  isTransitionTimeValid,
  createTransitionAnchor,
  calculateOptimalTransitionTime,
  distributeRidesBetweenParks,
  getParkTimeWindows,
  validateParkHopperConfig,
  generateParkHopperInsights,
} from './core/parkHopperManager';

// =============================================================================
// ADAPTER - For PlanWizard Integration
// =============================================================================

export {
  optimizeScheduleWithNewScheduler,
  shouldUseNewScheduler,
  convertToSchedulerInput,
  convertFromSchedulerResult,
} from './adapter';

export type {
  LegacyOptimizationInput,
  LegacyOptimizedSchedule,
  LegacyScheduleItem,
  LegacyRide,
  LegacyEntertainment,
} from './adapter';
