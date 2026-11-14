"use client";

import React, { useState } from "react";
import { ImageOff, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { buildWatchUrl, getContinueWatchingItemId } from "@/lib/continue-watching";
import { useContinueWatchingStore } from "@/stores";

/**
 * Reference-style Continue watching card. Real saved progress, real player URL,
 * and the existing profile-scoped removal store; no requests or new cache.
 * The resume and remove buttons are siblings, never nested interactive nodes.
 */
export function CinematicContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const router = useRouter();
  const removeItem = useContinueWatchingStore((state) => state.removeItem);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const rawImage = item.backdrop_path || item.poster_path;
  const imageUrl = rawImage?.startsWith("http")
    ? rawImage
    : rawImage
      ? `https://image.tmdb.org/t/p/w780${rawImage}`
      : null;
  const hasImage = Boolean(imageUrl && failedImage !== imageUrl);
  const progress = Math.min(100, Math.max(0, Math.round(item.progress_percent ?? 0)));
  const id = getContinueWatchingItemId(item);
  const episode = item.season && item.episode
    ? `S${item.season} · E${item.episode}`
    : item.media_type === "anime" ? "Anime" : item.media_type === "tv" ? "Series" : "Movie";

  return (
    <article className="zoku-continue-card group relative w-[min(74vw,340px)] shrink-0 sm:w-[340px]">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border-custom/70 bg-surface">
        {!hasImage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-on-surface-variant">
            <ImageOff className="h-8 w-8 opacity-50" aria-hidden="true" />
          </div>
        )}
        {hasImage && (
          <img src={imageUrl!} alt="" loading="lazy" decoding="async" draggable={false}
            onError={() => setFailedImage(imageUrl!)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.025] group-focus-within:scale-[1.025]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />
        <button type="button"
          className="zoku-continue-open absolute inset-0 z-10 w-full rounded-xl focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-primary"
          data-tv-focusable="true"
          aria-label={`Resume ${item.title} (${progress}% watched)`}
          onClick={() => router.push(buildWatchUrl(item))}>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-contrast">
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            </span>
          </span>
        </button>
        {id && (
          <button type="button" data-tv-focusable="true"
            aria-label={`Remove ${item.title} from Continue watching`}
            onClick={() => void removeItem(item.media_type, id)}
            className="zoku-continue-remove absolute right-2 top-2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div role="progressbar" aria-label={`${item.title} playback progress`}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1 bg-white/35">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-2.5 flex min-w-0 items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-on-surface">{item.title}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">{episode}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{progress}%</span>
      </div>
    </article>
  );
}
