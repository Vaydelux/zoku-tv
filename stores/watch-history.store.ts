import { create } from "zustand";
import {
  setDocument,
  getCollectionRef,
  getDocRef,
  getCollectionDocs,
  listenToOrderedCollection,
  deleteDocument,
} from "@/lib/firebase";
import {
  continueWatchingEntryKey,
  getContinueWatchingItemId,
  sanitizeContinueWatchingItems,
  writeLocalContinueWatching,
  type ContinueWatchingItem,
} from "@/lib/continue-watching";
import {
  MAX_WATCH_HISTORY_ITEMS,
  buildRewatchUrl,
  clearLocalWatchHistory,
  getWatchHistoryItemId,
  mergeWatchHistory,
  purgeLocalWatchedAndMediaCaches,
  readLocalWatchHistory,
  removeWatchHistoryEntry,
  resetWatchHistoryProgress,
  sanitizeWatchHistoryItems,
  upsertWatchHistoryEntry,
  watchHistoryEntryKey,
  watchHistorySeededKey,
  writeLocalWatchHistory,
  type WatchHistoryItem,
  type WatchHistoryUpsertInput,
} from "@/lib/watch-history";
import type { MediaType } from "@/lib/media-types";
import { useSessionStore } from "./session.store";
import { useContinueWatchingStore } from "./continue-watching.store";
import { useEpisodeProgressStore } from "./episode-progress.store";
import { useDynamicIslandStore } from "./ui.store";

export interface WatchHistoryState {
  items: WatchHistoryItem[];
  initWatchHistory: () => () => void;
  getEntry: (media_type: MediaType, id: number) => WatchHistoryItem | undefined;
  hasEntry: (media_type: MediaType, id: number) => boolean;
  isCompleted: (media_type: MediaType, id: number) => boolean;
  recordHistory: (input: WatchHistoryUpsertInput) => Promise<void>;
  toggleCompleted: (input: WatchHistoryUpsertInput) => Promise<void>;
  removeItem: (media_type: MediaType, id: number) => Promise<void>;
  clearHistory: (catalogMode?: "tmdb" | "anime") => Promise<void>;
  refreshLocalHistoryCache: () => Promise<{ clearedKeys: number }>;
  watchAgain: (item: WatchHistoryItem) => Promise<string>;
}

export const useWatchHistoryStore = create<WatchHistoryState>((set, get) => ({
  items: [],

  initWatchHistory: () => {
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
        localStorage.removeItem(watchHistorySeededKey(profileId, "tmdb"));
        localStorage.removeItem(watchHistorySeededKey(profileId, "anime"));
      } catch {
        // Ignore storage errors
      }
    }

    const colPath = `users/${user.uid}/profiles/${profileId}/watchHistory`;
    const localItems = readLocalWatchHistory(profileId);
    const cwItems = useContinueWatchingStore.getState().items;

    if (localItems.length > 0 || cwItems.length > 0) {
      set({ items: mergeWatchHistory(localItems, get().items, cwItems) });
    }

    const colRef = getCollectionRef(colPath);
    const unsubscribe = listenToOrderedCollection(
      colRef,
      { orderByField: "last_watched_at", direction: "desc", limitTo: MAX_WATCH_HISTORY_ITEMS },
      (snapshot) => {
        const rawCloudItems: WatchHistoryItem[] = [];
        snapshot.forEach((docSnap: { data: () => WatchHistoryItem }) => {
          rawCloudItems.push(docSnap.data() as WatchHistoryItem);
        });

        const { valid: cloudItems, removed: syntheticCloud } =
          sanitizeWatchHistoryItems(rawCloudItems);

        if (syntheticCloud.length > 0) {
          void Promise.all(
            syntheticCloud.map((entry) => {
              const id = getWatchHistoryItemId(entry);
              if (!id) return Promise.resolve();
              const docRef = getDocRef(colPath, watchHistoryEntryKey(entry.media_type, id));
              return deleteDocument(docRef);
            })
          ).catch(() => {});
        }

        const latestLocal = readLocalWatchHistory(profileId);
        const latestCw = useContinueWatchingStore.getState().items;
        const merged = mergeWatchHistory(latestLocal, cloudItems, latestCw);
        set({ items: merged });
        writeLocalWatchHistory(profileId, merged);
      }
    );

    return unsubscribe;
  },

  getEntry: (media_type, id) => {
    return get().items.find(
      (item) => item.media_type === media_type && getWatchHistoryItemId(item) === id
    );
  },

  hasEntry: (media_type, id) => {
    return get().items.some(
      (item) => item.media_type === media_type && getWatchHistoryItemId(item) === id
    );
  },

  isCompleted: (media_type, id) => {
    const entry = get().items.find(
      (item) => item.media_type === media_type && getWatchHistoryItemId(item) === id
    );
    return Boolean(entry?.completed);
  },

  recordHistory: async (input) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const result = upsertWatchHistoryEntry(get().items, input);
    if (!result) return;

    const { entry, items: nextItems } = result;
    const itemId = getWatchHistoryItemId(entry);
    const key = watchHistoryEntryKey(entry.media_type, itemId);

    set({ items: nextItems });
    writeLocalWatchHistory(profile.id, nextItems);

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/watchHistory`, key);
      await setDocument(docRef, entry);
    } catch (e) {
      console.error("Failed to persist watch history entry", e);
    }
  },

  toggleCompleted: async (input) => {
    const itemId = input.media_type === "anime" ? input.anilistId : input.tmdbId;
    if (!itemId) return;

    const existing = get().getEntry(input.media_type, itemId);
    const nextCompleted = existing ? !existing.completed : true;

    await get().recordHistory({
      ...input,
      completed: nextCompleted,
      progress_percent: nextCompleted ? 100 : 45,
      current_time_sec: nextCompleted ? 0 : (existing?.current_time_sec ?? 1200),
    });

    useDynamicIslandStore.getState().pushActivity(
      nextCompleted ? "Marked Watched" : "Marked Unwatched",
      { detail: input.title, tone: nextCompleted ? "success" : "neutral" }
    );

    if (nextCompleted) {
      await useContinueWatchingStore.getState().removeItem(input.media_type, itemId);
    }
  },

  removeItem: async (media_type, id) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentItems = get().items;
    const nextItems = removeWatchHistoryEntry(currentItems, media_type, id);
    set({ items: nextItems });
    writeLocalWatchHistory(profile.id, nextItems);

    if (useContinueWatchingStore.getState().getEntry(media_type, id)) {
      void useContinueWatchingStore.getState().removeItem(media_type, id);
    }

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/watchHistory`,
        watchHistoryEntryKey(media_type, id)
      );
      await deleteDocument(docRef);
    } catch (e) {
      set({ items: currentItems });
      console.error("Failed to remove watch history entry", e);
    }
  },

  clearHistory: async (catalogMode) => {
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
      clearLocalWatchHistory(profile.id);
    } else {
      writeLocalWatchHistory(profile.id, remaining);
    }

    try {
      await Promise.all(
        toRemove.map((entry) => {
          const docRef = getDocRef(
            `users/${user.uid}/profiles/${profile.id}/watchHistory`,
            watchHistoryEntryKey(entry.media_type, getWatchHistoryItemId(entry))
          );
          return deleteDocument(docRef);
        })
      );
    } catch (e) {
      console.error("Failed to clear watch history", e);
    }
  },

  refreshLocalHistoryCache: async () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile || typeof window === "undefined") {
      return { clearedKeys: 0 };
    }

    const removedKeys = purgeLocalWatchedAndMediaCaches(window.localStorage, profile.id);

    if ("caches" in window) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      } catch {
        // Ignore CacheStorage errors
      }
    }

    try {
      const historyColRef = getCollectionRef(`users/${user.uid}/profiles/${profile.id}/watchHistory`);
      const cwColRef = getCollectionRef(`users/${user.uid}/profiles/${profile.id}/continueWatching`);

      const [historySnap, cwSnap] = await Promise.all([
        getCollectionDocs(historyColRef),
        getCollectionDocs(cwColRef),
      ]);

      const rawCloudHistory: WatchHistoryItem[] = [];
      historySnap.forEach((docSnap: { data: () => unknown }) => {
        rawCloudHistory.push(docSnap.data() as WatchHistoryItem);
      });

      const rawCloudCw: ContinueWatchingItem[] = [];
      cwSnap.forEach((docSnap: { data: () => unknown }) => {
        rawCloudCw.push(docSnap.data() as ContinueWatchingItem);
      });

      const { valid: cloudHistory, removed: removedHistory } =
        sanitizeWatchHistoryItems(rawCloudHistory);
      const { valid: cloudCw, removed: removedCw } =
        sanitizeContinueWatchingItems(rawCloudCw);

      if (removedHistory.length > 0 || removedCw.length > 0) {
        void Promise.all([
          ...removedHistory.map((entry) => {
            const id = getWatchHistoryItemId(entry);
            if (!id) return Promise.resolve();
            const docRef = getDocRef(
              `users/${user.uid}/profiles/${profile.id}/watchHistory`,
              watchHistoryEntryKey(entry.media_type, id)
            );
            return deleteDocument(docRef);
          }),
          ...removedCw.map((entry) => {
            const id = getContinueWatchingItemId(entry);
            if (!id) return Promise.resolve();
            const docRef = getDocRef(
              `users/${user.uid}/profiles/${profile.id}/continueWatching`,
              continueWatchingEntryKey(entry.media_type, id)
            );
            return deleteDocument(docRef);
          }),
        ]).catch(() => {});
      }

      const refreshed = mergeWatchHistory([], cloudHistory, cloudCw);
      set({ items: refreshed });
      useContinueWatchingStore.setState({ items: cloudCw });
      writeLocalWatchHistory(profile.id, refreshed);
      writeLocalContinueWatching(profile.id, cloudCw);
    } catch (e) {
      console.error("Failed to re-sync watch history after clearing local cache", e);
    }

    return { clearedKeys: Math.max(1, removedKeys.length) };
  },

  watchAgain: async (item) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    const targetUrl = buildRewatchUrl(item);

    if (!user || !profile) {
      return targetUrl;
    }

    const res = resetWatchHistoryProgress(get().items, item);
    if (!res) return targetUrl;

    const { entry, items: nextItems } = res;
    set({ items: nextItems });
    writeLocalWatchHistory(profile.id, nextItems);

    const itemId = getWatchHistoryItemId(entry);
    const key = watchHistoryEntryKey(entry.media_type, itemId);

    await useContinueWatchingStore.getState().removeItem(entry.media_type, itemId);

    if (entry.media_type === "tv" || entry.media_type === "anime") {
      void useEpisodeProgressStore.getState().resetEpisodeProgress(
        entry.media_type,
        itemId,
        entry.season ?? 1,
        entry.episode ?? 1
      );
    }

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/watchHistory`, key);
      await setDocument(docRef, entry);
    } catch (e) {
      console.error("Failed to persist watch again reset", e);
    }

    return targetUrl;
  },
}));
