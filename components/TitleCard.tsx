"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play, CheckCircle2 } from "lucide-react";
import { useWatchlistStore, useWatchHistoryStore } from "@/stores";
import { getTitleDetails, TMDBTitle } from "@/lib/tmdb";

interface TitleCardProps {
  title: TMDBTitle;
  mediaType?: "movie" | "tv";
  fullWidth?: boolean;
}

export function TitleCard({ title, mediaType, fullWidth = false }: TitleCardProps) {
  const router = useRouter();
  const actualMediaType = mediaType || title.media_type || "movie";
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [synopsis, setSynopsis] = useState(title.overview?.trim() || "");
  const [resolvedBackdrop, setResolvedBackdrop] = useState<string | null>(
    title.backdrop_path ?? null
  );

  const name = title.title || title.name || "Untitled Masterpiece";
  const rawImagePath = resolvedBackdrop || title.backdrop_path || title.poster_path;
  const imagePath = rawImagePath
    ? rawImagePath.startsWith("http")
      ? rawImagePath
      : `https://image.tmdb.org/t/p/w780${rawImagePath}`
    : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900";

  const rating = title.vote_average ? title.vote_average.toFixed(1) : "N/A";
  const releaseYear =
    (title.release_date || title.first_air_date || "").split("-")[0] || "N/A";

  const isInWatchlist = hasItem(actualMediaType, title.id);
  const watchedCompleted = isCompleted(actualMediaType, title.id);

  useEffect(() => {
    setSynopsis(title.overview?.trim() || "");
    setResolvedBackdrop(title.backdrop_path ?? null);
  }, [title.id, title.overview, title.backdrop_path]);

  useEffect(() => {
    if (!isHovered || (synopsis && resolvedBackdrop)) return;
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await getTitleDetails(actualMediaType, title.id);
        if (cancelled || !data) return;
        if (!synopsis && data.overview) {
          setSynopsis(data.overview);
        }
        if (!resolvedBackdrop && data.backdrop_path) {
          setResolvedBackdrop(data.backdrop_path);
        }
      } catch (err) {
        console.error("Failed to load title synopsis", err);
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [isHovered, synopsis, resolvedBackdrop, actualMediaType, title.id]);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchlist) {
      removeItem(actualMediaType, title.id);
    } else {
      addItem({
        media_type: actualMediaType,
        tmdbId: title.id,
        title: name,
        genres: title.genres?.map((g) => g.name) || null,
        poster_path: title.poster_path,
        backdrop_path: resolvedBackdrop || title.backdrop_path,
        vote_average: title.vote_average,
        release_date: title.release_date || title.first_air_date || null,
      });
    }
  };

  const handleHistoryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleCompleted({
      media_type: actualMediaType,
      tmdbId: title.id,
      season: actualMediaType === "tv" ? 1 : null,
      episode: actualMediaType === "tv" ? 1 : null,
      title: name,
      overview: synopsis || title.overview || null,
      vote_average: title.vote_average ?? null,
      poster_path: title.poster_path ?? null,
      backdrop_path: resolvedBackdrop || title.backdrop_path || null,
    });
  };

  const handleClick = () => {
    router.push(`/title/${actualMediaType}/${title.id}`);
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
      handleClick();
    }
  };

  const widthClasses = fullWidth
    ? "w-full"
    : "w-[240px] sm:w-[276px] md:w-[308px] lg:w-[328px] flex-shrink-0";

  return (
    <div
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      aria-label={`${name} (${releaseYear})`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`poster-card group/card relative aspect-video ${widthClasses} cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface select-none transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:border-primary`}
    >
      {imageLoading && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={imagePath}
        alt={name}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 group-focus-within/card:scale-105 ${
          imageLoading ? "scale-95 opacity-0 blur-md" : "scale-100 opacity-100 blur-0"
        }`}
        loading="lazy"
      />

      {/* Minimal resting state */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3.5 pb-3.5 pt-10 transition-opacity duration-250 group-hover/card:opacity-0 group-focus-within/card:opacity-0">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/70 tabular-nums">
          <span>{releaseYear}</span>
          <span>·</span>
          <span className="uppercase text-primary font-semibold">{actualMediaType}</span>
          {watchedCompleted && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-semibold uppercase">Watched</span>
            </>
          )}
        </div>
        <h3 className="mt-0.5 line-clamp-1 font-display text-sm font-bold tracking-tight text-white">
          {name}
        </h3>
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
            <span>{releaseYear}</span>
            <span>·</span>
            <span className="uppercase text-primary font-semibold">{actualMediaType}</span>
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
