"use client";

import { Workspace } from "@/components/Workspace";
import { EditorView } from "@/components/EditorView";
import { Sidebar } from "@/components/Sidebar";
import { Timeline } from "@/components/Timeline";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { Settings, ChevronRight, Loader2, Sparkles, Plus, Clapperboard } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { LandingPage } from "@/components/LandingPage";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const projects = useQuery(api.projects.getProjects);
  const user = useQuery(api.users.currentUser);
  const createProject = useMutation(api.projects.createProject);
  const storeUser = useMutation(api.users.storeUser);

  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(null);
  const [activeTab, setActiveTab] = useState("studio");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricingReason, setPricingReason] = useState<"credits" | "tier" | undefined>(undefined);

  // Move sync to a component that only renders when Authenticated
  function UserSync() {
    const storeUser = useMutation(api.users.storeUser);
    useEffect(() => {
      storeUser();
    }, [storeUser]);
    return null;
  }

  // Initial Project Creation logic
  useEffect(() => {
    if (user && projects && projects.length === 0) {
      createProject({ title: "My First Project" }).then(id => {
        setActiveProjectId(id);
      });
    }
  }, [user, projects, createProject]);

  return (
    <>
      <AuthLoading>
        <div className="h-screen w-screen bg-[#121212] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d6c9b1]" size={32} />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>

      <Authenticated>
        <UserSync />
        {user && projects && (projects.length > 0 || activeProjectId) ? (
          (() => {
            const currentActiveId = activeProjectId || projects[0]._id;
            const activeProject = projects.find(p => p._id === currentActiveId) || projects[0];

            return (
              <main className="flex h-screen bg-[var(--background-obsidian)] overflow-hidden text-[var(--studio-text)]">
                <Sidebar
                  activeTab={activeTab}
                  onNavigate={(tab: string) => setActiveTab(tab)}
                />

                <SettingsDrawer
                  isOpen={isSettingsOpen}
                  onClose={() => setIsSettingsOpen(false)}
                  userId={user._id}
                />

                <div className="flex-1 flex flex-col ml-14">
                  <header className="h-12 border-b border-white/5 bg-[var(--studio-charcoal)] flex items-center justify-between px-4 z-20">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-[var(--primary)]/10 border border-[var(--primary)]/20 shadow-[0_0_15px_rgba(230,179,25,0.1)]">
                        <Clapperboard size={12} className="text-[var(--primary)]" />
                      </div>
                      <div className="h-4 w-px bg-white/10" />
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] tracking-[0.4em] font-black text-white uppercase leading-none">Asset Flow</span>
                        <span className="text-[10px] tracking-[0.4em] font-black text-white/20 uppercase leading-none">Studio</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div
                        onClick={() => {
                          setPricingReason("credits");
                          setIsPricingOpen(true);
                        }}
                        className="flex items-center bg-[var(--deep-slate)] rounded border border-white/5 px-3 py-1 space-x-3 cursor-pointer hover:border-[var(--primary)]/30 transition-all group/credits"
                      >
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] text-white/40 leading-none uppercase tracking-tighter group-hover/credits:text-[var(--primary)] transition-colors">API Credits</span>
                          <span className="text-xs font-mono text-[var(--primary)] font-bold">
                            {user.credits?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                          </span>
                        </div>
                        <div className="w-[1px] h-6 bg-white/10 group-hover/credits:bg-[var(--primary)]/20 transition-colors"></div>
                        <div className="flex items-center justify-center bg-[var(--primary)]/10 p-1 rounded group-hover/credits:bg-[var(--primary)]/20 transition-all">
                          <Plus size={10} className="text-[var(--primary)]" />
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setIsSettingsOpen(true)}
                          className="w-8 h-8 rounded-full bg-[var(--deep-slate)] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all group"
                        >
                          <Settings size={14} className="text-white/40 group-hover:text-[var(--primary)] transition-colors" />
                        </button>
                        <UserButton />
                      </div>
                    </div>
                  </header>

                  <PricingModal
                    isOpen={isPricingOpen}
                    onClose={() => setIsPricingOpen(false)}
                    userId={user._id}
                    reason={pricingReason}
                  />

                  {activeTab === "studio" ? (
                    <Workspace
                      projectId={activeProject._id}
                      versionId={activeProject.currentVersionId}
                      userId={user._id}
                      onInsufficientCredits={(reason) => {
                        setPricingReason(reason);
                        setIsPricingOpen(true);
                      }}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                    />
                  ) : (
                    <EditorView
                      projectId={activeProject._id}
                      versionId={activeProject.currentVersionId}
                      onUpgradeRequest={(reason) => {
                        setPricingReason(reason);
                        setIsPricingOpen(true);
                      }}
                    />
                  )}
                </div>
              </main>
            );
          })()
        ) : (
          <div className="h-screen w-screen bg-[#121212] flex items-center justify-center">
            <Loader2 className="animate-spin text-[#d6c9b1]" size={32} />
          </div>
        )}
      </Authenticated>
    </>
  );
}
