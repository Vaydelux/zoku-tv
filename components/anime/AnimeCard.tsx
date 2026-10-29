"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play, CheckCircle2 } from "lucide-react";
import { useWatchlistStore, useWatchHistoryStore } from "@/stores";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDetails, getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";

interface AnimeCardProps {
  anime: AniListMedia;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [synopsis, setSynopsis] = useState(anime.description?.trim() || "");

  const name = getAnimeDisplayTitle(anime);
  const posterPath = getAnimePoster(anime) || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const year = anime.seasonYear ? String(anime.seasonYear) : "N/A";
  const isInWatchlist = hasItem("anime", anime.id);
  const watchedCompleted = isCompleted("anime", anime.id);

  useEffect(() => {
    setSynopsis(anime.description?.trim() || "");
  }, [anime.id, anime.description]);

  useEffect(() => {
    if (!isHovered || synopsis) return;
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await getAnimeDetails(anime.id);
        if (!cancelled && data?.description) {
          setSynopsis(data.description);
        }
      } catch (err) {
        console.error("Failed to load anime synopsis", err);
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [isHovered, synopsis, anime.id]);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchlist) {
      removeItem("anime", anime.id);
    } else {
      addItem({
        media_type: "anime",
        anilistId: anime.id,
        title: name,
        poster_path: getAnimePoster(anime),
        backdrop_path: anime.bannerImage ?? null,
        vote_average: anime.averageScore ? anime.averageScore / 10 : undefined,
      });
    }
  };

  const handleHistoryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleCompleted({
      media_type: "anime",
      anilistId: anime.id,
      season: 1,
      episode: 1,
      title: name,
      overview: synopsis || anime.description || null,
      vote_average: anime.averageScore ? anime.averageScore / 10 : null,
      poster_path: getAnimePoster(anime),
      backdrop_path: anime.bannerImage ?? null,
    });
  };

  return (
    <div
      onClick={() => router.push(`/anime/${anime.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="poster-card group/card relative aspect-[2/3] w-[128px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface transition-all duration-300 select-none hover:-translate-y-1.5 hover:scale-[1.03] hover:border-primary sm:w-[160px] md:w-[180px] lg:w-[200px]"
    >
      {imageLoading && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={posterPath}
        alt={name}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 ${
          imageLoading ? "scale-95 opacity-0 blur-md" : "scale-100 opacity-100 blur-0"
        }`}
        loading="lazy"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3.5 pt-10 transition-opacity duration-250 group-hover/card:opacity-0">
        <div className="flex items-center gap-2 font-mono text-[9px] text-white/60">
          <span>{year}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="uppercase">anime</span>
        </div>
        <h3 className="mt-0.5 line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
          {name}
        </h3>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/55 to-black/25 p-3.5 opacity-0 transition-opacity duration-250 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1 rounded border border-white/15 bg-black/70 px-2 py-0.5 font-mono text-[9px] text-white backdrop-blur-md">
            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
            <span>{rating}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleHistoryToggle}
              className={`rounded-full border p-1.5 transition-colors ${
                watchedCompleted
                  ? "border-emerald-500 bg-emerald-500/25 text-emerald-300"
                  : "border-white/20 bg-black/60 text-white hover:border-primary hover:bg-primary"
              }`}
              title={watchedCompleted ? "Completed in Watch History" : "Mark as Watched (Add to History)"}
              aria-label={watchedCompleted ? "Completed in Watch History" : "Mark as Watched"}
            >
              <CheckCircle2 className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={handleWatchlistToggle}
              className={`rounded-full border p-1.5 transition-colors ${
                isInWatchlist
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-white/20 bg-black/60 text-white hover:border-primary hover:bg-primary"
              }`}
              title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              {isInWatchlist ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-[9px] text-white/60">
            <span>{year}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="uppercase">anime</span>
          </div>

          <h3 className="line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
            {name}
          </h3>

          <p className="line-clamp-4 overflow-hidden break-words text-[10px] leading-snug text-white/85 hyphens-auto whitespace-normal">
            {synopsis || "Synopsis unavailable."}
          </p>

          <span className="inline-flex items-center gap-1 pt-0.5 text-[10px] font-semibold text-primary">
            <Play className="h-2.5 w-2.5 fill-primary" />
            Details & Watch
          </span>
        </div>
      </div>
    </div>
  );
}
