"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import {
    Play,
    Square,
    Zap,
    Volume2,
    Layers,
    Monitor,
    Smartphone,
    ChevronUp,
    ChevronDown,
    Sparkles,
    CheckCircle2,
    Share2
} from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";

interface TimelineProps {
    handleExportBundle: () => void;
    hideExport?: boolean;
}

// Sub-component for individual scene cards to handle localized playback logic
function SceneCard({
    scene,
    isActive,
    isPlaying,
    isPast,
    playbackTime,
    startTime,
    onClick,
    index
}: {
    scene: any,
    isActive: boolean,
    isPlaying: boolean,
    isPast: boolean,
    playbackTime: number,
    startTime: number,
    onClick: () => void,
    index: number
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        if (isActive && isPlaying) {
            videoRef.current.play().catch(() => { });
            // Sync current time with playback offset within the scene
            const offset = playbackTime - startTime;
            if (Math.abs(videoRef.current.currentTime - offset) > 0.5) {
                videoRef.current.currentTime = offset % (videoRef.current.duration || 1);
            }
        } else {
            videoRef.current.pause();
        }
    }, [isActive, isPlaying, playbackTime, startTime]);

    const isLinked = scene.status === 'linked';

    return (
        <div
            onClick={onClick}
            className={`flex-shrink-0 h-full aspect-video rounded-xl border-2 transition-all cursor-pointer relative group overflow-hidden ${isActive ? 'border-[var(--primary)] scale-[1.05] z-10 shadow-2xl shadow-[var(--primary)]/20' : 'border-white/5 hover:border-white/20'}`}
        >
            {scene.selectedAssetUrl ? (
                <video
                    ref={videoRef}
                    src={scene.selectedAssetUrl}
                    className={`w-full h-full object-cover transition-all duration-700 ${isPast && !isActive ? 'grayscale opacity-30 scale-95' : 'grayscale-0 opacity-100 scale-100'}`}
                    muted
                    playsInline
                    loop
                />
            ) : (
                <div className="w-full h-full bg-[#0a0905] flex flex-col items-center justify-center space-y-2">
                    <Sparkles size={16} className="text-[var(--primary)] opacity-10" />
                    <span className="text-[14px] font-black text-white/5">{index + 1}</span>
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>

            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/5">
                <span className="text-[8px] font-mono font-bold text-white/40 tracking-tighter">
                    {scene.durationEstimate}s
                </span>
            </div>

            {isLinked && (
                <div className="absolute top-2 right-2">
                    <CheckCircle2 size={12} className="text-[var(--primary)] fill-black" />
                </div>
            )}

            <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[9px] text-white/60 font-black truncate uppercase tracking-[0.2em]">{scene.visualKeywords?.[0] || 'Beat'}</p>
            </div>

            {isActive && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-[var(--primary)] transition-all linear shadow-[0_0_15px_rgba(230,179,25,1)]"
                    style={{ width: `${((playbackTime - startTime) / (scene.durationEstimate || 5)) * 100}%` }}
                />
            )}
        </div>
    );
}

export function Timeline({
    handleExportBundle,
    hideExport
}: TimelineProps) {
    const { activeVersionId: versionId, isTimelineOpen: isOpen, setTimelineOpen: onToggle, isExporting, optimisticStatuses, isPlaying, setPlaying: setIsPlaying, playbackTime, setPlaybackTime, selectedSceneId: activeSceneId, setSelectedSceneId: setActiveSceneId } = useStudioStore();
    const scenes = useQuery(
        api.scenes.getScenes,
        versionId ? { versionId } : "skip"
    );



    // Calculate production progress internally
    const linkedCount = scenes?.filter(s => s.status === 'linked').length || 0;
    const scenesCount = scenes?.length || 0;
    const progress = scenesCount > 0 ? (linkedCount / scenesCount) * 100 : 0;

    // Calculate scene timings
    const sceneTimings = (scenes || []).map((scene, idx) => {
        const start = (scenes || []).slice(0, idx).reduce((acc, s) => acc + (s.durationEstimate || 5), 0);
        return {
            id: scene._id,
            start,
            end: start + (scene.durationEstimate || 5)
        };
    });

    const totalDuration = (scenes || []).reduce((acc, s) => acc + (s.durationEstimate || 5), 0);

    // Playback Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setPlaybackTime(prev => {
                    if (prev >= totalDuration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.1;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, totalDuration]);

    // Update active scene based on playback time
    useEffect(() => {
        if (isPlaying) {
            const currentScene = sceneTimings.find(t => playbackTime >= t.start && playbackTime < t.end);
            if (currentScene && currentScene.id !== activeSceneId) {
                setActiveSceneId(currentScene.id);
            }
        }
    }, [playbackTime, isPlaying, sceneTimings, activeSceneId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(2, '0')}:00`;
    };

    const togglePlayback = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <footer className={`bg-[#0a0905] border-t border-white/5 flex flex-col z-20 overflow-hidden shadow-[0_-32px_128px_rgba(0,0,0,0.8)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'h-72' : 'h-12'}`}>
            {/* High-Fidelity Control Bar (The Toggle Button) */}
            <div
                className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-transparent cursor-pointer hover:bg-white/[0.02] transition-colors group"
                onClick={() => onToggle(!isOpen)}
            >
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex bg-[var(--deep-slate)] rounded-lg p-1 border border-white/5">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOpen) onToggle(true);
                                togglePlayback();
                            }}
                            className={`p-1 px-3 rounded-md flex items-center gap-2 transition-all min-w-[100px] justify-center ${isPlaying ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'}`}
                        >
                            {isPlaying ? (
                                <>
                                    <Square size={12} fill="currentColor" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Stop</span>
                                </>
                            ) : (
                                <>
                                    <Play size={12} fill="currentColor" className="ml-0.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => { setIsPlaying(false); setPlaybackTime(0); setActiveSceneId(scenes?.[0]?._id || null); }}
                            className="p-2 text-white/40 hover:text-white transition-colors border-l border-white/5 ml-1"
                        >
                            <Zap size={14} className="rotate-180" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
                        <span className="text-[var(--primary)] shadow-[0_0_8px_rgba(230,179,25,0.3)]">{formatTime(playbackTime)}</span>
                        <span className="text-white/10">/</span>
                        <span className="text-white/40">{formatTime(totalDuration)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {!isOpen && !hideExport && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(true);
                            }}
                            className="bg-[var(--primary)] text-black px-6 py-1.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_30px_rgba(230,179,25,0.2)] active:scale-95"
                        >
                            <span className="material-icons text-[14px]">download</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Export Bundle</span>
                        </button>
                    )}

                    {!isOpen && !hideExport && <div className="h-4 w-px bg-white/10" />}

                    {/* Angle Icon Toggle */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-[var(--primary)]/20 transition-all border border-white/5">
                        {isOpen ? (
                            <ChevronDown size={14} className="text-white/40 group-hover:text-[var(--primary)]" />
                        ) : (
                            <ChevronUp size={14} className="text-white/40 group-hover:text-[var(--primary)]" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content: Sequence + Export Panel */}
            <div className="flex-1 flex overflow-hidden">
                {/* Visual Sequence Reel */}
                <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center p-6 gap-6 bg-gradient-to-b from-transparent to-black/20">
                    {scenes && scenes.length > 0 ? (
                        scenes.map((scene, idx) => {
                            const timing = sceneTimings.find(t => t.id === scene._id);
                            const isActive = activeSceneId === scene._id;
                            const isPast = playbackTime > (timing?.end || 0);

                            return (
                                <SceneCard
                                    key={scene._id}
                                    scene={{
                                        ...scene,
                                        status: optimisticStatuses.get(scene._id) || scene.status
                                    }}
                                    index={idx}
                                    isActive={isActive}
                                    isPlaying={isPlaying}
                                    isPast={isPast}
                                    playbackTime={playbackTime}
                                    startTime={timing?.start || 0}
                                    onClick={() => {
                                        setIsPlaying(false);
                                        setPlaybackTime(timing?.start || 0);
                                        setActiveSceneId(scene._id);
                                    }}
                                />
                            );
                        })
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-10 border border-dashed border-white/20 rounded-xl">
                            <span className="text-[10px] uppercase font-black tracking-[0.4em]">Initialize Script to Load Sequence</span>
                        </div>
                    )}
                </div>

                {/* Right Panel: Export Preferences (Only visible when open) */}
                {!hideExport && isOpen && (
                    <div className="w-80 bg-black/40 border-l border-white/5 p-5 animate-in slide-in-from-right-8 duration-500 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--primary)] mb-6">Production Settings</h3>
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-2xl">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                                <Sparkles size={14} className="text-[var(--primary)]" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-white uppercase tracking-widest">Auto-Mastering</p>
                                                <p className="text-[7px] text-white/40 uppercase tracking-widest font-bold mt-0.5">Best available source fidelity</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <button
                                    onClick={handleExportBundle}
                                    disabled={progress < 100 || isExporting}
                                    className={`w-full py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${progress === 100 && !isExporting
                                        ? 'bg-[var(--primary)] text-black shadow-[0_15px_30px_rgba(230,179,25,0.2)] hover:scale-[1.02] cursor-pointer'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isExporting ? <span className="material-icons text-sm animate-spin">refresh</span> : <span className="material-icons text-sm">archive</span>}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {isExporting ? 'Packaging Master...' : 'Export Final Bundle'}
                                        </span>
                                    </div>
                                </button>
                                <p className="text-[7px] text-center text-white/20 uppercase tracking-[0.2em] mt-4 leading-relaxed font-bold">
                                    {progress < 100
                                        ? `Directing ${scenesCount - linkedCount} more scenes...`
                                        : "Assets Curated & Verified for Master Production"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </footer>
    );
}
