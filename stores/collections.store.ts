import { create } from "zustand";
import {
  setDocument,
  getCollectionRef,
  getDocRef,
  listenToCollection,
  deleteDocument,
} from "@/lib/firebase";
import {
  createCollectionRecord,
  importLibraryBackupJson,
  readLocalCollections,
  sanitizeCustomCollections,
  toggleItemInCollection,
  validateCollectionInput,
  writeLocalCollections,
  type CustomCollection,
  type LibraryBackupSummary,
} from "@/lib/custom-collections";
import {
  getWatchHistoryItemId,
  watchHistoryEntryKey,
  writeLocalWatchHistory,
} from "@/lib/watch-history";
import { useSessionStore } from "./session.store";
import { useWatchlistStore } from "./watchlist.store";
import { useWatchHistoryStore } from "./watch-history.store";

export interface CustomCollectionsState {
  collections: CustomCollection[];
  hydrated: boolean;
  hydrateLocal: () => void;
  initCollections: () => () => void;
  createCollection: (input: {
    name: string;
    description?: string;
    initialMediaKey?: string;
  }) => Promise<{ ok: true; collection: CustomCollection } | { ok: false; error: string }>;
  renameCollection: (
    collectionId: string,
    input: { name: string; description?: string }
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteCollection: (collectionId: string) => Promise<void>;
  toggleItemInCollection: (collectionId: string, mediaKey: string) => Promise<void>;
  importLibraryJson: (
    rawJson: string,
    mode: "merge" | "replace"
  ) => Promise<{ ok: true; summary: LibraryBackupSummary } | { ok: false; error: string }>;
}

async function persistCollectionDoc(col: CustomCollection): Promise<void> {
  const session = useSessionStore.getState();
  if (!session.user || !session.currentProfile) return;
  try {
    const docRef = getDocRef(
      `users/${session.user.uid}/profiles/${session.currentProfile.id}/collections`,
      col.id
    );
    await setDocument(docRef, {
      id: col.id,
      name: col.name,
      description: col.description ?? null,
      itemKeys: col.itemKeys,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    });
  } catch (e) {
    console.error("Failed to sync custom collection to Firestore", e);
  }
}

export const useCustomCollectionsStore = create<CustomCollectionsState>((set, get) => ({
  collections: [],
  hydrated: false,

  hydrateLocal: () => {
    const profileId = useSessionStore.getState().currentProfile?.id ?? null;
    set({ collections: readLocalCollections(profileId), hydrated: true });
  },

  initCollections: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    const local = readLocalCollections(profile?.id ?? null);
    set({ collections: local, hydrated: true });

    if (!user || !profile) {
      return () => {};
    }

    const colRef = getCollectionRef(
      `users/${user.uid}/profiles/${profile.id}/collections`
    );
    return listenToCollection(colRef, (snapshot) => {
      const remoteList: unknown[] = [];
      snapshot.forEach((docSnap: any) => {
        remoteList.push(docSnap.data());
      });
      const sanitized = sanitizeCustomCollections(remoteList);
      set({ collections: sanitized, hydrated: true });
      writeLocalCollections(sanitized, profile.id);
    });
  },

  createCollection: async (input) => {
    const res = createCollectionRecord({
      name: input.name,
      description: input.description,
      itemKeys: input.initialMediaKey ? [input.initialMediaKey] : [],
    });
    if (!res.ok) return res;

    const profileId = useSessionStore.getState().currentProfile?.id ?? null;
    const next = [res.collection, ...get().collections];
    set({ collections: next });
    writeLocalCollections(next, profileId);
    await persistCollectionDoc(res.collection);
    return { ok: true, collection: res.collection };
  },

  renameCollection: async (collectionId, input) => {
    const validated = validateCollectionInput(input);
    if (!validated.ok) return validated;

    const current = get().collections;
    const target = current.find((c) => c.id === collectionId);
    if (!target) return { ok: false, error: "Collection not found." };

    const updated: CustomCollection = {
      ...target,
      name: validated.name,
      description: validated.description,
      updatedAt: new Date().toISOString(),
    };
    const next = current.map((c) => (c.id === collectionId ? updated : c));
    const profileId = useSessionStore.getState().currentProfile?.id ?? null;
    set({ collections: next });
    writeLocalCollections(next, profileId);
    await persistCollectionDoc(updated);
    return { ok: true };
  },

  deleteCollection: async (collectionId) => {
    const session = useSessionStore.getState();
    const profileId = session.currentProfile?.id ?? null;
    const next = get().collections.filter((c) => c.id !== collectionId);
    set({ collections: next });
    writeLocalCollections(next, profileId);

    if (session.user && session.currentProfile) {
      try {
        const docRef = getDocRef(
          `users/${session.user.uid}/profiles/${session.currentProfile.id}/collections`,
          collectionId
        );
        await deleteDocument(docRef);
      } catch (e) {
        console.error("Failed to delete custom collection", e);
      }
    }
  },

  toggleItemInCollection: async (collectionId, mediaKey) => {
    const current = get().collections;
    const target = current.find((c) => c.id === collectionId);
    if (!target) return;

    const updated = toggleItemInCollection(target, mediaKey);
    const next = current.map((c) => (c.id === collectionId ? updated : c));
    const profileId = useSessionStore.getState().currentProfile?.id ?? null;
    set({ collections: next });
    writeLocalCollections(next, profileId);
    await persistCollectionDoc(updated);
  },

  importLibraryJson: async (rawJson, mode) => {
    const watchlistStore = useWatchlistStore.getState();
    const historyStore = useWatchHistoryStore.getState();
    const currentCollections = get().collections;

    const result = importLibraryBackupJson(
      rawJson,
      {
        watchlist: watchlistStore.items,
        collections: currentCollections,
        watchHistory: historyStore.items,
      },
      mode
    );
    if (!result.ok) return result;

    const session = useSessionStore.getState();
    const profileId = session.currentProfile?.id ?? null;

    await watchlistStore.importItems(result.watchlist, mode === "replace");

    const prevCollectionIds = new Set(currentCollections.map((c) => c.id));
    const nextCollectionIds = new Set(result.collections.map((c) => c.id));
    set({ collections: result.collections });
    writeLocalCollections(result.collections, profileId);
    if (session.user && session.currentProfile) {
      if (mode === "replace") {
        await Promise.all(
          [...prevCollectionIds]
            .filter((id) => !nextCollectionIds.has(id))
            .map((id) =>
              deleteDocument(
                getDocRef(
                  `users/${session.user!.uid}/profiles/${session.currentProfile!.id}/collections`,
                  id
                )
              )
            )
        );
      }
      await Promise.all(result.collections.map((col) => persistCollectionDoc(col)));
    }

    if (profileId) {
      writeLocalWatchHistory(profileId, result.watchHistory);
    }
    useWatchHistoryStore.setState({ items: result.watchHistory });
    if (session.user && session.currentProfile) {
      await Promise.all(
        result.watchHistory.slice(0, 60).map((entry) => {
          const id = getWatchHistoryItemId(entry);
          if (!id) return Promise.resolve();
          const docRef = getDocRef(
            `users/${session.user!.uid}/profiles/${session.currentProfile!.id}/watchHistory`,
            watchHistoryEntryKey(entry.media_type, id)
          );
          return setDocument(docRef, entry);
        })
      );
    }

    return { ok: true, summary: result.summary };
  },
}));
