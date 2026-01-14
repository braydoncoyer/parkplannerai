import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Get all tracked parks (public query)
 */
export const getAllParks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("parks").collect();
  },
});

/**
 * Get all tracked parks (internal query for actions)
 */
export const getAllParksInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("parks").collect();
  },
});

/**
 * Get a park by external ID
 */
export const getByExternalId = query({
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

/**
 * Get a park with its themed areas (lands)
 */
export const getParkWithLands = query({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!park) {
      return null;
    }

    const lands = await ctx.db
      .query("lands")
      .withIndex("by_park", (q) => q.eq("parkId", park._id))
      .collect();

    return {
      ...park,
      lands,
    };
  },
});

/**
 * Get all lands for a park
 */
export const getLandsByPark = query({
  args: {
    parkExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return [];
    }

    return await ctx.db
      .query("lands")
      .withIndex("by_park", (q) => q.eq("parkId", park._id))
      .collect();
  },
});

/**
 * Get all rides for a park
 */
export const getRidesByPark = query({
  args: {
    parkExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    const park = await ctx.db
      .query("parks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.parkExternalId))
      .unique();

    if (!park) {
      return [];
    }

    return await ctx.db
      .query("rides")
      .withIndex("by_park", (q) => q.eq("parkId", park._id))
      .collect();
  },
});

/**
 * Internal query to get all ride mappings for efficient snapshot insertion
 * Returns a structure optimized for quick lookups by external ride ID
 */
export const getRideMappingsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const parks = await ctx.db.query("parks").collect();
    const rides = await ctx.db.query("rides").collect();

    // Build lookup maps
    const parksByExternalId: Record<string, {
      _id: Id<"parks">;
      externalId: string;
      name: string;
    }> = {};

    for (const park of parks) {
      parksByExternalId[park.externalId] = {
        _id: park._id,
        externalId: park.externalId,
        name: park.name,
      };
    }

    // Map rides by external ID, including park and land references
    const ridesByExternalId: Record<string, {
      _id: Id<"rides">;
      parkId: Id<"parks">;
      landId: Id<"lands"> | undefined;
      externalParkId: string;
    }> = {};

    for (const ride of rides) {
      ridesByExternalId[ride.externalId] = {
        _id: ride._id,
        parkId: ride.parkId,
        landId: ride.landId,
        externalParkId: ride.externalParkId,
      };
    }

    return {
      parksByExternalId,
      ridesByExternalId,
      hasData: parks.length > 0 && rides.length > 0,
      parkCount: parks.length,
      rideCount: rides.length,
    };
  },
});
