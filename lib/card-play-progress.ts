"use client";

import { useMemo } from "react";
import type { MediaType } from "@/lib/media-types";
import { getContinueWatchingItemId, type ContinueWatchingItem } from "@/lib/continue-watching";
import { getWatchHistoryItemId, type WatchHistoryItem } from "@/lib/watch-history";
import { useContinueWatchingStore, useWatchHistoryStore } from "@/stores";

export interface CardPlayProgress {
  progressPercent: number;
  hasProgress: boolean;
  season?: number | null;
  episode?: number | null;
  currentTimeSec?: number | null;
  durationSec?: number | null;
  label?: string;
}

/**
 * Pure domain logic to resolve play progress from continue watching & watch history entries.
 * Completed titles (>= 95% or completed: true) do not show an active remaining progress bar.
 */
export function resolveItemPlayProgress(
  cwItem?: ContinueWatchingItem | null,
  historyItem?: WatchHistoryItem | null
): CardPlayProgress {
  // 1. Highest priority: active Continue Watching queue
  if (cwItem) {
    let percent = 0;
    if (typeof cwItem.progress_percent === "number" && cwItem.progress_percent > 0) {
      percent = Math.min(100, Math.max(0, Math.round(cwItem.progress_percent)));
    } else if (
      typeof cwItem.current_time_sec === "number" &&
      typeof cwItem.duration_sec === "number" &&
      cwItem.duration_sec > 0
    ) {
      percent = Math.min(
        100,
        Math.max(0, Math.round((cwItem.current_time_sec / cwItem.duration_sec) * 100))
      );
    }

    if (percent > 0 && percent < 95) {
      const episodeText =
        cwItem.season && cwItem.episode
          ? `S${cwItem.season}:E${cwItem.episode}`
          : undefined;
      return {
        progressPercent: percent,
        hasProgress: true,
        season: cwItem.season ?? null,
        episode: cwItem.episode ?? null,
        currentTimeSec: cwItem.current_time_sec ?? null,
        durationSec: cwItem.duration_sec ?? null,
        label: episodeText ? `${episodeText} · ${percent}% watched` : `${percent}% watched`,
      };
    }
  }

  // 2. Secondary fallback: Watch History entries that are partially watched and not completed
  if (historyItem && !historyItem.completed) {
    let percent = 0;
    if (typeof historyItem.progress_percent === "number" && historyItem.progress_percent > 0) {
      percent = Math.min(100, Math.max(0, Math.round(historyItem.progress_percent)));
    } else if (
      typeof historyItem.current_time_sec === "number" &&
      typeof historyItem.duration_sec === "number" &&
      historyItem.duration_sec > 0
    ) {
      percent = Math.min(
        100,
        Math.max(0, Math.round((historyItem.current_time_sec / historyItem.duration_sec) * 100))
      );
    }

    if (percent > 0 && percent < 95) {
      const episodeText =
        historyItem.season && historyItem.episode
          ? `S${historyItem.season}:E${historyItem.episode}`
          : undefined;
      return {
        progressPercent: percent,
        hasProgress: true,
        season: historyItem.season ?? null,
        episode: historyItem.episode ?? null,
        currentTimeSec: historyItem.current_time_sec ?? null,
        durationSec: historyItem.duration_sec ?? null,
        label: episodeText ? `${episodeText} · ${percent}% watched` : `${percent}% watched`,
      };
    }
  }

  return { progressPercent: 0, hasProgress: false };
}

/**
 * React hook to reactively subscribe to play progress for a specific card.
 */
export function useCardPlayProgress(
  mediaType: MediaType,
  id: number | string | undefined | null
): CardPlayProgress {
  const numericId = typeof id === "number" ? id : Number(id);

  const cwItem = useContinueWatchingStore((state) => {
    if (!numericId || isNaN(numericId)) return undefined;
    return state.items.find(
      (item) => item.media_type === mediaType && getContinueWatchingItemId(item) === numericId
    );
  });

  const historyItem = useWatchHistoryStore((state) => {
    if (!numericId || isNaN(numericId)) return undefined;
    return state.items.find(
      (item) => item.media_type === mediaType && getWatchHistoryItemId(item) === numericId
    );
  });

  return useMemo(() => {
    if (!numericId || isNaN(numericId)) {
      return { progressPercent: 0, hasProgress: false };
    }
    return resolveItemPlayProgress(cwItem, historyItem);
  }, [numericId, cwItem, historyItem]);
}
