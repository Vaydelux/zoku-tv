"use client";

import { useCallback, useEffect, useState } from "react";
import { useContinueWatchingStore } from "@/stores";
import { EMBED_SERVER_CATALOG, getEmbedUrl } from "@/lib/embed";
import { RESUME_THRESHOLD_PERCENT } from "@/lib/continue-watching";
import { usePlayerProgressListener } from "@/lib/player-progress";

type WatchProgressInput = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  selectedServerId: string;
  ready: boolean;
};

export function useWatchProgress({
  tmdbId,
  mediaType,
  season,
  episode,
  title,
  poster_path,
  backdrop_path,
  selectedServerId,
  ready,
}: WatchProgressInput) {
  const [urlStartAt, setUrlStartAt] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUrlStartAt(Number.parseInt(params.get("t") || "0", 10) || 0);
  }, []);

  const { getEntry, recordWatching, recordProgress } = useContinueWatchingStore();

  const savedEntry = getEntry(mediaType, tmdbId);
  const sameEpisode =
    mediaType === "movie" ||
    (savedEntry?.season === season && savedEntry?.episode === episode);

  const savedProgress = sameEpisode ? savedEntry : null;
  const canResume =
    urlStartAt === 0 &&
    savedProgress?.progress_percent != null &&
    savedProgress.progress_percent > RESUME_THRESHOLD_PERCENT &&
    savedProgress.progress_percent < 95;

  const [startAtSec, setStartAtSec] = useState<number | undefined>(
    urlStartAt > 0 ? urlStartAt : undefined
  );
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(urlStartAt > 0);

  useEffect(() => {
    if (canResume && !playbackStarted) {
      setShowResumePrompt(true);
    }
  }, [canResume, playbackStarted]);

  useEffect(() => {
    if (!ready || !title) return;
    recordWatching({
      tmdbId,
      media_type: mediaType,
      season,
      episode,
      title,
      poster_path,
      backdrop_path,
    });
  }, [ready, tmdbId, mediaType, season, episode, title, poster_path, backdrop_path, recordWatching]);

  const handleResume = useCallback(() => {
    setStartAtSec(savedProgress?.current_time_sec ?? undefined);
    setShowResumePrompt(false);
    setPlaybackStarted(true);
  }, [savedProgress?.current_time_sec]);

  const handleStartOver = useCallback(() => {
    setStartAtSec(undefined);
    setShowResumePrompt(false);
    setPlaybackStarted(true);
  }, []);

  const handleProgress = useCallback(
    (progressPercent: number, currentTimeSec: number, durationSec?: number) => {
      recordProgress({
        tmdbId,
        media_type: mediaType,
        season,
        episode,
        title,
        poster_path,
        backdrop_path,
        progress_percent: progressPercent,
        current_time_sec: currentTimeSec,
        duration_sec: durationSec,
      });
    },
    [tmdbId, mediaType, season, episode, title, poster_path, backdrop_path, recordProgress]
  );

  const selectedServer = EMBED_SERVER_CATALOG.find((s) => s.id === selectedServerId) || EMBED_SERVER_CATALOG[0];
  const embedUrl = ready
    ? getEmbedUrl(selectedServer, mediaType, tmdbId, season, episode, { startAtSec })
    : "";

  usePlayerProgressListener({
    serverId: selectedServerId,
    domains: selectedServer?.domains ?? [],
    embedUrl,
    enabled: ready && playbackStarted && !showResumePrompt,
    onProgress: handleProgress,
  });

  return {
    showResumePrompt,
    savedProgress,
    startAtSec,
    handleResume,
    handleStartOver,
  };
}
