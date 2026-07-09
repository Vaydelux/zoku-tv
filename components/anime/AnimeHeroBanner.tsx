"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";

interface AnimeHeroBannerProps {
  slides: AniListMedia[];
  loading?: boolean;
}

export function AnimeHeroBanner({ slides, loading = false }: AnimeHeroBannerProps) {
  const router = useRouter();
  const current = slides[0];

  if (loading) {
    return <div className="h-[45vh] min-h-[300px] bg-surface animate-pulse" />;
  }

  if (!current) return null;

  const title = getAnimeDisplayTitle(current);
  const banner = current.bannerImage || getAnimePoster(current);

  return (
    <div
      className="relative h-[45vh] min-h-[300px] bg-cover bg-center"
      style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="max-w-xl space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Featured Anime</p>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant line-clamp-3">{current.description}</p>
          <button
            onClick={() => router.push(`/anime/${current.id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            <Play className="h-4 w-4 fill-white" />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
