"use client";

import { X, Check, Zap, Crown, AlertCircle, Clapperboard } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: Id<"users">;
    reason?: "credits" | "tier";
}

export function PricingModal({ isOpen, onClose, userId, reason }: PricingModalProps) {
    const user = useQuery(api.users.currentUser);
    const [isLoading, setIsLoading] = useState(false);
    const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

    const handleTopUp = async (amount: number) => {
        setIsLoading(true);
        try {
            const url = await createCheckoutSession({
                topUpAmount: amount
            });
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("No checkout URL returned from Stripe");
            }
        } catch (err) {
            console.error("Stripe session failed:", err);
            alert(`Process failed: ${err instanceof Error ? err.message : "Internal error"}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpgrade = async (tier: "creative" | "pro" | "studio") => {
        if (tier === "creative") return; // Free tier
        setIsLoading(true);
        try {
            console.log("Initiating upgrade for tier:", tier);
            const url = await createCheckoutSession({
                tierId: tier as "pro" | "studio"
            });
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("No checkout URL returned from Stripe");
            }
        } catch (err) {
            console.error("Stripe session failed:", err);
            alert(`Process failed: ${err instanceof Error ? err.message : "Internal error"}. Please check your Stripe configuration.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    const plans = [
        {
            name: "Explorer",
            tierId: "creative" as const,
            price: "Free",
            description: "Experience the Full Brain",
            features: ["Full Director's Brain Access", "20 Production Credits", "Restricted to 1080p HD", "Restricted to 16:9 Format", "All Cinematic Vibes"],
            current: user.tier === "creative",
            icon: <Zap size={20} className="text-[var(--primary)]" />
        },
        {
            name: "Director",
            tierId: "pro" as const,
            price: "$39",
            period: "/mo",
            description: "Advanced Production Power",
            features: ["500 Production Credits /mo", "Export Editor-Ready Bundles (.ZIP)", "Unlock Strict 4K UHD Scouting", "Unlock All Canvas Formats", "Commercial Use License"],
            current: user.tier === "pro",
            recommended: true,
            icon: <Crown size={20} className="text-[var(--primary)]" />
        },
        {
            name: "Unleashed",
            tierId: "studio" as const,
            price: "$199",
            period: " Lifetime",
            description: "The Ultimate BYOK Engine",
            features: ["Unlimited Generations", "100% BYOK API Integration", "Batch Voiceover Syncing", "Unthrottled Deep Waterfalling", "Zero Credit Consumption"],
            current: user.tier === "studio",
            icon: <Clapperboard size={20} className="text-[var(--primary)]" />
        }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={onClose}
            />

            <div className="relative w-full max-w-6xl bg-[#0a0905] border border-white/5 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-700">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all z-10 hover:rotate-90"
                >
                    <X size={20} className="text-white/40" />
                </button>

                <div className="p-12">
                    <div className="text-center mb-12">

                        <h2 className="text-5xl font-black text-white tracking-tighter mb-3 uppercase">Studio Access</h2>
                        <p className="text-white/20 text-[11px] max-w-md mx-auto uppercase tracking-[0.4em] font-black leading-relaxed">Select a tier to scale your vision</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col p-8 rounded-[32px] border transition-all duration-500 group ${plan.recommended
                                    ? 'bg-white/[0.03] border-[var(--primary)] shadow-[0_20px_60px_rgba(230,179,25,0.1)] scale-105 z-10'
                                    : 'bg-black/20 border-white/5 hover:border-white/10 hover:translate-y-[-4px]'
                                    }`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1 bg-[var(--primary)] rounded-full shadow-[0_0_20px_rgba(230,179,25,0.4)]">
                                        <span className="text-[9px] font-black text-black uppercase tracking-widest">Most Popular</span>
                                    </div>
                                )}

                                <div className="mb-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-black/40 border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                                            {plan.icon}
                                        </div>
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Directorial Tier</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter">{plan.name}</h3>
                                    <p className="text-[10px] text-[var(--primary)] opacity-60 uppercase tracking-widest leading-relaxed font-bold">{plan.description}</p>
                                </div>

                                <div className="flex items-baseline gap-2 mb-10">
                                    <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
                                    {plan.period && <span className="text-white/30 text-xs font-black uppercase tracking-[0.1em]">{plan.period}</span>}
                                </div>

                                <div className="space-y-5 mb-12 flex-1">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
                                                <Check size={8} className="text-[var(--primary)]" />
                                            </div>
                                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest leading-none">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleUpgrade(plan.tierId)}
                                    className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${plan.current
                                        ? 'bg-white/5 border border-white/5 text-white/10 cursor-default'
                                        : plan.recommended
                                            ? 'bg-[var(--primary)] text-black shadow-[0_15_30_rgba(230,179,25,0.2)] hover:shadow-[0_20_40_rgba(230,179,25,0.3)] hover:scale-[1.03] active:scale-95'
                                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:scale-[1.03] active:scale-95'
                                        }`}
                                    disabled={plan.current || isLoading}
                                >
                                    {plan.current ? 'Current Access' : 'Initialize Access'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Need more credits?</h4>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">One-time top-up for large productions</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {[
                                { amount: 50, price: "$9" },
                                { amount: 200, price: "$19" }
                            ].map((pack) => (
                                <button
                                    key={pack.amount}
                                    onClick={() => handleTopUp(pack.amount)}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg hover:border-[var(--primary)]/50 transition-all flex items-center gap-3 group disabled:opacity-50"
                                >
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[10px] font-black text-white group-hover:text-[var(--primary)] transition-colors uppercase">{pack.amount} Credits</span>
                                        <span className="text-[8px] text-white/20 uppercase font-medium mt-0.5">Top-Up</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/5" />
                                    <span className="text-xs font-bold text-white">{pack.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
