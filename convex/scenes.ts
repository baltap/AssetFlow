import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { checkSceneOwnership, checkVersionOwnership, sanitizeAiInputWithLogging } from "./authUtils";

export const createScene = internalMutation({
    args: {
        projectId: v.id("projects"),
        versionId: v.id("scriptVersions"),
        order: v.number(),
        text: v.string(),
        visualDescription: v.string(),
        visualKeywords: v.array(v.string()),
        shotType: v.optional(v.string()),
        lighting: v.optional(v.string()),
        cameraMovement: v.optional(v.string()),
        directorCommentary: v.optional(v.string()),
        durationEstimate: v.number(),
        status: v.union(
            v.literal("analyzing"),
            v.literal("searching"),
            v.literal("ready"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("scenes", args);
    },
});

export const updateSceneStatus = internalMutation({
    args: {
        sceneId: v.id("scenes"),
        status: v.union(
            v.literal("analyzing"),
            v.literal("searching"),
            v.literal("ready"),
            v.literal("linked"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sceneId, { status: args.status });
    },
});

export const updateSceneText = mutation({
    args: {
        sceneId: v.id("scenes"),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        const { scene, project, user } = await checkSceneOwnership(ctx, args.sceneId);

        // Sanitize manual text edits with logging
        const safeText = await sanitizeAiInputWithLogging(ctx, args.text, user._id);

        await ctx.db.patch(args.sceneId, {
            text: safeText,
            status: "analyzing",
        });
    },
});

export const updateSceneAI = internalMutation({
    args: {
        sceneId: v.id("scenes"),
        visualDescription: v.string(),
        visualKeywords: v.array(v.string()),
        shotType: v.optional(v.string()),
        lighting: v.optional(v.string()),
        cameraMovement: v.optional(v.string()),
        directorCommentary: v.optional(v.string()),
        durationEstimate: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sceneId, {
            visualDescription: args.visualDescription,
            visualKeywords: args.visualKeywords,
            shotType: args.shotType,
            lighting: args.lighting,
            cameraMovement: args.cameraMovement,
            directorCommentary: args.directorCommentary,
            durationEstimate: args.durationEstimate,
            status: "ready",
        });
    },
});

export const getScenes = query({
    args: { versionId: v.id("scriptVersions") },
    handler: async (ctx, args) => {
        await checkVersionOwnership(ctx, args.versionId).catch(() => {
            throw new Error("Unauthorized to view these scenes.");
        });

        return await ctx.db
            .query("scenes")
            .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
            .order("asc")
            .collect();
    },
});

export const getSceneInternal = internalQuery({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        const scene = await ctx.db.get(args.sceneId);
        if (!scene) return null;

        const project = await ctx.db.get(scene.projectId);
        if (!project) return null;

        return {
            ...scene,
            userId: project.userId
        };
    },
});

export const getScenesInternal = internalQuery({
    args: { versionId: v.id("scriptVersions") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("scenes")
            .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
            .order("asc")
            .collect();
    },
});
