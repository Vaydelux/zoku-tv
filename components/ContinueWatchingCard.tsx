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

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = getContinueWatchingItemId(item);
    if (!id) return;
    void removeItem(item.media_type, id);
  };

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
      className="poster-card group/card relative aspect-[2/3] w-[128px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-custom bg-surface transition-all duration-300 select-none hover:-translate-y-1.5 hover:scale-[1.03] hover:border-primary sm:w-[160px] md:w-[180px] lg:w-[200px]"
    >
      {/* Quick Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${item.title} from Continue Watching`}
        title="Remove from Continue Watching"
        className="absolute right-2 top-2 z-30 flex h-6 w-6 items-center justify-center rounded-lg border border-white/15 bg-black/75 text-white/80 backdrop-blur-md transition-all hover:border-red-500/60 hover:bg-red-500/80 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {imageLoading && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900/90">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      <img
        src={posterPath}
        alt={item.title}
        onLoad={() => setImageLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 ${
          imageLoading ? "scale-95 opacity-0 blur-md" : "scale-100 opacity-100 blur-0"
        }`}
        loading="lazy"
      />

      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[15] h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3.5 pt-10 transition-opacity duration-250 group-hover/card:opacity-0">
        <span className="font-mono text-[9px] uppercase text-white/60">{episodeLabel}</span>
        <h3 className="mt-0.5 line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
          {item.title}
        </h3>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Play className="h-2.5 w-2.5 fill-primary" />
          Resume
        </span>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/55 to-black/25 p-3.5 opacity-0 transition-opacity duration-250 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
        <div className="flex justify-start pr-7">
          <span className="flex items-center gap-1 rounded border border-white/15 bg-black/70 px-2 py-0.5 font-mono text-[9px] text-white backdrop-blur-md">
            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
            <span>{ratingLabel}</span>
          </span>
        </div>

        <div className="min-w-0 space-y-1.5">
          <span className="font-mono text-[9px] uppercase text-white/60">{episodeLabel}</span>
          <h3 className="line-clamp-2 break-words text-xs font-semibold leading-tight text-white">
            {item.title}
          </h3>
          <p className="line-clamp-4 overflow-hidden break-words text-[10px] leading-snug text-white/85 hyphens-auto whitespace-normal">
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
