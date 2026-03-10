"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { X, Key, Shield, Cpu, Volume2, Save, CheckCircle2, Lock, Crown, AlertCircle } from "lucide-react";
import posthog from "posthog-js";
import { UsageDashboard } from "./UsageDashboard";

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userId: Id<"users">;
}

export function SettingsDrawer({ isOpen, onClose, userId }: SettingsDrawerProps) {
    const user = useQuery(api.users.currentUser);
    const settings = useQuery(api.settings.getSettings, { userId });
    const updateSettingsAction = useMutation(api.settings.updateSettings);

    const [pexelsKey, setPexelsKey] = useState("");
    const [pixabayKey, setPixabayKey] = useState("");
    const [geminiKey, setGeminiKey] = useState("");
    const [elevenLabsKey, setElevenLabsKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<"keys" | "usage">("keys");

    const alerts = useQuery(api.logs.getSecurityAlerts, { userId });
    const hasActiveAlerts = alerts && alerts.length > 0;

    const isUnleashed = user?.tier === "studio";

    // Initialize keys if settings are loaded
    useEffect(() => {
        if (settings?.apiKeys) {
            const keys = settings.apiKeys as Record<string, string>;
            setPexelsKey(keys["pexels"] || "");
            setPixabayKey(keys["pixabay"] || "");
            setGeminiKey(keys["gemini"] || "");
            setElevenLabsKey(keys["elevenlabs"] || "");
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Only send keys that have been modified or don't look like masks
            const apiKeys: any = {};
            if (pexelsKey && !pexelsKey.includes("...")) apiKeys.pexels = pexelsKey;
            if (pixabayKey && !pixabayKey.includes("...")) apiKeys.pixabay = pixabayKey;
            if (geminiKey && !geminiKey.includes("...")) apiKeys.gemini = geminiKey;
            if (elevenLabsKey && !elevenLabsKey.includes("...")) apiKeys.elevenlabs = elevenLabsKey;

            await updateSettingsAction({
                apiKeys
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            posthog.capture("settings_updated", { tier: user?.tier });
        } catch (error) {
            console.error("Failed to update settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-lg bg-[#0A0A0A] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                {/* Header */}
                <header className="p-8 pb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Studio Configuration</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 italic">Personal generation parameters</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="px-8 border-b border-white/5 flex gap-6 bg-black/10">
                    <button 
                        onClick={() => setActiveTab("keys")}
                        className={`py-4 text-[9px] uppercase tracking-widest font-black transition-all border-b-2 ${activeTab === 'keys' ? 'text-[var(--primary)] border-[var(--primary)]' : 'text-white/30 border-transparent hover:text-white'}`}
                    >
                        Integration Vault
                    </button>
                    <button 
                        onClick={() => setActiveTab("usage")}
                        className={`py-4 text-[9px] uppercase tracking-widest font-black transition-all border-b-2 relative ${activeTab === 'usage' ? 'text-[var(--primary)] border-[var(--primary)]' : 'text-white/30 border-transparent hover:text-white'}`}
                    >
                        Studio Metrics
                        {hasActiveAlerts && (
                            <span className="absolute top-3 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        )}
                    </button>
                </div>

                {/* Content */}
                {activeTab === "keys" ? (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                        {!isUnleashed && (
                            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-5 flex items-start gap-3">
                                <Crown className="text-[var(--primary)] shrink-0 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Unleashed Integration</p>
                                    <p className="text-[9px] text-white/40 mt-1 leading-relaxed uppercase tracking-widest">
                                        You are currently using shared global keys. Setting your own keys bypasses all internal unit limits and provides direct provider access.
                                    </p>
                                </div>
                            </div>
                        )}

                        <section className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="text-white/20" size={14} />
                                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Media Intelligence</h3>
                            </div>

                            {/* Pexels */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Pexels API Key</label>
                                    {pexelsKey && <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Active</span>}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={pexelsKey}
                                        onChange={(e) => setPexelsKey(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                                    />
                                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" size={14} />
                                </div>
                            </div>

                            {/* Pixabay */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Pixabay API Key</label>
                                    {pixabayKey && <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Active</span>}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={pixabayKey}
                                        onChange={(e) => setPixabayKey(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                                    />
                                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" size={14} />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6 pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="text-white/20" size={14} />
                                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Neural Processing</h3>
                            </div>

                            {/* Gemini */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Gemini API Key</label>
                                    {geminiKey && <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Active</span>}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                                    />
                                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" size={14} />
                                </div>
                            </div>

                            {/* ElevenLabs */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">ElevenLabs API Key</label>
                                    {elevenLabsKey && <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Active</span>}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={elevenLabsKey}
                                        onChange={(e) => setElevenLabsKey(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                                    />
                                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" size={14} />
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <UsageDashboard userId={userId} />
                    </div>
                )}

                {/* Footer */}
                <footer className="p-8 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock className="text-white/10" size={14} />
                        <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Encrypted at rest</span>
                    </div>
                    
                    <button
                        onClick={handleSave}
                        disabled={isSaving || activeTab === 'usage'}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                            showSuccess 
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20" 
                            : activeTab === 'usage'
                            ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                            : "bg-[var(--primary)] text-black hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.3)]"
                        }`}
                    >
                        {showSuccess ? (
                            <>
                                <CheckCircle2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sync Complete</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isSaving ? "Syncing..." : "Commit Changes"}
                                </span>
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
}
