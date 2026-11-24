"use client";

import React, { useCallback, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Film, ImageOff, Play } from "lucide-react";
import { computeCardTransformOrigin, type CardTransformOrigin } from "@/lib/rail-edge-origin";

export interface CinematicMediaCardProps {
  title: string;
  imageUrl: string | null;
  year: string;
  mediaLabel: string;
  rating: string;
  overview?: string;
  recent?: boolean;
  episodes?: number | null;
  watched: boolean;
  saved: boolean;
  progressPercent?: number | null;
  fullWidth?: boolean;
  onOpen: () => void;
  onPlay?: () => void;
  onQuickTrailer?: () => void;
  onPrefetch?: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
}

/**
 * Artwork-first 2:3 cinematic poster card.
 * - Unobstructed poster art at rest (only progress bar & subtle New mark).
 * - Viewport/rail edge-aware hover scale (grows inward, never breaks row alignment).
 * - Single clean bottom action tray inside directional gradient scrim on hover/focus.
 * - Independent accessible sibling buttons (never nested interactive nodes).
 */
export function CinematicMediaCard({
  title,
  imageUrl,
  year,
  mediaLabel,
  rating,
  overview,
  recent = false,
  episodes,
  watched,
  saved,
  progressPercent,
  fullWidth = false,
  onOpen,
  onPlay,
  onQuickTrailer,
  onPrefetch,
  onToggleWatchlist,
  onToggleWatched,
}: CinematicMediaCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [transformOrigin, setTransformOrigin] = useState<CardTransformOrigin>("center center");

  const imageAvailable = Boolean(imageUrl && imageUrl !== failedImage);
  const progress =
    typeof progressPercent === "number" && Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, progressPercent))
      : null;

  const updateEdgeOrigin = useCallback(() => {
    const el = cardRef.current;
    if (!el || typeof window === "undefined") return;
    const cardRect = el.getBoundingClientRect();
    const scrollParent = el.closest(".rail-scroll-track");
    const containerRect = scrollParent
      ? scrollParent.getBoundingClientRect()
      : { left: 0, right: window.innerWidth, width: window.innerWidth };
    setTransformOrigin(computeCardTransformOrigin(cardRect, containerRect));
  }, []);

  const handleEnter = () => {
    updateEdgeOrigin();
    onPrefetch?.();
  };

  const metaParts: string[] = [];
  if (year && year !== "N/A") metaParts.push(year);
  if (rating && rating !== "N/A") metaParts.push(`★ ${rating}`);
  else if (mediaLabel) metaParts.push(mediaLabel);
  if (episodes) metaParts.push(`${episodes} EP`);

  return (
    <article
      ref={cardRef}
      className={`cinematic-poster-card group/card relative min-w-0 shrink-0 ${
        fullWidth
          ? "w-full"
          : "w-[36vw] min-w-[132px] max-w-[196px] sm:w-[172px] md:w-[184px] lg:w-[196px]"
      }`}
      aria-label={title}
      onPointerEnter={handleEnter}
      onFocus={handleEnter}
    >
      <div
        style={{ transformOrigin }}
        className="cinematic-poster-art relative aspect-[2/3] overflow-hidden rounded-lg bg-surface"
      >
        {/* Fallback placeholder when image is unavailable */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface px-3 text-center text-on-surface-variant">
          <ImageOff className="h-7 w-7 opacity-30" aria-hidden="true" />
        </div>

        {imageAvailable && (
          <img
            key={imageUrl}
            src={imageUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailedImage(imageUrl!)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Subtle New release marker */}
        {recent && (
          <span
            data-testid="recent-release-tag"
            className="pointer-events-none absolute top-2 left-2 z-20 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-contrast"
          >
            New
          </span>
        )}

        {/* Primary clickable artwork layer (draggable inside horizontal rails) */}
        <button
          type="button"
          data-tv-focusable="true"
          className="cinematic-poster-open absolute inset-0 z-10 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-[-2px]"
          onClick={onOpen}
          aria-label={`Open ${title} details`}
          title={overview || title}
        >
          <span className="sr-only">Open {title} details</span>
        </button>

        {/* Directional hover scrim + disciplined bottom action bar */}
        <div
          className="cinematic-hover-scrim pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-2.5"
          style={{
            background:
              "linear-gradient(to top, rgba(11,11,15,0.96) 6%, rgba(11,11,15,0.68) 46%, transparent 82%)",
          }}
        >
          {overview && (
            <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-[#F5F5F7]/85">
              {overview}
            </p>
          )}

          <div className="pointer-events-auto flex items-center gap-1.5">
            {onPlay && (
              <button
                type="button"
                onClick={onPlay}
                aria-label={`Play ${title}`}
                data-tv-focusable="true"
                className="cinematic-poster-action inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast transition-opacity hover:opacity-90"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              data-tv-focusable="true"
              data-testid="resting-quick-add-btn"
              aria-pressed={saved}
              aria-label={saved ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
              title={saved ? "In My List" : "Add to My List"}
              onClick={onToggleWatchlist}
              className={`cinematic-poster-action inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                saved
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-white/25 bg-[#14141A]/90 text-[#F5F5F7] hover:border-white hover:bg-[#1C1C24]"
              }`}
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            {onQuickTrailer && (
              <button
                type="button"
                data-tv-focusable="true"
                data-testid="card-quick-trailer-btn"
                aria-label={`Watch trailer for ${title}`}
                title={`Trailer: ${title}`}
                onClick={onQuickTrailer}
                className="cinematic-poster-action inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#14141A]/90 text-[#F5F5F7] transition-colors hover:border-white hover:bg-[#1C1C24]"
              >
                <Film className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              data-tv-focusable="true"
              aria-pressed={watched}
              aria-label={watched ? `Mark ${title} as not watched` : `Mark ${title} as watched`}
              title={watched ? "Watched" : "Mark as watched"}
              onClick={onToggleWatched}
              className={`cinematic-poster-action zoku-watched-toggle ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                watched
                  ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-400"
                  : "border-white/25 bg-[#14141A]/90 text-[#F5F5F7] hover:border-white hover:bg-[#1C1C24]"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Thin bottom playback progress track */}
        {progress !== null && progress > 0 && (
          <div
            data-testid="card-play-progress-bar"
            role="progressbar"
            aria-label={`${title} playback progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[3px] overflow-hidden bg-white/25"
          >
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Quiet editorial caption below poster */}
      <div className="min-w-0 px-0.5 pt-2">
        <h3 className="truncate text-[13px] font-medium leading-snug text-on-surface sm:text-sm">
          {title}
        </h3>
        {metaParts.length > 0 && (
          <p className="mt-0.5 truncate text-[11px] text-on-surface-variant tabular-nums">
            {metaParts.join(" · ")}
            {watched ? " · Watched" : ""}
          </p>
        )}
      </div>
    </article>
  );
}
