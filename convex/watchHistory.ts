import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get watch history for current user
export const getWatchHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("watchHistory")
      .withIndex("by_user_and_anime", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get last watched episode for an anime
export const getLastWatchedEpisode = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_user_and_anime", (q) => 
        q.eq("userId", userId).eq("animeId", args.animeId)
      )
      .order("desc")
      .first();
    
    return history;
  },
});

// Get watch progress for specific episode
export const getWatchProgress = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const history = await ctx.db
      .query("watchHistory")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("episodeId"), args.episodeId)
        )
      )
      .first();
    
    return history;
  },
});

// Update watch progress
export const updateWatchProgress = mutation({
  args: {
    episodeId: v.id("episodes"),
    animeId: v.id("anime"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to save watch progress");
    }
    
    const existing = await ctx.db
      .query("watchHistory")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("episodeId"), args.episodeId)
        )
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        timestamp: args.timestamp,
        lastWatched: Date.now(),
      });
    } else {
      await ctx.db.insert("watchHistory", {
        userId,
        episodeId: args.episodeId,
        animeId: args.animeId,
        timestamp: args.timestamp,
        lastWatched: Date.now(),
      });
    }
    
    return null;
  },
});
