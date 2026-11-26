"use client";

import type { AniListMedia } from "@/lib/anilist";
import { CinematicAnimeHero } from "@/components/anime/CinematicAnimeHero";

interface AnimeHeroBannerProps {
  slides: AniListMedia[];
  loading?: boolean;
}

export function AnimeHeroBanner({ slides, loading = false }: AnimeHeroBannerProps) {
  return <CinematicAnimeHero slides={slides} loading={loading} />;
}
