"use client";

import { useEffect, useState } from "react";
import { Play, X, Keyboard } from "lucide-react";
import {
  AUTO_NEXT_COUNTDOWN_SECONDS,
  WATCH_SHORTCUT_DEFINITIONS,
} from "@/lib/watch-shortcuts";

interface AutoNextOverlayProps {
  visible: boolean;
  nextEpisodeLabel: string;
  nextEpisodeTitle?: string;
  onPlayNext: () => void;
  onCancel: () => void;
}

export function AutoNextOverlay({
  visible,
  nextEpisodeLabel,
  nextEpisodeTitle,
  onPlayNext,
  onCancel,
}: AutoNextOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_NEXT_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(AUTO_NEXT_COUNTDOWN_SECONDS);
      return;
    }
    setSecondsLeft(AUTO_NEXT_COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (visible && secondsLeft === 0) {
      onPlayNext();
    }
  }, [visible, secondsLeft, onPlayNext]);

  if (!visible) return null;

  const progressPct = Math.round(
    ((AUTO_NEXT_COUNTDOWN_SECONDS - secondsLeft) / AUTO_NEXT_COUNTDOWN_SECONDS) * 100
  );

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="auto-next-overlay"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border-custom bg-surface/95 p-4 text-on-surface shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-medium text-on-surface-variant">
            Up Next · Starting in{" "}
            <span className="font-mono font-semibold text-primary tabular-nums">
              {secondsLeft}s
            </span>
          </p>
          <p className="text-sm font-semibold text-on-surface truncate">
            {nextEpisodeLabel}
          </p>
          {nextEpisodeTitle && (
            <p className="text-xs text-on-surface-variant truncate">{nextEpisodeTitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel auto-next countdown"
          data-tv-focusable="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-hover hover:text-on-surface transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border-custom/60">
        <div
          className="h-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayNext}
          data-tv-focusable="true"
          className="flex-1 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-contrast hover:opacity-90 transition-opacity"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          Play Next Now
        </button>
        <button
          type="button"
          onClick={onCancel}
          data-tv-focusable="true"
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-border-custom bg-background/60 px-3.5 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-hover hover:text-on-surface transition-colors"
        >
          Stay Here
        </button>
      </div>
    </div>
  );
}

export function WatchShortcutsPopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      data-testid="watch-shortcuts-popover"
      className="fixed bottom-4 left-4 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border-custom bg-surface/95 p-4 text-on-surface shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
          <Keyboard className="h-4 w-4 text-primary" aria-hidden="true" />
          Player Shortcuts
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close shortcuts guide"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <dl className="space-y-2 text-xs">
        {WATCH_SHORTCUT_DEFINITIONS.map((def) => (
          <div key={def.action} className="flex items-center justify-between gap-2">
            <dt className="text-on-surface-variant">{def.label}</dt>
            <dd className="rounded-md border border-border-custom bg-background/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-on-surface tabular-nums">
              {def.key}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
