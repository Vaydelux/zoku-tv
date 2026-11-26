import { create } from "zustand";
import {
  setDocument,
  getCollectionRef,
  getDocRef,
  listenToOrderedCollection,
  deleteDocument,
} from "@/lib/firebase";
import type { MediaType } from "@/lib/media-types";
import { watchlistEntryKey, getWatchlistItemId } from "@/lib/media-types";
import { useSessionStore } from "./session.store";
import { useDynamicIslandStore } from "./ui.store";

export interface WatchlistItem {
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

export interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;
  initWatchlist: () => () => void;
  addItem: (input: {
    media_type: MediaType;
    tmdbId?: number;
    anilistId?: number;
    title?: string;
    creator?: string | null;
    genres?: string[] | null;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    release_date?: string | null;
  }) => Promise<void>;
  removeItem: (media_type: MediaType, id: number) => Promise<void>;
  hasItem: (media_type: MediaType, id: number) => boolean;
  clearWatchlist: (catalogMode?: "tmdb" | "anime" | "all") => Promise<void>;
  importItems: (nextItems: WatchlistItem[], replaceExisting: boolean) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  loading: false,

  initWatchlist: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    if (!user || !profile) {
      set({ items: [] });
      return () => {};
    }

    const colRef = getCollectionRef(`users/${user.uid}/profiles/${profile.id}/watchlist`);
    return listenToOrderedCollection(
      colRef,
      { orderByField: "added_at", direction: "desc", limitTo: 100 },
      (snapshot) => {
        const itemsList: WatchlistItem[] = [];
        snapshot.forEach((docSnap: any) => {
          itemsList.push(docSnap.data() as WatchlistItem);
        });
        set({ items: itemsList });
      }
    );
  },

  addItem: async (input) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const id = input.media_type === "anime" ? input.anilistId : input.tmdbId;
    if (!id) return;

    const added_at = new Date().toISOString();
    const newItem: WatchlistItem = { ...input, added_at };
    const currentItems = get().items;

    if (
      currentItems.some(
        (item) => item.media_type === input.media_type && getWatchlistItemId(item) === id
      )
    ) {
      return;
    }

    set({ items: [...currentItems, newItem] });
    useDynamicIslandStore.getState().pushActivity("Saved to Watchlist", {
      detail: input.title,
      tone: "success",
    });

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/watchlist`,
        watchlistEntryKey(input.media_type, id)
      );
      await setDocument(docRef, newItem);
    } catch (e) {
      set({ items: currentItems });
      console.error("Failed to add to watchlist", e);
    }
  },

  removeItem: async (media_type, id) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentItems = get().items;
    const target = currentItems.find(
      (item) => item.media_type === media_type && getWatchlistItemId(item) === id
    );
    set({
      items: currentItems.filter(
        (item) => !(item.media_type === media_type && getWatchlistItemId(item) === id)
      ),
    });
    useDynamicIslandStore.getState().pushActivity("Removed from List", {
      detail: target?.title,
      tone: "neutral",
    });

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/watchlist`,
        watchlistEntryKey(media_type, id)
      );
      await deleteDocument(docRef);
    } catch (e) {
      set({ items: currentItems });
      console.error("Failed to remove from watchlist", e);
    }
  },

  hasItem: (media_type, id) => {
    return get().items.some(
      (item) => item.media_type === media_type && getWatchlistItemId(item) === id
    );
  },

  clearWatchlist: async (catalogMode?: "tmdb" | "anime" | "all") => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentItems = get().items;
    const toRemove =
      !catalogMode || catalogMode === "all"
        ? currentItems
        : currentItems.filter((item) =>
            catalogMode === "anime"
              ? item.media_type === "anime"
              : item.media_type === "movie" || item.media_type === "tv"
          );

    const remaining =
      !catalogMode || catalogMode === "all"
        ? []
        : currentItems.filter((item) =>
            catalogMode === "anime"
              ? item.media_type !== "anime"
              : item.media_type === "anime"
          );

    set({ items: remaining });

    try {
      await Promise.all(
        toRemove.map((entry) => {
          const id = getWatchlistItemId(entry);
          if (!id) return Promise.resolve();
          const docRef = getDocRef(
            `users/${user.uid}/profiles/${profile.id}/watchlist`,
            watchlistEntryKey(entry.media_type, id)
          );
          return deleteDocument(docRef);
        })
      );
    } catch (e) {
      set({ items: currentItems });
      console.error("Failed to clear watchlist", e);
    }
  },

  importItems: async (nextItems, replaceExisting) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    const previous = get().items;

    set({ items: nextItems });
    if (!user || !profile) return;

    try {
      const nextKeys = new Set(
        nextItems
          .map((item) => {
            const id = getWatchlistItemId(item);
            return id ? watchlistEntryKey(item.media_type, id) : null;
          })
          .filter((k): k is string => Boolean(k))
      );

      if (replaceExisting) {
        await Promise.all(
          previous.map((entry) => {
            const id = getWatchlistItemId(entry);
            if (!id) return Promise.resolve();
            const key = watchlistEntryKey(entry.media_type, id);
            if (nextKeys.has(key)) return Promise.resolve();
            const docRef = getDocRef(
              `users/${user.uid}/profiles/${profile.id}/watchlist`,
              key
            );
            return deleteDocument(docRef);
          })
        );
      }

      await Promise.all(
        nextItems.map((entry) => {
          const id = getWatchlistItemId(entry);
          if (!id) return Promise.resolve();
          const docRef = getDocRef(
            `users/${user.uid}/profiles/${profile.id}/watchlist`,
            watchlistEntryKey(entry.media_type, id)
          );
          return setDocument(docRef, entry);
        })
      );
    } catch (e) {
      console.error("Failed to sync imported watchlist items", e);
    }
  },
}));
