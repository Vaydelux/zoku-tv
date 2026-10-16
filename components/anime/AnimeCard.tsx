"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play } from "lucide-react";
import { useWatchlistStore } from "@/stores";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDetails, getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";

interface AnimeCardProps {
  anime: AniListMedia;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [synopsis, setSynopsis] = useState(anime.description?.trim() || "");

  const name = getAnimeDisplayTitle(anime);
  const posterPath = getAnimePoster(anime) || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const year = anime.seasonYear ? String(anime.seasonYear) : "N/A";
  const isInWatchlist = hasItem("anime", anime.id);

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

  return (
    <div
      onClick={() => router.push(`/anime/${anime.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group/card relative flex-shrink-0 w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface overflow-hidden cursor-pointer shadow-md border border-border-custom hover:border-primary hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 select-none"
    >
      {imageLoading && (
        <div className="absolute inset-0 bg-neutral-900/90 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      <img
        src={posterPath}
        alt={name}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 ${
          imageLoading ? "opacity-0 scale-95 blur-md" : "opacity-100 scale-100 blur-0"
        }`}
        loading="lazy"
      />

      {/* Always-visible title */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3.5 pt-10">
        <div className="flex items-center gap-2 text-[9px] font-mono text-white/60">
          <span>{year}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="uppercase">anime</span>
        </div>
        <h3 className="mt-0.5 line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
          {name}
        </h3>
      </div>

      {/* Hover: actions + synopsis */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black via-black/88 to-black/40 p-3.5 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-between items-start">
          <span className="bg-black/70 backdrop-blur-md text-[9px] font-mono px-2 py-0.5 rounded border border-border-custom text-white flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
            <span>{rating}</span>
          </span>

          <button
            onClick={handleWatchlistToggle}
            className={`p-1.5 rounded-full border transition-colors pointer-events-auto ${
              isInWatchlist
                ? "bg-primary border-primary text-white"
                : "bg-black/60 border-border-custom hover:bg-primary hover:border-primary text-white"
            }`}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {isInWatchlist ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </button>
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-mono text-white/60">
            <span>{year}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="uppercase">anime</span>
          </div>

          <h3 className="font-semibold text-xs text-white line-clamp-2 leading-tight break-words">
            {name}
          </h3>

          <p className="text-[10px] leading-snug text-white/80 break-words whitespace-normal hyphens-auto line-clamp-5 overflow-hidden">
            {synopsis || "Synopsis unavailable."}
          </p>

          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold">
              <Play className="h-2.5 w-2.5 fill-primary" />
              <span>Details & Watch</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
