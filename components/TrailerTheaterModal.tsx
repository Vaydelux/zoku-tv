"use client";

import { useEffect, useRef, useState } from "react";
import { X, Film, Play, Maximize, Minimize } from "lucide-react";
import { useTheaterFullscreen } from "@/hooks/useTheaterFullscreen";

export interface TrailerClip {
  id: string;
  key: string;
  name: string;
  type?: string;
}

interface TrailerTheaterModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  clips: TrailerClip[];
  initialIndex?: number;
}

export function TrailerTheaterModal({
  open,
  onClose,
  title,
  clips,
  initialIndex = 0,
}: TrailerTheaterModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { isExpanded, toggleFullscreen, exitFullscreenOrTheater } =
    useTheaterFullscreen({
      stageRef,
      keepHudVisible: true,
    });

  useEffect(() => {
    if (open) {
      setActiveIndex(
        Math.min(Math.max(0, initialIndex), Math.max(0, clips.length - 1))
      );
    }
  }, [open, initialIndex, clips.length]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isExpanded) {
          void exitFullscreenOrTheater();
        } else {
          onClose();
        }
      } else if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose, isExpanded, exitFullscreenOrTheater, toggleFullscreen]);

  if (!open || clips.length === 0) return null;

  const activeClip = clips[activeIndex] ?? clips[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} Trailer Theater`}
      data-testid="trailer-theater-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B0B0F]/92 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={stageRef}
        className={`zoku-theater-stage flex w-full flex-col overflow-hidden border border-white/10 bg-[#14141A] shadow-2xl ${
          isExpanded
            ? "zoku-theater-viewport-lock"
            : "max-w-5xl max-h-[92dvh] rounded-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0B0B0F] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex items-center gap-2.5">
            <Film className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-display font-semibold text-[#F5F5F7] truncate">
                {title}
              </p>
              <p className="text-[11px] text-[#A1A1AA] truncate">
                {activeClip.type || "Trailer"} · {activeClip.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isExpanded ? "Exit fullscreen" : "Fullscreen trailer"}
              title="Fullscreen (F)"
              data-tv-focusable="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#14141A] text-[#F5F5F7] hover:border-white/25 hover:bg-[#1C1C24] transition-colors"
            >
              {isExpanded ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                if (isExpanded) {
                  void exitFullscreenOrTheater();
                }
                onClose();
              }}
              aria-label="Close trailer modal"
              data-tv-focusable="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#14141A] text-[#F5F5F7] hover:border-white/25 hover:bg-[#1C1C24] transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 16:9 Video Surface */}
        <div
          className={`relative w-full bg-black ${
            isExpanded ? "flex-1 min-h-0" : "aspect-video"
          }`}
        >
          <iframe
            key={activeClip.key}
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeClip.key)}?autoplay=1&rel=0&modestbranding=1`}
            title={`${title} — ${activeClip.name}`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Multi-Clip Selector */}
        {clips.length > 1 && !isExpanded && (
          <div className="border-t border-white/10 bg-[#0B0B0F] px-4 py-3 sm:px-5">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {clips.map((clip, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={clip.id || clip.key}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    data-tv-focusable="true"
                    className={`inline-flex items-center gap-2 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-white/10 bg-[#14141A] text-[#A1A1AA] hover:border-white/25 hover:text-[#F5F5F7]"
                    }`}
                  >
                    <Play className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />
                    <span className="max-w-[200px] truncate">{clip.name}</span>
                    {clip.type && (
                      <span className="font-mono text-[10px] uppercase opacity-70">
                        {clip.type}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
