import type { ContinueWatchingDoc } from "@/lib/firestore-types";
import type { MediaType } from "@/lib/media-types";
import { watchlistEntryKey, getWatchlistItemId } from "@/lib/media-types";

export const MAX_CONTINUE_WATCHING_ITEMS = 20;
export const RECORD_DEBOUNCE_MS = 2500;
export const RESUME_THRESHOLD_PERCENT = 5;
export const COMPLETION_THRESHOLD_PERCENT = 95;

export type ContinueWatchingItem = ContinueWatchingDoc;

export function continueWatchingEntryKey(
  media_type: MediaType,
  id: number
) {
  return watchlistEntryKey(media_type, id);
}

export function getContinueWatchingItemId(item: ContinueWatchingItem): number {
  return getWatchlistItemId(item);
}

export function continueWatchingStorageKey(profileId: string) {
  return `zoku_continue_${profileId}`;
}

export function readLocalContinueWatching(profileId: string): ContinueWatchingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(continueWatchingStorageKey(profileId));
    return raw ? (JSON.parse(raw) as ContinueWatchingItem[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalContinueWatching(profileId: string, items: ContinueWatchingItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      continueWatchingStorageKey(profileId),
      JSON.stringify(items.slice(0, MAX_CONTINUE_WATCHING_ITEMS))
    );
  } catch {
    // Non-fatal when storage is blocked.
  }
}

export function clearLocalContinueWatching(profileId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(continueWatchingStorageKey(profileId));
  } catch {
    // Ignore storage failures.
  }
}

export function mergeContinueWatching(
  local: ContinueWatchingItem[],
  cloud: ContinueWatchingItem[]
): ContinueWatchingItem[] {
  const merged = new Map<string, ContinueWatchingItem>();

  for (const entry of cloud) {
    merged.set(
      continueWatchingEntryKey(entry.media_type, getContinueWatchingItemId(entry)),
      entry
    );
  }

  for (const entry of local) {
    const key = continueWatchingEntryKey(entry.media_type, getContinueWatchingItemId(entry));
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, entry);
      continue;
    }
    const localTs = Date.parse(entry.last_watched_at);
    const cloudTs = Date.parse(existing.last_watched_at);
    merged.set(key, localTs > cloudTs ? entry : existing);
  }

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
    .slice(0, MAX_CONTINUE_WATCHING_ITEMS);
}

export function buildWatchUrl(item: ContinueWatchingItem): string {
  const startAt =
    item.current_time_sec && item.current_time_sec > 0
      ? `?t=${Math.floor(item.current_time_sec)}`
      : "";

  if (item.media_type === "anime" && item.anilistId) {
    return `/watch/anime/${item.anilistId}/${item.season ?? 1}/${item.episode ?? 1}${startAt}`;
  }
  if (item.media_type === "tv" && item.season && item.episode && item.tmdbId) {
    return `/watch/tv/${item.tmdbId}/${item.season}/${item.episode}${startAt}`;
  }
  if (item.tmdbId) {
    return `/watch/${item.media_type}/${item.tmdbId}${startAt}`;
  }
  return "/home";
}

export function filterContinueWatchingByCatalog(
  items: ContinueWatchingItem[],
  catalogMode: "tmdb" | "anime"
): ContinueWatchingItem[] {
  if (catalogMode === "anime") {
    return items.filter((item) => item.media_type === "anime");
  }
  return items.filter((item) => item.media_type === "movie" || item.media_type === "tv");
}
