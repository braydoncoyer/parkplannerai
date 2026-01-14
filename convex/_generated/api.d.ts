/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_cleanupNonUSParks from "../actions/cleanupNonUSParks.js";
import type * as actions_collectParkSchedules from "../actions/collectParkSchedules.js";
import type * as actions_collectWaitTimes from "../actions/collectWaitTimes.js";
import type * as actions_computeDailyAggregates from "../actions/computeDailyAggregates.js";
import type * as crons from "../crons.js";
import type * as mutations_cleanup from "../mutations/cleanup.js";
import type * as mutations_dailyAggregates from "../mutations/dailyAggregates.js";
import type * as mutations_lands from "../mutations/lands.js";
import type * as mutations_parks from "../mutations/parks.js";
import type * as mutations_rides from "../mutations/rides.js";
import type * as mutations_schedules from "../mutations/schedules.js";
import type * as mutations_snapshots from "../mutations/snapshots.js";
import type * as queries_analytics from "../queries/analytics.js";
import type * as queries_dailyAggregates from "../queries/dailyAggregates.js";
import type * as queries_history from "../queries/history.js";
import type * as queries_parks from "../queries/parks.js";
import type * as queries_predictions from "../queries/predictions.js";
import type * as queries_schedules from "../queries/schedules.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/cleanupNonUSParks": typeof actions_cleanupNonUSParks;
  "actions/collectParkSchedules": typeof actions_collectParkSchedules;
  "actions/collectWaitTimes": typeof actions_collectWaitTimes;
  "actions/computeDailyAggregates": typeof actions_computeDailyAggregates;
  crons: typeof crons;
  "mutations/cleanup": typeof mutations_cleanup;
  "mutations/dailyAggregates": typeof mutations_dailyAggregates;
  "mutations/lands": typeof mutations_lands;
  "mutations/parks": typeof mutations_parks;
  "mutations/rides": typeof mutations_rides;
  "mutations/schedules": typeof mutations_schedules;
  "mutations/snapshots": typeof mutations_snapshots;
  "queries/analytics": typeof queries_analytics;
  "queries/dailyAggregates": typeof queries_dailyAggregates;
  "queries/history": typeof queries_history;
  "queries/parks": typeof queries_parks;
  "queries/predictions": typeof queries_predictions;
  "queries/schedules": typeof queries_schedules;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
