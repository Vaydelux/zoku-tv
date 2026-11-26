import { create } from "zustand";
import { setDocument, getDocument, getDocRef } from "@/lib/firebase";
import { useSessionStore } from "./session.store";

export interface SearchHistoryState {
  history: string[];
  loadHistory: () => Promise<void>;
  addQuery: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  history: [],

  loadHistory: async () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) {
      set({ history: [] });
      return;
    }
    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/searchHistory`, "list");
      const snap = await getDocument(docRef);
      if (snap.exists()) {
        set({ history: snap.data()?.history || [] });
      } else {
        set({ history: [] });
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    }
  },

  addQuery: async (queryStr) => {
    const trimmed = queryStr.trim();
    if (!trimmed) return;

    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const currentHistory = get().history;
    const filtered = currentHistory.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    const newHistory = [trimmed, ...filtered].slice(0, 10);

    set({ history: newHistory });

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/searchHistory`, "list");
      await setDocument(docRef, {
        history: newHistory,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  },

  clearHistory: async () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    set({ history: [] });

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/searchHistory`, "list");
      await setDocument(docRef, {
        history: [],
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to clear search history", e);
    }
  },
}));
