"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Star } from "lucide-react";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { buildWatchUrl } from "@/lib/continue-watching";
import { getTitleDetails } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
}

export function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [overview, setOverview] = useState(item.overview?.trim() || "");
  const [rating, setRating] = useState<number | null>(
    typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average
      : null
  );

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

  const ratingLabel = rating != null ? rating.toFixed(1) : "N/A";

  useEffect(() => {
    setOverview(item.overview?.trim() || "");
    setRating(
      typeof item.vote_average === "number" && item.vote_average > 0
        ? item.vote_average
        : null
    );
  }, [item.overview, item.vote_average, item.tmdbId, item.anilistId, item.media_type]);

  useEffect(() => {
    if (!hovered || (overview && rating != null)) return;

    let cancelled = false;

    async function loadMeta() {
      try {
        if (item.media_type === "anime" && item.anilistId) {
          const data = await getAnimeDetails(item.anilistId);
          if (cancelled || !data) return;
          if (!overview && data.description) setOverview(data.description);
          if (rating == null && data.averageScore) {
            setRating(data.averageScore / 10);
          }
          return;
        }

        if ((item.media_type === "movie" || item.media_type === "tv") && item.tmdbId) {
          const data = await getTitleDetails(item.media_type, item.tmdbId);
          if (cancelled || !data) return;
          if (!overview && data.overview) setOverview(data.overview);
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
  }, [hovered, overview, rating, item.media_type, item.tmdbId, item.anilistId]);

  return (
    <div
      onClick={() => router.push(buildWatchUrl(item))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group/card relative flex-shrink-0 w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface overflow-hidden cursor-pointer shadow-md border border-border-custom hover:border-primary hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 select-none"
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
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 ${
          imageLoading ? "opacity-0 scale-95 blur-md" : "opacity-100 scale-100 blur-0"
        }`}
        loading="lazy"
      />

      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* Always-visible title shell */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3.5 pt-10">
        <span className="text-[9px] font-mono text-white/60 uppercase">{episodeLabel}</span>
        <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight text-white break-words">
          {item.title}
        </h3>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Play className="h-2.5 w-2.5 fill-primary" />
          Resume
        </span>
      </div>

      {/* Hover synopsis + rating */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black via-black/88 to-black/40 p-3.5 transition-opacity duration-300 ${
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-start">
          <span className="bg-black/70 backdrop-blur-md text-[9px] font-mono px-2 py-0.5 rounded border border-border-custom text-white flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
            <span>{ratingLabel}</span>
          </span>
        </div>

        <div className="min-w-0 space-y-1.5">
          <span className="text-[9px] font-mono uppercase text-white/60">{episodeLabel}</span>
          <h3 className="line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
            {item.title}
          </h3>
          <p className="max-h-[42%] overflow-hidden text-[10px] leading-snug text-white/80 break-words whitespace-normal hyphens-auto line-clamp-5">
            {overview || "Synopsis unavailable."}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Play className="h-2.5 w-2.5 fill-primary" />
            Resume
          </span>
        </div>
      </div>
    </div>
  );
}
