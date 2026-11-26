import { create } from "zustand";
import {
  setDocument,
  getCollectionRef,
  getDocRef,
  listenToOrderedCollection,
  deleteDocument,
} from "@/lib/firebase";
import {
  COMPLETION_THRESHOLD_PERCENT,
  MAX_CONTINUE_WATCHING_ITEMS,
  RECORD_DEBOUNCE_MS,
  clearLocalContinueWatching,
  continueWatchingEntryKey,
  getContinueWatchingItemId,
  mergeContinueWatching,
  readLocalContinueWatching,
  sanitizeContinueWatchingItems,
  writeLocalContinueWatching,
  type ContinueWatchingItem,
} from "@/lib/continue-watching";
import type { MediaType } from "@/lib/media-types";
import { useSessionStore } from "./session.store";
import { useWatchHistoryStore } from "./watch-history.store";

export type ContinueWatchingRecordInput = {
  media_type: MediaType;
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  title: string;
  overview?: string | null;
  vote_average?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  progress_percent?: number;
  current_time_sec?: number;
  duration_sec?: number;
};

export interface ContinueWatchingState {
  items: ContinueWatchingItem[];
  initContinueWatching: () => () => void;
  getEntry: (media_type: MediaType, id: number) => ContinueWatchingItem | undefined;
  recordWatching: (input: ContinueWatchingRecordInput) => void;
  recordProgress: (input: ContinueWatchingRecordInput) => void;
  removeItem: (media_type: MediaType, id: number) => Promise<void>;
  clearContinueWatching: (catalogMode?: "tmdb" | "anime") => Promise<void>;
}

let recordTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRecord: ContinueWatchingRecordInput | null = null;

async function flushContinueWatchingRecord(
  get: () => ContinueWatchingState,
  set: (partial: Partial<ContinueWatchingState>) => void,
  input: ContinueWatchingRecordInput
) {
  const session = useSessionStore.getState();
  const user = session.user;
  const profile = session.currentProfile;
  if (!user || !profile) return;

  const profileId = profile.id;
  const colPath = `users/${user.uid}/profiles/${profileId}/continueWatching`;
  const now = new Date().toISOString();
  const itemId = input.media_type === "anime" ? input.anilistId : input.tmdbId;
  if (!itemId) return;

  const key = continueWatchingEntryKey(input.media_type, itemId);
  const previous = get().items.find(
    (item) =>
      continueWatchingEntryKey(item.media_type, getContinueWatchingItemId(item)) === key
  );
  const sameEpisode =
    previous &&
    previous.season === input.season &&
    previous.episode === input.episode;

  const progressPercent = input.progress_percent ?? previous?.progress_percent ?? null;
  const currentTimeSec = input.current_time_sec ?? (sameEpisode ? previous?.current_time_sec : null);
  const durationSec = input.duration_sec ?? (sameEpisode ? previous?.duration_sec : null);

  const isCompleted = progressPercent != null && progressPercent >= COMPLETION_THRESHOLD_PERCENT;
  void useWatchHistoryStore.getState().recordHistory({
    media_type: input.media_type,
    tmdbId: input.media_type === "anime" ? null : input.tmdbId ?? null,
    anilistId: input.media_type === "anime" ? input.anilistId ?? null : null,
    season: input.season ?? null,
    episode: input.episode ?? null,
    title: input.title,
    overview: input.overview ?? previous?.overview ?? null,
    vote_average: input.vote_average ?? previous?.vote_average ?? null,
    poster_path: input.poster_path ?? previous?.poster_path ?? null,
    backdrop_path: input.backdrop_path ?? previous?.backdrop_path ?? null,
    progress_percent: isCompleted ? 100 : (progressPercent ?? 24),
    current_time_sec: isCompleted ? 0 : currentTimeSec,
    duration_sec: durationSec,
    completed: isCompleted,
    last_watched_at: now,
  });

  if (isCompleted) {
    await get().removeItem(input.media_type, itemId);
    return;
  }

  const entry: ContinueWatchingItem = {
    media_type: input.media_type,
    tmdbId: input.media_type === "anime" ? null : input.tmdbId ?? null,
    anilistId: input.media_type === "anime" ? input.anilistId ?? null : null,
    season: input.season ?? null,
    episode: input.episode ?? null,
    title: input.title,
    overview: input.overview ?? previous?.overview ?? null,
    vote_average: input.vote_average ?? previous?.vote_average ?? null,
    poster_path: input.poster_path ?? previous?.poster_path ?? null,
    backdrop_path: input.backdrop_path ?? previous?.backdrop_path ?? null,
    last_watched_at: now,
    progress_percent: progressPercent,
    current_time_sec: currentTimeSec,
    duration_sec: durationSec,
  };

  const nextItems = [
    entry,
    ...get().items.filter(
      (item) =>
        continueWatchingEntryKey(item.media_type, getContinueWatchingItemId(item)) !== key
    ),
  ].slice(0, MAX_CONTINUE_WATCHING_ITEMS);

  set({ items: nextItems });
  writeLocalContinueWatching(profileId, nextItems);

  try {
    const docRef = getDocRef(colPath, key);
    await setDocument(docRef, entry);
  } catch (e) {
    console.error("Failed to save continue watching entry", e);
  }
}

export const useContinueWatchingStore = create<ContinueWatchingState>((set, get) => ({
  items: [],

  initContinueWatching: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    if (!user || !profile) {
      set({ items: [] });
      return () => {};
    }

    const profileId = profile.id;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`zoku_cw_seeded_${profileId}_tmdb`);
        localStorage.removeItem(`zoku_cw_seeded_${profileId}_anime`);
      } catch {
        // Ignore storage errors
      }
    }

    const colPath = `users/${user.uid}/profiles/${profileId}/continueWatching`;
    const localItems = readLocalContinueWatching(profileId);
    let mergedOnInit = false;

    const mergeLocalIntoCloud = async (cloudItems: ContinueWatchingItem[]) => {
      if (mergedOnInit || localItems.length === 0) return;
      mergedOnInit = true;
      const merged = mergeContinueWatching(localItems, cloudItems);
      set({ items: merged });
      try {
        await Promise.all(
          merged.map((entry) => {
            const docRef = getDocRef(
              colPath,
              continueWatchingEntryKey(entry.media_type, getContinueWatchingItemId(entry))
            );
            return setDocument(docRef, entry);
          })
        );
        clearLocalContinueWatching(profileId);
      } catch (e) {
        writeLocalContinueWatching(profileId, merged);
        console.error("Failed to merge continue watching into cloud", e);
      }
    };

    const colRef = getCollectionRef(colPath);
    const unsubscribe = listenToOrderedCollection(
      colRef,
      { orderByField: "last_watched_at", direction: "desc", limitTo: MAX_CONTINUE_WATCHING_ITEMS },
      (snapshot) => {
        const rawCloudItems: ContinueWatchingItem[] = [];
        snapshot.forEach((docSnap: { data: () => ContinueWatchingItem }) => {
          rawCloudItems.push(docSnap.data() as ContinueWatchingItem);
        });

        const { valid: cloudItems, removed: syntheticCloud } =
          sanitizeContinueWatchingItems(rawCloudItems);

        if (syntheticCloud.length > 0) {
          void Promise.all(
            syntheticCloud.map((entry) => {
              const id = getContinueWatchingItemId(entry);
              if (!id) return Promise.resolve();
              const docRef = getDocRef(colPath, continueWatchingEntryKey(entry.media_type, id));
              return deleteDocument(docRef);
            })
          ).catch(() => {});
        }

        if (localItems.length > 0) {
          void mergeLocalIntoCloud(cloudItems);
        } else {
          set({ items: cloudItems });
          writeLocalContinueWatching(profileId, cloudItems);
        }
      }
    );

    if (localItems.length > 0) {
      set({ items: mergeContinueWatching(localItems, get().items) });
    }

    return unsubscribe;
  },

  getEntry: (media_type, id) => {
    return get().items.find(
      (item) => item.media_type === media_type && getContinueWatchingItemId(item) === id
    );
  },

  recordWatching: (input) => {
    pendingRecord = input;
    if (recordTimer) clearTimeout(recordTimer);
    recordTimer = setTimeout(() => {
      const pending = pendingRecord;
      pendingRecord = null;
      if (!pending) return;
      void flushContinueWatchingRecord(get, set, pending);
    }, RECORD_DEBOUNCE_MS);
  },

  recordProgress: (input) => {
    pendingRecord = input;
    if (recordTimer) clearTimeout(recordTimer);
    recordTimer = setTimeout(() => {
      const pending = pendingRecord;
      pendingRecord = null;
      if (!pending) return;
      void flushContinueWatchingRecord(get, set, pending);
    }, RECORD_DEBOUNCE_MS);
  },

  removeItem: async (media_type, id) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentItems = get().items;
    const nextItems = currentItems.filter(
      (item) => !(item.media_type === media_type && getContinueWatchingItemId(item) === id)
    );
    set({ items: nextItems });
    writeLocalContinueWatching(profile.id, nextItems);

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/continueWatching`,
        continueWatchingEntryKey(media_type, id)
      );
      await deleteDocument(docRef);
    } catch (e) {
      set({ items: currentItems });
      console.error("Failed to remove continue watching entry", e);
    }
  },

  clearContinueWatching: async (catalogMode) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentItems = get().items;
    const toRemove = catalogMode
      ? currentItems.filter((item) =>
          catalogMode === "anime"
            ? item.media_type === "anime"
            : item.media_type === "movie" || item.media_type === "tv"
        )
      : currentItems;

    const remaining = catalogMode
      ? currentItems.filter((item) =>
          catalogMode === "anime"
            ? item.media_type !== "anime"
            : item.media_type === "anime"
        )
      : [];

    set({ items: remaining });
    if (remaining.length === 0) {
      clearLocalContinueWatching(profile.id);
    } else {
      writeLocalContinueWatching(profile.id, remaining);
    }

    try {
      await Promise.all(
        toRemove.map((entry) => {
          const docRef = getDocRef(
            `users/${user.uid}/profiles/${profile.id}/continueWatching`,
            continueWatchingEntryKey(entry.media_type, getContinueWatchingItemId(entry))
          );
          return deleteDocument(docRef);
        })
      );
    } catch (e) {
      console.error("Failed to clear continue watching", e);
    }
  },
}));
