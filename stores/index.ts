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
import { applyTheme, DEFAULT_THEME_ID } from "@/lib/themes";
import { canAddProfile, MAX_PROFILES } from "@/lib/profile-limits";

// === TYPES ===

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  avatarColor?: string;
  kidMode: boolean;
  themePreference: string;
  iframeModePreference: "Strict" | "Compatibility";
  homeGenreRailPreferences: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WatchlistItem {
  tmdbId: number;
  media_type: "movie" | "tv";
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
      applyTheme(profile.themePreference);
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
        iframeModePreference: "Strict",
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
          if (updates.themePreference) {
            applyTheme(updates.themePreference);
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

          set({ profiles: profilesList });

          if (profilesList.length > 0) {
            const stored = localStorage.getItem(`zoku_active_profile_${firebaseUser.uid}`);
            const matched = stored ? profilesList.find(p => p.id === JSON.parse(stored).id) : null;
            if (matched) {
              set({ currentProfile: matched });
              applyTheme(matched.themePreference);
            } else if (!get().currentProfile) {
              if (profilesList.length === 1) {
                set({ currentProfile: profilesList[0] });
                applyTheme(profilesList[0].themePreference);
              }
            }
          } else {
            set({ currentProfile: null });
          }
        });
      } else {
        set({ user: null, profiles: [], currentProfile: null, initializing: false });
        applyTheme(DEFAULT_THEME_ID);
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
  addItem: (tmdbId: number, media_type: "movie" | "tv", title?: string, poster_path?: string | null, backdrop_path?: string | null, vote_average?: number) => Promise<void>;
  removeItem: (tmdbId: number, media_type: "movie" | "tv") => Promise<void>;
  hasItem: (tmdbId: number, media_type: "movie" | "tv") => boolean;
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

  addItem: async (tmdbId, media_type, title, poster_path, backdrop_path, vote_average) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    // Optimistic Update
    const added_at = new Date().toISOString();
    const newItem: WatchlistItem = { tmdbId, media_type, added_at, title, poster_path, backdrop_path, vote_average };
    const currentItems = get().items;
    
    if (currentItems.some(item => item.tmdbId === tmdbId && item.media_type === media_type)) return;
    
    set({ items: [...currentItems, newItem] });

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/watchlist`, `${media_type}_${tmdbId}`);
      await setDocument(docRef, newItem);
    } catch (e) {
      // Revert optimistic update
      set({ items: currentItems });
      console.error("Failed to add to watchlist", e);
    }
  },

  removeItem: async (tmdbId, media_type) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    // Optimistic Update
    const currentItems = get().items;
    set({ items: currentItems.filter(item => !(item.tmdbId === tmdbId && item.media_type === media_type)) });

    try {
      const docRef = getDocRef(`users/${user.uid}/profiles/${profile.id}/watchlist`, `${media_type}_${tmdbId}`);
      await deleteDocument(docRef);
    } catch (e) {
      // Revert optimistic update
      set({ items: currentItems });
      console.error("Failed to remove from watchlist", e);
    }
  },

  hasItem: (tmdbId, media_type) => {
    return get().items.some(item => item.tmdbId === tmdbId && item.media_type === media_type);
  }
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
  selectedServerId: "vidsrc-to",
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

