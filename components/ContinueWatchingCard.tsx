"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Star, X } from "lucide-react";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { buildWatchUrl, getContinueWatchingItemId } from "@/lib/continue-watching";
import { useContinueWatchingStore } from "@/stores";
import { getTitleDetails } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
}

export function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
  const router = useRouter();
  const removeItem = useContinueWatchingStore((state) => state.removeItem);
  const [imageLoading, setImageLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [overview, setOverview] = useState(item.overview?.trim() || "");
  const [resolvedBackdrop, setResolvedBackdrop] = useState<string | null>(
    item.backdrop_path ?? null
  );
  const [rating, setRating] = useState<number | null>(
    typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average
      : null
  );

  const rawImage = resolvedBackdrop || item.backdrop_path || item.poster_path;
  const imagePath = rawImage?.startsWith("http")
    ? rawImage
    : rawImage
    ? `https://image.tmdb.org/t/p/w780${rawImage}`
    : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900";

  const progress = Math.min(100, Math.max(0, Math.round(item.progress_percent ?? 0)));
  const episodeLabel =
    item.media_type === "anime" && item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type === "tv" && item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type.toUpperCase();

  const ratingLabel = rating != null ? rating.toFixed(1) : "N/A";

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = getContinueWatchingItemId(item);
    if (!id) return;
    void removeItem(item.media_type, id);
  };

  useEffect(() => {
    setOverview(item.overview?.trim() || "");
    setResolvedBackdrop(item.backdrop_path ?? null);
    setRating(
      typeof item.vote_average === "number" && item.vote_average > 0
        ? item.vote_average
        : null
    );
  }, [
    item.overview,
    item.backdrop_path,
    item.vote_average,
    item.tmdbId,
    item.anilistId,
    item.media_type,
  ]);

  useEffect(() => {
    if (!hovered || (overview && rating != null && resolvedBackdrop)) return;

    let cancelled = false;

    async function loadMeta() {
      try {
        if (item.media_type === "anime" && item.anilistId) {
          const data = await getAnimeDetails(item.anilistId);
          if (cancelled || !data) return;
          if (!overview && data.description) setOverview(data.description);
          if (!resolvedBackdrop && data.bannerImage) setResolvedBackdrop(data.bannerImage);
          if (rating == null && data.averageScore) {
            setRating(data.averageScore / 10);
          }
          return;
        }

        if ((item.media_type === "movie" || item.media_type === "tv") && item.tmdbId) {
          const data = await getTitleDetails(item.media_type, item.tmdbId);
          if (cancelled || !data) return;
          if (!overview && data.overview) setOverview(data.overview);
          if (!resolvedBackdrop && data.backdrop_path) {
            setResolvedBackdrop(data.backdrop_path);
          }
          if (rating == null && data.vote_average) {
            setRating(data.vote_average);
          }
        }
      } catch (err) {
        console.error("Failed to load continue-watching meta", err);
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [hovered, overview, rating, resolvedBackdrop, item.media_type, item.tmdbId, item.anilistId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (
      e.key === "Enter" ||
      e.key === " " ||
      e.key === "Select" ||
      e.keyCode === 23
    ) {
      e.preventDefault();
      router.push(buildWatchUrl(item));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      aria-label={`Resume ${item.title} (${episodeLabel})`}
      onClick={() => router.push(buildWatchUrl(item))}
      onKeyDown={handleKeyDown}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="poster-card group/card relative aspect-video w-[228px] xs:w-[244px] sm:w-[276px] md:w-[308px] lg:w-[328px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface select-none transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:border-primary"
    >
      {imageLoading && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={imagePath}
        alt={item.title}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 group-focus-within/card:scale-105 ${
          imageLoading ? "scale-95 opacity-0 blur-md" : "scale-100 opacity-100 blur-0"
        }`}
        loading="lazy"
      />

      {/* Minimal resting state */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-3 pt-10 sm:px-3.5 sm:pb-3.5 transition-opacity duration-250 group-hover/card:opacity-0 group-focus-within/card:opacity-0">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/70 tabular-nums">
          <span className="font-semibold uppercase text-primary">{episodeLabel}</span>
          {progress > 0 && (
            <>
              <span>·</span>
              <span>{progress}% Watched</span>
            </>
          )}
        </div>
        <h3 className="mt-0.5 line-clamp-1 font-display text-xs sm:text-sm font-bold tracking-tight text-white">
          {item.title}
        </h3>
      </div>

      {/* Hover & TV D-Pad Focus overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/70 to-black/30 p-3.5 opacity-0 transition-opacity duration-250 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-md tabular-nums">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>{ratingLabel}</span>
            {progress > 0 && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-primary">{progress}%</span>
              </>
            )}
          </span>

          <button
            type="button"
            tabIndex={-1}
            onClick={handleRemove}
            aria-label={`Remove ${item.title} from Continue Watching`}
            title="Remove from Continue Watching"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-black/70 p-1.5 text-white/90 backdrop-blur-md transition-all hover:border-red-500/70 hover:bg-red-500/90 hover:text-white active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/70 tabular-nums">
            <span className="font-semibold uppercase text-primary">{episodeLabel}</span>
            {progress > 0 && (
              <>
                <span>·</span>
                <span>{progress}% Watched</span>
              </>
            )}
          </div>

          <h3 className="line-clamp-1 font-display text-sm font-bold tracking-tight text-white">
            {item.title}
          </h3>

          <p className="line-clamp-2 overflow-hidden break-words text-[11px] leading-snug text-white/80">
            {overview || "Resume playback from where you left off."}
          </p>

          <span className="inline-flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-primary">
            <Play className="h-3 w-3 fill-primary" />
            <span>Resume</span>
          </span>
        </div>
      </div>

      {/* Bottom progress indicator bar */}
      {progress > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/15">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
