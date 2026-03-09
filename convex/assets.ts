import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { checkSceneOwnership } from "./authUtils";

export const clearAssetsForScene = internalMutation({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        const assets = await ctx.db
            .query("assets")
            .withIndex("by_scene", (q) => q.eq("sceneId", args.sceneId))
            .collect();
        for (const asset of assets) {
            await ctx.db.delete(asset._id);
        }
    },
});

export const storeSearchedAssets = internalMutation({
    args: {
        sceneId: v.id("scenes"),
        searchKeywords: v.string(),
        assets: v.array(
            v.object({
                externalId: v.string(),
                previewUrl: v.string(),
                downloadUrl: v.string(),
                matchScore: v.number(),
                metadata: v.object({
                    duration: v.optional(v.number()),
                    width: v.optional(v.number()),
                    height: v.optional(v.number()),
                    resolution: v.optional(v.string()),
                    tags: v.array(v.string()),
                }),
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const assetData of args.assets) {
            // Check if this specific asset version already exists for this scene
            const existing = await ctx.db
                .query("assets")
                .withIndex("by_scene", (q) => q.eq("sceneId", args.sceneId))
                .filter((q) => q.eq(q.field("externalId"), assetData.externalId))
                .first();

            if (existing) continue;

            await ctx.db.insert("assets", {
                sceneId: args.sceneId,
                source: "pexels",
                searchKeywords: args.searchKeywords,
                ...assetData,
            });
        }
    },
});

export const updateSceneWithAsset = mutation({
    args: {
        sceneId: v.id("scenes"),
        assetId: v.string(),
        assetUrl: v.string(),
        assetPreviewUrl: v.string(),
        assetResolution: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await checkSceneOwnership(ctx, args.sceneId);
        
        await ctx.db.patch(args.sceneId, {
            selectedAssetId: args.assetId,
            selectedAssetUrl: args.assetUrl,
            selectedAssetPreviewUrl: args.assetPreviewUrl,
            selectedAssetResolution: args.assetResolution,
            status: "linked",
        });
    },
});

export const updateSceneWithAssetInternal = internalMutation({
    args: {
        sceneId: v.id("scenes"),
        assetId: v.string(),
        assetUrl: v.string(),
        assetPreviewUrl: v.string(),
        assetResolution: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sceneId, {
            selectedAssetId: args.assetId,
            selectedAssetUrl: args.assetUrl,
            selectedAssetPreviewUrl: args.assetPreviewUrl,
            selectedAssetResolution: args.assetResolution,
            status: "linked",
        });
    },
});

export const getAssetsByKeywordsInternal = internalQuery({
    args: { keywords: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("assets")
            .withIndex("by_keywords", (q) => q.eq("searchKeywords", args.keywords))
            .collect();
    },
});

export const getAssets = query({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        await checkSceneOwnership(ctx, args.sceneId);

        return await ctx.db
            .query("assets")
            .withIndex("by_scene", (q) => q.eq("sceneId", args.sceneId))
            .collect();
    },
});

export const getAssetsInternal = internalQuery({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("assets")
            .withIndex("by_scene", (q) => q.eq("sceneId", args.sceneId))
            .collect();
    },
});
