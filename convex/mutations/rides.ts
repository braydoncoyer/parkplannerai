import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert a ride by external ID
 * If the ride exists, update it. Otherwise, create it.
 */
export const upsertRide = internalMutation({
  args: {
    externalId: v.string(),
    parkId: v.id("parks"),
    landId: v.optional(v.id("lands")),
    externalParkId: v.string(),
    externalLandId: v.optional(v.string()),
    name: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        landId: args.landId,
        externalLandId: args.externalLandId,
        category: args.category,
        lastSeen: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("rides", {
        externalId: args.externalId,
        parkId: args.parkId,
        landId: args.landId,
        externalParkId: args.externalParkId,
        externalLandId: args.externalLandId,
        name: args.name,
        category: args.category,
        lastSeen: now,
      });
    }
  },
});

/**
 * Get ride by external ID
 */
export const getByExternalId = internalMutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rides")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});
