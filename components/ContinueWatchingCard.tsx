"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { buildWatchUrl } from "@/lib/continue-watching";

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
}

export function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);

  const posterPath = item.poster_path?.startsWith("http")
    ? item.poster_path
    : item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";

  const progress = item.progress_percent ?? 0;
  const episodeLabel =
    item.media_type === "anime" && item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type === "tv" && item.season && item.episode
      ? `S${item.season} · E${item.episode}`
      : item.media_type.toUpperCase();

  return (
    <div
      onClick={() => router.push(buildWatchUrl(item))}
      className="group relative flex-shrink-0 w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface overflow-hidden cursor-pointer shadow-md border border-border-custom hover:border-primary hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 select-none"
    >
      {imageLoading && (
        <div className="absolute inset-0 bg-neutral-900/90 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      <img
        src={posterPath}
        alt={item.title}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
          imageLoading ? "opacity-0 scale-95 blur-md" : "opacity-100 scale-100 blur-0"
        }`}
        loading="lazy"
      />

      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
        <span className="text-[9px] font-mono text-white/60 uppercase">{episodeLabel}</span>
        <h3 className="font-semibold text-xs text-white line-clamp-2 leading-tight mt-0.5">
          {item.title}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-1.5">
          <Play className="h-2.5 w-2.5 fill-primary" />
          Resume
        </span>
      </div>
    </div>
  );
}
