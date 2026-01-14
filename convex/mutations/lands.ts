import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Upsert a land (themed area) by external ID
 * If the land exists, update it. Otherwise, create it.
 */
export const upsertLand = internalMutation({
  args: {
    externalId: v.string(),
    parkId: v.id("parks"),
    externalParkId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lands")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        lastSeen: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("lands", {
        externalId: args.externalId,
        parkId: args.parkId,
        externalParkId: args.externalParkId,
        name: args.name,
        lastSeen: now,
      });
    }
  },
});

/**
 * Get land by external ID
 */
export const getByExternalId = internalMutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lands")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});
