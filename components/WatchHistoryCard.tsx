"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Info,
  Trash2,
  Star,
} from "lucide-react";
import { useWatchHistoryStore } from "@/stores";
import {
  buildHistoryDetailsUrl,
  buildRewatchUrl,
  getWatchHistoryItemId,
  type WatchHistoryItem,
} from "@/lib/watch-history";

interface WatchHistoryCardProps {
  item: WatchHistoryItem;
  onQuickRemove?: (item: WatchHistoryItem) => void;
}

function resolveBackdropImage(item: WatchHistoryItem): string {
  const raw = item.backdrop_path || item.poster_path;
  if (!raw) {
    return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `https://image.tmdb.org/t/p/w780${raw}`;
}

function formatWatchedTimeAgo(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return "Recently";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function WatchHistoryCard({ item, onQuickRemove }: WatchHistoryCardProps) {
  const router = useRouter();
  const { recordHistory, toggleCompleted, removeItem, watchAgain } = useWatchHistoryStore();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resetting, setResetting] = useState(false);

  const itemId = getWatchHistoryItemId(item);
  const imageSrc = resolveBackdropImage(item);
  const progress = item.completed
    ? 100
    : Math.min(99, Math.max(5, Math.round(item.progress_percent ?? 35)));

  const episodeLabel =
    (item.media_type === "tv" || item.media_type === "anime") && item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type.toUpperCase();

  const handleWatchAgain = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (resetting) return;
    setResetting(true);
    try {
      const url = await watchAgain(item);
      router.push(url);
    } finally {
      setResetting(false);
    }
  };

  const handleRewatch = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    void recordHistory({
      ...item,
      last_watched_at: new Date().toISOString(),
    });
    router.push(buildRewatchUrl(item));
  };

  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(buildHistoryDetailsUrl(item));
  };

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleCompleted(item);
  };

  const handleQuickRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemId) return;
    if (onQuickRemove) {
      onQuickRemove(item);
      return;
    }
    void removeItem(item.media_type, itemId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Select" || e.keyCode === 23) {
      e.preventDefault();
      handleRewatch();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      aria-label={`Watch ${item.title} (${episodeLabel})`}
      onClick={() => handleRewatch()}
      onKeyDown={handleKeyDown}
      className="poster-card group/card relative aspect-video w-[228px] xs:w-[244px] sm:w-[276px] md:w-[308px] lg:w-[328px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface select-none transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:border-primary"
    >
      {!imageLoaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={imageSrc}
        alt={item.title}
        onLoad={() => setImageLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 group-focus-within/card:scale-105 ${
          imageLoaded ? "scale-100 opacity-100 blur-0" : "scale-95 opacity-0 blur-md"
        }`}
        loading="lazy"
      />

      {/* Minimal resting state */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-3 pt-10 sm:px-3.5 sm:pb-3.5 transition-opacity duration-250 group-hover/card:opacity-0 group-focus-within/card:opacity-0">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-white/70 tabular-nums">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold uppercase text-primary">{episodeLabel}</span>
            <span>·</span>
            <span className={item.completed ? "text-emerald-400 font-semibold" : "text-white/75"}>
              {item.completed ? "Completed" : `${progress}%`}
            </span>
          </div>
          <span className="shrink-0 text-white/55">{formatWatchedTimeAgo(item.last_watched_at)}</span>
        </div>
        <h3 className="mt-0.5 line-clamp-1 font-display text-xs sm:text-sm font-bold tracking-tight text-white">
          {item.title}
        </h3>
      </div>

      {/* Hover & TV D-Pad Focus overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/70 to-black/30 p-3.5 pb-4 opacity-0 transition-opacity duration-250 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {item.completed ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-md tabular-nums">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completed</span>
                {item.watch_count > 1 && (
                  <span className="ml-0.5 text-white/75">×{item.watch_count}</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur-md tabular-nums">
                <Clock className="h-3 w-3" />
                <span>Partial · {progress}%</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={handleWatchAgain}
              data-testid="watch-again-icon-btn"
              aria-label={`Watch Again ${item.title}`}
              title="Watch Again (Reset to 0% & Restart)"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-black/70 p-1.5 text-white/90 backdrop-blur-md transition-all hover:border-primary hover:text-primary active:scale-95"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin text-primary" : ""}`} />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={handleToggleCompleted}
              aria-label={item.completed ? "Mark as partially watched" : "Mark as completed"}
              title={item.completed ? "Mark as partially watched" : "Mark as completed"}
              className={`rounded-lg border p-1.5 backdrop-blur-md transition-colors ${
                item.completed
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35"
                  : "border-white/20 bg-black/70 text-white/85 hover:border-primary hover:text-primary"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={handleQuickRemove}
              data-testid="quick-remove-btn"
              aria-label={`Quick Remove ${item.title}`}
              title="Quick Remove"
              className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-black/75 p-1.5 text-white/90 backdrop-blur-md transition-all hover:border-red-500/70 hover:bg-red-500/90 hover:text-white active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-white/70 tabular-nums">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold uppercase text-primary">{episodeLabel}</span>
              {item.vote_average != null && item.vote_average > 0 && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 text-white/90">
                    <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                    {item.vote_average.toFixed(1)}
                  </span>
                </>
              )}
            </div>
            <span className="shrink-0 text-white/55">{formatWatchedTimeAgo(item.last_watched_at)}</span>
          </div>

          <h3 className="line-clamp-1 font-display text-sm font-bold tracking-tight text-white">
            {item.title}
          </h3>

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={handleWatchAgain}
              data-testid="watch-again-btn"
              aria-label={`Watch Again ${item.title}`}
              title="Reset progress of completed title to 0% and restart"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-contrast transition-all hover:brightness-110 active:scale-95 shadow-sm"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>Watch Again</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={handleDetails}
              aria-label={`View details for ${item.title}`}
              title="Title Details"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md transition-colors hover:border-primary hover:text-primary"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom progress indicator bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/15">
        <div
          className={`h-full transition-all duration-300 ${
            item.completed ? "bg-emerald-400" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}
