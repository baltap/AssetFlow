import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../../../../../convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    const payload = await req.text();
    const signature = req.headers.get("Stripe-Signature")!;

    try {
        await convex.action(api.stripe.fulfill, {
            payload,
            signature,
        });

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Stripe webhook fulfillment failed:", err);
        return NextResponse.json(
            { error: "Webhook fulfillment failed" },
            { status: 400 }
        );
    }
}
