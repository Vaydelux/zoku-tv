"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { buildWatchUrl, getContinueWatchingItemId } from "@/lib/continue-watching";
import { useContinueWatchingStore } from "@/stores";
import { getAnimeDetails } from "@/lib/anilist";
import { getSeasonDetails } from "@/lib/tmdb";
import {
  deriveLatestAiredAnimeEpisode,
  resolveNewEpisodeRadarForTrackedItem,
} from "@/lib/discovery-intelligence";
import { computeCardTransformOrigin, type CardTransformOrigin } from "@/lib/rail-edge-origin";

export function CinematicContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement>(null);
  const removeItem = useContinueWatchingStore((state) => state.removeItem);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [newEpBadge, setNewEpBadge] = useState<string | null>(null);
  const [transformOrigin, setTransformOrigin] = useState<CardTransformOrigin>("center center");

  const rawImage = item.backdrop_path || item.poster_path;
  const imageUrl = rawImage?.startsWith("http")
    ? rawImage
    : rawImage
      ? `https://image.tmdb.org/t/p/w780${rawImage}`
      : null;
  const hasImage = Boolean(imageUrl && failedImage !== imageUrl);
  const progress = Math.min(100, Math.max(0, Math.round(item.progress_percent ?? 0)));
  const id = getContinueWatchingItemId(item);
  const episode =
    item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type === "anime"
        ? "Anime"
        : item.media_type === "tv"
          ? "Series"
          : "Film";

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

  useEffect(() => {
    let cancelled = false;
    setNewEpBadge(null);
    if (!item.episode || (item.media_type !== "anime" && item.media_type !== "tv")) {
      return;
    }

    resolveNewEpisodeRadarForTrackedItem({
      mediaType: item.media_type,
      tmdbId: item.tmdbId,
      anilistId: item.anilistId,
      season: item.season ?? 1,
      episode: item.episode,
      fetchAnimeLatest: async (aid) => {
        const detail = await getAnimeDetails(aid);
        return detail ? deriveLatestAiredAnimeEpisode(detail) : null;
      },
      fetchTvLatest: async (tid, sNum) => {
        const sDetail = await getSeasonDetails(tid, sNum);
        const today = new Date().toISOString().slice(0, 10);
        const airedEps = (sDetail?.episodes ?? []).filter(
          (ep) => !ep.air_date || ep.air_date <= today
        );
        return airedEps.length > 0
          ? Math.max(...airedEps.map((e) => e.episode_number))
          : null;
      },
    }).then((status) => {
      if (!cancelled && status.hasNewEpisode) {
        setNewEpBadge(status.badgeText);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.media_type, item.tmdbId, item.anilistId, item.season, item.episode]);

  return (
    <article
      ref={cardRef}
      onPointerEnter={updateEdgeOrigin}
      onFocus={updateEdgeOrigin}
      className="zoku-continue-card group relative w-[min(76vw,310px)] shrink-0 sm:w-[300px] lg:w-[320px]"
    >
      <div
        style={{ transformOrigin }}
        className="zoku-continue-art relative aspect-video overflow-hidden rounded-[20px] border border-[var(--glass-border)] bg-surface shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] duration-200 group-hover:border-[var(--glass-border-strong)] group-hover:shadow-[var(--shadow-card-hover)]"
      >
        {!hasImage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-on-surface-variant">
            <ImageOff className="h-7 w-7 opacity-35" aria-hidden="true" />
          </div>
        )}
        {hasImage && (
          <img
            src={imageUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(imageUrl!)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Directional obsidian bottom scrim */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(11,11,15,0.86) 0%, rgba(11,11,15,0.22) 45%, transparent 75%)",
          }}
          aria-hidden="true"
        />

        <button
          type="button"
          className="zoku-continue-open absolute inset-0 z-10 w-full rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-on-surface"
          data-tv-focusable="true"
          aria-label={`Resume ${item.title} (${progress}% watched)`}
          onClick={() => router.push(buildWatchUrl(item))}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="liquid-glass-cta inline-flex h-12 w-12 items-center justify-center rounded-full">
              <Play className="h-5 w-5 fill-current ml-0.5" aria-hidden="true" />
            </span>
          </span>
        </button>

        {id && (
          <button
            type="button"
            data-tv-focusable="true"
            aria-label={`Remove ${item.title} from Continue watching`}
            onClick={() => void removeItem(item.media_type, id)}
            className="zoku-continue-remove absolute right-2.5 top-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-xl transition-colors hover:bg-black/85"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        <div
          role="progressbar"
          aria-label={`${item.title} playback progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/25"
        >
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-baseline justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-on-surface">{item.title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant tabular-nums">
            <span>{episode}</span>
            {newEpBadge && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="new-episode-radar-badge"
                  className="font-semibold text-emerald-400"
                >
                  {newEpBadge}
                </span>
              </>
            )}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-on-surface-variant tabular-nums">
          {progress}%
        </span>
      </div>
    </article>
  );
}
