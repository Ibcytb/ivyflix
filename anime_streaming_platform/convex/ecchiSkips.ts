import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function isAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  
  const user = await ctx.db.get(userId);
  if (!user) return false;
  
  return user.email === "Ivyee0601";
}

// List ecchi skips for an episode
export const listEcchiSkips = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ecchiSkips")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
  },
});

// Create ecchi skip (admin only)
export const createEcchiSkip = mutation({
  args: {
    episodeId: v.id("episodes"),
    startTime: v.number(),
    endTime: v.number(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return await ctx.db.insert("ecchiSkips", args);
  },
});

// Update ecchi skip (admin only)
export const updateEcchiSkip = mutation({
  args: {
    skipId: v.id("ecchiSkips"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const { skipId, ...updates } = args;
    await ctx.db.patch(skipId, updates);
    return null;
  },
});

// Delete ecchi skip (admin only)
export const deleteEcchiSkip = mutation({
  args: { skipId: v.id("ecchiSkips") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    await ctx.db.delete(args.skipId);
    return null;
  },
});
