"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Star, Play } from "lucide-react";
import { useWatchlistStore } from "@/stores";
import { TMDBTitle } from "@/lib/tmdb";

interface TitleCardProps {
  title: TMDBTitle;
  mediaType?: "movie" | "tv";
}

export function TitleCard({ title, mediaType }: TitleCardProps) {
  const router = useRouter();
  const actualMediaType = mediaType || title.media_type || "movie";
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const name = title.title || title.name || "Untitled Masterpiece";
  const posterPath = title.poster_path 
    ? `https://image.tmdb.org/t/p/w500${title.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";
  
  const rating = title.vote_average ? title.vote_average.toFixed(1) : "N/A";
  const releaseYear = (title.release_date || title.first_air_date || "").split("-")[0] || "N/A";

  const isInWatchlist = hasItem(actualMediaType, title.id);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchlist) {
      removeItem(actualMediaType, title.id);
    } else {
      addItem({
        media_type: actualMediaType,
        tmdbId: title.id,
        title: name,
        poster_path: title.poster_path,
        backdrop_path: title.backdrop_path,
        vote_average: title.vote_average,
      });
    }
  };

  const handleClick = () => {
    // Navigate to title details page. 
    // The instructions mention /title/[type]/[id] as a modal/parallel route.
    // For general compatibility, navigating to /title/[type]/[id] will open the beautiful details page or modal!
    router.push(`/title/${actualMediaType}/${title.id}`);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex-shrink-0 w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface overflow-hidden cursor-pointer shadow-md border border-border-custom hover:border-primary hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 select-none"
    >
      {/* Skeleton / Blur Placeholder */}
      {imageLoading && (
        <div className="absolute inset-0 bg-neutral-900/90 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      {/* Poster Image */}
      <img
        src={posterPath}
        alt={name}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
          imageLoading ? "opacity-0 scale-95 blur-md" : "opacity-100 scale-100 blur-0"
        }`}
        loading="lazy"
      />

      {/* Hover Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/30 flex flex-col justify-between p-3.5 transition-opacity duration-300 ${
        isHovered ? "opacity-100" : "opacity-0"
      }`}>
        {/* Quick Top Actions */}
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

        {/* Info Area */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] font-mono text-on-surface-variant">
            <span>{releaseYear}</span>
            <span className="h-1 w-1 rounded-full bg-border-custom" />
            <span className="uppercase">{actualMediaType}</span>
          </div>

          <h3 className="font-semibold text-xs text-on-surface line-clamp-2 leading-tight">
            {name}
          </h3>

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
