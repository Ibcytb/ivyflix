import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get BnviitLasik font URL
export const getBnviitFontUrl = query({
  args: {},
  handler: async (ctx) => {
    const storageId = "kg2etyvpkmmzr0eerwv170dzhh7x433f" as Id<"_storage">;
    return await ctx.storage.getUrl(storageId);
  },
});

// Get profile image URL
export const getProfileImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get user preferences with custom fonts
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    // Get custom fonts for this user
    const customFonts = await ctx.db
      .query("customFonts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const customFontsWithUrls = await Promise.all(
      customFonts.map(async (font) => ({
        _id: font._id,
        name: font.name,
        url: await ctx.storage.getUrl(font.storageId),
      }))
    );
    
    if (!prefs) {
      // Return default preferences with BnviitLasik as default font
      return {
        playbackSpeed: 1.0,
        preferredQuality: "auto",
        subtitleFontSize: 24,
        subtitleFontFamily: "Arial",
        autoPlayNext: true,
        autoSkipOpening: false,
        autoSkipEnding: false,
        openingSkipMode: "button" as const,
        endingSkipMode: "button" as const,
        ecchiSkipMode: "button" as const,
        selectedFontId: "bnviit",
        customFonts: customFontsWithUrls,
        ageVerified: false,
        theme: "dark" as const,
        uiScale: 1.0,
        showAdultContent: true,
        hiddenGenres: [],
        contentFilter: "all" as const,
        interfaceLanguage: "ko" as const,
        defaultSubtitleLanguage: "ko",
        favoriteGenres: [],
      };
    }
    
    return {
      ...prefs,
      customFonts: customFontsWithUrls,
    };
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    playbackSpeed: v.optional(v.number()),
    preferredQuality: v.optional(v.string()),
    subtitleFontSize: v.optional(v.number()),
    subtitleFontFamily: v.optional(v.string()),
    selectedFontId: v.optional(v.string()),
    autoPlayNext: v.optional(v.boolean()),
    autoSkipOpening: v.optional(v.boolean()),
    autoSkipEnding: v.optional(v.boolean()),
    openingSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    endingSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    ecchiSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    birthYear: v.optional(v.number()),
    ageVerified: v.optional(v.boolean()),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    uiScale: v.optional(v.number()),
    showAdultContent: v.optional(v.boolean()),
    hiddenGenres: v.optional(v.array(v.string())),
    contentFilter: v.optional(v.union(v.literal("all"), v.literal("ongoing"), v.literal("completed"))),
    interfaceLanguage: v.optional(v.string()),
    defaultSubtitleLanguage: v.optional(v.string()),
    nickname: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
    favoriteGenres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to save preferences");
    }
    
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        playbackSpeed: args.playbackSpeed ?? 1.0,
        preferredQuality: args.preferredQuality ?? "auto",
        subtitleFontSize: args.subtitleFontSize ?? 24,
        subtitleFontFamily: args.subtitleFontFamily ?? "Arial",
        selectedFontId: args.selectedFontId ?? "bnviit",
        autoPlayNext: args.autoPlayNext ?? true,
        autoSkipOpening: args.autoSkipOpening ?? false,
        autoSkipEnding: args.autoSkipEnding ?? false,
        openingSkipMode: args.openingSkipMode ?? "button",
        endingSkipMode: args.endingSkipMode ?? "button",
        ecchiSkipMode: args.ecchiSkipMode ?? "button",
      });
    }
    
    return null;
  },
});

// Generate upload URL for custom font
export const generateFontUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload custom font");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Generate upload URL for profile image
export const generateProfileImageUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload profile image");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Save custom font
export const saveCustomFont = mutation({
  args: {
    name: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to save custom font");
    }
    
    return await ctx.db.insert("customFonts", {
      userId,
      name: args.name,
      storageId: args.storageId,
    });
  },
});

// Delete custom font
export const deleteCustomFont = mutation({
  args: { fontId: v.id("customFonts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }
    
    const font = await ctx.db.get(args.fontId);
    if (!font || font.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.fontId);
    return null;
  },
});

export const setAgeVerification = mutation({
  args: { birthYear: v.number(), isAdult: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");
    const existing = await ctx.db.query("userPreferences").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const mode = args.isAdult ? "button" : "auto";
    if (existing) {
      await ctx.db.patch(existing._id, { birthYear: args.birthYear, ageVerified: true, ecchiSkipMode: mode });
    } else {
      await ctx.db.insert("userPreferences", { userId, playbackSpeed: 1.0, preferredQuality: "auto", subtitleFontSize: 24, subtitleFontFamily: "Arial", selectedFontId: "bnviit", autoPlayNext: true, autoSkipOpening: false, autoSkipEnding: false, openingSkipMode: "button", endingSkipMode: "button", ecchiSkipMode: mode, birthYear: args.birthYear, ageVerified: true });
    }
    return null;
  },
});

export const checkAndUpdateAge = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const prefs = await ctx.db.query("userPreferences").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (prefs && prefs.birthYear && !prefs.ageVerified) {
      const age = new Date().getFullYear() - prefs.birthYear;
      if (age >= 18 && prefs.ecchiSkipMode === "auto") {
        await ctx.db.patch(prefs._id, { ecchiSkipMode: "button", ageVerified: true });
      }
    }
    return null;
  },
});

// Delete user account
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");
    
    // Delete user preferences
    const prefs = await ctx.db.query("userPreferences").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (prefs) await ctx.db.delete(prefs._id);
    
    // Delete custom fonts
    const fonts = await ctx.db.query("customFonts").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const font of fonts) {
      await ctx.db.delete(font._id);
    }
    
    // Delete watch history
    const history = await ctx.db.query("watchHistory").withIndex("by_user_and_anime", (q) => q.eq("userId", userId)).collect();
    for (const h of history) {
      await ctx.db.delete(h._id);
    }
    
    // Delete favorites
    const favorites = await ctx.db.query("favorites").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const fav of favorites) {
      await ctx.db.delete(fav._id);
    }
    
    // Delete user
    await ctx.db.delete(userId);
    
    return null;
  },
});
