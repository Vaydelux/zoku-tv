import type { ContinueWatchingDoc, WatchHistoryDoc } from "@/lib/firestore-types";
import type { MediaType } from "@/lib/media-types";
import { watchlistEntryKey, getWatchlistItemId } from "@/lib/media-types";
import {
  COMPLETION_THRESHOLD_PERCENT,
  sanitizeContinueWatchingItems,
} from "@/lib/continue-watching";

export const MAX_WATCH_HISTORY_ITEMS = 40;

export type WatchHistoryItem = WatchHistoryDoc;
export type WatchHistoryFilter = "all" | "completed" | "partial";

export type WatchHistoryUpsertInput = {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  season?: number | null;
  episode?: number | null;
  title: string;
  overview?: string | null;
  vote_average?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  progress_percent?: number | null;
  current_time_sec?: number | null;
  duration_sec?: number | null;
  completed?: boolean;
  last_watched_at?: string;
};

export function watchHistoryEntryKey(media_type: MediaType, id: number): string {
  return watchlistEntryKey(media_type, id);
}

export function getWatchHistoryItemId(item: WatchHistoryItem): number {
  return getWatchlistItemId(item);
}

export function watchHistoryStorageKey(profileId: string): string {
  return `zoku_watch_history_${profileId}`;
}

export function watchHistorySeededKey(profileId: string, catalogMode: "tmdb" | "anime"): string {
  return `zoku_watch_history_seeded_${profileId}_${catalogMode}`;
}

export function isSyntheticWatchHistoryItem(
  item: WatchHistoryItem,
  allItems: WatchHistoryItem[] = []
): boolean {
  if (
    item.duration_sec === 4400 &&
    (item.current_time_sec === 2840 || item.current_time_sec === 1420)
  ) {
    return true;
  }
  if (
    item.duration_sec === 4300 &&
    (item.current_time_sec === 2900 || item.current_time_sec === 1450)
  ) {
    return true;
  }

  if (
    !item.completed &&
    item.duration_sec == null &&
    (item.current_time_sec == null || item.current_time_sec === 0)
  ) {
    if (item.media_type === "movie" && item.progress_percent === 58) return true;
    if (
      item.media_type === "tv" &&
      item.progress_percent === 72 &&
      item.season === 1 &&
      item.episode === 3
    ) {
      return true;
    }
    if (
      item.media_type === "anime" &&
      item.progress_percent === 64 &&
      item.season === 1 &&
      item.episode === 4
    ) {
      return true;
    }
  }

  const itemTs = Date.parse(item.last_watched_at);
  if (Number.isFinite(itemTs) && itemTs % 60_000 !== 0 && allItems.length > 1) {
    for (const other of allItems) {
      if (other === item) continue;
      const otherId = getWatchHistoryItemId(other);
      const thisId = getWatchHistoryItemId(item);
      if (other.media_type === item.media_type && otherId === thisId) continue;
      const otherTs = Date.parse(other.last_watched_at);
      if (!Number.isFinite(otherTs)) continue;
      const diff = Math.abs(itemTs - otherTs);
      if (diff > 0 && diff % 1_800_000 === 0) {
        return true;
      }
    }
  }

  return false;
}

export function sanitizeWatchHistoryItems(
  items: WatchHistoryItem[]
): { valid: WatchHistoryItem[]; removed: WatchHistoryItem[] } {
  const valid: WatchHistoryItem[] = [];
  const removed: WatchHistoryItem[] = [];

  for (const item of items) {
    if (isSyntheticWatchHistoryItem(item, items)) {
      removed.push(item);
    } else {
      valid.push(item);
    }
  }

  return { valid, removed };
}

export function readLocalWatchHistory(profileId: string): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(watchHistoryStorageKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    const { valid, removed } = sanitizeWatchHistoryItems(parsed);
    if (removed.length > 0) {
      writeLocalWatchHistory(profileId, valid);
    }
    return valid;
  } catch {
    return [];
  }
}

export function writeLocalWatchHistory(profileId: string, items: WatchHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      watchHistoryStorageKey(profileId),
      JSON.stringify(items.slice(0, MAX_WATCH_HISTORY_ITEMS))
    );
  } catch {
    // Ignore storage errors
  }
}

export function clearLocalWatchHistory(profileId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(watchHistoryStorageKey(profileId));
  } catch {
    // Ignore storage errors
  }
}

export function removeWatchHistoryEntry(
  existingItems: WatchHistoryItem[],
  media_type: MediaType,
  id: number
): WatchHistoryItem[] {
  const targetKey = watchHistoryEntryKey(media_type, id);
  return existingItems.filter(
    (item) => watchHistoryEntryKey(item.media_type, getWatchHistoryItemId(item)) !== targetKey
  );
}

export interface StorageLike {
  length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

/**
 * Clears local cache entries for recently watched items and TMDB/AniList catalog metadata
 * without touching active user/profile session keys.
 */
export function purgeLocalWatchedAndMediaCaches(
  storage: StorageLike,
  profileId?: string | null
): string[] {
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;

    // Never clear active profile cache or auth state
    if (
      key.startsWith("zoku_profiles_cache_") ||
      key.startsWith("zoku_active_profile_") ||
      key === "zoku_local_auth_user" ||
      key === "zoku_local_db"
    ) {
      continue;
    }

    const isProfileWatchCache =
      profileId &&
      (key === watchHistoryStorageKey(profileId) ||
        key === `zoku_continue_${profileId}` ||
        key.startsWith(`zoku_watch_history_seeded_${profileId}_`) ||
        key.startsWith(`zoku_cw_seeded_${profileId}_`));

    const isCatalogOrWatchCache =
      Boolean(isProfileWatchCache) ||
      key.startsWith("zoku_tmdb_cache_") ||
      key.startsWith("zoku_anilist_cache_") ||
      (!profileId &&
        (key.startsWith("zoku_watch_history_") ||
          key.startsWith("zoku_continue_") ||
          key.startsWith("zoku_cw_seeded_")));

    if (isCatalogOrWatchCache) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => storage.removeItem(k));
  return keysToRemove;
}

export function upsertWatchHistoryEntry(
  existingItems: WatchHistoryItem[],
  input: WatchHistoryUpsertInput,
  nowIso: string = new Date().toISOString()
): { entry: WatchHistoryItem; items: WatchHistoryItem[] } | null {
  const itemId = input.media_type === "anime" ? input.anilistId : input.tmdbId;
  if (!itemId) return null;

  const key = watchHistoryEntryKey(input.media_type, itemId);
  const previous = existingItems.find(
    (item) => watchHistoryEntryKey(item.media_type, getWatchHistoryItemId(item)) === key
  );

  const sameEpisode =
    previous &&
    (previous.season ?? null) === (input.season ?? previous.season ?? null) &&
    (previous.episode ?? null) === (input.episode ?? previous.episode ?? null);

  const rawProgress =
    input.progress_percent !== undefined
      ? input.progress_percent
      : previous?.progress_percent ?? null;

  const isCompleted =
    input.completed === true ||
    (rawProgress != null && rawProgress >= COMPLETION_THRESHOLD_PERCENT) ||
    (previous?.completed === true && input.completed !== false && (rawProgress == null || rawProgress >= COMPLETION_THRESHOLD_PERCENT));

  const normalizedProgress = isCompleted
    ? 100
    : rawProgress != null
      ? Math.max(1, Math.min(99, Math.round(rawProgress)))
      : previous?.progress_percent ?? 28;

  const previousWatchCount = previous?.watch_count ?? 0;
  const watchCount =
    previousWatchCount === 0
      ? 1
      : isCompleted && !previous?.completed
        ? previousWatchCount + 1
        : input.completed === true && previous?.completed
          ? previousWatchCount + 1
          : previousWatchCount;

  const entry: WatchHistoryItem = {
    media_type: input.media_type,
    tmdbId: input.media_type === "anime" ? null : (input.tmdbId ?? previous?.tmdbId ?? null),
    anilistId: input.media_type === "anime" ? (input.anilistId ?? previous?.anilistId ?? null) : null,
    season: input.season ?? previous?.season ?? null,
    episode: input.episode ?? previous?.episode ?? null,
    title: input.title || previous?.title || "Untitled",
    overview: input.overview ?? previous?.overview ?? null,
    vote_average: input.vote_average ?? previous?.vote_average ?? null,
    poster_path: input.poster_path ?? previous?.poster_path ?? null,
    backdrop_path: input.backdrop_path ?? previous?.backdrop_path ?? null,
    last_watched_at: input.last_watched_at ?? nowIso,
    progress_percent: normalizedProgress,
    current_time_sec: isCompleted
      ? 0
      : (input.current_time_sec ?? (sameEpisode ? previous?.current_time_sec : null) ?? null),
    duration_sec: input.duration_sec ?? (sameEpisode ? previous?.duration_sec : null) ?? null,
    completed: isCompleted,
    watch_count: watchCount,
  };

  const nextItems = [
    entry,
    ...existingItems.filter(
      (item) => watchHistoryEntryKey(item.media_type, getWatchHistoryItemId(item)) !== key
    ),
  ]
    .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
    .slice(0, MAX_WATCH_HISTORY_ITEMS);

  return { entry, items: nextItems };
}

/**
 * Resets the progress of a completed (or partially watched) title to 0%
 * with completed: false so users can immediately re-watch and restart from the beginning.
 */
export function resetWatchHistoryProgress(
  existingItems: WatchHistoryItem[],
  target: WatchHistoryItem,
  nowIso: string = new Date().toISOString()
): { entry: WatchHistoryItem; items: WatchHistoryItem[] } | null {
  const itemId = getWatchHistoryItemId(target);
  if (!itemId) return null;

  const key = watchHistoryEntryKey(target.media_type, itemId);
  const previous = existingItems.find(
    (item) => watchHistoryEntryKey(item.media_type, getWatchHistoryItemId(item)) === key
  );

  const watchCount = (previous?.watch_count ?? target.watch_count ?? 1) + 1;

  const entry: WatchHistoryItem = {
    ...(previous ?? target),
    progress_percent: 0,
    current_time_sec: 0,
    completed: false,
    watch_count: watchCount,
    last_watched_at: nowIso,
  };

  const nextItems = [
    entry,
    ...existingItems.filter(
      (item) => watchHistoryEntryKey(item.media_type, getWatchHistoryItemId(item)) !== key
    ),
  ]
    .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
    .slice(0, MAX_WATCH_HISTORY_ITEMS);

  return { entry, items: nextItems };
}

export function mergeWatchHistory(
  local: WatchHistoryItem[],
  cloud: WatchHistoryItem[],
  continueWatching: ContinueWatchingDoc[] = []
): WatchHistoryItem[] {
  const merged = new Map<string, WatchHistoryItem>();
  const cleanCloud = sanitizeWatchHistoryItems(cloud).valid;
  const cleanLocal = sanitizeWatchHistoryItems(local).valid;
  const cleanCw = sanitizeContinueWatchingItems(continueWatching).valid;

  for (const entry of cleanCloud) {
    const id = getWatchHistoryItemId(entry);
    if (!id) continue;
    merged.set(watchHistoryEntryKey(entry.media_type, id), {
      ...entry,
      completed: Boolean(entry.completed || (entry.progress_percent ?? 0) >= COMPLETION_THRESHOLD_PERCENT),
      watch_count: Math.max(1, entry.watch_count ?? 1),
    });
  }

  for (const entry of cleanLocal) {
    const id = getWatchHistoryItemId(entry);
    if (!id) continue;
    const key = watchHistoryEntryKey(entry.media_type, id);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...entry,
        completed: Boolean(entry.completed || (entry.progress_percent ?? 0) >= COMPLETION_THRESHOLD_PERCENT),
        watch_count: Math.max(1, entry.watch_count ?? 1),
      });
      continue;
    }
    const localTs = Date.parse(entry.last_watched_at);
    const cloudTs = Date.parse(existing.last_watched_at);
    const winner = localTs >= cloudTs ? entry : existing;
    merged.set(key, {
      ...winner,
      completed: Boolean(winner.completed || existing.completed),
      watch_count: Math.max(entry.watch_count ?? 1, existing.watch_count ?? 1),
    });
  }

  for (const cw of cleanCw) {
    const id = cw.media_type === "anime" ? (cw.anilistId ?? 0) : (cw.tmdbId ?? 0);
    if (!id) continue;
    const key = watchHistoryEntryKey(cw.media_type, id);
    const existing = merged.get(key);
    const isCompleted = (cw.progress_percent ?? 0) >= COMPLETION_THRESHOLD_PERCENT;
    if (!existing) {
      merged.set(key, {
        ...cw,
        progress_percent: cw.progress_percent ?? 35,
        completed: isCompleted,
        watch_count: 1,
      });
    } else if (Date.parse(cw.last_watched_at) > Date.parse(existing.last_watched_at)) {
      merged.set(key, {
        ...existing,
        ...cw,
        progress_percent: cw.progress_percent ?? existing.progress_percent ?? 35,
        completed: isCompleted || existing.completed,
        watch_count: existing.watch_count ?? 1,
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
    .slice(0, MAX_WATCH_HISTORY_ITEMS);
}

export function filterWatchHistoryByCatalog(
  items: WatchHistoryItem[],
  catalogMode: "tmdb" | "anime"
): WatchHistoryItem[] {
  if (catalogMode === "anime") {
    return items.filter((item) => item.media_type === "anime");
  }
  return items.filter((item) => item.media_type === "movie" || item.media_type === "tv");
}

export function filterWatchHistoryByStatus(
  items: WatchHistoryItem[],
  statusFilter: WatchHistoryFilter
): WatchHistoryItem[] {
  if (statusFilter === "completed") {
    return items.filter((item) => item.completed);
  }
  if (statusFilter === "partial") {
    return items.filter((item) => !item.completed);
  }
  return items;
}

export type WatchHistoryTypeFilter = "all" | "movie" | "tv";

/**
 * Filters watch history items by media type:
 * - 'all': returns all items
 * - 'movie': returns movies (including anime movies)
 * - 'tv': returns TV series (including episodic anime)
 */
export function filterWatchHistoryByType(
  items: WatchHistoryItem[],
  typeFilter: WatchHistoryTypeFilter
): WatchHistoryItem[] {
  if (typeFilter === "movie") {
    return items.filter(
      (item) =>
        item.media_type === "movie" ||
        (item.media_type === "anime" && (item.title || "").toLowerCase().includes("movie"))
    );
  }
  if (typeFilter === "tv") {
    return items.filter(
      (item) =>
        item.media_type === "tv" ||
        (item.media_type === "anime" && !(item.title || "").toLowerCase().includes("movie"))
    );
  }
  return items;
}

/**
 * Builds a clean Re-watch URL starting from the beginning (no ?t= offset)
 * so users can immediately replay completed or favorite episodes/movies.
 */
export function buildRewatchUrl(item: WatchHistoryItem): string {
  if (item.media_type === "anime" && item.anilistId) {
    return `/watch/anime/${item.anilistId}/${item.season ?? 1}/${item.episode ?? 1}`;
  }
  if (item.media_type === "tv" && item.tmdbId) {
    return `/watch/tv/${item.tmdbId}/${item.season ?? 1}/${item.episode ?? 1}`;
  }
  if (item.tmdbId) {
    return `/watch/${item.media_type}/${item.tmdbId}`;
  }
  return "/home";
}

/**
 * Builds a detail page URL for inspecting seasons, cast, or related titles.
 */
export function buildHistoryDetailsUrl(item: WatchHistoryItem): string {
  if (item.media_type === "anime" && item.anilistId) {
    return `/anime/${item.anilistId}`;
  }
  if (item.tmdbId) {
    return `/title/${item.media_type}/${item.tmdbId}`;
  }
  return "/home";
}

export type WatchHistorySortOption =
  | "most_recent"
  | "oldest"
  | "completion_status";

export const WATCH_HISTORY_SORT_OPTIONS: {
  id: WatchHistorySortOption;
  label: string;
}[] = [
  { id: "most_recent", label: "Most Recent" },
  { id: "oldest", label: "Oldest" },
  { id: "completion_status", label: "Completion Status" },
];

function parseWatchedTimestamp(iso?: string | null): number {
  if (!iso || typeof iso !== "string") return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Pure non-mutating sorter for Watch History items.
 * - 'most_recent': Newest last_watched_at first
 * - 'oldest': Oldest last_watched_at first
 * - 'completion_status': Completed items first, then highest progress %, then most recent
 */
export function sortWatchHistoryItems(
  items: WatchHistoryItem[],
  sortBy: WatchHistorySortOption
): WatchHistoryItem[] {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? [...items] : [];
  }

  const indexed = items.map((item, index) => ({ item, index }));

  indexed.sort((a, b) => {
    const timeA = parseWatchedTimestamp(a.item.last_watched_at);
    const timeB = parseWatchedTimestamp(b.item.last_watched_at);

    if (sortBy === "oldest") {
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.index - b.index;
    }

    if (sortBy === "completion_status") {
      const completedA = a.item.completed ? 1 : 0;
      const completedB = b.item.completed ? 1 : 0;
      if (completedB !== completedA) {
        return completedB - completedA;
      }

      const progressA =
        typeof a.item.progress_percent === "number" &&
        Number.isFinite(a.item.progress_percent)
          ? a.item.progress_percent
          : completedA
            ? 100
            : 0;
      const progressB =
        typeof b.item.progress_percent === "number" &&
        Number.isFinite(b.item.progress_percent)
          ? b.item.progress_percent
          : completedB
            ? 100
            : 0;
      if (progressB !== progressA) {
        return progressB - progressA;
      }

      const countA = a.item.watch_count ?? 1;
      const countB = b.item.watch_count ?? 1;
      if (countB !== countA) {
        return countB - countA;
      }

      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.index - b.index;
    }

    // Default: "most_recent"
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.item);
}

