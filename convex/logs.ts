import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./authUtils";

export const logSecurityEvent = internalMutation({
    args: {
        userId: v.optional(v.id("users")),
        eventType: v.union(v.literal("ai_injection_blocked"), v.literal("unauthorized_access")),
        payload: v.string(),
        metadata: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("securityLogs", {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const logUsage = internalMutation({
    args: {
        userId: v.id("users"),
        feature: v.union(v.literal("segment_script"), v.literal("rank_assets"), v.literal("generate_vo")),
        model: v.string(),
        tokens: v.object({
            prompt: v.number(),
            completion: v.number(),
        }),
        costEstimate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("usageLogs", {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const getUsageStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (user._id !== args.userId) {
            throw new Error("Unauthorized to view usage stats");
        }
        return await ctx.db
            .query("usageLogs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

export const getSecurityAlerts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (user._id !== args.userId) {
            throw new Error("Unauthorized to view security alerts");
        }
        return await ctx.db
            .query("securityLogs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("eventType"), "ai_injection_blocked"))
            .order("desc")
            .take(5);
    },
});
