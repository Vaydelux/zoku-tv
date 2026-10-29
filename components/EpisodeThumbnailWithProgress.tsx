"use client";

import { useState } from "react";
import { CheckCircle2, Play } from "lucide-react";

interface EpisodeThumbnailWithProgressProps {
  thumbnail?: string | null;
  title: string;
  episodeNumber: number;
  progressPercent?: number;
  completed?: boolean;
  aspectRatio?: "video" | "wide";
  className?: string;
}

export function EpisodeThumbnailWithProgress({
  thumbnail,
  title,
  episodeNumber,
  progressPercent = 0,
  completed = false,
  aspectRatio = "wide",
  className = "",
}: EpisodeThumbnailWithProgressProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const fallback =
    "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=480";
  const imageSrc = thumbnail || fallback;

  const boundedProgress = completed
    ? 100
    : Math.max(0, Math.min(99, Math.round(progressPercent)));

  const aspectClass = aspectRatio === "video" ? "aspect-video" : "aspect-[16/10]";

  return (
    <div
      className={`group/thumb relative w-full ${aspectClass} overflow-hidden rounded-lg border border-border-custom bg-black select-none ${className}`}
    >
      <img
        src={imageSrc}
        alt={title}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
        className={`h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105 ${
          imageLoaded ? "opacity-100" : "opacity-40 animate-pulse"
        }`}
      />

      {/* Scrim overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Hover play icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/35 backdrop-blur-[1px]">
        <div className="rounded-full bg-primary/90 p-2 text-primary-contrast shadow-lg">
          <Play className="h-4 w-4 fill-current ml-0.5" />
        </div>
      </div>

      {/* Top badges: Completed or in-progress percent */}
      {completed ? (
        <span
          data-testid="episode-completed-badge"
          className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 backdrop-blur-md border border-emerald-500/30"
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          <span>Watched</span>
        </span>
      ) : boundedProgress > 5 ? (
        <span
          data-testid="episode-progress-badge"
          className="absolute right-1.5 top-1.5 z-10 inline-flex items-center rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary backdrop-blur-md border border-primary/30 tabular-nums"
        >
          {boundedProgress}%
        </span>
      ) : null}

      {/* Progress Bar directly on thumbnail bottom */}
      <div
        data-testid="episode-progress-track"
        className="absolute inset-x-0 bottom-0 z-20 h-1.5 w-full bg-black/60 backdrop-blur-sm"
      >
        {boundedProgress > 0 && (
          <div
            data-testid="episode-progress-fill"
            className={`h-full transition-all duration-300 ${
              completed ? "bg-emerald-400" : "bg-primary"
            }`}
            style={{ width: `${boundedProgress}%` }}
          />
        )}
      </div>
    </div>
  );
}
