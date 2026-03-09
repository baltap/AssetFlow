"use client";

import {
    Search,
    Upload,
    Image as ImageIcon,
    Video,
    Music,
    History,
    Star,
    MoreVertical,
    Download,
    Filter,
    FolderPlus,
    Palette,
    Sparkles
} from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
    { id: 'stock', label: 'Stock Footage', icon: Video },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'ai-gen', label: 'AI Generated', icon: Sparkles },
    { id: 'audio', label: 'Audio & SFX', icon: Music },
];

const MOCK_ASSETS = [
    { id: 1, type: 'video', title: 'Urban Timelapse', author: 'Pexels', thumbnail: 'https://images.pexels.com/videos/3042456/free-video-3042456.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500', tags: ['city', 'dark', 'cinematic'] },
    { id: 2, type: 'image', title: 'Cyberpunk Street', author: 'AI Gen', thumbnail: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500&auto=format&fit=crop', tags: ['tech', 'neon', 'blue'] },
    { id: 3, type: 'video', title: 'Nature Drone', author: 'Pexels', thumbnail: 'https://images.pexels.com/videos/1526909/free-video-1526909.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500', tags: ['green', 'mountains', 'fresh'] },
    { id: 4, type: 'video', title: 'Abstract Coding', author: 'Stock', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop', tags: ['matrix', 'code', 'green'] },
    { id: 5, type: 'image', title: 'Minimal Workspace', author: 'Upload', thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&auto=format&fit=crop', tags: ['clean', 'office', 'wfh'] },
    { id: 6, type: 'video', title: 'Forest Path', author: 'Pexels', thumbnail: 'https://images.pexels.com/videos/1526909/free-video-1526909.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500', tags: ['nature', 'forest', 'calm'] },
];

export function AssetsView() {
    const [activeCategory, setActiveCategory] = useState('stock');
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="flex-1 flex overflow-hidden bg-[var(--background-dark)]">
            {/* Left Sidebar for Organization */}
            <div className="w-64 border-r border-white/5 bg-[var(--studio-charcoal)] flex flex-col p-4 gap-6">
                <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4">Library</h3>
                    <div className="flex flex-col gap-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeCategory === cat.id
                                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <cat.icon size={18} />
                                <span className="text-sm font-medium">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4">Collections</h3>
                    <div className="flex flex-col gap-1">
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all">
                            <Star size={18} />
                            <span className="text-sm font-medium">Favorites</span>
                        </button>
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all">
                            <History size={18} />
                            <span className="text-sm font-medium">Recently Used</span>
                        </button>
                        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/5 mt-2 transition-all border border-[var(--primary)]/20 border-dashed">
                            <FolderPlus size={18} />
                            <span className="text-sm font-medium">New Collection</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20">
                        <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                            <Palette size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Brand Kit</span>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                            Maintain consistent style across all generated visuals.
                        </p>
                        <button className="w-full mt-3 py-2 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-bold uppercase tracking-widest rounded transition-all">
                            Configure
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Search and Filters Bar */}
                <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[var(--studio-charcoal)]">
                    <div className="flex-1 max-w-xl relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Search high-quality stock footage, images, or your uploads..."
                            className="w-full bg-[var(--deep-slate)] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--primary)]/50 transition-all text-white/80 placeholder:text-white/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 ml-6">
                        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--deep-slate)] border border-white/5 rounded-lg text-xs font-bold text-white/60 hover:text-white transition-all">
                            <Filter size={14} />
                            Filters
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] rounded-lg text-xs font-bold text-[var(--background-dark)] hover:opacity-90 transition-all">
                            <Upload size={14} />
                            Import Assets
                        </button>
                    </div>
                </div>

                {/* Assets Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {MOCK_ASSETS.map((asset) => (
                            <div key={asset.id} className="group relative bg-[var(--studio-charcoal)] rounded-xl overflow-hidden border border-white/5 hover:border-[var(--primary)]/30 transition-all">
                                {/* Thumbnail Container */}
                                <div className="aspect-video relative overflow-hidden">
                                    <img
                                        src={asset.thumbnail}
                                        alt={asset.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all">
                                            <Download size={20} className="text-white" />
                                        </button>
                                        <button className="p-2 bg-[var(--primary)] hover:scale-110 rounded-full transition-all">
                                            <Star size={20} className="text-[var(--background-dark)]" />
                                        </button>
                                    </div>
                                    {/* Type Tag */}
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold uppercase tracking-widest text-white/80 border border-white/10">
                                        {asset.type}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-semibold text-white/90 truncate">{asset.title}</h4>
                                            <p className="text-[10px] text-white/40 mt-0.5">Source: {asset.author}</p>
                                        </div>
                                        <button className="text-white/20 hover:text-white transition-colors">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {asset.tags.map(tag => (
                                            <span key={tag} className="text-[9px] px-2 py-0.5 bg-[var(--deep-slate)] text-white/40 rounded transition-colors group-hover:text-[var(--primary)]/60">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
