"use client";

import { SignInButton } from "@clerk/nextjs";
import { Sparkles, Play, Shield, Globe, ArrowRight, CheckCircle2, Zap, Crown, Film, Cpu, Layers, Clapperboard } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";

export function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const features = [
        {
            title: "Smart Analytics",
            description: "Semantic script parsing that understands emotional beats, lighting requirements, and character presence automatically.",
            icon: <Cpu className="text-[var(--primary)]" size={24} />,
        },
        {
            title: "Visual Scouting",
            description: "Our AI engine scouts millions of high-fidelity frames to match your directorial intent with pixel-perfect precision.",
            icon: <Film className="text-[var(--primary)]" size={24} />,
        },
        {
            title: "Directorial Control",
            description: "Real-time collaboration tools that allow you to refine, tweak, and export production-ready bundles in minutes.",
            icon: <Layers className="text-[var(--primary)]" size={24} />,
        }
    ];

    const plans = [
        {
            name: "Explorer",
            price: "Free",
            description: "Experience the Full Brain",
            features: ["Full Director's Brain Access", "20 Production Credits", "Restricted to 1080p HD", "Restricted to 16:9 Format", "All Cinematic Vibes"],
            icon: <Zap size={20} className="text-[var(--primary)]" />
        },
        {
            name: "Director",
            price: "$39",
            period: "/mo",
            description: "Advanced Production Power",
            features: ["500 Production Credits /mo", "Export Editor-Ready Bundles (.ZIP)", "Unlock Strict 4K UHD Scouting", "Unlock All Canvas Formats", "Commercial Use License"],
            recommended: true,
            icon: <Crown size={20} className="text-[var(--primary)]" />
        },
        {
            name: "Unleashed",
            price: "$199",
            period: " Lifetime",
            description: "The Ultimate BYOK Engine",
            features: ["Unlimited Generations", "100% BYOK API Integration", "Batch Voiceover Syncing", "Unthrottled Deep Waterfalling", "Zero Credit Consumption"],
            icon: <Sparkles size={20} className="text-[var(--primary)]" />
        }
    ];

    return (
        <main className="min-h-screen bg-[#12100a] text-[#d1d1d1] selection:bg-[var(--primary)] selection:text-black">
            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'bg-[#12100a]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-default">
                        <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(230,179,25,0.2)] group-hover:scale-110 transition-transform">
                            <Clapperboard size={20} color="#12100a" />
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-black tracking-tighter text-white uppercase">AssetFlow</div>
                            <div className="text-2xl font-black tracking-tighter text-white/20 uppercase">Studio</div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        {["Production", "Pricing"].map(item => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[var(--primary)] transition-colors">
                                {item}
                            </a>
                        ))}
                    </div>

                    <SignInButton mode="modal">
                        <button
                            onClick={() => posthog.capture('CTA Clicked', { location: 'navbar', label: 'Enter Studio' })}
                            className="px-8 py-3 bg-[var(--primary)] text-black rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(230,179,25,0.2)]"
                            aria-label="Sign in to AssetFlow Studio"
                        >
                            Enter Studio
                        </button>
                    </SignInButton>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-48 pb-32 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl aspect-square bg-[radial-gradient(circle_at_center,rgba(230,179,25,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">V0.2 Production Release</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 uppercase leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                        From Script to <span className="bg-gradient-to-r from-[#ffeda3] to-[var(--primary)] text-transparent bg-clip-text">Cinema</span>. <br />
                        One Spark at a Time.
                    </h1>

                    <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                        Paste your script. AI segments your vision. Every cinematic mode is unlocked from day one. <br className="hidden md:block" />
                        Start your first production for free.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
                        <SignInButton mode="modal">
                            <button
                                onClick={() => posthog.capture('CTA Clicked', { location: 'hero', label: 'Initialize Your Vision' })}
                                className="px-10 py-5 bg-[var(--primary)] text-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(230,179,25,0.3)] flex items-center gap-3 group"
                                aria-label="Start your AI video production"
                            >
                                Initialize Your Vision
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </SignInButton>
                        <a 
                            href="#production"
                            onClick={() => posthog.capture('Watch Workflow Clicked', { location: 'hero' })}
                            className="px-10 py-5 bg-white/5 text-white rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all border border-white/10 inline-block text-center"
                        >
                            Watch the Workflow
                        </a>
                    </div>
                </div>

                {/* Dashboard Preview Mockup */}
                <div className="max-w-6xl mx-auto mt-24 relative animate-in fade-in slide-in-from-bottom-24 duration-1000 delay-700">
                    <div className="absolute inset-0 bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
                    <div
                        className="relative bg-[#1a1814] rounded-2xl border border-white/10 shadow-2xl overflow-hidden aspect-[16/9] group"
                        title="AssetFlow Studio Dashboard Preview"
                        aria-label="Visual preview of the AssetFlow AI video editing workspace"
                    >
                        <video
                            src="/cinematic_demo_v5.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay Gradient for consistency */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="production" className="py-32 px-6 bg-[#1a1814]/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)] mb-4">The Workflow</h3>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">AI-Driven Production Workflow</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {features.map((feature, idx) => (
                            <div key={idx} className="group p-8 rounded-2xl bg-[#1a1814] border border-white/5 hover:border-[var(--primary)]/30 transition-all duration-500">
                                <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">{feature.title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed uppercase tracking-widest font-medium">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)] mb-4">Access</h3>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">Choose Your Scale</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto items-stretch">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col p-10 rounded-[32px] border transition-all duration-500 group ${plan.recommended
                                    ? 'bg-white/[0.03] border-[var(--primary)] shadow-[0_40px_100px_rgba(230,179,25,0.08)] scale-[1.02] z-10 backdrop-blur-xl'
                                    : 'bg-[#1a1814]/50 border-white/5 hover:border-white/10 backdrop-blur-sm hover:translate-y-[-4px]'
                                    }`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-[var(--primary)] rounded-full shadow-[0_10px_30px_rgba(230,179,25,0.3)]">
                                        <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Most Popular</span>
                                    </div>
                                )}

                                <div className="mb-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-black/40 border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                                            {plan.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{plan.name}</h3>
                                            <p className="text-[10px] text-[var(--primary)] uppercase tracking-[0.3em] font-bold opacity-70">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black text-white tracking-tighter leading-none">{plan.price}</span>
                                        {plan.period && <span className="text-white/30 text-xs font-black uppercase tracking-[0.2em]">{plan.period}</span>}
                                    </div>
                                </div>

                                <div className="space-y-6 mb-12 flex-1">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-center gap-4">
                                            <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
                                                <CheckCircle2 size={10} className="text-[var(--primary)]" />
                                            </div>
                                            <span className="text-[11px] text-white/50 font-bold uppercase tracking-widest leading-none">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <SignInButton mode="modal">
                                    <button
                                        onClick={() => posthog.capture('Pricing CTA Clicked', { plan: plan.name, price: plan.price })}
                                        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all duration-500 ${plan.recommended
                                            ? 'bg-[var(--primary)] text-black shadow-[0_20px_40px_rgba(230,179,25,0.2)] hover:shadow-[0_25px_50px_rgba(230,179,25,0.3)] hover:scale-[1.03] active:scale-95'
                                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:scale-[1.03] active:scale-95'
                                            }`}
                                    >
                                        Start Production
                                    </button>
                                </SignInButton>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 bg-[#0a0905]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <div className="flex items-center gap-3 group cursor-default">
                            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(230,179,25,0.1)] group-hover:scale-110 transition-transform">
                                <Clapperboard size={16} color="#12100a" />
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black tracking-tighter text-white uppercase">AssetFlow</span>
                                <span className="text-lg font-black tracking-tighter text-white/20 uppercase">Studio</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-medium">© 2026 AssetFlow Studio. All rights reserved.</p>
                    </div>

                    <div className="flex gap-12">
                        {[{ name: "X", href: "#" }, { name: "Discord", href: "#" }, { name: "Terms", href: "/terms" }, { name: "Privacy", href: "/privacy" }].map(item => (
                            <Link key={item.name} href={item.href} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-[var(--primary)] transition-colors">
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </main>
    );
}
