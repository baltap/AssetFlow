"use node";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserAction } from "./authUtils";
import Stripe from "stripe";

// stripe instance will be created inside the actions

export const createCheckoutSession = action({
    args: {
        tierId: v.optional(v.union(v.literal("pro"), v.literal("studio"))),
        topUpAmount: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<{ url?: string; error?: string }> => {
        try {
            console.log("HANDLER_START: createCheckoutSession", args);
            
            // Check auth first
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                console.error("AUTH_ERROR: No identity found");
                return { error: "Unauthenticated: Please log in to your account." };
            }

            if (!process.env.STRIPE_SECRET_KEY) {
                console.error("CONFIG_ERROR: STRIPE_SECRET_KEY is missing");
                return { error: "Payment system is not configured. (Missing Secret Key)" };
            }

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const user = await getCurrentUserAction(ctx);
            
            console.log("USER_FOUND:", { id: user._id, email: user.email, stripeId: user.stripeCustomerId });
            
            let customerId: string | undefined = user.stripeCustomerId;

            // Create a Stripe customer if they don't have one
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: { convexUserId: user._id },
                });
                customerId = customer.id;
                await ctx.runMutation(internal.users.updateStripeCustomerInternal, {
                    userId: user._id,
                    stripeCustomerId: customerId,
                });
            }

            const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

            console.log(`Creating session for: ${args.tierId || 'Top-up'} (${args.topUpAmount || ''})`);

            if (args.tierId === "pro") {
                // Director Tier - $39/mo
                lineItems.push({
                    price_data: {
                        currency: "usd",
                        product: "prod_U7jBbwJTTu0UBI", 
                        unit_amount: 3900,
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                });
            } else if (args.tierId === "studio") {
                // Unleashed Tier - $199 Lifetime
                lineItems.push({
                    price_data: {
                        currency: "usd",
                        product: "prod_U7jBYl3diF0JSO",
                        unit_amount: 19900,
                    },
                    quantity: 1,
                });
            } else if (args.topUpAmount) {
                // Mapping top-up amounts to prices (in cents)
                let unitAmount = 0;
                if (args.topUpAmount === 50) unitAmount = 900; // $9.00
                else if (args.topUpAmount === 200) unitAmount = 1900; // $19.00
                else unitAmount = Math.round((args.topUpAmount / 10) * 100); // Standard fallback

                lineItems.push({
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${args.topUpAmount} AssetFlow Credits`,
                            description: "Top up your production credits",
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                });
            }

            if (lineItems.length === 0) {
                return { error: "No items selected for purchase." };
            }

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                line_items: lineItems,
                mode: args.tierId === "pro" ? "subscription" : "payment",
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://assetflow.studio"}/?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://assetflow.studio"}/`,
                metadata: {
                    convexUserId: user._id,
                    tierId: args.tierId || "",
                    topUpAmount: args.topUpAmount ? args.topUpAmount.toString() : "",
                },
            });

            console.log("SESSION_CREATED:", session.id);
            return { url: session.url! };
        } catch (error: any) {
            console.error("GLOBAL_STRIPE_ERROR:", error);
            return { error: error.message || "A server error occurred during checkout initialization." };
        }
    },
});

export const fulfill = action({
    args: { signature: v.string(), payload: v.string() },
    handler: async (ctx: any, args: any) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        let event;

        try {
            event = await stripe.webhooks.constructEventAsync(args.payload, args.signature, webhookSecret);
        } catch (err) {
            console.error(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
            throw new Error("Webhook signature verification failed");
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const customerId = session.customer as string;
            const convexUserId = session.metadata?.convexUserId as any;
            const tierId = session.metadata?.tierId as "pro" | "studio" | undefined;
            const topUpAmount = session.metadata?.topUpAmount ? parseInt(session.metadata.topUpAmount) : undefined;

            if (!convexUserId) {
                console.error("Missing convexUserId in Stripe metadata");
                return { success: false };
            }

            // Important: Store the customer ID so we can identify them in recurring webhooks
            await ctx.runMutation(internal.users.updateStripeCustomerInternal, {
                userId: convexUserId,
                stripeCustomerId: customerId,
            });

            await ctx.runMutation(internal.users.fulfillPurchaseInternal, {
                convexUserId,
                stripeCustomerId: customerId,
                tier: tierId || undefined,
                credits: topUpAmount,
            });
        } else if (event.type === "invoice.paid") {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;

            // Find user by stripeCustomerId
            const user = await ctx.runQuery(internal.users.getUserByStripeIdInternal, {
                stripeCustomerId: customerId,
            });

            if (user && user.tier !== "creative") {
                // For recurring subs, refill credits every month
                const creditAmount = user.tier === "pro" ? 500 : 0; // Adjust logic for studio if needed
                if (creditAmount > 0) {
                    await ctx.runMutation(internal.users.fulfillPurchaseInternal, {
                        convexUserId: user._id,
                        stripeCustomerId: customerId,
                        credits: creditAmount,
                    });
                }
            }
        } else if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const user = await ctx.runQuery(internal.users.getUserByStripeIdInternal, {
                stripeCustomerId: customerId,
            });

            if (user) {
                await ctx.runMutation(internal.users.downgradeUserInternal, {
                    userId: user._id,
                });
            }
        }

        return { received: true };
    },
});
