import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is admin - exported for reuse
export async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  
  const user = await ctx.db.get(userId);
  if (!user) return false;
  
  // Check if email/username is "Ivyee0601"
  return user.email === "Ivyee0601";
}

// Get user preferences helper
async function getUserPreferences(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  
  return await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

// Apply filters to anime list
function applyFilters(anime: any[], preferences: any) {
  let filtered = anime;
  
  // Apply content filter (ongoing/completed)
  if (preferences?.contentFilter && preferences.contentFilter !== "all") {
    filtered = filtered.filter(a => a.status === preferences.contentFilter);
  }
  
  // Apply hidden genres filter
  if (preferences?.hiddenGenres && preferences.hiddenGenres.length > 0) {
    filtered = filtered.filter(a => 
      !a.genres.some((genre: string) => preferences.hiddenGenres!.includes(genre))
    );
  }
  
  return filtered;
}

// List all anime with user preferences filtering
export const listAnime = query({
  args: {},
  handler: async (ctx) => {
    const preferences = await getUserPreferences(ctx);
    let anime = await ctx.db.query("anime").collect();
    
    // Apply filters
    anime = applyFilters(anime, preferences);
    
    return Promise.all(
      anime.map(async (a) => ({
        ...a,
        posterUrl: await ctx.storage.getUrl(a.poster),
        thumbnailUrl: await ctx.storage.getUrl(a.thumbnail),
      }))
    );
  },
});

// Get single anime details
export const getAnime = query({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    const anime = await ctx.db.get(args.animeId);
    if (!anime) return null;
    
    return {
      ...anime,
      posterUrl: await ctx.storage.getUrl(anime.poster),
      thumbnailUrl: await ctx.storage.getUrl(anime.thumbnail),
    };
  },
});

// Search anime with user preferences filtering
export const searchAnime = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const preferences = await getUserPreferences(ctx);
    
    let results = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q) => q.search("title", args.searchTerm))
      .take(100);
    
    // Apply filters
    results = applyFilters(results, preferences);
    
    // Limit to 20 results
    results = results.slice(0, 20);
    
    return Promise.all(
      results.map(async (a) => ({
        ...a,
        posterUrl: await ctx.storage.getUrl(a.poster),
        thumbnailUrl: await ctx.storage.getUrl(a.thumbnail),
      }))
    );
  },
});

// Create anime (admin only)
export const createAnime = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    poster: v.id("_storage"),
    thumbnail: v.id("_storage"),
    genres: v.array(v.string()),
    releaseYear: v.number(),
    status: v.union(v.literal("ongoing"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return await ctx.db.insert("anime", args);
  },
});

// Update anime (admin only)
export const updateAnime = mutation({
  args: {
    animeId: v.id("anime"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    poster: v.optional(v.id("_storage")),
    thumbnail: v.optional(v.id("_storage")),
    genres: v.optional(v.array(v.string())),
    releaseYear: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ongoing"), v.literal("completed"))),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const { animeId, ...updates } = args;
    await ctx.db.patch(animeId, updates);
    return null;
  },
});

// Delete anime (admin only)
export const deleteAnime = mutation({
  args: { animeId: v.id("anime") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Delete all episodes
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_anime", (q) => q.eq("animeId", args.animeId))
      .collect();
    
    for (const episode of episodes) {
      await ctx.db.delete(episode._id);
    }
    
    await ctx.db.delete(args.animeId);
    return null;
  },
});

// Generate upload URL for images/videos
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});
