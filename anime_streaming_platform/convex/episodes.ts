import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is admin
async function isAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  
  const user = await ctx.db.get(userId);
  if (!user) return false;
  
  return user.email === "Ivyee0601";
}

// List all episodes (for URL routing)
export const listAllEpisodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("episodes").collect();
  },
});

// List episodes for an anime with thumbnail URLs
export const listEpisodes = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_anime", (q) => q.eq("animeId", args.animeId))
      .collect();
    
    const episodesWithThumbnails = await Promise.all(
      episodes.map(async (episode) => ({
        ...episode,
        thumbnailUrl: episode.thumbnail ? await ctx.storage.getUrl(episode.thumbnail) : null,
      }))
    );
    
    return episodesWithThumbnails.sort((a, b) => a.episodeNumber - b.episodeNumber);
  },
});

// Get next episode
export const getNextEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const currentEpisode = await ctx.db.get(args.episodeId);
    if (!currentEpisode) return null;
    
    // Get all episodes for this anime and find the next one
    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_anime", (q) => q.eq("animeId", currentEpisode.animeId))
      .collect();
    
    // Find the next episode by episode number
    const nextEpisode = allEpisodes.find(
      (ep) => ep.episodeNumber === currentEpisode.episodeNumber + 1
    );
    
    return nextEpisode || null;
  },
});

// Get previous episode
export const getPreviousEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const currentEpisode = await ctx.db.get(args.episodeId);
    if (!currentEpisode) return null;
    
    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_anime", (q) => q.eq("animeId", currentEpisode.animeId))
      .collect();
    
    const prevEpisode = allEpisodes.find(
      (ep) => ep.episodeNumber === currentEpisode.episodeNumber - 1
    );
    
    return prevEpisode || null;
  },
});

// Get episode with video URL
export const getEpisodeWithVideo = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) return null;
    
    const hlsFiles = await ctx.db
      .query("hlsFiles")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
    
    const filesWithUrls = await Promise.all(
      hlsFiles.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
    
    return {
      ...episode,
      hlsFiles: filesWithUrls,
    };
  },
});

// Get single episode (for editing)
export const getEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.episodeId);
  },
});

// Create episode (admin only)
export const createEpisode = mutation({
  args: {
    animeId: v.id("anime"),
    episodeNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.id("_storage")),
    duration: v.number(),
    openingStart: v.optional(v.number()),
    openingEnd: v.optional(v.number()),
    endingStart: v.optional(v.number()),
    endingEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const episodeId = await ctx.db.insert("episodes", args);
    return episodeId;
  },
});

// Update episode (admin only)
export const updateEpisode = mutation({
  args: {
    episodeId: v.id("episodes"),
    episodeNumber: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    hlsZipFileId: v.optional(v.id("_storage")),
    thumbnail: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),
    openingStart: v.optional(v.number()),
    openingEnd: v.optional(v.number()),
    endingStart: v.optional(v.number()),
    endingEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const { episodeId, ...updates } = args;
    await ctx.db.patch(episodeId, updates);
    return null;
  },
});

// Delete episode (admin only)
export const deleteEpisode = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const hlsFiles = await ctx.db
      .query("hlsFiles")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
    
    for (const file of hlsFiles) {
      await ctx.db.delete(file._id);
    }
    
    await ctx.db.delete(args.episodeId);
    return null;
  },
});

// Generate upload URL (admin only)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateInternalUploadUrl = internalMutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save HLS file (called from client after upload)
export const saveHlsFile = mutation({
  args: {
    episodeId: v.id("episodes"),
    filename: v.string(),
    storageId: v.id("_storage"),
    isPlaylist: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    await ctx.db.insert("hlsFiles", args);
    return null;
  },
});

// Delete all HLS files for an episode
export const deleteHlsFiles = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const files = await ctx.db
      .query("hlsFiles")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
    
    for (const file of files) {
      await ctx.db.delete(file._id);
    }
    
    return null;
  },
});
