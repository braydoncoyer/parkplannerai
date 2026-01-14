import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get park schedule for a specific date
 */
export const getParkSchedule = query({
  args: {
    parkExternalId: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date ?? new Date().toISOString().split("T")[0];

    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return null;
    }

    return await ctx.db
      .query("parkSchedules")
      .withIndex("by_park_date", (q) => q.eq("parkId", park._id).eq("date", date))
      .first();
  },
});

/**
 * Get park schedule for a date range
 */
export const getParkScheduleRange = query({
  args: {
    parkExternalId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return { park: null, schedules: [] };
    }

    // Get all schedules for this park within the date range
    const allSchedules = await ctx.db
      .query("parkSchedules")
      .withIndex("by_park_date", (q) => q.eq("parkId", park._id))
      .collect();

    // Filter by date range (Convex doesn't support range queries on non-first index fields)
    const schedules = allSchedules.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );

    return { park, schedules };
  },
});

/**
 * Get schedules for all parks on a specific date
 */
export const getAllParkSchedulesForDate = query({
  args: {
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date ?? new Date().toISOString().split("T")[0];

    const schedules = await ctx.db
      .query("parkSchedules")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Join with park data
    const schedulesWithParks = await Promise.all(
      schedules.map(async (schedule) => {
        const park = await ctx.db.get(schedule.parkId);
        return {
          ...schedule,
          park,
        };
      })
    );

    return schedulesWithParks;
  },
});

/**
 * Get parks with extended hours for a date range
 */
export const getParksWithExtendedHours = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all schedules in range with extended hours
    const allSchedules = await ctx.db
      .query("parkSchedules")
      .collect();

    const extendedSchedules = allSchedules.filter(
      (s) =>
        s.date >= args.startDate &&
        s.date <= args.endDate &&
        s.hasExtendedHours
    );

    // Join with park data
    const schedulesWithParks = await Promise.all(
      extendedSchedules.map(async (schedule) => {
        const park = await ctx.db.get(schedule.parkId);
        return {
          ...schedule,
          park,
        };
      })
    );

    return schedulesWithParks;
  },
});

/**
 * Calculate average operating hours for a park
 */
export const getParkOperatingHoursStats = query({
  args: {
    parkExternalId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;

    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    const allSchedules = await ctx.db
      .query("parkSchedules")
      .withIndex("by_park_date", (q) => q.eq("parkId", park._id))
      .collect();

    const recentSchedules = allSchedules.filter(
      (s) => s.date >= cutoffDateStr
    );

    if (recentSchedules.length === 0) {
      return {
        park,
        avgOpenHour: null,
        avgCloseHour: null,
        avgOperatingHours: null,
        daysWithExtendedHours: 0,
        totalDays: 0,
      };
    }

    const openHours = recentSchedules.map(
      (s) => s.openHour + s.openMinute / 60
    );
    const closeHours = recentSchedules.map(
      (s) => s.closeHour + s.closeMinute / 60
    );
    const operatingHours = recentSchedules.map((s) => {
      const open = s.openHour + s.openMinute / 60;
      let close = s.closeHour + s.closeMinute / 60;
      // Handle parks that close after midnight
      if (close < open) close += 24;
      return close - open;
    });

    return {
      park,
      avgOpenHour:
        openHours.reduce((a, b) => a + b, 0) / openHours.length,
      avgCloseHour:
        closeHours.reduce((a, b) => a + b, 0) / closeHours.length,
      avgOperatingHours:
        operatingHours.reduce((a, b) => a + b, 0) / operatingHours.length,
      daysWithExtendedHours: recentSchedules.filter((s) => s.hasExtendedHours)
        .length,
      totalDays: recentSchedules.length,
    };
  },
});
