// Zoku TV Zustand Stores Configuration
import { create } from "zustand";
import { 
  auth, 
  onAuthChanged, 
  setDocument, 
  getDocument, 
  getCollectionRef, 
  getDocRef,
  listenToCollection,
  listenToOrderedCollection,
  listenToDoc,
  updateDocument,
  deleteDocument
} from "@/lib/firebase";
import {
  applyTheme,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID,
  normalizeAppearance,
} from "@/lib/themes";
import { canAddProfile, MAX_PROFILES } from "@/lib/profile-limits";
import {
  COMPLETION_THRESHOLD_PERCENT,
  MAX_CONTINUE_WATCHING_ITEMS,
  RECORD_DEBOUNCE_MS,
  clearLocalContinueWatching,
  continueWatchingEntryKey,
  getContinueWatchingItemId,
  mergeContinueWatching,
  readLocalContinueWatching,
  writeLocalContinueWatching,
  type ContinueWatchingItem,
} from "@/lib/continue-watching";
import type { CatalogMode, MediaType } from "@/lib/media-types";
import { watchlistEntryKey, getWatchlistItemId } from "@/lib/media-types";

// === TYPES ===

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  avatarColor?: string;
  kidMode: boolean;
  themePreference: string;
  appearancePreference?: "dark" | "light";
  iframeModePreference: "Strict" | "Compatibility";
  catalogMode: CatalogMode;
  homeGenreRailPreferences: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WatchlistItem {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  added_at: string;
  title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
}

// === 1. SESSION & PROFILE STORE ===

interface SessionState {
  user: any | null;
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  initializing: boolean;
  setProfile: (profile: Profile | null) => void;
  createProfile: (name: string, avatar: string, kidMode: boolean, avatarColor?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  initSession: () => () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  profiles: [],
  currentProfile: null,
  loading: false,
  initializing: true,

  setProfile: (profile) => {
    set({ currentProfile: profile });
    if (profile && typeof window !== "undefined") {
      localStorage.setItem(`zoku_active_profile_${get().user?.uid}`, JSON.stringify(profile));
      applyTheme(
        profile.themePreference,
        normalizeAppearance(profile.appearancePreference ?? DEFAULT_APPEARANCE)
      );
    }
  },

  createProfile: async (name, avatar, kidMode, avatarColor) => {
    const { user, profiles } = get();
    if (!user) {
      return { success: false, error: "You must be signed in to create a profile." };
    }
    if (!canAddProfile(profiles.length)) {
      return {
        success: false,
        error: `Maximum of ${MAX_PROFILES} profiles reached. Delete one to add another.`,
      };
    }

    set({ loading: true });
    try {
      const profileId = "profile_" + Math.random().toString(36).substr(2, 9);
      const now = new Date().toISOString();
      const newProfile: Profile = {
        id: profileId,
        name,
        avatar,
        avatarColor,
        kidMode,
        themePreference: DEFAULT_THEME_ID,
        appearancePreference: DEFAULT_APPEARANCE,
        iframeModePreference: "Strict",
        catalogMode: "tmdb",
        homeGenreRailPreferences: [28, 12, 35, 18], // Action, Adventure, Comedy, Drama
        createdAt: now,
        updatedAt: now,
      };

      const docRef = getDocRef(`users/${user.uid}/profiles`, profileId);
      await setDocument(docRef, newProfile);
      return { success: true };
    } catch (e) {
      console.error("Failed to create profile", e);
      return { success: false, error: "Could not create profile. Please try again." };
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (profileId, updates) => {
    const { user, currentProfile } = get();
    if (!user) return;
    try {
      const docRef = getDocRef(`users/${user.uid}/profiles`, profileId);
      await setDocument(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      if (currentProfile && currentProfile.id === profileId) {
        const updated = { ...currentProfile, ...updates };
        set({ currentProfile: updated });
        if (typeof window !== "undefined") {
          localStorage.setItem(`zoku_active_profile_${user.uid}`, JSON.stringify(updated));
          if (updates.themePreference !== undefined || updates.appearancePreference !== undefined) {
            applyTheme(
              updated.themePreference,
              normalizeAppearance(updated.appearancePreference ?? DEFAULT_APPEARANCE)
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to update profile", e);
    }
  },

  deleteProfile: async (profileId) => {
    const { user, currentProfile } = get();
    if (!user) return;
    try {
      const docRef = getDocRef(`users/${user.uid}/profiles`, profileId);
      await deleteDocument(docRef);
      if (currentProfile && currentProfile.id === profileId) {
        set({ currentProfile: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem(`zoku_active_profile_${user.uid}`);
        }
      }
    } catch (e) {
      console.error("Failed to delete profile", e);
    }
  },

  initSession: () => {
    let unsubscribeProfiles: (() => void) | null = null;

    const unsubscribeAuth = onAuthChanged((firebaseUser) => {
      if (unsubscribeProfiles) {
        unsubscribeProfiles();
        unsubscribeProfiles = null;
      }

      if (firebaseUser) {
        set({ user: firebaseUser, initializing: false });

        const colRef = getCollectionRef(`users/${firebaseUser.uid}/profiles`);
        unsubscribeProfiles = listenToCollection(colRef, (snapshot) => {
          const profilesList: Profile[] = [];
          snapshot.forEach((docSnap: any) => {
            profilesList.push({ id: docSnap.id, ...docSnap.data() } as Profile);
          });

          profilesList.sort((a, b) => {
            const aTime = a.createdAt ?? "";
            const bTime = b.createdAt ?? "";
            return aTime.localeCompare(bTime);
          });

          const normalizedProfiles = profilesList.map((p) => ({
            ...p,
            catalogMode: p.catalogMode ?? "tmdb",
            appearancePreference: normalizeAppearance(
              p.appearancePreference ?? DEFAULT_APPEARANCE
            ),
          }));

          set({ profiles: normalizedProfiles });

          if (normalizedProfiles.length > 0) {
            const stored = localStorage.getItem(`zoku_active_profile_${firebaseUser.uid}`);
            const matched = stored ? normalizedProfiles.find(p => p.id === JSON.parse(stored).id) : null;
            if (matched) {
              set({ currentProfile: { ...matched, catalogMode: matched.catalogMode ?? "tmdb" } });
              applyTheme(matched.themePreference, matched.appearancePreference);
            } else if (!get().currentProfile) {
              if (normalizedProfiles.length === 1) {
                set({ currentProfile: { ...normalizedProfiles[0], catalogMode: normalizedProfiles[0].catalogMode ?? "tmdb" } });
                applyTheme(
                  normalizedProfiles[0].themePreference,
                  normalizedProfiles[0].appearancePreference
                );
              }
            }
          } else {
            set({ currentProfile: null });
          }
        });
      } else {
        set({ user: null, profiles: [], currentProfile: null, initializing: false });
        applyTheme(DEFAULT_THEME_ID, DEFAULT_APPEARANCE);
      }
    });

    return () => {
      if (unsubscribeProfiles) {
        unsubscribeProfiles();
      }
      unsubscribeAuth();
    };
  }
}));

// === 2. WATCHLIST STORE ===

interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;
  initWatchlist: () => () => void;
  addItem: (input: {
    media_type: MediaType;
    tmdbId?: number;
    anilistId?: number;
    title?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
  }) => Promise<void>;
  removeItem: (media_type: MediaType, id: number) => Promise<void>;
  hasItem: (media_type: MediaType, id: number) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  loading: false,

  initWatchlist: () => {
    // We listen to the current active profile's watchlist
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
    });
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

    if (currentItems.some((item) => item.media_type === input.media_type && getWatchlistItemId(item) === id)) return;

    set({ items: [...currentItems, newItem] });

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
    set({
      items: currentItems.filter(
        (item) => !(item.media_type === media_type && getWatchlistItemId(item) === id)
      ),
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
    return get().items.some((item) => item.media_type === media_type && getWatchlistItemId(item) === id);
  }
}));

// === 2b. CONTINUE WATCHING STORE ===

type ContinueWatchingRecordInput = {
  media_type: MediaType;
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  title: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  progress_percent?: number;
  current_time_sec?: number;
  duration_sec?: number;
};

interface ContinueWatchingState {
  items: ContinueWatchingItem[];
  initContinueWatching: () => () => void;
  getEntry: (media_type: MediaType, id: number) => ContinueWatchingItem | undefined;
  recordWatching: (input: ContinueWatchingRecordInput) => void;
  recordProgress: (input: ContinueWatchingRecordInput) => void;
  removeItem: (media_type: MediaType, id: number) => Promise<void>;
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

  if (progressPercent != null && progressPercent >= COMPLETION_THRESHOLD_PERCENT) {
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

  try {
    const docRef = getDocRef(colPath, key);
    await setDocument(docRef, entry);
  } catch (e) {
    writeLocalContinueWatching(profileId, nextItems);
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
        const cloudItems: ContinueWatchingItem[] = [];
        snapshot.forEach((docSnap: { data: () => ContinueWatchingItem }) => {
          cloudItems.push(docSnap.data() as ContinueWatchingItem);
        });

        if (localItems.length > 0) {
          void mergeLocalIntoCloud(cloudItems);
        } else {
          set({ items: cloudItems });
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
    set({
      items: currentItems.filter(
        (item) => !(item.media_type === media_type && getContinueWatchingItemId(item) === id)
      ),
    });

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
}));

// === 3. EMBED & IFRAME PREFERENCE STORE ===

interface EmbedState {
  selectedServerId: string;
  iframeMode: "Strict" | "Compatibility";
  serverHealth: Record<string, { status: "good" | "failing"; lastTested: number }>;
  setServerId: (id: string) => void;
  setIframeMode: (mode: "Strict" | "Compatibility") => void;
  markServerFailing: (id: string) => void;
  resetHealth: () => void;
}

export const useEmbedStore = create<EmbedState>((set, get) => ({
  selectedServerId: "vidsrc",
  iframeMode: "Strict",
  serverHealth: {},

  setServerId: (id) => {
    set({ selectedServerId: id });
    if (typeof window !== "undefined") {
      localStorage.setItem("zoku_selected_server_id", id);
    }
  },

  setIframeMode: (mode) => {
    set({ iframeMode: mode });
    if (typeof window !== "undefined") {
      localStorage.setItem("zoku_iframe_mode", mode);
    }
    // Also sync back to profile preferences if a profile is active
    const session = useSessionStore.getState();
    if (session.user && session.currentProfile) {
      session.updateProfile(session.currentProfile.id, { iframeModePreference: mode });
    }
  },

  markServerFailing: (id) => {
    const health = { ...get().serverHealth };
    health[id] = { status: "failing", lastTested: Date.now() };
    set({ serverHealth: health });
  },

  resetHealth: () => set({ serverHealth: {} })
}));

// Initialize Embed preferences from localStorage on startup if in browser
if (typeof window !== "undefined") {
  const savedServer = localStorage.getItem("zoku_selected_server_id");
  const savedMode = localStorage.getItem("zoku_iframe_mode");
  if (savedServer) useEmbedStore.setState({ selectedServerId: savedServer });
  if (savedMode) useEmbedStore.setState({ iframeMode: savedMode as "Strict" | "Compatibility" });
}

// === 4. SEARCH HISTORY STORE ===

interface SearchHistoryState {
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
    // Deduplicate and cap at 10 items
    const filtered = currentHistory.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
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
  }
}));

// Re-export authentication helpers for clean access from page controllers
export { 
  loginWithEmail, 
  signupWithEmail, 
  loginWithGoogle,
  signInWithGoogle,
  logout 
} from "@/lib/firebase";

