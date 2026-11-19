"use client";

import { useEffect, useRef, useState } from "react";
import { X, Film, Play } from "lucide-react";

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
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setActiveIndex(Math.min(Math.max(0, initialIndex), Math.max(0, clips.length - 1)));
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
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || clips.length === 0) return null;

  const activeClip = clips[activeIndex] ?? clips[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} Trailer Theater`}
      data-testid="trailer-theater-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl rounded-2xl border border-border-custom bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border-custom px-4 sm:px-6 py-3.5">
          <div className="min-w-0 flex items-center gap-2.5">
            <Film className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-display font-bold text-on-surface truncate">
                {title}
              </p>
              <p className="text-[11px] font-mono text-on-surface-variant truncate">
                {activeClip.type || "Trailer"} · {activeClip.name}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close trailer modal"
            data-tv-focusable="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-custom bg-background/70 text-on-surface hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 16:9 Lazy Video Surface */}
        <div className="relative aspect-video w-full bg-black">
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
        {clips.length > 1 && (
          <div className="border-t border-border-custom bg-background/60 px-4 sm:px-6 py-3">
            <div className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              {clips.map((clip, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={clip.id || clip.key}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    data-tv-focusable="true"
                    className={`inline-flex items-center gap-2 shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border-custom bg-surface text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
                    }`}
                  >
                    <Play className="h-3 w-3 fill-current shrink-0" />
                    <span className="max-w-[200px] truncate">{clip.name}</span>
                    {clip.type && (
                      <span className="font-mono text-[10px] uppercase opacity-75">
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
