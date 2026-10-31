"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play, CheckCircle2 } from "lucide-react";
import { useWatchlistStore, useWatchHistoryStore } from "@/stores";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDetails, getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { isReleasedWithinLast30Days } from "@/lib/media-types";

interface AnimeCardProps {
  anime: AniListMedia;
  fullWidth?: boolean;
}

export function AnimeCard({ anime, fullWidth = false }: AnimeCardProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [synopsis, setSynopsis] = useState(anime.description?.trim() || "");
  const [resolvedBanner, setResolvedBanner] = useState<string | null>(
    anime.bannerImage ?? null
  );

  const name = getAnimeDisplayTitle(anime);
  const posterFallback = getAnimePoster(anime);
  const imagePath =
    resolvedBanner ||
    anime.bannerImage ||
    posterFallback ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900";

  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const year = anime.seasonYear
    ? String(anime.seasonYear)
    : anime.startDate?.year
    ? String(anime.startDate.year)
    : "N/A";
  const isRecentRelease = isReleasedWithinLast30Days(null, anime.startDate);
  const isInWatchlist = hasItem("anime", anime.id);
  const watchedCompleted = isCompleted("anime", anime.id);

  useEffect(() => {
    setSynopsis(anime.description?.trim() || "");
    setResolvedBanner(anime.bannerImage ?? null);
  }, [anime.id, anime.description, anime.bannerImage]);

  useEffect(() => {
    if (!isHovered || (synopsis && resolvedBanner)) return;
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await getAnimeDetails(anime.id);
        if (cancelled || !data) return;
        if (!synopsis && data.description) {
          setSynopsis(data.description);
        }
        if (!resolvedBanner && data.bannerImage) {
          setResolvedBanner(data.bannerImage);
        }
      } catch (err) {
        console.error("Failed to load anime synopsis", err);
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [isHovered, synopsis, resolvedBanner, anime.id]);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isInWatchlist) {
      removeItem("anime", anime.id);
    } else {
      const relDate = anime.startDate?.year
        ? `${anime.startDate.year}-${String(anime.startDate.month || 1).padStart(2, "0")}-${String(anime.startDate.day || 1).padStart(2, "0")}`
        : anime.seasonYear
        ? `${anime.seasonYear}-01-01`
        : null;
      addItem({
        media_type: "anime",
        anilistId: anime.id,
        title: name,
        genres: anime.genres || null,
        poster_path: posterFallback,
        backdrop_path: resolvedBanner || anime.bannerImage || null,
        vote_average: anime.averageScore ? anime.averageScore / 10 : undefined,
        release_date: relDate,
      });
    }
  };

  const handleHistoryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void toggleCompleted({
      media_type: "anime",
      anilistId: anime.id,
      season: 1,
      episode: 1,
      title: name,
      overview: synopsis || anime.description || null,
      vote_average: anime.averageScore ? anime.averageScore / 10 : null,
      poster_path: posterFallback,
      backdrop_path: resolvedBanner || anime.bannerImage || null,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (
      e.key === "Enter" ||
      e.key === " " ||
      e.key === "Select" ||
      e.keyCode === 23
    ) {
      e.preventDefault();
      router.push(`/anime/${anime.id}`);
    }
  };

  const widthClasses = fullWidth
    ? "w-full"
    : "w-[228px] xs:w-[244px] sm:w-[276px] md:w-[308px] lg:w-[328px] flex-shrink-0";

  return (
    <div
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      aria-label={`${name} (${year})`}
      onClick={() => router.push(`/anime/${anime.id}`)}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`poster-card group/card relative aspect-video ${widthClasses} cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface select-none transition-[transform,border-color,box-shadow] duration-200 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:border-primary focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:border-primary`}
    >
      {imageLoading && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={imagePath}
        alt={name}
        decoding="async"
        draggable={false}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover/card:scale-105 group-focus-within/card:scale-105 ${
          imageLoading ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        loading="lazy"
      />

      {/* Corner 'New' badge in resting state for releases within the last 30 days */}
      {isRecentRelease && (
        <div
          data-testid="recent-release-tag"
          title="Released within the last 30 days"
          className="pointer-events-none absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-md border border-emerald-400/45 bg-black/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 shadow-sm backdrop-blur-md transition-opacity duration-250 group-hover/card:opacity-0 group-focus-within/card:opacity-0"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>New</span>
        </div>
      )}

      {/* Minimal resting state overlay with Quick Add button */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-10 sm:px-3.5 sm:pb-3.5 transition-opacity duration-250 group-hover/card:opacity-0 group-focus-within/card:opacity-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-white/70 tabular-nums">
            <span>{year}</span>
            <span>·</span>
            <span className="uppercase text-primary font-semibold">Anime</span>
            {anime.episodes ? (
              <>
                <span>·</span>
                <span>{anime.episodes} EP</span>
              </>
            ) : null}
            {watchedCompleted && (
              <>
                <span>·</span>
                <span className="text-emerald-400 font-semibold uppercase">Watched</span>
              </>
            )}
          </div>
          <h3 className="mt-0.5 line-clamp-1 font-display text-xs sm:text-sm font-bold tracking-tight text-white">
            {name}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleWatchlistToggle}
          onKeyDown={(e) => e.stopPropagation()}
          data-testid="resting-quick-add-btn"
          aria-pressed={isInWatchlist}
          aria-label={isInWatchlist ? "Remove from Watchlist" : "Quick Add to Watchlist"}
          title={isInWatchlist ? "In Watchlist (Click to remove)" : "Quick Add to Watchlist"}
          className={`pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
            isInWatchlist
              ? "border-primary bg-primary text-primary-contrast shadow-sm"
              : "border-white/25 bg-black/75 text-white/95 hover:border-primary hover:bg-primary hover:text-primary-contrast"
          }`}
        >
          {isInWatchlist ? (
            <>
              <Check className="h-3 w-3 shrink-0" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 shrink-0" />
              <span>Quick Add</span>
            </>
          )}
        </button>
      </div>

      {/* Hover & TV D-Pad Focus overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/70 to-black/30 p-3.5 opacity-0 transition-opacity duration-250 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-md tabular-nums">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>{rating}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={handleHistoryToggle}
              className={`rounded-lg border p-1.5 backdrop-blur-md transition-colors ${
                watchedCompleted
                  ? "border-emerald-500/60 bg-emerald-500/25 text-emerald-300"
                  : "border-white/20 bg-black/70 text-white/90 hover:border-primary hover:bg-primary hover:text-primary-contrast"
              }`}
              title={
                watchedCompleted
                  ? "Completed in Watch History"
                  : "Mark as Watched (Add to History)"
              }
              aria-label={
                watchedCompleted ? "Completed in Watch History" : "Mark as Watched"
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={handleWatchlistToggle}
              className={`rounded-lg border p-1.5 backdrop-blur-md transition-colors ${
                isInWatchlist
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-white/20 bg-black/70 text-white/90 hover:border-primary hover:bg-primary hover:text-primary-contrast"
              }`}
              title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              aria-label={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              {isInWatchlist ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/70 tabular-nums">
            {isRecentRelease && (
              <>
                <span className="font-bold uppercase tracking-wider text-emerald-400">
                  New
                </span>
                <span>·</span>
              </>
            )}
            <span>{year}</span>
            <span>·</span>
            <span className="uppercase text-primary font-semibold">Anime</span>
            {anime.episodes ? (
              <>
                <span>·</span>
                <span>{anime.episodes} EP</span>
              </>
            ) : null}
          </div>

          <h3 className="line-clamp-1 font-display text-sm font-bold tracking-tight text-white">
            {name}
          </h3>

          <p className="line-clamp-2 overflow-hidden break-words text-[11px] leading-snug text-white/80">
            {synopsis || "Synopsis unavailable."}
          </p>

          <span className="inline-flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-primary">
            <Play className="h-3 w-3 fill-primary" />
            <span>Details & Watch</span>
          </span>
        </div>
      </div>
    </div>
  );
}
