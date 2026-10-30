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
      className="relative min-h-[clamp(280px,45dvh,540px)] overflow-hidden bg-background bg-cover bg-center"
      style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
    >
      <div className="hero-media-scrim" aria-hidden />
      <div className="relative z-10 mx-auto flex h-full min-h-[clamp(280px,45dvh,540px)] w-full items-end px-4 pb-10 pt-14 sm:items-center sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
        <div className="hero-copy max-w-xl space-y-2.5 sm:space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Featured Anime</p>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold text-on-surface leading-tight line-clamp-2">
            {title}
          </h2>
          <p className="hero-overview text-xs sm:text-sm text-on-surface-variant line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {current.description}
          </p>
          <div className="pt-1">
            <button
              onClick={() => router.push(`/anime/${current.id}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-primary-contrast active:scale-95 transition-all"
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current shrink-0" />
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
