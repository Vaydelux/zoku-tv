"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play } from "lucide-react";
import { useWatchlistStore } from "@/stores";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";

interface AnimeCardProps {
  anime: AniListMedia;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const name = getAnimeDisplayTitle(anime);
  const posterPath = getAnimePoster(anime) || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const year = anime.seasonYear ? String(anime.seasonYear) : "N/A";
  const isInWatchlist = hasItem("anime", anime.id);

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
      className="group relative flex-shrink-0 w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface overflow-hidden cursor-pointer shadow-md border border-border-custom hover:border-primary hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 select-none"
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
        className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
          imageLoading ? "opacity-0 scale-95 blur-md" : "opacity-100 scale-100 blur-0"
        }`}
        loading="lazy"
      />

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/30 flex flex-col justify-between p-3.5 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex justify-between items-start">
          <span className="bg-black/70 backdrop-blur-md text-[9px] font-mono px-2 py-0.5 rounded border border-border-custom text-on-surface flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
            <span>{rating}</span>
          </span>

          <button
            onClick={handleWatchlistToggle}
            className={`p-1.5 rounded-full border transition-colors ${
              isInWatchlist
                ? "bg-primary border-primary text-white"
                : "bg-black/60 border-border-custom hover:bg-primary hover:border-primary text-on-surface"
            }`}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {isInWatchlist ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] font-mono text-on-surface-variant">
            <span>{year}</span>
            <span className="h-1 w-1 rounded-full bg-border-custom" />
            <span className="uppercase">anime</span>
          </div>

          <h3 className="font-semibold text-xs text-on-surface line-clamp-2 leading-tight">{name}</h3>

          <div className="pt-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline">
              <Play className="h-2.5 w-2.5 fill-primary" />
              <span>Details & Watch</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
