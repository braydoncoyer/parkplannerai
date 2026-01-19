import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Parks from Queue-Times API
  parks: defineTable({
    externalId: v.string(), // Queue-Times park ID
    name: v.string(),
    operator: v.string(), // "Disney" or "Universal"
    timezone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    country: v.optional(v.string()),
    continent: v.optional(v.string()),
    lastUpdated: v.number(), // Unix timestamp
  }).index("by_external_id", ["externalId"]),

  // Themed areas within parks (Adventureland, Tomorrowland, etc.)
  lands: defineTable({
    externalId: v.string(), // Queue-Times land ID
    parkId: v.id("parks"),
    externalParkId: v.string(),
    name: v.string(),
    lastSeen: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_park", ["parkId"]),

  // Rides/attractions
  rides: defineTable({
    externalId: v.string(), // Queue-Times ride ID
    parkId: v.id("parks"), // Convex reference
    landId: v.optional(v.id("lands")), // Themed area reference
    externalParkId: v.string(),
    externalLandId: v.optional(v.string()),
    name: v.string(),
    category: v.optional(v.string()),
    lastSeen: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_park", ["parkId"])
    .index("by_land", ["landId"]),

  // DEPRECATED: Historical wait times (collected every 15 min)
  // Use liveWaitTimes for recent data and hourlyRideWaits for historical
  waitTimeSnapshots: defineTable({
    rideId: v.id("rides"),
    parkId: v.id("parks"),
    landId: v.optional(v.id("lands")),
    externalRideId: v.string(),
    externalParkId: v.string(),
    waitTimeMinutes: v.optional(v.number()),
    isOpen: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_ride_time", ["rideId", "timestamp"])
    .index("by_park_time", ["parkId", "timestamp"])
    .index("by_land_time", ["landId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Rolling window of recent wait times (24-48 hours)
  // 15-minute granularity, auto-purged after 48 hours
  // Used by: live dashboard, real-time predictions
  liveWaitTimes: defineTable({
    rideId: v.id("rides"),
    parkId: v.id("parks"),
    landId: v.optional(v.id("lands")),
    externalRideId: v.string(),
    externalParkId: v.string(),
    waitTimeMinutes: v.optional(v.number()),
    isOpen: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_ride_time", ["rideId", "timestamp"])
    .index("by_park_time", ["parkId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Permanent hourly aggregates for historical analysis
  // Used by: predictions, analytics, YoY comparison
  hourlyRideWaits: defineTable({
    rideId: v.id("rides"),
    parkId: v.id("parks"),
    landId: v.optional(v.id("lands")),
    date: v.string(), // "YYYY-MM-DD" (local park time)
    dayOfWeek: v.number(), // 0-6 (0=Sunday)
    hour: v.number(), // 0-23 (local park time)
    avgWaitMinutes: v.number(),
    maxWaitMinutes: v.number(),
    minWaitMinutes: v.number(),
    sampleCount: v.number(), // Typically 4 (15-min intervals)
    openPercent: v.number(), // 0-100, % of time ride was open
  })
    .index("by_ride_date", ["rideId", "date"])
    .index("by_ride_date_hour", ["rideId", "date", "hour"])
    .index("by_park_date", ["parkId", "date"])
    .index("by_ride_dayofweek", ["rideId", "dayOfWeek"])
    .index("by_park_dayofweek", ["parkId", "dayOfWeek"]),

  // Pre-computed daily statistics
  dailyAggregates: defineTable({
    parkId: v.id("parks"),
    externalParkId: v.string(),
    date: v.string(), // ISO date string YYYY-MM-DD
    avgWaitTime: v.optional(v.number()),
    maxWaitTime: v.optional(v.number()),
    totalRidesOpen: v.number(),
    dayOfWeek: v.number(), // 0-6 (0 = Sunday)
    isHoliday: v.boolean(),
  })
    .index("by_park_date", ["parkId", "date"])
    .index("by_day_of_week", ["dayOfWeek"]),

  // Pre-computed hourly patterns (average wait by hour of day)
  hourlyAggregates: defineTable({
    parkId: v.optional(v.id("parks")), // Optional - null for "all parks"
    operator: v.string(), // "Disney", "Universal", or "all"
    dayType: v.string(), // "weekday", "weekend", or "all"
    hour: v.number(), // 0-23
    avgWaitTime: v.number(),
    sampleCount: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_operator_daytype", ["operator", "dayType"])
    .index("by_park", ["parkId"]),

  // Pre-computed weekly patterns (average wait by day of week)
  weeklyAggregates: defineTable({
    operator: v.string(), // "Disney", "Universal", or "all"
    dayOfWeek: v.number(), // 0-6 (0 = Sunday)
    avgWaitTime: v.number(),
    sampleCount: v.number(),
    lastUpdated: v.number(),
  }).index("by_operator", ["operator"]),

  // Operator comparison metrics
  operatorAggregates: defineTable({
    operator: v.string(), // "Disney" or "Universal"
    periodDays: v.number(), // 7, 14, 30, etc.
    avgWaitTime: v.number(),
    totalSnapshots: v.number(),
    parksTracked: v.number(),
    lastUpdated: v.number(),
  }).index("by_operator_period", ["operator", "periodDays"]),

  // Pre-computed analytics insights
  analyticsInsights: defineTable({
    insightType: v.string(), // "best_day", "worst_day", "best_hour", etc.
    value: v.string(), // The value (e.g., "Tuesday", "9:00 AM")
    metric: v.number(), // Associated metric (e.g., avg wait)
    periodDays: v.number(), // Analysis period
    lastUpdated: v.number(),
  }).index("by_type", ["insightType"]),

  // Park operating hours from ThemeParks.wiki
  parkSchedules: defineTable({
    parkId: v.id("parks"),
    externalParkId: v.string(),
    date: v.string(), // ISO date YYYY-MM-DD
    openingTime: v.string(), // ISO timestamp
    closingTime: v.string(), // ISO timestamp
    openHour: v.number(), // Local hour (0-23)
    openMinute: v.number(),
    closeHour: v.number(),
    closeMinute: v.number(),
    hasExtendedHours: v.boolean(),
    extendedCloseHour: v.optional(v.number()),
    extendedCloseMinute: v.optional(v.number()),
    scheduleType: v.string(), // "OPERATING", "EXTRA_HOURS"
  })
    .index("by_park_date", ["parkId", "date"])
    .index("by_date", ["date"]),
});
