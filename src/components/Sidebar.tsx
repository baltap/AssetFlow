import {
    FileText,
    Grid,
    LayoutPanelLeft,
    Settings,
    Share,
    Sparkles,
    Video
} from "lucide-react";
import Link from "next/link";

interface SidebarProps {
    activeTab: string;
    onNavigate: (tab: string) => void;
    onOpenSettings: () => void;
}

const navItems = [
    { id: "studio", icon: "auto_fix_high", label: "Studio" },
    { id: "editor", icon: "theaters", label: "Editor" },
];

export function Sidebar({ activeTab, onNavigate, onOpenSettings }: SidebarProps) {
    return (
        <aside className="w-14 bg-[var(--studio-charcoal)] border-r border-white/5 flex flex-col items-center py-6 gap-8 z-20 h-full fixed left-0 top-0">

            <nav className="flex flex-col gap-6">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`flex flex-col items-center gap-1 group transition-colors ${activeTab === item.id ? "text-[var(--primary)]" : "text-white/40 hover:text-white"
                            }`}
                    >
                        <span className="material-icons text-xl">{item.icon}</span>
                        <span className="text-[8px] uppercase tracking-widest font-bold">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto flex flex-col gap-6 items-center">
                <button
                    onClick={onOpenSettings}
                    className="text-white/20 hover:text-white transition-colors"
                >
                    <span className="material-icons">settings</span>
                </button>
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/50 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[var(--primary)] uppercase">PB</span>
                </div>
            </div>
        </aside>
    );
}
