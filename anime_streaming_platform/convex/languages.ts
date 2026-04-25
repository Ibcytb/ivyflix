import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { isAdmin } from "./anime";

// List all languages
export const listLanguages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("languages").collect();
  },
});

// List active languages only
export const listActiveLanguages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("languages")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get language by code
export const getLanguageByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("languages")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

// Create language (admin only)
export const createLanguage = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    nativeName: v.string(),
    flag: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Check if language code already exists
    const existing = await ctx.db
      .query("languages")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("Language code already exists");
    }

    return await ctx.db.insert("languages", args);
  },
});

// Update language (admin only)
export const updateLanguage = mutation({
  args: {
    languageId: v.id("languages"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    nativeName: v.optional(v.string()),
    flag: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { languageId, ...updates } = args;

    // If updating code, check if new code already exists
    if (updates.code) {
      const existing = await ctx.db
        .query("languages")
        .withIndex("by_code", (q) => q.eq("code", updates.code!))
        .first();

      if (existing && existing._id !== languageId) {
        throw new Error("Language code already exists");
      }
    }

    await ctx.db.patch(languageId, updates);
    return null;
  },
});

// Delete language (admin only)
export const deleteLanguage = mutation({
  args: { languageId: v.id("languages") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Delete all translations for this language
    const language = await ctx.db.get(args.languageId);
    if (language) {
      const translations = await ctx.db
        .query("translations")
        .withIndex("by_language_and_key", (q) =>
          q.eq("languageCode", language.code)
        )
        .collect();

      for (const translation of translations) {
        await ctx.db.delete(translation._id);
      }
    }

    await ctx.db.delete(args.languageId);
    return null;
  },
});

// Get translations for a language
export const getTranslations = query({
  args: { languageCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("translations")
      .withIndex("by_language_and_key", (q) =>
        q.eq("languageCode", args.languageCode)
      )
      .collect();
  },
});

// Set translation (admin only)
export const setTranslation = mutation({
  args: {
    languageCode: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Check if translation already exists
    const existing = await ctx.db
      .query("translations")
      .withIndex("by_language_and_key", (q) =>
        q.eq("languageCode", args.languageCode).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("translations", args);
    }

    return null;
  },
});

// Delete translation (admin only)
export const deleteTranslation = mutation({
  args: { translationId: v.id("translations") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.delete(args.translationId);
    return null;
  },
});

// Bulk set translations (admin only)
export const bulkSetTranslations = mutation({
  args: {
    languageCode: v.string(),
    translations: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Unauthorized: Admin access required");
    }

    for (const translation of args.translations) {
      const existing = await ctx.db
        .query("translations")
        .withIndex("by_language_and_key", (q) =>
          q.eq("languageCode", args.languageCode).eq("key", translation.key)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { value: translation.value });
      } else {
        await ctx.db.insert("translations", {
          languageCode: args.languageCode,
          key: translation.key,
          value: translation.value,
        });
      }
    }

    return null;
  },
});
