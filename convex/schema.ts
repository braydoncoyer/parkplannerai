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

  // Historical wait times (collected every 15 min)
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
