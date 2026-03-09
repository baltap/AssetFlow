import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { checkProjectOwnership, getCurrentUser } from "./authUtils";

export const createProject = mutation({
    args: {
        title: v.string(),
        folderId: v.optional(v.id("folders")),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);

        const projectId = await ctx.db.insert("projects", {
            userId: user._id,
            title: args.title,
            folderId: args.folderId,
            status: "draft",
            exportPreferences: {
                targetSoftware: "Premiere Pro (.xml)",
                resolution: "1080p",
                framerate: 23.976,
                aspectRatio: "16:9",
            },
            createdAt: Date.now(),
        });

        return projectId;
    },
});

export const getProjects = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx).catch(() => null);
        if (!user) return [];

        return await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
    },
});

export const getProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await checkProjectOwnership(ctx, args.projectId);
    },
});

export const createNewVersion = mutation({
    args: {
        projectId: v.id("projects"),
        rawText: v.string(),
        changelog: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        const project = await checkProjectOwnership(ctx, args.projectId);

        // Atomic Credit Deduction
        if (user.credits < 1) {
            throw new Error("INSUFFICIENT_CREDITS");
        }

        await ctx.db.patch(user._id, {
            credits: user.credits - 1,
        });

        await ctx.db.insert("creditLogs", {
            userId: user._id,
            amount: -1,
            action: "script_analysis",
            timestamp: Date.now(),
        });

        // 1. Get current version count to increment
        const existingVersions = await ctx.db
            .query("scriptVersions")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        // 2. Insert new version
        const versionId = await ctx.db.insert("scriptVersions", {
            projectId: args.projectId,
            versionNumber: existingVersions.length + 1,
            rawText: args.rawText,
            changelog: args.changelog,
            createdAt: Date.now(),
        });

        // 3. Update project with the new current version
        await ctx.db.patch(args.projectId, {
            currentVersionId: versionId,
            status: "processing",
        });

        return versionId;
    },
});

export const updateProjectSettings = mutation({
    args: {
        projectId: v.id("projects"),
        vibe: v.optional(v.string()),
        voiceoverSettings: v.optional(v.object({
            provider: v.string(),
            voiceId: v.string(),
            stability: v.number(),
            similarity: v.number(),
        })),
        exportPreferences: v.optional(v.object({
            targetSoftware: v.union(
                v.literal("Premiere Pro (.xml)"),
                v.literal("DaVinci Resolve (.edl)"),
                v.literal("Final Cut (.fcpxml)")
            ),
            resolution: v.union(v.literal("4K"), v.literal("1080p")),
            framerate: v.number(),
            aspectRatio: v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1")),
        })),
    },
    handler: async (ctx, args) => {
        const { projectId, ...patches } = args;
        await checkProjectOwnership(ctx, projectId);
        await ctx.db.patch(projectId, patches);
    },
});
export const getProjectInternal = internalQuery({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.projectId);
    },
});

export const getVersionInternal = internalQuery({
    args: { versionId: v.id("scriptVersions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.versionId);
    },
});
