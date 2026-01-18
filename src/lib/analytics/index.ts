// Analytics Module - Smart Itinerary Optimization
// Exports all public APIs for the analytics system

// Types
export type {
  DayType,
  RidePopularity,
  RideCategory,
  BreakType,
  HourlyPattern,
  RideMetadata,
  RideWithPredictions,
  PredictedWaitTime,
  BreakAnalysis,
  ScheduledBreak,
  RideScore,
  ScheduleItem,
  OptimizedSchedule,
  OptimizationInput,
  DaySchedule,
  MultiDaySchedule,
  RideDayAssignment,
  EntertainmentItem,
  PredictionConfidence,
  PredictionSource,
} from './types';

// Main optimization functions
export { optimizeSchedule, optimizeScheduleAsync } from './optimization/scheduleOptimizer';
export { optimizeMultiDaySchedule } from './optimization/multiDayOptimizer';

// Prediction functions
export {
  predictRideWaitTimes,
  getPredictedWaitForHour,
  getDetailedPrediction,
  findBestHoursForRide,
  findWorstHoursForRide,
  predictRideWaitTimesWithHistory,
  predictMultipleRidesWithHistory,
} from './prediction/waitTimePredictor';

// Convex-powered predictions
export {
  getConvexPredictions,
  shouldUseConvexPredictions,
  getPredictionSystemStatus,
} from './prediction/convexPredictor';

export type {
  ConvexPredictionResult,
} from './prediction/convexPredictor';

// Day classification
export {
  classifyDayType,
  getDayTypeDescription,
  isHoliday,
  isPeakPeriod,
} from './prediction/dayTypeClassifier';

// Break scheduling
export {
  analyzeBreakOpportunity,
  determineBreakType,
  createScheduledBreak,
} from './optimization/breakScheduler';

// Ride metadata
export {
  findRideMetadata,
  getRidePopularity,
  getRideCategory,
  getRideDuration,
  enrichRideWithMetadata,
} from './data/rideMetadata';

// Historical patterns (for reference/debugging)
export {
  HOURLY_PATTERNS,
  BASE_WAIT_BY_POPULARITY,
  getHourlyMultiplier,
  getBaseWaitTime,
} from './data/historicalPatterns';

// Utilities
export {
  formatTime,
  parseArrivalTime,
  calculateDepartureHour,
  addMinutes,
  sum,
} from './utils/timeUtils';

// Rope drop strategy
export {
  getRopeDropStrategy,
  isRopeDropTarget,
  getRopeDropWaitEstimate,
  ROPE_DROP_STRATEGIES,
} from './data/ropeDropStrategy';

export type {
  RopeDropTarget,
  ParkRopeDropStrategy,
} from './data/ropeDropStrategy';

// =============================================================================
// NEW SCHEDULING MODULE (v2)
// Clean, phased scheduling algorithm with anchor-based optimization
// =============================================================================

// Main scheduler functions
export {
  createOptimizedSchedule,
  createOptimizedScheduleAsync,
  createOptimizedTrip,
  createOptimizedTripAsync,
  estimateRideCapacity as estimateScheduleCapacity,
  isReasonableForOneDay,
} from './scheduling';

// Scheduler types
export type {
  SchedulerInput,
  SchedulerResult,
  ScheduledItem,
  OverflowItem,
  ScheduleValidation,
  ScheduleStats,
  TripSchedulerInput,
  TripSchedulerResult,
  RopeDropConfig,
  ParkHopperConfig,
  SchedulerPreferences,
  TimeBlock,
  Anchor,
  SchedulingContext,
  TripContext,
} from './scheduling';

// Scheduler utilities
export {
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateSavingsDelta,
  findOptimalPredictionHour,
  findPeakPredictionHour,
} from './scheduling';

// Phase exports for advanced usage
export {
  identifyHeadliners,
  getRopeDropTargetIds,
  validateRopeDropConfig,
} from './scheduling';

// Adapter for PlanWizard integration
export {
  optimizeScheduleWithNewScheduler,
  shouldUseNewScheduler,
} from './scheduling';

export type {
  LegacyOptimizationInput,
  LegacyOptimizedSchedule,
} from './scheduling';
