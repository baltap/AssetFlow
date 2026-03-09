import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./authUtils";

export const storeUser = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication");
        }

        // Check if we've already stored this user
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (user !== null) {
            // If we've seen this identity before but the name/email has changed, patch it.
            if (user.name !== identity.name || user.email !== identity.email) {
                await ctx.db.patch(user._id, { name: identity.name, email: identity.email });
            }
            return user._id;
        }

        // If it's a new identity, create a new User.
        return await ctx.db.insert("users", {
            name: identity.name || identity.nickname || "Anonymous Reader",
            email: identity.email || "no-email@clerk.user",
            tokenIdentifier: identity.tokenIdentifier,
            tier: "creative",
            credits: 10,
            freeVoiceSyncsUsed: 0,
        });
    },
});

export const updateApiKey = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        await ctx.db.patch(user._id, { elevenlabsApiKey: args.key });
    }
});

export const deductCredits = mutation({
    args: {
        amount: v.number(),
        action: v.union(
            v.literal("script_analysis"),
            v.literal("asset_export"),
            v.literal("subscription_refill")
        ),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);

        if (user.credits < args.amount) {
            throw new Error("INSUFFICIENT_CREDITS");
        }

        await ctx.db.patch(user._id, {
            credits: user.credits - args.amount,
        });

        await ctx.db.insert("creditLogs", {
            userId: user._id,
            amount: -args.amount,
            action: args.action,
            timestamp: Date.now(),
        });

        return { success: true, remaining: user.credits - args.amount };
    },
});

export const currentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
    },
});

export const deductCreditsInternal = internalMutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        action: v.union(
            v.literal("script_analysis"),
            v.literal("asset_export"),
            v.literal("subscription_refill")
        ),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        if (user.credits < args.amount) {
            throw new Error("INSUFFICIENT_CREDITS");
        }

        await ctx.db.patch(args.userId, {
            credits: user.credits - args.amount,
        });

        await ctx.db.insert("creditLogs", {
            userId: args.userId,
            amount: -args.amount,
            action: args.action,
            timestamp: Date.now(),
        });

        return { success: true, remaining: user.credits - args.amount };
    },
});

export const topUpCredits = internalMutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.userId, {
            credits: user.credits + args.amount,
        });

        await ctx.db.insert("creditLogs", {
            userId: args.userId,
            amount: args.amount,
            action: "subscription_refill",
            timestamp: Date.now(),
        });

        return { success: true, newBalance: user.credits + args.amount };
    },
});

export const updateUserTier = internalMutation({
    args: {
        userId: v.id("users"),
        tier: v.union(v.literal("creative"), v.literal("pro"), v.literal("studio")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.userId, {
            tier: args.tier,
        });

        // Add some bonus credits for the upgrade
        const bonus = args.tier === "pro" ? 500 : 0;
        if (bonus > 0) {
            await ctx.db.patch(args.userId, {
                credits: user.credits + bonus,
            });
        }

        return { success: true };
    },
});

export const getUserByTokenInternal = internalQuery({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();
    }
});

export const getUserByIdInternal = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    }
});

export const incrementFreeVoiceSyncsInternal = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(user._id, { freeVoiceSyncsUsed: (user.freeVoiceSyncsUsed || 0) + 1 });
        }
    }
});

export const updateStripeCustomerInternal = internalMutation({
    args: { userId: v.id("users"), stripeCustomerId: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { stripeCustomerId: args.stripeCustomerId });
    }
});

export const fulfillPurchaseInternal = internalMutation({
    args: {
        convexUserId: v.id("users"),
        stripeCustomerId: v.string(),
        tier: v.optional(v.union(v.literal("pro"), v.literal("studio"))),
        credits: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.convexUserId);
        
        if (!user) throw new Error("User associated with metadata not found");

        // Cross-verify Stripe Customer IDs to prevent metadata spoofing
        if (user.stripeCustomerId !== args.stripeCustomerId) {
            throw new Error("Security Violation: Stripe Customer ID mismatch.");
        }

        if (args.tier) {
            await ctx.db.patch(user._id, { tier: args.tier });

            // Default refills for tiers
            if (args.tier === "pro") {
                await ctx.db.patch(user._id, { credits: user.credits + 500 });
                await ctx.db.insert("creditLogs", {
                    userId: user._id,
                    amount: 500,
                    action: "subscription_refill",
                    timestamp: Date.now(),
                });
            }
        }

        if (args.credits) {
            await ctx.db.patch(user._id, { credits: user.credits + args.credits });
            await ctx.db.insert("creditLogs", {
                userId: user._id,
                amount: args.credits,
                action: "subscription_refill",
                timestamp: Date.now(),
            });
        }
    }
});

