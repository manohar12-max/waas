import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Play,
    Pause,
    Maximize2,
    Minimize2,
    List,
    X,
    Download,
    Clock,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface SlideAsset {
    title: string;
    content: string[];
}

export interface UnitAssetsItem {
    subTopicTitle: string;
    assets: SlideAsset[];
}

interface FlatSlide {
    subTopicTitle: string;
    slide: SlideAsset;
    globalIndex: number;
}

export interface SlideViewerProps {
    groups: UnitAssetsItem[];
    unitTitle: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function flattenSlides(groups: UnitAssetsItem[]): FlatSlide[] {
    const flat: FlatSlide[] = [];
    let idx = 0;
    for (const group of groups) {
        for (const slide of group.assets ?? []) {
            flat.push({ subTopicTitle: group.subTopicTitle, slide, globalIndex: idx });
            idx++;
        }
    }
    return flat;
}

function SplitTitle({ title }: { title: string }) {
    if (!title) return null;
    const words = title.trim().split(' ');
    if (words.length < 2) return <span className="text-primary-light">{title}</span>;
    const accent = words.pop()!;
    return (
        <>
            {words.join(' ')}{' '}
            <span className="text-primary-light">{accent}</span>
        </>
    );
}

/* ─── Auto-play speeds ───────────────────────────────────────────────────── */
const AUTO_PLAY_SPEEDS = [
    { label: '3s', ms: 3000 },
    { label: '5s', ms: 5000 },
    { label: '8s', ms: 8000 },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export const SlideViewer: React.FC<SlideViewerProps> = ({ groups, unitTitle }) => {
    const slides = flattenSlides(groups);

    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [showIndex, setShowIndex] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const indexRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const total = slides.length;

    const goTo = useCallback((idx: number) => {
        const clamped = Math.max(0, Math.min(total - 1, idx));
        setCurrent(c => { setDirection(clamped >= c ? 'next' : 'prev'); return clamped; });
    }, [total]);
    const prev = () => goTo(current - 1);
    const next = useCallback(() => {
        setCurrent(c => {
            if (c >= total - 1) { setIsPlaying(false); return c; }
            setDirection('next');
            return c + 1;
        });
    }, [total]);

    /* auto-play */
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (isPlaying) {
            intervalRef.current = setInterval(next, AUTO_PLAY_SPEEDS[speedIdx].ms);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, speedIdx, next]);

    /* fullscreen API */
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    /* keyboard navigation */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
            if (e.key === 'Escape' && showIndex) setShowIndex(false);
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [current, showIndex, goTo]);

    /* scroll active index item into view */
    useEffect(() => {
        if (showIndex && indexRef.current) {
            const active = indexRef.current.querySelector<HTMLButtonElement>('[data-active="true"]');
            active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [current, showIndex]);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
                No slides available yet. Content may still be generating.
            </div>
        );
    }

    const { slide, subTopicTitle } = slides[current];
    const description = slide.content?.[0] ?? '';
    const cards = slide.content?.slice(1) ?? [];

    const DOT_LIMIT = 8;
    const dotCount = Math.min(total, DOT_LIMIT);
    let dotStart = Math.max(0, current - Math.floor(DOT_LIMIT / 2));
    if (dotStart + dotCount > total) dotStart = Math.max(0, total - dotCount);

    return (
        <div ref={containerRef} className={`flex flex-col rounded-[32px] overflow-hidden ${isFullscreen ? 'h-screen bg-slate-50 dark:bg-[#020208] p-4' : 'h-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10'}`}>
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between mb-3 p-6 pb-2 gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 min-w-0">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">{unitTitle}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-20" />
                    <span className="truncate max-w-[180px] text-slate-500 dark:text-white/40 font-medium">{subTopicTitle}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-primary-light/10 border border-primary-light/20 px-3 py-1 rounded-full shadow-sm">
                        <p className="text-[10px] font-black text-primary-light tracking-wide uppercase">
                            SLIDE {current + 1} OF {total}
                        </p>
                    </div>

                    {isPlaying && (
                        <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-white/20" />
                            {AUTO_PLAY_SPEEDS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSpeedIdx(i)}
                                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg transition-colors ${i === speedIdx ? 'bg-primary-light text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-2 rounded-xl border transition-colors ${isPlaying
                                ? 'bg-primary-light text-white border-primary-light'
                                : 'bg-white dark:bg-white/5 text-slate-400 dark:text-white/40 border-slate-200 dark:border-white/10 hover:border-primary-light/50 hover:text-primary-light'
                            }`}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => setShowIndex(!showIndex)}
                        className={`p-2 rounded-xl border transition-colors ${showIndex
                                ? 'bg-primary-light text-white border-primary-light'
                                : 'bg-white dark:bg-white/5 text-slate-400 dark:text-white/40 border-slate-200 dark:border-white/10 hover:border-primary-light/50 hover:text-primary-light'
                            }`}
                    >
                        {showIndex ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl border bg-white dark:bg-white/5 text-slate-400 dark:text-white/40 border-slate-200 dark:border-white/10 hover:border-primary-light/50 hover:text-primary-light transition-colors"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── Body: index panel + slide ── */}
            <div className="flex gap-4 flex-1 min-h-0 p-6 pt-0">

                {showIndex && (
                    <div
                        ref={indexRef}
                        className="w-64 shrink-0 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-y-auto flex flex-col custom-scrollbar shadow-sm"
                    >
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#1A1A2E] z-10">
                            <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">Index</p>
                        </div>
                        <div className="p-2 space-y-1">
                            {slides.map(({ slide: s, subTopicTitle: st, globalIndex: gi }) => (
                                <button
                                    key={gi}
                                    data-active={gi === current}
                                    onClick={() => goTo(gi)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${gi === current
                                            ? 'bg-primary-light text-white'
                                            : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-white/60'
                                        }`}
                                >
                                    <div className={`text-[9px] font-black uppercase mb-0.5 ${gi === current ? 'text-white' : 'text-slate-400 dark:text-white/20'}`}>
                                        {gi + 1} · {st}
                                    </div>
                                    <div className="text-xs font-bold leading-snug line-clamp-2">
                                        {s.title}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main slide card */}
                <div className="flex-1 bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden flex flex-col min-w-0 relative">
                    <div className="flex-1 flex items-center justify-center p-8 md:p-12 overflow-y-auto custom-scrollbar">
                        <div
                            key={current}
                            className="max-w-2xl w-full space-y-7"
                            style={{ animation: `${direction === 'next' ? 'slideInFromRight' : 'slideInFromLeft'} 0.35s cubic-bezier(0.22,1,0.36,1) both` }}
                        >
                            <div className="space-y-3">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight italic">
                                    <SplitTitle title={slide.title} />
                                </h2>
                                {description && (
                                    <p className="text-lg text-slate-800 dark:text-white/60 leading-relaxed font-bold tracking-tight">{description}</p>
                                )}
                            </div>

                            {cards.length > 0 && (
                                <div className={`grid gap-4 ${cards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                    {cards.map((point, i) => {
                                        const colonIdx = point.indexOf(':');
                                        const hasLabel = colonIdx > 0 && colonIdx < 40;
                                        const label = hasLabel ? point.slice(0, colonIdx).trim() : null;
                                        const body = hasLabel ? point.slice(colonIdx + 1).trim() : point;
                                        return (
                                            <div key={i} className="p-6 rounded-[24px] border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 transition-all hover:border-primary-light/20 shadow-sm">
                                                {label ? (
                                                    <>
                                                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-primary-light italic">{label}</h4>
                                                        <p className="text-sm text-slate-600 dark:text-white/40 leading-relaxed font-medium">{body}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed font-medium">{body}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom nav */}
                    <div className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md px-8 py-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                        <button
                            onClick={prev}
                            disabled={current === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Previous
                        </button>

                        <div className="flex items-center gap-1.5">
                            {dotStart > 0 && <span className="text-slate-300 dark:text-white/10 text-xs">…</span>}
                            {Array.from({ length: dotCount }).map((_, i) => {
                                const idx = dotStart + i;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => goTo(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === current
                                                ? 'w-10 bg-primary-light shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'
                                                : idx < current
                                                    ? 'w-6 bg-primary-light/20'
                                                    : 'w-6 bg-slate-300 dark:bg-white/10'
                                            }`}
                                    />
                                );
                            })}
                            {dotStart + dotCount < total && <span className="text-slate-300 dark:text-white/10 text-xs">…</span>}
                        </div>

                        <button
                            onClick={next}
                            disabled={current === total - 1}
                            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary-light text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-dark shadow-xl shadow-primary-light/20 disabled:opacity-10 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Auto-play progress bar */}
            {isPlaying && (
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mx-6 mb-6">
                    <div
                        key={`${current}-${speedIdx}`}
                        className="h-full bg-primary-light"
                        style={{ animation: `slideProgress ${AUTO_PLAY_SPEEDS[speedIdx].ms}ms linear forwards` }}
                    />
                </div>
            )}

            <style>{`
                @keyframes slideProgress {
                    from { width: 0% }
                    to   { width: 100% }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInFromLeft {
                    from { opacity: 0; transform: translateX(-40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};
