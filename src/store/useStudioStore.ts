import { create } from 'zustand';
import { Id } from '../../convex/_generated/dataModel';

interface StudioState {
    // Current Project Context
    activeProjectId: Id<"projects"> | null;
    activeVersionId: Id<"scriptVersions"> | null;

    // Editor State
    selectedSceneId: Id<"scenes"> | null;
    isExporting: boolean;
    isPlaying: boolean;
    playbackTime: number;
    isRegenerating: boolean;
    isBatchRefining: boolean;
    isTimelineOpen: boolean;
    optimisticStatuses: Map<Id<"scenes">, string>;

    // Actions
    setActiveProject: (projectId: Id<"projects"> | null, versionId: Id<"scriptVersions"> | null) => void;
    setSelectedSceneId: (sceneId: Id<"scenes"> | null) => void;
    setExporting: (isExporting: boolean) => void;
    setPlaying: (isPlaying: boolean) => void;
    setPlaybackTime: (time: number | ((prev: number) => number)) => void;
    setRegenerating: (isRegenerating: boolean) => void;
    setBatchRefining: (isBatchRefining: boolean) => void;
    setTimelineOpen: (isOpen: boolean) => void;
    setOptimisticStatus: (sceneId: Id<"scenes">, status: string | null) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
    activeProjectId: null,
    activeVersionId: null,
    selectedSceneId: null,
    isExporting: false,
    isPlaying: false,
    playbackTime: 0,
    isRegenerating: false,
    isBatchRefining: false,
    isTimelineOpen: false,
    optimisticStatuses: new Map(),

    setActiveProject: (projectId, versionId) => set({ activeProjectId: projectId, activeVersionId: versionId }),
    setSelectedSceneId: (sceneId) => set({ selectedSceneId: sceneId }),
    setExporting: (isExporting) => set({ isExporting: isExporting }),
    setPlaying: (isPlaying) => set({ isPlaying: isPlaying }),
    setPlaybackTime: (time) => set((state) => ({ playbackTime: typeof time === 'function' ? time(state.playbackTime) : time })),
    setRegenerating: (isRegenerating) => set({ isRegenerating: isRegenerating }),
    setBatchRefining: (isBatchRefining) => set({ isBatchRefining: isBatchRefining }),
    setTimelineOpen: (isOpen) => set({ isTimelineOpen: isOpen }),
    setOptimisticStatus: (sceneId, status) => set((state) => {
        const next = new Map(state.optimisticStatuses);
        if (status) next.set(sceneId, status);
        else next.delete(sceneId);
        return { optimisticStatuses: next };
    }),
}));
