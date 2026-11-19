import type { MediaType } from "@/lib/media-types";
import { watchlistEntryKey } from "@/lib/media-types";
import {
  sanitizeWatchHistoryItems,
  mergeWatchHistory,
  type WatchHistoryItem,
} from "@/lib/watch-history";

export const LIBRARY_BACKUP_VERSION = 1;
export const MAX_COLLECTIONS_PER_PROFILE = 40;
export const MAX_ITEMS_PER_COLLECTION = 250;

export interface CustomCollection {
  id: string;
  name: string;
  description?: string;
  itemKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BackupWatchlistItem {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  added_at: string;
  title?: string;
  creator?: string | null;
  genres?: string[] | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string | null;
}

export interface LibraryBackupSummary {
  watchlistCount: number;
  collectionsCount: number;
  watchHistoryCount: number;
}

export function canonicalMediaKey(mediaType: MediaType, id: number): string {
  return `${mediaType}_${id}`;
}

export function isValidMediaKey(key: unknown): key is string {
  return typeof key === "string" && /^(movie|tv|anime)_[1-9]\d{0,9}$/.test(key);
}

function slugifyCollectionId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const rand = Math.random().toString(36).slice(2, 6);
  return `col-${base || "list"}-${rand}`;
}

export function validateCollectionInput(input: {
  name: string;
  description?: string;
}): { ok: true; name: string; description?: string } | { ok: false; error: string } {
  const name = (input.name || "").trim();
  if (name.length < 1 || name.length > 60) {
    return { ok: false, error: "Collection name must be between 1 and 60 characters." };
  }
  const desc = (input.description || "").trim().slice(0, 160);
  return {
    ok: true,
    name,
    description: desc || undefined,
  };
}

export function createCollectionRecord(input: {
  id?: string;
  name: string;
  description?: string;
  itemKeys?: string[];
}): { ok: true; collection: CustomCollection } | { ok: false; error: string } {
  const validated = validateCollectionInput(input);
  if (!validated.ok) return validated;
  const now = new Date().toISOString();
  const rawId = (input.id || "").trim();
  const id =
    rawId && /^[a-z0-9][a-z0-9_-]{1,59}$/i.test(rawId)
      ? rawId.toLowerCase()
      : slugifyCollectionId(validated.name);
  const itemKeys = [
    ...new Set((input.itemKeys || []).filter(isValidMediaKey)),
  ].slice(0, MAX_ITEMS_PER_COLLECTION);

  return {
    ok: true,
    collection: {
      id,
      name: validated.name,
      description: validated.description,
      itemKeys,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function sanitizeCustomCollection(raw: unknown): CustomCollection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id.trim() : "";
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!id || !/^[a-z0-9][a-z0-9_-]{1,59}$/i.test(id)) return null;
  if (name.length < 1 || name.length > 60) return null;

  const description =
    typeof obj.description === "string" && obj.description.trim()
      ? obj.description.trim().slice(0, 160)
      : undefined;
  const itemKeys = Array.isArray(obj.itemKeys)
    ? [...new Set(obj.itemKeys.filter(isValidMediaKey))].slice(
        0,
        MAX_ITEMS_PER_COLLECTION
      )
    : [];
  const now = new Date().toISOString();
  const createdAt =
    typeof obj.createdAt === "string" && obj.createdAt.trim() ? obj.createdAt : now;
  const updatedAt =
    typeof obj.updatedAt === "string" && obj.updatedAt.trim() ? obj.updatedAt : now;

  return {
    id,
    name,
    description,
    itemKeys,
    createdAt,
    updatedAt,
  };
}

export function sanitizeCustomCollections(rawList: unknown): CustomCollection[] {
  if (!Array.isArray(rawList)) return [];
  const byId = new Map<string, CustomCollection>();
  for (const raw of rawList) {
    const clean = sanitizeCustomCollection(raw);
    if (clean) byId.set(clean.id, clean);
    if (byId.size >= MAX_COLLECTIONS_PER_PROFILE) break;
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "")
  );
}

export function toggleItemInCollection(
  collection: CustomCollection,
  mediaKey: string
): CustomCollection {
  if (!isValidMediaKey(mediaKey)) return collection;
  const exists = collection.itemKeys.includes(mediaKey);
  const nextKeys = exists
    ? collection.itemKeys.filter((k) => k !== mediaKey)
    : [mediaKey, ...collection.itemKeys].slice(0, MAX_ITEMS_PER_COLLECTION);
  return {
    ...collection,
    itemKeys: nextKeys,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeBackupWatchlistItem(raw: unknown): BackupWatchlistItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const media_type = obj.media_type;
  if (media_type !== "movie" && media_type !== "tv" && media_type !== "anime") {
    return null;
  }
  const tmdbId =
    typeof obj.tmdbId === "number" && Number.isSafeInteger(obj.tmdbId) && obj.tmdbId > 0
      ? obj.tmdbId
      : null;
  const anilistId =
    typeof obj.anilistId === "number" &&
    Number.isSafeInteger(obj.anilistId) &&
    obj.anilistId > 0
      ? obj.anilistId
      : null;
  if (media_type === "anime" && !anilistId) return null;
  if ((media_type === "movie" || media_type === "tv") && !tmdbId) return null;

  return {
    media_type,
    tmdbId: media_type === "anime" ? null : tmdbId,
    anilistId: media_type === "anime" ? anilistId : null,
    added_at:
      typeof obj.added_at === "string" && obj.added_at.trim()
        ? obj.added_at
        : new Date().toISOString(),
    title: typeof obj.title === "string" ? obj.title.slice(0, 200) : undefined,
    creator: typeof obj.creator === "string" ? obj.creator.slice(0, 120) : null,
    genres: Array.isArray(obj.genres)
      ? obj.genres.filter((g): g is string => typeof g === "string").slice(0, 12)
      : null,
    poster_path: typeof obj.poster_path === "string" ? obj.poster_path : null,
    backdrop_path: typeof obj.backdrop_path === "string" ? obj.backdrop_path : null,
    vote_average:
      typeof obj.vote_average === "number" && Number.isFinite(obj.vote_average)
        ? obj.vote_average
        : undefined,
    release_date: typeof obj.release_date === "string" ? obj.release_date : null,
  };
}

export function exportLibraryBackupJson(payload: {
  profileName?: string;
  watchlist: BackupWatchlistItem[];
  collections: CustomCollection[];
  watchHistory: WatchHistoryItem[];
}): string {
  return JSON.stringify(
    {
      app: "zoku-tv",
      schema: "library-backup",
      version: LIBRARY_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      profileName: payload.profileName || undefined,
      watchlist: payload.watchlist,
      collections: payload.collections,
      watchHistory: payload.watchHistory,
    },
    null,
    2
  );
}

export function importLibraryBackupJson(
  rawJson: string,
  current: {
    watchlist: BackupWatchlistItem[];
    collections: CustomCollection[];
    watchHistory: WatchHistoryItem[];
  },
  mode: "merge" | "replace"
):
  | {
      ok: true;
      watchlist: BackupWatchlistItem[];
      collections: CustomCollection[];
      watchHistory: WatchHistoryItem[];
      summary: LibraryBackupSummary;
    }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Invalid JSON syntax. Please check the backup file." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Backup JSON must be an object." };
  }

  const obj = parsed as Record<string, unknown>;
  const hasKnownKey =
    "watchlist" in obj || "collections" in obj || "watchHistory" in obj;
  if (!hasKnownKey) {
    return {
      ok: false,
      error:
        "JSON does not contain Zoku TV library fields (watchlist, collections, or watchHistory).",
    };
  }

  const incomingWatchlist = Array.isArray(obj.watchlist)
    ? obj.watchlist
        .map(sanitizeBackupWatchlistItem)
        .filter((x): x is BackupWatchlistItem => x !== null)
    : [];
  const incomingCollections = sanitizeCustomCollections(obj.collections);
  const incomingHistory = sanitizeWatchHistoryItems(
    Array.isArray(obj.watchHistory) ? (obj.watchHistory as WatchHistoryItem[]) : []
  ).valid;

  if (mode === "replace") {
    const dedupWatchlist = new Map<string, BackupWatchlistItem>();
    for (const item of incomingWatchlist) {
      const id = item.media_type === "anime" ? item.anilistId! : item.tmdbId!;
      dedupWatchlist.set(watchlistEntryKey(item.media_type, id), item);
    }
    const nextWatchlist = [...dedupWatchlist.values()];
    return {
      ok: true,
      watchlist: nextWatchlist,
      collections: incomingCollections,
      watchHistory: incomingHistory,
      summary: {
        watchlistCount: nextWatchlist.length,
        collectionsCount: incomingCollections.length,
        watchHistoryCount: incomingHistory.length,
      },
    };
  }

  // Merge mode: union without losing existing items
  const mergedWatchlist = new Map<string, BackupWatchlistItem>();
  for (const item of current.watchlist) {
    const id = item.media_type === "anime" ? item.anilistId : item.tmdbId;
    if (id) mergedWatchlist.set(watchlistEntryKey(item.media_type, id), item);
  }
  for (const item of incomingWatchlist) {
    const id = item.media_type === "anime" ? item.anilistId : item.tmdbId;
    if (id) {
      const key = watchlistEntryKey(item.media_type, id);
      if (!mergedWatchlist.has(key)) {
        mergedWatchlist.set(key, item);
      }
    }
  }

  const mergedCollections = new Map<string, CustomCollection>();
  for (const col of current.collections) {
    mergedCollections.set(col.id, col);
  }
  for (const col of incomingCollections) {
    const existing = mergedCollections.get(col.id);
    if (existing) {
      mergedCollections.set(col.id, {
        ...existing,
        name: col.name,
        description: col.description ?? existing.description,
        itemKeys: [...new Set([...existing.itemKeys, ...col.itemKeys])].slice(
          0,
          MAX_ITEMS_PER_COLLECTION
        ),
        updatedAt: new Date().toISOString(),
      });
    } else if (mergedCollections.size < MAX_COLLECTIONS_PER_PROFILE) {
      mergedCollections.set(col.id, col);
    }
  }

  const nextWatchlist = [...mergedWatchlist.values()];
  const nextCollections = [...mergedCollections.values()];
  const nextHistory = mergeWatchHistory(current.watchHistory, incomingHistory);

  return {
    ok: true,
    watchlist: nextWatchlist,
    collections: nextCollections,
    watchHistory: nextHistory,
    summary: {
      watchlistCount: nextWatchlist.length,
      collectionsCount: nextCollections.length,
      watchHistoryCount: nextHistory.length,
    },
  };
}

function collectionsStorageKey(profileId?: string | null): string {
  return `zoku_custom_collections_v1_${profileId || "default"}`;
}

export function readLocalCollections(profileId?: string | null): CustomCollection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(collectionsStorageKey(profileId));
    if (!raw) return [];
    return sanitizeCustomCollections(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeLocalCollections(
  collections: CustomCollection[],
  profileId?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      collectionsStorageKey(profileId),
      JSON.stringify(collections)
    );
  } catch {
    /* ignore storage errors */
  }
}
