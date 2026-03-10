"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
    Play,
    Settings,
    Music,
    Sparkles,
    ChevronRight,
    Download,
    Volume2,
    Lock,
    Unlock,
    Clapperboard,
    Loader2,
    CheckCircle2,
    ChevronDown
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Timeline } from "./Timeline";
import { useStudioStore } from "../store/useStudioStore";
import { useAction } from "convex/react";
import { createAndDownloadBundle, ExportScene } from "../utils/export";

interface EditorViewProps {
    projectId: Id<"projects">;
    versionId?: Id<"scriptVersions">;
    onUpgradeRequest?: (reason: "credits" | "tier") => void;
}

export function EditorView({ projectId, versionId, onUpgradeRequest }: EditorViewProps) {
    const { selectedSceneId: activeSceneId, setSelectedSceneId: setActiveSceneId, isPlaying, setPlaying: setIsPlaying, playbackTime } = useStudioStore();
    const project = useQuery(api.projects.getProject, { projectId });
    const scenes = useQuery(
        api.scenes.getScenes,
        versionId ? { versionId } : "skip"
    );
    const user = useQuery(api.users.currentUser);
    const updateSettings = useMutation(api.projects.updateProjectSettings);
    const refineAllScenesWithVibe = useAction(api.ai.refineAllScenesWithVibe);
    const generateVO = useAction(api.audio.generateMockVO);

    const ELEVENLABS_VOICES = [
        { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep • Narration" },
        { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft • American" },
        { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded • American" },
        { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Emotional • Youthful" },
        { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Deep • American" },
        { id: "VR6AewLTigWG4xSOukaG", name: "Rachel", description: "Calm • American" },
    ];

    const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [isGeneratingVO, setIsGeneratingVO] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string, type: "info" | "error" | "warning" } | null>(null);
    const [freeSyncModal, setFreeSyncModal] = useState<{ remaining: number } | null>(null);
    const [byokErrorModal, setByokErrorModal] = useState(false);
    const [limitReachedModal, setLimitReachedModal] = useState(false);
    const [exportState, setExportState] = useState<{ status: string; progress: number } | null>(null);
    const deductCredits = useMutation(api.users.deductCredits);

    const showToast = (text: string, type: "info" | "error" | "warning" = "info") => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 5000);
    };


    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const activeScene = scenes?.find(s => s._id === activeSceneId);

    // Calculate scene timings
    const sceneTimings = (scenes || []).map((scene, idx) => {
        const start = scenes!.slice(0, idx).reduce((acc, s) => acc + (s.durationEstimate || 5), 0);
        return {
            id: scene._id,
            start,
            end: start + (scene.durationEstimate || 5)
        };
    });

    const totalDuration = (scenes || []).reduce((acc, s) => acc + (s.durationEstimate || 5), 0);

    // 1. Video Sync Logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            if (video.paused) {
                video.play().catch(e => console.warn("Video play failed:", e));
            }
        } else {
            video.pause();
        }
    }, [isPlaying, activeSceneId]);

    // 2. Audio Source Assignment
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // We removed the manual load() because React key remount handles it perfectly now.
    }, [activeScene?.audioUrl]);

    // 3. Audio Playback Control
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && activeScene?.audioUrl) {
            // Play explicitly
            if (audio.paused) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn("Audio play prevented:", e));
                }
            }
        } else {
            audio.pause();
        }
    }, [isPlaying, activeSceneId, activeScene?.audioUrl]);

    // 2. Continuous Drift Correction (Keeps audio locked to visual timeline)
    useEffect(() => {
        if (!isPlaying || !audioRef.current || !activeScene?.audioUrl) return;

        const currentTiming = sceneTimings.find(t => t.id === activeSceneId);
        if (!currentTiming) return;

        const expectedOffset = playbackTime - currentTiming.start;
        const audioTime = audioRef.current.currentTime;

        // Only correct drift if audio is actually ready to play (readyState >= 2)
        // and drifted more than 1 second to avoid interrupting short buffers
        if (audioRef.current.readyState >= 2 && Math.abs(audioTime - expectedOffset) > 1.0) {
            audioRef.current.currentTime = Math.max(0, expectedOffset);
        }
    }, [playbackTime, isPlaying, activeSceneId, activeScene?.audioUrl]);





    if (!project || !scenes) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--background-dark)]">
                <div className="flex flex-col items-center gap-4 opacity-20">
                    <Clapperboard size={48} className="animate-pulse" />
                    <p className="text-sm font-bold uppercase tracking-[0.4em]">Loading Studio...</p>
                </div>
            </div>
        );
    }

    const handleUpdateVibe = (vibe: string) => {
        updateSettings({ projectId, vibe });
    };

    const handleSyncVO = async () => {
        if (!activeSceneId) return;
        setIsGeneratingVO(true);
        try {
            const result = await generateVO({
                sceneId: activeSceneId,
                voiceId: ELEVENLABS_VOICES[selectedVoiceIdx].id
            });

            if (result && !result.success) {
                if (result.error === "LIMIT_REACHED") {
                    setLimitReachedModal(true);
                } else if (result.error === "API_ERROR" || result.error === "API_MISSING") {
                    setByokErrorModal(true);
                } else {
                    showToast("Failed to generate voiceover.", "error");
                }
            } else if (result && result.success && result.usedFreeSync) {
                setFreeSyncModal({ remaining: result.syncsRemaining ?? 0 });
            }
        } catch (error) {
            console.error("VO generation failed", error);
            showToast("An unexpected error occurred while generating audio.", "error");
        } finally {
            setIsGeneratingVO(false);
        }
    };

    const handleSyncAllVO = async () => {
        if (!scenes || scenes.length === 0) return;
        setIsGeneratingVO(true);
        try {
            for (const scene of scenes) {
                const result = await generateVO({
                    sceneId: scene._id,
                    voiceId: ELEVENLABS_VOICES[selectedVoiceIdx].id
                });
                if (result && !result.success) {
                    if (result.error === "LIMIT_REACHED") {
                        setLimitReachedModal(true);
                        break; // Stop syncing if limit reached
                    } else if (result.error === "API_ERROR" || result.error === "API_MISSING") {
                        setByokErrorModal(true);
                        break;
                    }
                }
            }
            showToast("Voiceovers synced for all accessible scenes.", "info");
        } catch (error) {
            console.error("Batch VO generation failed", error);
            showToast("An error occurred while batch generating audio.", "error");
        } finally {
            setIsGeneratingVO(false);
        }
    };

    const handleExportFinalBundle = async () => {
        if (!scenes || scenes.length === 0 || !user || !project) return;

        const hasMissingAudio = scenes.some(s => s.audioStatus !== 'ready');
        const hasMissingVideo = scenes.some(s => !s.selectedAssetUrl);

        if (hasMissingAudio || hasMissingVideo) {
            showToast("Missing assets! Please select videos and sync voiceovers for all scenes first.", "error");
            return;
        }

        const exportScenes: ExportScene[] = scenes.map(s => ({
            _id: s._id,
            order: s.order,
            visualDescription: s.visualDescription || '',
            scriptText: s.text,
            videoUrl: s.selectedAssetUrl,
            audioUrl: s.audioUrl,
            audioDurationMs: s.durationEstimate ? s.durationEstimate * 1000 : null
        }));

        try {
            setExportState({ status: 'Initializing Export...', progress: 0 });

            // Deduct credits unless Unleashed
            if (user.tier !== "studio") {
                await deductCredits({
                    amount: 10,
                    action: "asset_export"
                });
            }

            await createAndDownloadBundle(
                project.title || "Project Archive",
                exportScenes,
                (status, progress) => {
                    setExportState({ status, progress });
                }
            );
            showToast("Project Bundle exported successfully!", "info");
        } catch (e: any) {
            console.error("Export failed:", e);
            if (e.message?.includes("INSUFFICIENT_CREDITS")) {
                if (onUpgradeRequest) onUpgradeRequest('credits');
            } else {
                showToast("Failed to compile project bundle.", "error");
            }
        } finally {
            setExportState(null);
        }
    };



    return (
        <div className="flex-1 flex overflow-hidden bg-[var(--background-dark)] relative">
            {/* Custom Toast */}
            {toastMessage && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-black border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`w-2 h-2 rounded-full ${toastMessage.type === 'error' ? 'bg-red-500' : toastMessage.type === 'warning' ? 'bg-[var(--primary)]' : 'bg-emerald-500'} animate-pulse`} />
                    <span className="text-white text-[11px] font-bold tracking-widest uppercase">{toastMessage.text}</span>
                </div>
            )}

            {/* Main Stage */}
            <div className="flex-1 flex flex-col overflow-hidden">


                {/* Video Stage Area */}
                <div className="flex-1 relative bg-black flex items-center justify-center p-8">
                    {/* Constraining wrapper */}
                    <div className="w-full h-full max-w-[800px] flex items-center justify-center">
                        <div className={`relative shadow-2xl shadow-black/50 overflow-hidden bg-[var(--studio-charcoal)] border border-white/10 transition-all duration-500 ${project?.exportPreferences?.aspectRatio === '9:16' ? 'aspect-[9/16] h-full max-h-[70vh]' :
                            project?.exportPreferences?.aspectRatio === '1:1' ? 'aspect-square h-full max-h-[70vh]' :
                                'aspect-video w-full'
                            }`}>
                            {activeSceneId ? (
                                <div className="w-full h-full relative flex items-center justify-center bg-black">
                                    {scenes?.find(s => s._id === activeSceneId)?.selectedAssetUrl ? (
                                        <video
                                            ref={videoRef}
                                            key={activeSceneId as string}
                                            src={scenes.find(s => s._id === activeSceneId)?.selectedAssetUrl!}
                                            className="w-full h-full object-contain transition-opacity duration-500"
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 gap-4">
                                            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                                                <Clapperboard size={32} className="text-white/20" />
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No Asset Linked for this Scene</p>
                                        </div>
                                    )}
                                    <div className="absolute bottom-12 left-0 right-0 px-12 text-center pointer-events-none">
                                        <p className="text-white text-xl font-medium drop-shadow-lg leading-relaxed bg-black/40 backdrop-blur-sm py-2 px-4 rounded-lg inline-block animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            {scenes?.find(s => s._id === activeSceneId)?.text}
                                        </p>
                                    </div>
                                    {isPlaying && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
                                            <div
                                                className="h-full bg-[var(--primary)] transition-all duration-100 linear"
                                                style={{ width: `${(playbackTime / (totalDuration || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    )}
                                    <audio
                                        key={activeScene?.audioUrl || 'no-audio'}
                                        ref={audioRef}
                                        className="hidden"
                                        preload="auto"
                                        src={activeScene?.audioUrl || undefined}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/10 gap-4 bg-black">
                                    <Play size={64} className="opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-widest leading-none">Ready for Playback</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Timeline handleExportBundle={handleExportFinalBundle} hideExport={true} />
            </div>

            {/* Sidebar Inspector */}
            <aside className="w-72 border-l border-white/5 bg-[var(--studio-charcoal)] flex flex-col overflow-y-auto custom-scrollbar shadow-2xl z-20">
                {/* Section: Voiceover */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-4 text-[var(--primary)] justify-between">
                        <div className="flex items-center gap-2">
                            <Volume2 size={16} />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest">Voiceover</h3>
                            {user && user.tier !== "studio" && (
                                <span className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-[var(--primary)]/20">
                                    {Math.max(0, 3 - (user.freeVoiceSyncsUsed || 0))} Free Left
                                </span>
                            )}
                        </div>
                        {activeSceneId && scenes && (
                            <div className="text-[8px] font-black uppercase tracking-tighter text-white/20">
                                SC {scenes.findIndex(s => s._id === activeSceneId) + 1}
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                                className="p-3 w-full bg-white/5 hover:bg-white/10 transition-colors rounded-lg border border-white/10 flex items-center justify-between group text-left cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-[var(--deep-slate)] flex items-center justify-center">
                                        <Music size={14} className="text-white/40 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <p className="text-[10px] font-bold text-white leading-none truncate w-full">{ELEVENLABS_VOICES[selectedVoiceIdx].name}</p>
                                        <p className="text-[8px] text-white/40 uppercase tracking-tighter mt-1 truncate">{ELEVENLABS_VOICES[selectedVoiceIdx].description}</p>
                                    </div>
                                </div>
                                <div className="text-[var(--primary)] shrink-0 transition-transform duration-200" style={{ transform: isVoiceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <ChevronDown size={16} />
                                </div>
                            </button>

                            {isVoiceDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-1 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl z-50 flex flex-col gap-1">
                                    {ELEVENLABS_VOICES.map((voice, idx) => (
                                        <button
                                            key={voice.id}
                                            onClick={() => {
                                                setSelectedVoiceIdx(idx);
                                                setIsVoiceDropdownOpen(false);
                                            }}
                                            className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${selectedVoiceIdx === idx ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'hover:bg-white/5 text-white/70 hover:text-white'}`}
                                        >
                                            <div className="flex flex-col items-start overflow-hidden w-full">
                                                <p className="text-[10px] font-bold leading-none truncate w-full">{voice.name}</p>
                                                <p className={`text-[8px] uppercase tracking-tighter mt-1 truncate ${selectedVoiceIdx === idx ? 'text-[var(--primary)]/70' : 'text-white/40'}`}>
                                                    {voice.description}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {activeSceneId && (
                            <button
                                onClick={handleSyncVO}
                                disabled={isGeneratingVO || scenes.find(s => s._id === activeSceneId)?.audioStatus === 'generating'}
                                className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${scenes.find(s => s._id === activeSceneId)?.audioStatus === 'ready'
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black'
                                    }`}
                            >
                                {isGeneratingVO || scenes.find(s => s._id === activeSceneId)?.audioStatus === 'generating' ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Synthesizing...
                                    </>
                                ) : scenes.find(s => s._id === activeSceneId)?.audioStatus === 'ready' ? (
                                    <>
                                        <CheckCircle2 size={12} />
                                        VO Synced ({scenes.find(s => s._id === activeSceneId)?.durationEstimate}s)
                                    </>
                                ) : (
                                    <>
                                        <Volume2 size={12} />
                                        Sync Beat Voiceover
                                    </>
                                )}
                            </button>
                        )}

                        {user && user.tier === "studio" && (
                            <button
                                onClick={handleSyncAllVO}
                                disabled={isGeneratingVO || !scenes || scenes.length === 0}
                                className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[var(--primary)]/70 hover:bg-[var(--primary)] hover:text-black`}
                            >
                                <Sparkles size={12} />
                                Sync All Scenes
                            </button>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] text-white/40 uppercase font-bold">Stability</span>
                                <span className="text-[10px] font-mono text-white/60">75%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[var(--primary)] w-[75%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Production Settings */}
                <div className="p-6 mt-auto bg-black/40 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={14} className="text-[var(--primary)]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)]">Production Settings</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-white/40 font-bold uppercase tracking-widest">Format</span>
                                <span className="text-white font-bold bg-white/10 px-2 py-1 rounded">{project.exportPreferences?.targetSoftware}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl">
                                <div>
                                    <p className="text-[9px] font-black text-white uppercase tracking-widest">Auto-Mastering</p>
                                    <p className="text-[7px] text-white/40 uppercase tracking-widest font-bold mt-0.5">Best available source fidelity</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={handleExportFinalBundle}
                                className="w-full py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all bg-[var(--primary)] text-black shadow-[0_15px_30px_rgba(230,179,25,0.2)] hover:scale-[1.02] cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-2">
                                    <Download size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        Export Final Bundle
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Custom Free Sync Modal */}
            {freeSyncModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFreeSyncModal(null)} />
                    <div className="relative bg-[#0a0905] border border-[var(--primary)]/30 p-8 rounded-3xl shadow-[0_0_80px_rgba(230,179,25,0.15)] flex flex-col items-center max-w-sm animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center mb-6">
                            <Sparkles size={24} className="text-[var(--primary)]" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 text-center">Premium Sync Used</h3>
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold text-center mb-8 px-4 leading-relaxed">
                            You have <span className="text-[var(--primary)]">{freeSyncModal.remaining}</span> free high-fidelity voiceover generations remaining.
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => {
                                    setFreeSyncModal(null);
                                    if (onUpgradeRequest) onUpgradeRequest("tier");
                                }}
                                className="w-full py-4 bg-[var(--primary)] text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(230,179,25,0.2)]"
                            >
                                Upgrade to Unleashed
                            </button>
                            <button
                                onClick={() => setFreeSyncModal(null)}
                                className="w-full py-4 bg-white/5 text-white/60 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                            >
                                Continue Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom BYOK Error Modal */}
            {byokErrorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setByokErrorModal(false)} />
                    <div className="relative bg-[#0a0905] border border-red-500/30 p-8 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.15)] flex flex-col items-center max-w-sm animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 text-red-500">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 text-center">BYOK Required</h3>
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold text-center mb-8 px-4 leading-relaxed">
                            Your ElevenLabs API key is either missing or invalid. Please check your studio preferences to configure it securely.
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => setByokErrorModal(false)}
                                className="w-full py-4 bg-red-500 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Limit Reached Modal */}
            {limitReachedModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLimitReachedModal(false)} />
                    <div className="relative bg-[#0a0905] border border-orange-500/30 p-8 rounded-3xl shadow-[0_0_80px_rgba(249,115,22,0.15)] flex flex-col items-center max-w-sm animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-6 text-orange-500">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 text-center">Free Syncs Met</h3>
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold text-center mb-8 px-4 leading-relaxed">
                            You have consumed all your free high-fidelity voice iterations. Upgrade to Unleashed to connect your own API keys for unlimited syncing.
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => {
                                    setLimitReachedModal(false);
                                    if (onUpgradeRequest) onUpgradeRequest("tier");
                                }}
                                className="w-full py-4 bg-[var(--primary)] text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(230,179,25,0.2)]"
                            >
                                View Unleashed Tier
                            </button>
                            <button
                                onClick={() => setLimitReachedModal(false)}
                                className="w-full py-4 bg-white/5 text-white/60 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                            >
                                Continue Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Export Progress Modal */}
            {exportState && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in duration-500">
                        <div className="relative w-24 h-24 mb-8">
                            {/* Outer rotating ring */}
                            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[var(--primary)] animate-spin" />
                            {/* Inner rotating ring */}
                            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-[var(--primary)]/50 animate-[spin_2s_reverse_infinite]" />
                            {/* Center icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Download size={24} className="text-[var(--primary)] animate-pulse" />
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-4 text-center">
                            Rendering Timeline
                        </h3>

                        <p className="text-xs text-[var(--primary)] uppercase tracking-[0.2em] font-bold text-center mb-6 h-4">
                            {exportState.status}
                        </p>

                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full bg-[var(--primary)] shadow-[0_0_10px_rgba(230,179,25,0.5)] transition-all duration-300"
                                style={{ width: `${exportState.progress}%` }}
                            />
                        </div>

                        <div className="flex justify-between w-full text-[10px] text-white/40 uppercase tracking-widest font-black">
                            <span>{exportState.progress}%</span>
                            <span>Do not close tab</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
