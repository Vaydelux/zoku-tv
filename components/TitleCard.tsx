"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useWatchlistStore,
  useWatchHistoryStore,
  useQuickTrailerStore,
  useQuickInspectorStore,
} from "@/stores";
import { TMDBTitle } from "@/lib/tmdb";
import { isReleasedWithinLast30Days } from "@/lib/media-types";
import { useCardPlayProgress } from "@/lib/card-play-progress";
import { CinematicMediaCard } from "@/components/CinematicMediaCard";

interface TitleCardProps {
  title: TMDBTitle;
  mediaType?: "movie" | "tv";
  fullWidth?: boolean;
  prioritizeArtwork?: boolean;
}

export function TitleCard({ title, mediaType, fullWidth = false, prioritizeArtwork = false }: TitleCardProps) {
  const router = useRouter();
  const actualMediaType = mediaType || title.media_type || "movie";
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const playProgress = useCardPlayProgress(actualMediaType, title.id);
  const prefetchedRef = useRef(false);

  const name = title.title || title.name || "Untitled";
  const rating = title.vote_average ? title.vote_average.toFixed(1) : "N/A";
  const rawReleaseDate = title.release_date || title.first_air_date || null;
  const releaseYear = (rawReleaseDate || "").split("-")[0] || "N/A";
  const isRecentRelease = isReleasedWithinLast30Days(rawReleaseDate);

  const isInWatchlist = hasItem(actualMediaType, title.id);
  const watchedCompleted = isCompleted(actualMediaType, title.id);

  const artwork = title.poster_path || title.backdrop_path || null;
  const posterUrl = artwork
    ? artwork.startsWith("http") || artwork.startsWith("data:")
      ? artwork
      : `https://image.tmdb.org/t/p/w500${artwork}`
    : null;
  const backdropUrl = title.backdrop_path
    ? title.backdrop_path.startsWith("http") || title.backdrop_path.startsWith("data:")
      ? title.backdrop_path
      : `https://image.tmdb.org/t/p/w780${title.backdrop_path}`
    : posterUrl;

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      void removeItem(actualMediaType, title.id);
    } else {
      void addItem({
        media_type: actualMediaType,
        tmdbId: title.id,
        title: name,
        genres: title.genres?.map((g) => g.name) || null,
        poster_path: title.poster_path,
        backdrop_path: title.backdrop_path,
        vote_average: title.vote_average,
        release_date: rawReleaseDate,
      });
    }
  };

  const handleHistoryToggle = () => {
    void toggleCompleted({
      media_type: actualMediaType,
      tmdbId: title.id,
      season: actualMediaType === "tv" ? 1 : null,
      episode: actualMediaType === "tv" ? 1 : null,
      title: name,
      overview: title.overview || null,
      vote_average: title.vote_average ?? null,
      poster_path: title.poster_path ?? null,
      backdrop_path: title.backdrop_path ?? null,
    });
  };

  return (
    <CinematicMediaCard
      title={name}
      imageUrl={posterUrl}
      year={releaseYear}
      mediaLabel={actualMediaType === "tv" ? "TV" : "Movie"}
      rating={rating}
      overview={title.overview?.trim() || ""}
      recent={isRecentRelease}
      watched={watchedCompleted}
      saved={isInWatchlist}
      progressPercent={playProgress.hasProgress ? playProgress.progressPercent : null}
      fullWidth={fullWidth}
      prioritizeArtwork={prioritizeArtwork}
      onOpen={() => router.push(`/title/${actualMediaType}/${title.id}`)}
      onPlay={() => router.push(`/watch/${actualMediaType}/${title.id}`)}
      onQuickTrailer={() => {
        void useQuickTrailerStore.getState().openTmdbTrailer(actualMediaType, title.id, name);
      }}
      onQuickInspect={() => {
        useQuickInspectorStore.getState().openInspector({
          mediaType: actualMediaType,
          id: title.id,
          title: name,
          posterUrl,
          backdropUrl,
          year: releaseYear,
          rating,
          overview: title.overview?.trim() || "",
        });
      }}
      onPrefetch={() => {
        if (prefetchedRef.current) return;
        prefetchedRef.current = true;
        router.prefetch(`/title/${actualMediaType}/${title.id}`);
      }}
      onToggleWatchlist={handleWatchlistToggle}
      onToggleWatched={handleHistoryToggle}
    />
  );
}
