import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./authUtils";

export const getSettingsInternal = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();

        return settings;
    },
});

export const getSettings = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (user._id !== args.userId) {
            throw new Error("Unauthorized to view settings");
        }
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();

        if (!settings) {
            return {
                apiKeys: {},
                preferences: {
                    defaultResolution: "1080p",
                    defaultAspectRatio: "16:9",
                }
            };
        }

        // Mask API keys for security
        const maskedKeys: Record<string, string> = {};
        if (settings.apiKeys) {
            for (const [key, value] of Object.entries(settings.apiKeys)) {
                if (value) {
                    maskedKeys[key] = value.length > 8 
                        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
                        : "****";
                }
            }
        }

        return {
            ...settings,
            apiKeys: maskedKeys
        };
    },
});

export const updateSettings = mutation({
    args: {
        apiKeys: v.optional(v.object({
            pexels: v.optional(v.string()),
            pixabay: v.optional(v.string()),
            gemini: v.optional(v.string()),
            elevenlabs: v.optional(v.string()),
        })),
        preferences: v.optional(v.object({
            defaultResolution: v.optional(v.union(v.literal("4K"), v.literal("1080p"), v.literal("720p"))),
            defaultAspectRatio: v.optional(v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1"))),
        })),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        const existingSettings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

        if (existingSettings) {
            await ctx.db.patch(existingSettings._id, {
                apiKeys: {
                    ...existingSettings.apiKeys,
                    ...(args.apiKeys || {})
                },
                preferences: {
                    ...existingSettings.preferences,
                    ...(args.preferences || {})
                },
            });
        } else {
            await ctx.db.insert("userSettings", {
                userId: user._id,
                apiKeys: args.apiKeys || {},
                preferences: {
                    defaultResolution: args.preferences?.defaultResolution || "1080p",
                    defaultAspectRatio: args.preferences?.defaultAspectRatio || "16:9",
                },
            });
        }
    },
});
