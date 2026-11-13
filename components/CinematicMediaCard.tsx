"use client";

import React, { useState } from "react";
import { Check, CheckCircle2, ImageOff, Plus, Star } from "lucide-react";

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
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
}

/**
 * The image link and the two secondary buttons are independent siblings.
 * This is keyboard/touch/TV accessible, unlike nested buttons in old cards.
 * No additional catalog request, cache or content-policy decisions live here.
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
  onToggleWatchlist,
  onToggleWatched,
}: CinematicMediaCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageAvailable = Boolean(imageUrl && imageUrl !== failedImage);
  const progress = typeof progressPercent === "number" && Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(100, progressPercent))
    : null;

  return (
    <article
      className={`cinematic-poster-card group/card relative min-w-0 shrink-0 ${fullWidth ? "w-full" : "w-[146px] xs:w-[162px] sm:w-[174px] md:w-[188px] lg:w-[198px]"}`}
      aria-label={title}
    >
      <div className="cinematic-poster-art relative aspect-[2/3] overflow-hidden rounded-xl bg-surface border border-border-custom">
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface text-on-surface-variant">
          <ImageOff className="h-8 w-8 opacity-35" aria-hidden="true" />
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
            className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-[1.035] group-focus-within/card:scale-[1.035]"
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
        {recent && (
          <span data-testid="recent-release-tag" className="pointer-events-none absolute top-2 left-2 z-20 rounded-md bg-primary px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-contrast">New</span>
        )}

        <button
          type="button"
          data-tv-focusable="true"
          className="cinematic-poster-open absolute inset-0 z-10 cursor-pointer rounded-xl outline-offset-[-3px] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary"
          onClick={onOpen}
          aria-label={`Open ${title} details`}
          title={overview || title}
        >
          <span className="sr-only">Open {title} details</span>
        </button>

        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            data-tv-focusable="true"
            data-testid="resting-quick-add-btn"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
            onClick={onToggleWatchlist}
            className={`cinematic-poster-action flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white shadow-sm transition-colors ${saved ? "bg-primary border-primary text-primary-contrast" : "bg-black/70 hover:bg-primary hover:text-primary-contrast"}`}
          >
            {saved ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            data-tv-focusable="true"
            aria-pressed={watched}
            aria-label={watched ? `Mark ${title} as not watched` : `Mark ${title} as watched`}
            onClick={onToggleWatched}
            className={`cinematic-poster-action flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white shadow-sm transition-colors ${watched ? "bg-primary border-primary text-primary-contrast" : "bg-black/70 hover:bg-primary hover:text-primary-contrast"}`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex items-center gap-1 text-xs font-semibold text-white drop-shadow-sm">
          {watched ? <span className="rounded bg-black/75 px-2 py-1">Watched</span>
          : progress !== null && progress > 0 ? <span className="rounded bg-black/75 px-2 py-1">Resume · {progress}%</span>
          : null}
        </div>

        {progress !== null && progress > 0 && (
          <div data-testid="card-play-progress-bar" role="progressbar" aria-label={`${title} playback progress`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-1 overflow-hidden bg-white/35">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="min-w-0 px-0.5 pt-2">
        <h3 className="line-clamp-2 min-h-[2.25rem] text-[13px] font-semibold leading-[1.2rem] text-on-surface sm:text-sm">{title}</h3>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-on-surface-variant">
          <span>{year}</span>
          <span aria-hidden="true">·</span>
          <span className="uppercase">{mediaLabel}</span>
          {episodes ? <><span aria-hidden="true">·</span><span>{episodes} EP</span></> : null}
          {rating !== "N/A" && <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" /> {rating}
            </span>
          </>}
        </div>
      </div>
    </article>
  );
}
