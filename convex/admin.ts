import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const manualTopUp = internalAction({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.runMutation(internal.users.topUpCredits, {
            userId: args.userId,
            amount: args.amount,
        });
    },
});
export const topUpByEmail = internalAction({
    args: {
        email: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const users = await ctx.runQuery(api.debug.listAllUsers);
        const user = users.find((u: any) => u.email === args.email);
        if (!user) throw new Error("User not found: " + args.email);
        
        await ctx.runMutation(internal.users.topUpCredits, {
            userId: user._id,
            amount: args.amount,
        });
        
        console.log(`Successfully topped up ${args.email} with ${args.amount} credits.`);
    },
});
