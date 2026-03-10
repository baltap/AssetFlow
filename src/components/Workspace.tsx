"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Timeline } from "./Timeline";
import { Settings, Sliders, Play, Share2, CheckCircle2, LayoutDashboard, Sparkles, Edit3, Trash2, RefreshCw, Clapperboard } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import posthog from "posthog-js";
import { useUser } from "@clerk/nextjs";

interface WorkspaceProps {
    projectId: Id<"projects">;
    versionId?: Id<"scriptVersions">;
    userId: Id<"users">;
    onInsufficientCredits: (reason?: 'credits' | 'tier') => void;
    onOpenSettings?: () => void;
}

export function Workspace({ projectId, versionId, userId, onInsufficientCredits, onOpenSettings }: WorkspaceProps) {
    const {
        selectedSceneId,
        setSelectedSceneId,
        isRegenerating,
        setRegenerating,
        isTimelineOpen,
        setTimelineOpen,
        isExporting,
        setExporting,
        isBatchRefining,
        setBatchRefining,
        setActiveProject
    } = useStudioStore();

    const [script, setScript] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [hoveredAssetId, setHoveredAssetId] = useState<Id<"assets"> | null>(null);
    const [editingSceneId, setEditingSceneId] = useState<Id<"scenes"> | null>(null);
    const [editingSceneText, setEditingSceneText] = useState("");
    const [byokError, setByokError] = useState<{ type: string, message: string } | null>(null);

    const createVersion = useMutation(api.projects.createNewVersion);
    const segmentScript = useAction(api.ai.segmentScript);
    const updateSceneText = useMutation(api.scenes.updateSceneText);
    const refineAllScenesWithVibe = useAction(api.ai.refineAllScenesWithVibe);
    const regenerateScene = useAction(api.ai.regenerateScene);
    const updateProjectSettings = useMutation(api.projects.updateProjectSettings);
    const deductCredits = useMutation(api.users.deductCredits);

    const project = useQuery(api.projects.getProject, { projectId });
    const user = useQuery(api.users.currentUser);

    const scenes = useQuery(
        api.scenes.getScenes,
        versionId ? { versionId } : "skip"
    );

    const { user: clerkUser } = useUser();

    useEffect(() => {
        setActiveProject(projectId, versionId || null);
        
        // Identify user in PostHog
        if (clerkUser) {
            posthog.identify(clerkUser.id, {
                email: clerkUser.primaryEmailAddress?.emailAddress,
                name: clerkUser.fullName,
                tier: user?.tier || 'free'
            });
        }
    }, [projectId, versionId, setActiveProject, clerkUser, user?.tier]);

    useEffect(() => {
        if (!isEditing && !selectedSceneId && scenes && scenes.length > 0) {
            setSelectedSceneId(scenes[0]._id);
        }
    }, [scenes, selectedSceneId, isEditing, setSelectedSceneId]);

    const showEditor = isEditing || !scenes || scenes.length === 0;

    const assets = useQuery(
        api.assets.getAssets,
        (selectedSceneId && !showEditor) ? { sceneId: selectedSceneId } : "skip"
    );

    const updateSceneAsset = useMutation(api.assets.updateSceneWithAsset);

    const handleSelectAsset = async (asset: any) => {
        if (!selectedSceneId) return;
        
        posthog.capture('Asset Selected', {
            sceneId: selectedSceneId,
            assetId: asset.externalId,
            matchScore: asset.matchScore
        });

        await updateSceneAsset({
            sceneId: selectedSceneId,
            assetId: asset.externalId,
            assetUrl: asset.downloadUrl,
            assetPreviewUrl: asset.previewUrl,
        });
    };

    const handleGenerate = async () => {
        if (!script.trim()) return;

        setIsGenerating(true);
        try {
            const newVersionId = await createVersion({
                projectId,
                rawText: script,
                changelog: "AI Generation",
            });

            setIsEditing(false);
            setScript("");

            posthog.capture('Production Initialized', {
                scriptLength: script.length,
                vibe: project?.vibe,
                format: project?.exportPreferences?.aspectRatio
            });

            await segmentScript({
                projectId,
                versionId: newVersionId,
                scriptText: script,
            });

            // The scenes will now appear in real-time as 'pending'/'searching'
            // and resolve to 'linked' or 'failed' as the scheduler processes them.
        } catch (error: any) {
            console.error("Generation failed:", error);
            if (error.message?.includes("INSUFFICIENT_CREDITS")) {
                posthog.capture('Paywall Hit', { reason: 'credits', features: 'generation' });
                onInsufficientCredits('credits');
            } else if (error.message?.includes("API_MISSING_GEMINI")) {
                setByokError({ type: 'Gemini', message: 'Google Gemini Key Required to Initialize Scripts.' });
            } else if (error.message?.includes("API_MISSING_PEXELS")) {
                setByokError({ type: 'Pexels', message: 'Pexels API Key Required to Scout Assets.' });
            } else if (error.message?.includes("API_MISSING_PIXABAY")) {
                setByokError({ type: 'Pixabay', message: 'Pixabay API Key Required to Scout Assets.' });
            } else {
                alert("Generation failed. Please try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateScene = async (sceneId: Id<"scenes">) => {
        if (!editingSceneText.trim()) return;

        const { setOptimisticStatus } = useStudioStore.getState();
        // Immediately select the scene and start regeneration state
        setSelectedSceneId(sceneId);
        setOptimisticStatus(sceneId, 'searching');
        setRegenerating(true);
        setEditingSceneId(null);

        try {
            posthog.capture('Beat Refined', {
                sceneId,
                textLength: editingSceneText.length
            });
            await updateSceneText({ sceneId, text: editingSceneText });
            await regenerateScene({ sceneId, sceneText: editingSceneText });
        } catch (error: any) {
            console.error("Regeneration failed:", error);
            if (error.message?.includes("INSUFFICIENT_CREDITS")) {
                posthog.capture('Paywall Hit', { reason: 'credits', features: 'generation' });
                onInsufficientCredits('credits');
            } else if (error.message?.includes("API_MISSING_GEMINI")) {
                setByokError({ type: 'Gemini', message: 'Google Gemini Key Required to Initialize Scripts.' });
            } else if (error.message?.includes("API_MISSING_PEXELS")) {
                setByokError({ type: 'Pexels', message: 'Pexels API Key Required to Scout Assets.' });
            } else if (error.message?.includes("API_MISSING_PIXABAY")) {
                setByokError({ type: 'Pixabay', message: 'Pixabay API Key Required to Scout Assets.' });
            } else {
                alert("Regeneration failed. Please try again.");
            }
        } finally {
            setRegenerating(false);
            setOptimisticStatus(sceneId, null);
        }
    };

    const handleExportBundle = async () => {
        if (!scenes || linkedCount < scenes.length) return;
        setExporting(true);
        try {
            posthog.capture('Export Started', {
                projectId,
                sceneCount: scenes.length,
                resolution: project?.exportPreferences?.resolution
            });

            // Deduct credits for the final product
            await deductCredits({
                amount: 10,
                action: "asset_export"
            });
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const folder = zip.folder("AssetFlow_Production");

            // Add a script overview
            const scriptOverview = scenes.map((s, i) => `SCENE ${String(i + 1).padStart(2, '0')}:\nTEXT: ${s.text}\nKEYWORDS: ${s.visualKeywords.join(", ")}`).join("\n\n" + "=".repeat(20) + "\n\n");
            folder?.file("PRODUCTION_SCRIPT.txt", `ASSETFLOW PRODUCTION BUNDLE\nVERSION: ${versionId}\nTIMESTAMP: ${new Date().toLocaleString()}\n\n${scriptOverview}`);

            // Download each selected asset
            const downloadPromises = scenes.map(async (scene, index) => {
                if (!scene.selectedAssetUrl) return;

                try {
                    const response = await fetch(scene.selectedAssetUrl);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const blob = await response.blob();

                    // Determine extension
                    const filename = `SC_${String(index + 1).padStart(2, '0')}_${(scene.visualKeywords[0] || 'clip').toLowerCase()}.mp4`;
                    folder?.file(filename, blob);
                } catch (err) {
                    console.error(`Failed to download asset for scene ${index + 1}:`, err);
                }
            });

            await Promise.all(downloadPromises);

            const content = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `AssetFlow_Bundle_${versionId}.zip`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error("Bundle generation failed:", error);
            if (error.message?.includes("INSUFFICIENT_CREDITS")) {
                onInsufficientCredits('credits');
            } else {
                alert("Failed to generate bundle. Please try again.");
            }
        } finally {
            setExporting(false);
        }
    };

    const currentScene = scenes?.find(s => s._id === selectedSceneId);

    // Calculate production progress
    const linkedCount = scenes?.filter(s => s.status === 'linked').length || 0;
    const progress = scenes && scenes.length > 0 ? (linkedCount / scenes.length) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-[var(--background-obsidian)] flex-1 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Script Pane */}
                <section className="flex-1 flex flex-col border-r border-[#1a1814] bg-[var(--background-obsidian)]/30 backdrop-blur-sm relative">
                    <div className="h-10 px-6 flex items-center border-b border-white/5 justify-between bg-[#0a0905]/40">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--accent-muted)]">Production Floor</h2>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center space-x-2">
                                <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--primary)] transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-[8px] text-[var(--primary)] font-bold font-mono tracking-tighter">
                                    {Math.round(progress)}% PROD SCORE
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="flex items-center gap-2">
                            </div>
                            {!showEditor && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setSelectedSceneId(null);
                                    }}
                                    className="text-[10px] text-white/40 hover:text-[var(--primary)] uppercase tracking-[0.2em] font-black transition-all flex items-center gap-1.5 group/new"
                                >
                                    <span className="material-icons text-xs opacity-40 group-hover/new:opacity-100">add_box</span>
                                    Draft New Script
                                </button>
                            )}
                            {(isGenerating || isRegenerating) && (
                                <div className="flex items-center space-x-2">
                                    <span className="material-icons text-sm text-[var(--primary)] animate-spin">refresh</span>
                                    <span className="text-[10px] text-[var(--primary)] uppercase tracking-[0.2em] font-black animate-pulse">
                                        Analyzing Sequence...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {showEditor ? (
                            <div className="h-full flex flex-col">
                                <textarea
                                    className="flex-1 p-12 text-lg font-light leading-relaxed bg-transparent resize-none focus:outline-none placeholder:text-white/20 custom-scrollbar"
                                    placeholder="Paste your voiceover script here... (e.g. 'The sun rises over the quiet valley...')"
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <div className="p-6 border-t border-white/5 bg-black/10 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            {/* Resolution Dropdown */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white/40">Fidelity</span>
                                                <select
                                                    value={project?.exportPreferences?.resolution || "1080p"}
                                                    onChange={(e) => {
                                                        if (user?.tier === "creative" && e.target.value === "4K") {
                                                            onInsufficientCredits('tier');
                                                            return;
                                                        }
                                                        updateProjectSettings({
                                                            projectId,
                                                            exportPreferences: {
                                                                targetSoftware: project?.exportPreferences?.targetSoftware || "Premiere Pro (.xml)",
                                                                framerate: project?.exportPreferences?.framerate || 30,
                                                                aspectRatio: project?.exportPreferences?.aspectRatio || "16:9",
                                                                resolution: e.target.value as "1080p" | "4K"
                                                            }
                                                        })
                                                    }}
                                                    className="bg-[#1a1a1a] text-[10px] uppercase tracking-[0.1em] font-bold text-white border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-[var(--primary)]/50 cursor-pointer"
                                                >
                                                    <option value="1080p">1080p HD</option>
                                                    <option value="4K">4K UHD {user?.tier === "creative" ? "🔒" : ""}</option>
                                                </select>
                                            </div>

                                            {/* Aspect Ratio Dropdown */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white/40">Canvas Format</span>
                                                <select
                                                    value={project?.exportPreferences?.aspectRatio || "16:9"}
                                                    onChange={(e) => {
                                                        if (user?.tier === "creative" && e.target.value !== "16:9") {
                                                            onInsufficientCredits('tier');
                                                            return;
                                                        }
                                                        updateProjectSettings({
                                                            projectId,
                                                            exportPreferences: {
                                                                targetSoftware: project?.exportPreferences?.targetSoftware || "Premiere Pro (.xml)",
                                                                framerate: project?.exportPreferences?.framerate || 30,
                                                                resolution: project?.exportPreferences?.resolution || "1080p",
                                                                aspectRatio: e.target.value as "16:9" | "9:16" | "1:1"
                                                            }
                                                        })
                                                    }}
                                                    className="bg-[#1a1a1a] text-[10px] uppercase tracking-[0.1em] font-bold text-white border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-[var(--primary)]/50 cursor-pointer"
                                                >
                                                    <option value="16:9">Landscape</option>
                                                    <option value="9:16">Portrait {user?.tier === "creative" ? "🔒" : ""}</option>
                                                    <option value="1:1">Square {user?.tier === "creative" ? "🔒" : ""}</option>
                                                </select>
                                            </div>

                                            {/* Vibe Dropdown */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white/40">Vibe</span>
                                                <select
                                                    value={project?.vibe || "Cinematic"}
                                                    onChange={(e) => updateProjectSettings({ projectId, vibe: e.target.value })}
                                                    className="bg-[#1a1a1a] text-[10px] uppercase tracking-[0.1em] font-bold text-white border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-[var(--primary)]/50 cursor-pointer"
                                                >
                                                    <option value="Cinematic">Cinematic</option>
                                                    <option value="Noir">Noir</option>
                                                    <option value="High-Key">High-Key</option>
                                                    <option value="Vibrant">Vibrant</option>
                                                    <option value="Minimalist">Minimalist</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {scenes && scenes.length > 0 && (
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="text-white/40 px-6 py-2 text-[10px] uppercase tracking-widest hover:text-white transition-all"
                                                >
                                                    Return to Floor
                                                </button>
                                            )}
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !script.trim()}
                                                className="bg-[var(--primary)] text-black px-10 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-30 disabled:hover:scale-100 shadow-[0_0_30px_rgba(230,179,25,0.2)]"
                                            >
                                                <div className="w-4 h-4 flex items-center justify-center">
                                                    <span className="material-icons text-sm">{isGenerating ? 'refresh' : 'auto_awesome'}</span>
                                                </div>
                                                Initialize Production
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto p-12 space-y-12 pb-32">
                                {scenes.map((scene, idx) => {
                                    const isEditingThis = editingSceneId === scene._id;
                                    const isSelectedScene = selectedSceneId === scene._id;

                                    return (
                                        <div
                                            key={scene._id}
                                            className={`relative grid grid-cols-[200px,1fr] gap-8 group transition-opacity ${isSelectedScene ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                                            onClick={() => !isEditingThis && setSelectedSceneId(scene._id)}
                                        >
                                            {/* Left Slot: Cinematic Preview */}
                                            <div className={`relative aspect-video rounded-xl overflow-hidden bg-[#0a0905] border transition-all duration-700 shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${isSelectedScene ? 'border-[var(--primary)]/60 scale-[1.05] ring-2 ring-[var(--primary)]/10 z-10' : 'border-white/5 hover:border-white/20'
                                                }`}>
                                                {scene.status === 'linked' && scene.selectedAssetUrl ? (
                                                    <img
                                                        src={scene.selectedAssetPreviewUrl || scene.selectedAssetUrl}
                                                        className="w-full h-full object-cover"
                                                        alt="Scene Preview"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center space-y-2 bg-[var(--deep-slate)]/50">
                                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${scene.status === 'failed' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                                            <span className={`material-icons text-sm ${scene.status === 'searching' ? 'animate-spin text-[var(--primary)]' : scene.status === 'failed' ? 'text-red-500' : 'text-white/20'}`}>
                                                                {scene.status === 'searching' ? 'refresh' : scene.status === 'failed' ? 'error_outline' : 'videocam_off'}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${scene.status === 'failed' ? 'text-red-500' : 'text-white/20'}`}>
                                                            {scene.status === 'searching' ? 'Directing...' : scene.status === 'failed' ? 'Scouting Failed' : 'Empty Slot'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Status Badge Over Preview */}
                                                <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                                                    <div className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tighter shadow-lg backdrop-blur-md ${scene.status === 'linked'
                                                        ? 'bg-[var(--primary)]/90 border-white/20 text-black'
                                                        : scene.status === 'failed'
                                                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                                            : 'bg-black/60 border-white/10 text-white/40'
                                                        }`}>
                                                        {scene.status === 'linked' ? 'Ready' : scene.status === 'searching' ? 'AI' : scene.status === 'failed' ? 'Failed' : 'Wait'}
                                                    </div>

                                                    {project?.exportPreferences?.resolution === "4K" && scene.selectedAssetResolution && (() => {
                                                        const [w, h] = (scene.selectedAssetResolution as string).split('x').map(Number);
                                                        return Math.max(w, h) < 3840;
                                                    })() && (
                                                            <div className="px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[8px] font-black uppercase tracking-widest text-amber-500 shadow-lg backdrop-blur-md whitespace-nowrap ml-px flex items-center gap-1">
                                                                <span className="material-icons text-[10px]">warning</span> 1080P
                                                            </div>
                                                        )}
                                                </div>

                                                <div className="absolute bottom-2 left-2 text-[10px] text-white/40 font-mono tracking-widest leading-none bg-black/40 backdrop-blur-sm px-2 py-1 rounded border border-white/5 uppercase z-10">
                                                    SC {String(idx + 1).padStart(2, '0')}
                                                </div>
                                            </div>

                                            {/* Right Slot: Script Text */}
                                            <div className="space-y-4 text-left">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-white/30 text-[10px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                        {scene.durationEstimate ? `${scene.durationEstimate}s beat` : 'Beat'}
                                                        {scene.status === 'linked' && <CheckCircle2 size={10} className="text-[var(--primary)]" />}
                                                    </div>
                                                    {!isEditingThis && (
                                                        <div className="flex gap-2">
                                                            {scene.status === 'failed' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRegenerateScene(scene._id);
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 uppercase tracking-[0.2em] font-black flex items-center gap-1.5 transition-all hover:scale-105"
                                                                >
                                                                    <span className="material-icons text-xs">refresh</span>
                                                                    Retry
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingSceneId(scene._id);
                                                                    setEditingSceneText(scene.text);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--primary)] uppercase tracking-[0.2em] font-black flex items-center gap-1.5 transition-all hover:scale-105"
                                                            >
                                                                <span className="material-icons text-xs">edit</span>
                                                                Rewrite
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {isEditingThis ? (
                                                    <div className="space-y-4">
                                                        <textarea
                                                            className="w-full bg-white/5 border border-[var(--primary)]/30 rounded-lg p-4 text-lg leading-relaxed text-white focus:outline-none focus:border-[var(--primary)]/60 resize-none font-light shadow-[0_0_15px_rgba(230,179,25,0.05)]"
                                                            value={editingSceneText}
                                                            onChange={(e) => setEditingSceneText(e.target.value)}
                                                            autoFocus
                                                            rows={3}
                                                        />
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => setEditingSceneId(null)}
                                                                className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleRegenerateScene(scene._id)}
                                                                disabled={isRegenerating || editingSceneText === scene.text}
                                                                className="bg-[var(--primary)] text-black px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">{isRegenerating ? 'refresh' : 'auto_fix_high'}</span>
                                                                Refine Beat
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className={`text-xl leading-relaxed transition-colors duration-500 font-light ${isSelectedScene ? 'text-white' : 'text-white/60'}`}>
                                                            {scene.text}
                                                        </p>

                                                        {/* Cinematic Metadata */}
                                                        <div className="flex items-center gap-4 py-2 border-y border-white/5 my-2">
                                                            {scene.shotType && (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[7px] text-white/20 uppercase tracking-[0.2em] font-black">Shot</span>
                                                                    <span className="text-[9px] text-[var(--primary)] font-black uppercase tracking-widest">{scene.shotType}</span>
                                                                </div>
                                                            )}
                                                            {scene.lighting && (
                                                                <div className="flex flex-col border-l border-white/5 pl-4">
                                                                    <span className="text-[7px] text-white/20 uppercase tracking-[0.2em] font-black">Lighting</span>
                                                                    <span className="text-[9px] text-[var(--accent-muted)] font-black uppercase tracking-widest">{scene.lighting}</span>
                                                                </div>
                                                            )}
                                                            {scene.cameraMovement && (
                                                                <div className="flex flex-col border-l border-white/5 pl-4">
                                                                    <span className="text-[7px] text-white/20 uppercase tracking-[0.2em] font-black">Movement</span>
                                                                    <span className="text-[9px] text-[var(--accent-muted)] font-black uppercase tracking-widest">{scene.cameraMovement}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {scene.visualDescription && (
                                                            <p className="text-[10px] text-white/30 italic leading-relaxed border-l-2 border-[var(--primary)]/20 pl-4 py-1">
                                                                "{scene.visualDescription}"
                                                            </p>
                                                        )}

                                                        {scene.directorCommentary && (
                                                            <div className="mt-4 p-3 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Sparkles size={10} className="text-[var(--primary)]" />
                                                                    <span className="text-[8px] uppercase tracking-[0.2em] font-black text-[var(--primary)]">Director's Insight</span>
                                                                </div>
                                                                <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                                                                    {scene.directorCommentary}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            {scene.visualKeywords?.map((kw: string) => (
                                                                <span key={kw} className="text-[9px] px-2.5 py-1 bg-white/5 rounded-full text-white/20 border border-white/5 uppercase tracking-widest font-black hover:text-[var(--primary)] hover:border-[var(--primary)]/20 transition-all cursor-default">
                                                                    #{kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right: Smart Sidebar */}
                <section className="w-[420px] flex flex-col bg-[#0a0905]/60 border-l border-white/5">
                    <div className="h-10 px-6 flex items-center border-b border-white/5 bg-black/40">
                        <span className="material-icons text-sm text-[var(--primary)] mr-2">grid_view</span>
                        <span className="text-[9px] uppercase tracking-[0.3em] font-black text-[var(--accent-muted)]">Asset Library</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 space-y-4">
                            {isRegenerating ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full border-2 border-[var(--primary)]/20 border-t-[var(--primary)] animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Clapperboard size={24} className="text-[var(--primary)] animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--primary)]">Refining Logic</p>
                                        <p className="text-[8px] text-white/40 mt-2 uppercase tracking-widest animate-pulse">Scouting high-fidelity matches...</p>
                                    </div>
                                </div>
                            ) : assets && assets.length > 0 ? (
                                assets.map((asset) => {
                                    const isSelected = currentScene?.selectedAssetId === asset.externalId;
                                    return (
                                        <div
                                            key={asset._id}
                                            className={`group relative aspect-video bg-[var(--studio-charcoal)] rounded-xl overflow-hidden border transition-all cursor-pointer ${isSelected ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:scale-[1.02]'
                                                }`}
                                            onClick={() => handleSelectAsset(asset)}
                                            onMouseEnter={() => setHoveredAssetId(asset._id)}
                                            onMouseLeave={() => setHoveredAssetId(null)}
                                        >
                                            {hoveredAssetId === asset._id ? (
                                                <video
                                                    src={asset.downloadUrl}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={asset.previewUrl}
                                                    alt="Asset Preview"
                                                    className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>

                                            {isSelected && (
                                                <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--primary)] rounded shadow-xl flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                    <CheckCircle2 size={10} className="text-black stroke-[3px]" />
                                                    <span className="text-[8px] font-bold text-black uppercase tracking-widest">Active Shot</span>
                                                </div>
                                            )}

                                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 shadow-lg">
                                                <span className={`text-[10px] font-mono font-bold uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-[var(--primary)]'}`}>
                                                    {Math.round(asset.matchScore * 100)}% Match
                                                </span>
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 flex flex-col transform translate-y-1 group-hover:translate-y-0 transition-transform">
                                                <span className="text-[10px] text-white font-bold truncate tracking-tight">
                                                    {asset.metadata?.tags?.[0] || 'Visual_Component'}.mp4
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] text-white/40 uppercase tracking-widest flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        {asset.metadata?.resolution || 'HD'}
                                                    </span>
                                                    <span className="text-[8px] text-white/40 uppercase tracking-widest flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        {asset.metadata?.duration}s
                                                    </span>
                                                </div>
                                            </div>

                                            {!isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10">
                                                    <div className="w-12 h-12 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(230,179,25,0.4)] scale-75 group-hover:scale-100 transition-transform">
                                                        <span className="material-icons text-black text-2xl">add</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-6 opacity-40 pointer-events-none">
                                    <div className="w-16 h-16 rounded-full border border-dashed border-[var(--primary)]/30 flex items-center justify-center bg-[var(--primary)]/5">
                                        <Clapperboard size={24} className="text-[var(--primary)] animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--primary)]">Director Mode</p>
                                        <p className="text-[8px] text-white/40 mt-2 uppercase tracking-[0.3em] font-black">Select a beat to cue matches</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Bottom: Inline Timeline Drawer (fixed to bottom bar) */}
            {!showEditor && (
                <Timeline
                    handleExportBundle={handleExportBundle}
                />
            )}

            {/* Custom BYOK Error Modal */}
            {byokError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setByokError(null)} />
                    <div className="relative bg-[#0a0905] border border-red-500/30 p-8 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.15)] flex flex-col items-center max-w-sm animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 text-red-500">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 text-center">BYOK Required</h3>
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold text-center mb-8 px-4 leading-relaxed">
                            {byokError.message}
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => {
                                    setByokError(null);
                                    if (onOpenSettings) onOpenSettings();
                                }}
                                className="w-full py-4 bg-red-500 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                            >
                                Configure in Studio Preferences
                            </button>
                            <button
                                onClick={() => setByokError(null)}
                                className="w-full py-4 bg-white/5 text-white/60 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
