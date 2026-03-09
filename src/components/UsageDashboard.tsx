"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Shield, BarChart3, Zap, Info, AlertTriangle, Cpu, Volume2, Search, Clapperboard } from "lucide-react";

interface UsageDashboardProps {
    userId: Id<"users">;
}

export function UsageDashboard({ userId }: UsageDashboardProps) {
    const usage = useQuery(api.logs.getUsageStats, { userId });
    const alerts = useQuery(api.logs.getSecurityAlerts, { userId });

    if (!usage) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-40 bg-white/5 rounded-xl border border-white/5" />
            </div>
        );
    }

    // Process usage for summary stats
    const totalTokens = usage.reduce((acc, curr) => acc + (curr.tokens?.prompt || 0) + (curr.tokens?.completion || 0), 0);
    const featureBreakdown = usage.reduce((acc: Record<string, number>, curr) => {
        acc[curr.feature] = (acc[curr.feature] || 0) + 1;
        return acc;
    }, {});

    const featureIcons: Record<string, any> = {
        segment_script: Clapperboard,
        rank_assets: Search,
        generate_vo: Volume2
    };

    const featureLabels: Record<string, string> = {
        segment_script: "Script Segmentation",
        rank_assets: "Visual Ranking",
        generate_vo: "Voiceover Gen"
    };

    return (
        <div className="space-y-8 pb-4">
            {/* Security Alerts (if any) */}
            {alerts && alerts.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="text-emerald-500" size={14} />
                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Security Audit</h3>
                    </div>
                    {alerts.map((alert, idx) => (
                        <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                            <AlertTriangle className="text-red-500 shrink-0" size={14} />
                            <div className="flex-1">
                                <p className="text-[10px] text-red-500/90 font-bold uppercase tracking-wider leading-tight">
                                    {alert.eventType === 'ai_injection_blocked' ? 'AI Injection Blocked' : 'Security Alert'}
                                </p>
                                <p className="text-[9px] text-white/40 mt-1 line-clamp-1 italic uppercase tracking-widest">
                                    Payload: "{alert.payload}"
                                </p>
                                <p className="text-[8px] text-white/20 mt-1 uppercase font-black tabular-nums">
                                    {new Date(alert.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Credit Overview */}
            <section className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Zap size={16} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Studio Usage</h3>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Real-time resource audit</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[14px] font-black text-white tabular-nums">
                            {totalTokens.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-white/20 uppercase tracking-widest font-black">Processed Units</div>
                    </div>
                </div>

                {/* Feature Usage Breakdown */}
                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(featureBreakdown).map(([feature, count]) => {
                        const Icon = featureIcons[feature] || Cpu;
                        return (
                            <div key={feature} className="group relative bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                                            <Icon size={14} className="text-white/40 group-hover:text-[var(--primary)] transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-white/70 uppercase tracking-wider">
                                                {featureLabels[feature] || feature}
                                            </span>
                                            <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">
                                                {count} Executions
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1 flex-1 mx-8 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[var(--primary)]/30 rounded-full animate-in slide-in-from-left duration-1000 ease-out"
                                            style={{ width: `${Math.min(100, (count / usage.length) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[11px] font-black text-white tabular-nums">
                                            {Math.round((count / usage.length) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Pro-Tip section */}
            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl p-5 flex items-start gap-3">
                <Info size={16} className="text-[var(--primary)]/70 shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] leading-relaxed font-bold">
                    Higher tiered users enjoy direct <span className="text-[var(--primary)]">BYOK</span> integration, bypassing internal unit limits. Costs are billed directly to your provider key.
                </p>
            </div>
        </div>
    );
}
