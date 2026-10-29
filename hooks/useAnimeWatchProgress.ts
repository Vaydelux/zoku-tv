"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useContinueWatchingStore,
  useEpisodeProgressStore,
  useWatchHistoryStore,
} from "@/stores";
import { usePlayerProgressListener } from "@/lib/player-progress";
import { RECORD_DEBOUNCE_MS } from "@/lib/continue-watching";

interface UseAnimeWatchProgressOptions {
  anilistId: number;
  season: number;
  episode: number;
  title: string;
  overview?: string | null;
  poster?: string | null;
  voteAverage?: number | null;
  selectedServerId: string;
  serverDomains: string[];
  embedUrl?: string;
  ready: boolean;
}

export function useAnimeWatchProgress({
  anilistId,
  season,
  episode,
  title,
  overview,
  poster,
  voteAverage,
  selectedServerId,
  serverDomains,
  embedUrl,
  ready,
}: UseAnimeWatchProgressOptions) {
  const { getProgress, recordEpisodeProgress } = useEpisodeProgressStore();
  const { recordWatching, recordProgress: recordCwProgress } = useContinueWatchingStore();
  const { recordHistory } = useWatchHistoryStore();

  const savedRecord = getProgress("anime", anilistId, season, episode);
  const [currentProgress, setCurrentProgress] = useState(
    savedRecord ? savedRecord.progress_percent : 0
  );
  const [currentTimeSec, setCurrentTimeSec] = useState(
    savedRecord ? savedRecord.current_time_sec : 0
  );
  const [isCompleted, setIsCompleted] = useState(Boolean(savedRecord?.completed));

  // Sync state if record updates from database / listener
  useEffect(() => {
    if (savedRecord) {
      setCurrentProgress(savedRecord.progress_percent);
      setCurrentTimeSec(savedRecord.current_time_sec);
      setIsCompleted(savedRecord.completed);
    }
  }, [savedRecord?.progress_percent, savedRecord?.current_time_sec, savedRecord?.completed]);

  // Initial session record in Continue Watching
  useEffect(() => {
    if (!ready || !title || !anilistId) return;

    const timer = setTimeout(() => {
      recordWatching({
        media_type: "anime",
        anilistId,
        season,
        episode,
        title,
        overview,
        vote_average: voteAverage,
        poster_path: poster,
      });
    }, RECORD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [ready, title, anilistId, season, episode, overview, voteAverage, poster, recordWatching]);

  const handleProgress = useCallback(
    (progressPercent: number, timeSec: number, durationSec?: number) => {
      if (!anilistId || !title) return;

      const boundedPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
      const completed = boundedPercent >= 90;

      setCurrentProgress(boundedPercent);
      setCurrentTimeSec(timeSec);
      setIsCompleted(completed);

      // 1. Persist directly in EpisodeProgress (Firestore & localStorage)
      void recordEpisodeProgress({
        media_type: "anime",
        anilistId,
        season,
        episode,
        progress_percent: boundedPercent,
        current_time_sec: timeSec,
        duration_sec: durationSec,
        completed,
      });

      // 2. Synchronize Continue Watching
      void recordCwProgress({
        media_type: "anime",
        anilistId,
        season,
        episode,
        title,
        overview,
        vote_average: voteAverage,
        poster_path: poster,
        progress_percent: boundedPercent,
        current_time_sec: timeSec,
        duration_sec: durationSec,
      });

      // 3. If finished or substantial progress, record in Watch History
      if (completed || boundedPercent >= 30) {
        void recordHistory({
          media_type: "anime",
          anilistId,
          season,
          episode,
          title,
          overview,
          vote_average: voteAverage,
          poster_path: poster,
          progress_percent: boundedPercent,
          current_time_sec: timeSec,
          duration_sec: durationSec,
          completed,
        });
      }
    },
    [
      anilistId,
      season,
      episode,
      title,
      overview,
      voteAverage,
      poster,
      recordEpisodeProgress,
      recordCwProgress,
      recordHistory,
    ]
  );

  // Listen to postMessage from capable embed player iframes
  usePlayerProgressListener({
    serverId: selectedServerId,
    domains: serverDomains,
    embedUrl,
    enabled: ready,
    onProgress: handleProgress,
  });

  const markCompleted = useCallback(() => {
    handleProgress(100, 0, 1440);
  }, [handleProgress]);

  const resetProgress = useCallback(() => {
    handleProgress(0, 0, 1440);
  }, [handleProgress]);

  return {
    progressPercent: currentProgress,
    currentTimeSec,
    isCompleted,
    savedRecord,
    handleProgress,
    markCompleted,
    resetProgress,
  };
}
