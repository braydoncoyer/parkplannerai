import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert a park schedule (operating hours) for a specific date
 * If a schedule exists for that park+date, update it. Otherwise, create it.
 */
export const upsertParkSchedule = internalMutation({
  args: {
    parkId: v.id("parks"),
    externalParkId: v.string(),
    date: v.string(),
    openingTime: v.string(),
    closingTime: v.string(),
    openHour: v.number(),
    openMinute: v.number(),
    closeHour: v.number(),
    closeMinute: v.number(),
    hasExtendedHours: v.boolean(),
    extendedCloseHour: v.optional(v.number()),
    extendedCloseMinute: v.optional(v.number()),
    scheduleType: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if schedule already exists for this park and date
    const existing = await ctx.db
      .query("parkSchedules")
      .withIndex("by_park_date", (q) =>
        q.eq("parkId", args.parkId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        openingTime: args.openingTime,
        closingTime: args.closingTime,
        openHour: args.openHour,
        openMinute: args.openMinute,
        closeHour: args.closeHour,
        closeMinute: args.closeMinute,
        hasExtendedHours: args.hasExtendedHours,
        extendedCloseHour: args.extendedCloseHour,
        extendedCloseMinute: args.extendedCloseMinute,
        scheduleType: args.scheduleType,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("parkSchedules", {
        parkId: args.parkId,
        externalParkId: args.externalParkId,
        date: args.date,
        openingTime: args.openingTime,
        closingTime: args.closingTime,
        openHour: args.openHour,
        openMinute: args.openMinute,
        closeHour: args.closeHour,
        closeMinute: args.closeMinute,
        hasExtendedHours: args.hasExtendedHours,
        extendedCloseHour: args.extendedCloseHour,
        extendedCloseMinute: args.extendedCloseMinute,
        scheduleType: args.scheduleType,
      });
    }
  },
});
