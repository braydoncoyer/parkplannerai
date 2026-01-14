import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert a park by external ID (Queue-Times ID)
 * If the park exists, update it. Otherwise, create it.
 */
export const upsertPark = internalMutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    operator: v.string(),
    timezone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    country: v.optional(v.string()),
    continent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        operator: args.operator,
        timezone: args.timezone,
        latitude: args.latitude,
        longitude: args.longitude,
        country: args.country,
        continent: args.continent,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("parks", {
        externalId: args.externalId,
        name: args.name,
        operator: args.operator,
        timezone: args.timezone,
        latitude: args.latitude,
        longitude: args.longitude,
        country: args.country,
        continent: args.continent,
        lastUpdated: now,
      });
    }
  },
});

/**
 * Get park by external ID
 */
export const getByExternalId = mutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});
