"use client";

import { RecoverableArtwork } from "@/components/RecoverableArtwork";

import React, { useCallback, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Film,
  ImageOff,
  Play,
  SlidersHorizontal,
} from "lucide-react";
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
  onQuickInspect?: () => void;
  onPrefetch?: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
}

/**
 * iOS 27/28 Liquid Glass 2:3 squircle poster card.
 * - Artwork-first resting state with specular glass rim.
 * - Edge-aware hover expansion with frosted Liquid Glass bottom action dock.
 * - Independent accessible sibling buttons (zero nested interactive elements).
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
  onQuickInspect,
  onPrefetch,
  onToggleWatchlist,
  onToggleWatched,
}: CinematicMediaCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [transformOrigin, setTransformOrigin] = useState<CardTransformOrigin>("center center");

  const imageAvailable = Boolean(imageUrl);
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
          : "w-[37vw] min-w-[136px] max-w-[198px] sm:w-[176px] md:w-[188px] lg:w-[198px]"
      }`}
      aria-label={title}
      onPointerEnter={handleEnter}
      onFocus={handleEnter}
    >
      <div
        style={{ transformOrigin }}
        className="cinematic-poster-art relative aspect-[2/3] overflow-hidden rounded-[18px] bg-surface"
      >
        {/* Fallback placeholder when image is unavailable */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface px-3 text-center text-on-surface-variant">
          <ImageOff className="h-7 w-7 opacity-30" aria-hidden="true" />
        </div>

        {imageAvailable && (
          <RecoverableArtwork
            src={imageUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Specular top glass highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[18px] ring-1 ring-inset ring-white/15"
        />

        {/* Subtle frosted New release capsule */}
        {recent && (
          <span
            data-testid="recent-release-tag"
            className="pointer-events-none absolute top-2.5 left-2.5 z-20 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-contrast shadow-md backdrop-blur-md"
          >
            New
          </span>
        )}

        {/* Primary clickable artwork layer */}
        <button
          type="button"
          data-tv-focusable="true"
          className="cinematic-poster-open absolute inset-0 z-10 rounded-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-[-2px]"
          onClick={onOpen}
          aria-label={`Open ${title} details`}
          title={overview || title}
        >
          <span className="sr-only">Open {title} details</span>
        </button>

        {/* Directional hover scrim + Frosted Liquid Glass action dock */}
        <div
          className="cinematic-hover-scrim pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-2.5"
          style={{
            background:
              "linear-gradient(to top, rgba(6,9,19,0.94) 8%, rgba(6,9,19,0.58) 48%, transparent 84%)",
          }}
        >
          {overview && (
            <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-white/85">
              {overview}
            </p>
          )}

          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/55 p-1 backdrop-blur-xl">
            {onPlay && (
              <button
                type="button"
                onClick={onPlay}
                aria-label={`Play ${title}`}
                data-tv-focusable="true"
                className="cinematic-poster-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-sm transition-transform hover:scale-105"
              >
                <Play className="h-3 w-3 fill-current ml-0.5" aria-hidden="true" />
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
              className={`cinematic-poster-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                saved
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
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
                className="cinematic-poster-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <Film className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {onQuickInspect && (
              <button
                type="button"
                data-tv-focusable="true"
                data-testid="card-quick-inspect-btn"
                aria-label={`Quick inspect ${title}`}
                title={`Inspect ${title}`}
                onClick={onQuickInspect}
                className="cinematic-poster-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              data-tv-focusable="true"
              aria-pressed={watched}
              aria-label={watched ? `Mark ${title} as not watched` : `Mark ${title} as watched`}
              title={watched ? "Watched" : "Mark as watched"}
              onClick={onToggleWatched}
              className={`cinematic-poster-action zoku-watched-toggle ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                watched
                  ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-300"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
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

      {/* Clean aligned caption beneath poster */}
      <div className="mt-2.5 px-0.5 space-y-0.5">
        <h3 className="truncate font-display text-xs sm:text-[13px] font-semibold tracking-tight text-on-surface group-hover/card:text-primary transition-colors">
          {title}
        </h3>
        {metaParts.length > 0 && (
          <p className="truncate font-mono text-[10px] sm:text-[11px] text-on-surface-variant tabular-nums">
            {metaParts.join(" · ")}
          </p>
        )}
      </div>
    </article>
  );
}
