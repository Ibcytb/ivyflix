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

// List subtitles for an episode
export const listSubtitles = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const subtitles = await ctx.db
      .query("subtitles")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
    
    return Promise.all(
      subtitles.map(async (sub) => {
        // For SMI files, use the proxy endpoint to handle encoding
        const baseUrl = process.env.CONVEX_SITE_URL || process.env.CONVEX_CLOUD_URL;
        const proxyUrl = `${baseUrl}/subtitle-proxy?storageId=${sub.fileId}&format=${sub.format}`;
        
        return {
          ...sub,
          url: sub.format === "smi" ? proxyUrl : await ctx.storage.getUrl(sub.fileId),
        };
      })
    );
  },
});

// Create subtitle (admin only)
export const createSubtitle = mutation({
  args: {
    episodeId: v.id("episodes"),
    language: v.string(),
    label: v.string(),
    fileId: v.id("_storage"),
    format: v.union(
      v.literal("smi"),
      v.literal("srt"),
      v.literal("vtt"),
      v.literal("ass")
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return await ctx.db.insert("subtitles", args);
  },
});

// Delete subtitle (admin only)
export const deleteSubtitle = mutation({
  args: { subtitleId: v.id("subtitles") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    await ctx.db.delete(args.subtitleId);
    return null;
  },
});
