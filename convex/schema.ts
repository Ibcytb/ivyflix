import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  anime: defineTable({
    title: v.string(),
    description: v.string(),
    poster: v.id("_storage"),
    thumbnail: v.id("_storage"),
    genres: v.array(v.string()),
    releaseYear: v.number(),
    status: v.union(v.literal("ongoing"), v.literal("completed")),
  })
    .index("by_title", ["title"])
    .searchIndex("search_title", {
      searchField: "title",
    }),

  episodes: defineTable({
    animeId: v.id("anime"),
    episodeNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    hlsZipFileId: v.optional(v.id("_storage")), // Legacy field, no longer used
    thumbnail: v.optional(v.id("_storage")),
    duration: v.number(), // in seconds
    openingStart: v.optional(v.number()),
    openingEnd: v.optional(v.number()),
    endingStart: v.optional(v.number()),
    endingEnd: v.optional(v.number()),
  }).index("by_anime", ["animeId", "episodeNumber"]),

  hlsFiles: defineTable({
    episodeId: v.id("episodes"),
    filename: v.string(),
    storageId: v.id("_storage"),
    isPlaylist: v.boolean(),
  }).index("by_episode", ["episodeId"]),

  subtitles: defineTable({
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
  }).index("by_episode", ["episodeId"]),

  ecchiSkips: defineTable({
    episodeId: v.id("episodes"),
    startTime: v.number(),
    endTime: v.number(),
    summary: v.string(),
  }).index("by_episode", ["episodeId"]),

  watchHistory: defineTable({
    userId: v.id("users"),
    episodeId: v.id("episodes"),
    animeId: v.id("anime"),
    timestamp: v.number(), // current playback position in seconds
    lastWatched: v.number(), // timestamp
  }).index("by_user_and_anime", ["userId", "animeId"]),

  favorites: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
  }).index("by_user", ["userId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    playbackSpeed: v.number(),
    preferredQuality: v.string(),
    subtitleFontSize: v.number(),
    subtitleFontFamily: v.string(),
    subtitleColor: v.optional(v.string()), // Legacy field, ignored
    subtitleBackgroundColor: v.optional(v.string()), // Legacy field, ignored
    subtitleBackgroundOpacity: v.optional(v.number()), // Legacy field, ignored
    selectedFontId: v.optional(v.string()), // "default", "bnviit", or custom font _id
    customFontId: v.optional(v.id("_storage")), // Legacy field, will be migrated
    autoPlayNext: v.boolean(),
    autoSkipOpening: v.boolean(),
    autoSkipEnding: v.boolean(),
    openingSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    endingSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    ecchiSkipMode: v.optional(v.union(v.literal("auto"), v.literal("button"), v.literal("off"))),
    birthYear: v.optional(v.number()),
    ageVerified: v.optional(v.boolean()),
    // UI & Theme
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    uiScale: v.optional(v.number()),
    // Content Display
    showAdultContent: v.optional(v.boolean()),
    hiddenGenres: v.optional(v.array(v.string())),
    contentFilter: v.optional(v.union(v.literal("all"), v.literal("ongoing"), v.literal("completed"))),
    // Language & Region
    interfaceLanguage: v.optional(v.string()), // Changed to string to support dynamic languages
    defaultSubtitleLanguage: v.optional(v.string()),
    // Profile
    nickname: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
    favoriteGenres: v.optional(v.array(v.string())),
  }).index("by_user", ["userId"]),

  customFonts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    storageId: v.id("_storage"),
  }).index("by_user", ["userId"]),

  languages: defineTable({
    code: v.string(), // e.g., "ko", "en", "ja"
    name: v.string(), // e.g., "한국어", "English", "日本語"
    nativeName: v.string(), // e.g., "한국어", "English", "日本語"
    flag: v.string(), // emoji flag e.g., "🇰🇷", "🇺🇸", "🇯🇵"
    isActive: v.boolean(),
  }).index("by_code", ["code"]),

  translations: defineTable({
    languageCode: v.string(),
    key: v.string(), // e.g., "home.title", "settings.theme"
    value: v.string(), // translated text
  }).index("by_language_and_key", ["languageCode", "key"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
