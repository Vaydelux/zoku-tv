"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useWatchlistStore,
  useWatchHistoryStore,
  useQuickTrailerStore,
  useQuickInspectorStore,
} from "@/stores";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { isReleasedWithinLast30Days } from "@/lib/media-types";
import { useCardPlayProgress } from "@/lib/card-play-progress";
import { CinematicMediaCard } from "@/components/CinematicMediaCard";

interface AnimeCardProps {
  anime: AniListMedia;
  fullWidth?: boolean;
}

export function AnimeCard({ anime, fullWidth = false }: AnimeCardProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const playProgress = useCardPlayProgress("anime", anime.id);
  const prefetchedRef = useRef(false);

  const name = getAnimeDisplayTitle(anime);
  const posterFallback = getAnimePoster(anime);
  const artwork = posterFallback || anime.bannerImage || null;

  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const year = anime.seasonYear
    ? String(anime.seasonYear)
    : anime.startDate?.year
    ? String(anime.startDate.year)
    : "N/A";
  const isRecentRelease = isReleasedWithinLast30Days(null, anime.startDate);
  const isInWatchlist = hasItem("anime", anime.id);
  const watchedCompleted = isCompleted("anime", anime.id);

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      void removeItem("anime", anime.id);
    } else {
      const relDate = anime.startDate?.year
        ? `${anime.startDate.year}-${String(anime.startDate.month || 1).padStart(2, "0")}-${String(anime.startDate.day || 1).padStart(2, "0")}`
        : anime.seasonYear
        ? `${anime.seasonYear}-01-01`
        : null;
      void addItem({
        media_type: "anime",
        anilistId: anime.id,
        title: name,
        genres: anime.genres || null,
        poster_path: posterFallback,
        backdrop_path: anime.bannerImage || null,
        vote_average: anime.averageScore ? anime.averageScore / 10 : undefined,
        release_date: relDate,
      });
    }
  };

  const handleHistoryToggle = () => {
    void toggleCompleted({
      media_type: "anime",
      anilistId: anime.id,
      season: 1,
      episode: 1,
      title: name,
      overview: anime.description || null,
      vote_average: anime.averageScore ? anime.averageScore / 10 : null,
      poster_path: posterFallback,
      backdrop_path: anime.bannerImage || null,
    });
  };

  return (
    <CinematicMediaCard
      title={name}
      imageUrl={artwork}
      year={year}
      mediaLabel="Anime"
      rating={rating}
      overview={anime.description?.replace(/<[^>]+>/g, " ").trim() || ""}
      recent={isRecentRelease}
      episodes={anime.episodes}
      watched={watchedCompleted}
      saved={isInWatchlist}
      progressPercent={playProgress.hasProgress ? playProgress.progressPercent : null}
      fullWidth={fullWidth}
      onOpen={() => router.push(`/anime/${anime.id}`)}
      onPlay={
        anime.episodes && anime.episodes > 0
          ? () => router.push(`/watch/anime/${anime.id}/1/1`)
          : undefined
      }
      onQuickTrailer={() => {
        void useQuickTrailerStore.getState().openAnimeTrailer(anime.id, name);
      }}
      onQuickInspect={() => {
        useQuickInspectorStore.getState().openInspector({
          mediaType: "anime",
          id: anime.id,
          title: name,
          posterUrl: posterFallback,
          backdropUrl: anime.bannerImage || posterFallback,
          year,
          rating,
          overview: anime.description?.replace(/<[^>]+>/g, " ").trim() || "",
          episodes: anime.episodes,
        });
      }}
      onPrefetch={() => {
        if (prefetchedRef.current) return;
        prefetchedRef.current = true;
        router.prefetch(`/anime/${anime.id}`);
      }}
      onToggleWatchlist={handleWatchlistToggle}
      onToggleWatched={handleHistoryToggle}
    />
  );
}
