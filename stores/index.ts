// Zoku TV Zustand Stores Configuration
import { create } from "zustand";
import { 
  auth, 
  onAuthChanged, 
  setDocument, 
  getDocument, 
  getCollectionRef, 
  getDocRef,
  getCollectionDocs,
  listenToCollection,
  listenToOrderedCollection,
  listenToDoc,
  updateDocument,
  deleteDocument,
  purgeProfileData,
} from "@/lib/firebase";
import {
  applyTheme,
  BRAND_THEME_ID,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID,
  normalizeAppearance,
} from "@/lib/themes";
import { canAddProfile, MAX_PROFILES } from "@/lib/profile-limits";
import { EMBED_SERVER_CATALOG } from "@/lib/embed";
import { ANIME_EMBED_SERVER_CATALOG } from "@/lib/anime-embed";
import {
  createDefaultServerConfig,
  DEFAULT_ACTIVE_ANIME_SERVER_IDS,
  DEFAULT_ACTIVE_TMDB_SERVER_IDS,
  importServerConfigJson,
  readLocalServerConfig,
  sanitizeDynamicServerConfig,
  validateCustomAnimeServer,
  validateCustomTmdbServer,
  writeLocalServerConfig,
  type CustomAnimeServer,
  type CustomAnimeServerInput,
  type CustomTmdbServer,
  type CustomTmdbServerInput,
  type DynamicServerConfig,
  type ImportServerSummary,
} from "@/lib/dynamic-servers";
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
import { getVideos, type TMDBVideo } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
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
import {
  episodeProgressKey,
  mergeEpisodeProgress,
  readLocalEpisodeProgress,
  resetEpisodeProgressRecord,
  upsertEpisodeProgressRecord,
  writeLocalEpisodeProgress,
  type EpisodeProgressRecord,
  type EpisodeProgressUpsertInput,
} from "@/lib/episode-progress";
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
  creator?: string | null;
  genres?: string[] | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string | null;
}

// === 1. SESSION & PROFILE STORE ===

const profilesCacheKey = (uid: string) => `zoku_profiles_cache_${uid}`;

function normalizeProfile(p: Profile): Profile {
  return {
    ...p,
    catalogMode: p.catalogMode ?? "tmdb",
    appearancePreference: normalizeAppearance(
      p.appearancePreference ?? DEFAULT_APPEARANCE
    ),
  };
}

function readProfilesCache(uid: string): Profile[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(profilesCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalizeProfile);
  } catch {
    return null;
  }
}

function writeProfilesCache(uid: string, profiles: Profile[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(profilesCacheKey(uid), JSON.stringify(profiles));
  } catch {
    /* quota / private mode */
  }
}

function readStoredActiveProfileId(uid: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`zoku_active_profile_${uid}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

function profilesFromSnapshot(snapshot: { forEach: (cb: (doc: any) => void) => void }): Profile[] {
  const profilesList: Profile[] = [];
  snapshot.forEach((docSnap: any) => {
    profilesList.push({ id: docSnap.id, ...docSnap.data() } as Profile);
  });
  profilesList.sort((a, b) => {
    const aTime = a.createdAt ?? "";
    const bTime = b.createdAt ?? "";
    return aTime.localeCompare(bTime);
  });
  return profilesList.map(normalizeProfile);
}

interface SessionState {
  user: any | null;
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  initializing: boolean;
  profilesReady: boolean;
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
  profilesReady: false,

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
    const { user } = get();
    if (!user) throw new Error("Sign in before saving profile preferences.");
    try {
      const updatedAt = new Date().toISOString();
      const docRef = getDocRef(`users/${user.uid}/profiles`, profileId);
      // Await the actual write rather than showing a false success if Firestore
      // rejects it (permission, connectivity, invalid profile document).
      // This profile must already exist; never silently attempt a partial create.
      await updateDocument(docRef, { ...updates, updatedAt });

      const { profiles, currentProfile } = get();
      const updatedProfiles = profiles.map((profile) =>
        profile.id === profileId ? normalizeProfile({ ...profile, ...updates, updatedAt }) : profile
      );
      const updatedCurrent = currentProfile?.id === profileId
        ? normalizeProfile({ ...currentProfile, ...updates, updatedAt })
        : currentProfile;
      set({ profiles: updatedProfiles, currentProfile: updatedCurrent });
      writeProfilesCache(user.uid, updatedProfiles);

      if (updatedCurrent && currentProfile?.id === profileId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`zoku_active_profile_${user.uid}`, JSON.stringify(updatedCurrent));
        } catch { /* Storage may be blocked; Firestore is the source of truth. */ }
        if (updates.themePreference !== undefined || updates.appearancePreference !== undefined) {
          applyTheme(
            updatedCurrent.themePreference,
            normalizeAppearance(updatedCurrent.appearancePreference ?? DEFAULT_APPEARANCE)
          );
        }
      }
    } catch (e) {
      console.error("Failed to update profile", e);
      throw e;
    }
  },

  deleteProfile: async (profileId) => {
    const { user, currentProfile } = get();
    if (!user) return;
    try {
      await purgeProfileData(user.uid, profileId);
      clearLocalContinueWatching(profileId);
      clearLocalWatchHistory(profileId);
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
    let profilesBootGeneration = 0;

    const applyProfilesList = (
      uid: string,
      normalizedProfiles: Profile[],
      options?: { persistCache?: boolean; finishBoot?: boolean }
    ) => {
      const persistCache = options?.persistCache !== false;
      const finishBoot = options?.finishBoot !== false;

      if (persistCache) {
        writeProfilesCache(uid, normalizedProfiles);
      }

      const storedId = readStoredActiveProfileId(uid);
      const matched = storedId
        ? normalizedProfiles.find((p) => p.id === storedId)
        : null;

      // Restore currentProfile for routing only — do NOT applyTheme here.
      // Brand routes stay on Crimson; ClientInitializer applies profile theme in-app.
      let nextCurrent = get().currentProfile;
      if (matched) {
        nextCurrent = matched;
      } else if (normalizedProfiles.length === 0) {
        nextCurrent = null;
      } else if (
        nextCurrent &&
        !normalizedProfiles.some((p) => p.id === nextCurrent!.id)
      ) {
        nextCurrent = null;
      } else if (!nextCurrent && normalizedProfiles.length === 1) {
        nextCurrent = normalizedProfiles[0];
      }

      set({
        profiles: normalizedProfiles,
        currentProfile: nextCurrent,
        ...(finishBoot
          ? { initializing: false, profilesReady: true }
          : { profilesReady: true }),
      });
    };

    const unsubscribeAuth = onAuthChanged((firebaseUser) => {
      if (unsubscribeProfiles) {
        unsubscribeProfiles();
        unsubscribeProfiles = null;
      }

      profilesBootGeneration += 1;
      const bootId = profilesBootGeneration;

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const cached = readProfilesCache(uid);

        if (cached) {
          // Instant paint from last visit — no empty "Add Profile" flash
          applyProfilesList(uid, cached, { persistCache: false, finishBoot: true });
          set({ user: firebaseUser });
        } else {
          // Hold splash until first Firestore profiles result
          set({
            user: firebaseUser,
            profiles: [],
            currentProfile: null,
            profilesReady: false,
            initializing: true,
          });
        }

        const colRef = getCollectionRef(`users/${uid}/profiles`);
        let liveSnapshotReceived = false;

        const ingestSnapshot = (snapshot: any) => {
          if (bootId !== profilesBootGeneration) return;
          applyProfilesList(uid, profilesFromSnapshot(snapshot));
        };

        // Don't hang forever if Firestore is slow/offline
        const bootTimeout = window.setTimeout(() => {
          if (bootId !== profilesBootGeneration) return;
          if (get().initializing) {
            set({ initializing: false, profilesReady: true });
          }
        }, 8000);

        // Race a one-shot getDocs with the live listener for faster cold start
        void getCollectionDocs(colRef)
          .then((snapshot) => {
            if (bootId !== profilesBootGeneration) return;
            window.clearTimeout(bootTimeout);
            // The one-shot fetch may resolve AFTER an onSnapshot update. Do not
            // replace a newer live profile with a stale one-shot snapshot.
            if (!liveSnapshotReceived) ingestSnapshot(snapshot);
          })
          .catch((err) => {
            console.error("Failed to prefetch profiles", err);
            if (bootId !== profilesBootGeneration) return;
            if (!get().profilesReady) {
              window.clearTimeout(bootTimeout);
              set({ initializing: false, profilesReady: true });
            }
          });

        unsubscribeProfiles = listenToCollection(colRef, (snapshot) => {
          liveSnapshotReceived = true;
          window.clearTimeout(bootTimeout);
          ingestSnapshot(snapshot);
        });
      } else {
        const previousUid = get().user?.uid as string | undefined;
        if (previousUid && typeof window !== "undefined") {
          try {
            localStorage.removeItem(profilesCacheKey(previousUid));
          } catch {
            /* ignore */
          }
        }
        set({
          user: null,
          profiles: [],
          currentProfile: null,
          initializing: false,
          profilesReady: true,
        });
        applyTheme(BRAND_THEME_ID, "dark");
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

// === 2b. CONTINUE WATCHING STORE ===

type ContinueWatchingRecordInput = {
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

interface ContinueWatchingState {
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

  // Always record into Watch History (marking completed when >= threshold)
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

// === 2c. WATCH HISTORY STORE ===

interface WatchHistoryState {
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

    if (nextCompleted) {
      // Completed items move out of Continue Watching and live in Watch History
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

    // Also remove from Continue Watching if present so mergeWatchHistory doesn't resurrect it
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

    // Remove or reset old progress from Continue Watching so it starts at 0%
    await useContinueWatchingStore.getState().removeItem(entry.media_type, itemId);

    // If TV or Anime, also reset episode 1 progress to 0% so episode thumbnail shows clean start
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

// === 2d. EPISODE PROGRESS STORE ===

interface EpisodeProgressState {
  records: Record<string, EpisodeProgressRecord>;
  initEpisodeProgress: () => () => void;
  getProgress: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => EpisodeProgressRecord | null;
  getProgressPercent: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => number;
  isEpisodeCompleted: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => boolean;
  recordEpisodeProgress: (input: EpisodeProgressUpsertInput) => Promise<void>;
  resetEpisodeProgress: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => Promise<void>;
}

export const useEpisodeProgressStore = create<EpisodeProgressState>((set, get) => ({
  records: {},

  initEpisodeProgress: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    if (!user || !profile) {
      set({ records: {} });
      return () => {};
    }

    const profileId = profile.id;
    const colPath = `users/${user.uid}/profiles/${profileId}/episodeProgress`;
    const localRecords = readLocalEpisodeProgress(profileId);
    set({ records: localRecords });

    const colRef = getCollectionRef(colPath);
    const unsubscribe = listenToCollection(colRef, (snapshot) => {
      const cloudRecords: EpisodeProgressRecord[] = [];
      snapshot.forEach((docSnap: { data: () => EpisodeProgressRecord }) => {
        cloudRecords.push(docSnap.data() as EpisodeProgressRecord);
      });

      const currentLocal = readLocalEpisodeProgress(profileId);
      const merged = mergeEpisodeProgress(currentLocal, cloudRecords);
      set({ records: merged });
      writeLocalEpisodeProgress(profileId, merged);
    });

    return unsubscribe;
  },

  getProgress: (media_type, id, season, episode) => {
    const key = episodeProgressKey(media_type, id, season, episode);
    return get().records[key] ?? null;
  },

  getProgressPercent: (media_type, id, season, episode) => {
    const rec = get().getProgress(media_type, id, season, episode);
    return rec ? rec.progress_percent : 0;
  },

  isEpisodeCompleted: (media_type, id, season, episode) => {
    const rec = get().getProgress(media_type, id, season, episode);
    return Boolean(rec?.completed);
  },

  recordEpisodeProgress: async (input) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const res = upsertEpisodeProgressRecord(get().records, input);
    if (!res) return;

    const { key, record, records } = res;
    set({ records });
    writeLocalEpisodeProgress(profile.id, records);

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/episodeProgress`,
        key
      );
      await setDocument(docRef, record);
    } catch (e) {
      console.error("Failed to persist episode progress", e);
    }
  },

  resetEpisodeProgress: async (media_type, id, season, episode) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const res = resetEpisodeProgressRecord(get().records, media_type, id, season, episode);
    set({ records: res.records });
    writeLocalEpisodeProgress(profile.id, res.records);

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/episodeProgress`,
        res.key
      );
      await setDocument(docRef, res.record);
    } catch (e) {
      console.error("Failed to reset episode progress", e);
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
  hydrateEmbedPreferences: () => void;
}

export const useEmbedStore = create<EmbedState>((set, get) => ({
  selectedServerId: "vidsrc",
  iframeMode: "Strict",
  serverHealth: {},

  setServerId: (id) => {
    const customTmdb = useDynamicServerStore.getState().config.customTmdbServers;
    const valid =
      EMBED_SERVER_CATALOG.some((server) => server.id === id) ||
      customTmdb.some((server) => server.id === id);
    const nextId = valid ? id : "vidsrc";
    set({ selectedServerId: nextId });
    if (typeof window !== "undefined") {
      try { localStorage.setItem("zoku_selected_server_id", nextId); } catch { /* private mode */ }
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
      void session.updateProfile(session.currentProfile.id, { iframeModePreference: mode })
        .catch((error) => console.error("Failed to save iframe preference", error));
    }
  },

  markServerFailing: (id) => {
    const health = { ...get().serverHealth };
    health[id] = { status: "failing", lastTested: Date.now() };
    set({ serverHealth: health });
  },

  resetHealth: () => set({ serverHealth: {} }),

  hydrateEmbedPreferences: () => {
    if (typeof window === "undefined") return;
    try {
      const savedServer = localStorage.getItem("zoku_selected_server_id");
      const savedMode = localStorage.getItem("zoku_iframe_mode");
      const updates: Partial<EmbedState> = {};
      if (savedServer) {
        const dynamicCfg =
          useDynamicServerStore.getState().config.customTmdbServers.length > 0
            ? useDynamicServerStore.getState().config
            : readLocalServerConfig(useSessionStore.getState().currentProfile?.id);
        const isKnownServer =
          EMBED_SERVER_CATALOG.some((server) => server.id === savedServer) ||
          dynamicCfg.customTmdbServers.some((server) => server.id === savedServer);
        if (isKnownServer) {
          updates.selectedServerId = savedServer;
        } else {
          // Retired domains must never remain selected after a catalog update.
          updates.selectedServerId = "vidsrc";
          localStorage.removeItem("zoku_selected_server_id");
        }
      }
      if (savedMode === "Strict" || savedMode === "Compatibility") {
        updates.iframeMode = savedMode;
      }
      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch {
      /* ignore storage errors */
    }
  },
}));

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

export interface RailFilterOption {
  id: string;
  label: string;
}

export type RailSortMode =
  | "popularity"
  | "newest"
  | "ratings"
  | "most_watched";

interface RailFilterState {
  activeFilter: string;
  filterOptions: RailFilterOption[];
  railSort: RailSortMode;
  setActiveFilter: (filterId: string) => void;
  setFilterOptions: (options: RailFilterOption[]) => void;
  setRailSort: (sort: RailSortMode) => void;
}

export const useRailFilterStore = create<RailFilterState>((set) => ({
  activeFilter: "all",
  filterOptions: [],
  railSort: "popularity",
  setActiveFilter: (filterId: string) => set({ activeFilter: filterId }),
  setFilterOptions: (options: RailFilterOption[]) => set({ filterOptions: options }),
  setRailSort: (sort: RailSortMode) => set({ railSort: sort }),
}));

// === 5. DYNAMIC PLAYBACK SERVERS STORE ===

interface DynamicServerState {
  config: DynamicServerConfig;
  hydrated: boolean;
  hydrateLocal: () => void;
  initDynamicServers: () => () => void;
  addBuiltInServer: (kind: "tmdb" | "anime", serverId: string) => Promise<void>;
  removeActiveServer: (kind: "tmdb" | "anime", serverId: string) => Promise<void>;
  moveActiveServer: (
    kind: "tmdb" | "anime",
    serverId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  addAllBuiltIns: (kind: "tmdb" | "anime") => Promise<void>;
  resetDefaults: (kind: "tmdb" | "anime") => Promise<void>;
  addCustomTmdbServer: (
    input: CustomTmdbServerInput
  ) => Promise<{ ok: true; server: CustomTmdbServer } | { ok: false; error: string }>;
  addCustomAnimeServer: (
    input: CustomAnimeServerInput
  ) => Promise<{ ok: true; server: CustomAnimeServer } | { ok: false; error: string }>;
  deleteCustomServer: (kind: "tmdb" | "anime", serverId: string) => Promise<void>;
  importConfigJson: (
    rawJson: string,
    mode: "merge" | "replace"
  ) => Promise<
    { ok: true; config: DynamicServerConfig; summary: ImportServerSummary } | { ok: false; error: string }
  >;
}

async function persistDynamicServerConfig(next: DynamicServerConfig): Promise<void> {
  const session = useSessionStore.getState();
  const profileId = session.currentProfile?.id ?? null;
  writeLocalServerConfig(next, profileId);

  if (session.user && session.currentProfile) {
    try {
      const docRef = getDocRef(
        `users/${session.user.uid}/profiles/${session.currentProfile.id}/serverConfig`,
        "default"
      );
      await setDocument(docRef, {
        version: next.version,
        tmdbActiveIds: next.tmdbActiveIds,
        animeActiveIds: next.animeActiveIds,
        customTmdbServers: next.customTmdbServers,
        customAnimeServers: next.customAnimeServers,
        updatedAt: next.updatedAt,
      });
    } catch (e) {
      console.error("Failed to sync dynamic server config to Firestore", e);
    }
  }
}

export const useDynamicServerStore = create<DynamicServerState>((set, get) => ({
  config: createDefaultServerConfig(),
  hydrated: false,

  hydrateLocal: () => {
    const profileId = useSessionStore.getState().currentProfile?.id ?? null;
    const local = readLocalServerConfig(profileId);
    set({ config: local, hydrated: true });
  },

  initDynamicServers: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    const local = readLocalServerConfig(profile?.id ?? null);
    set({ config: local, hydrated: true });

    if (!user || !profile) {
      return () => {};
    }

    const docRef = getDocRef(
      `users/${user.uid}/profiles/${profile.id}/serverConfig`,
      "default"
    );

    const unsubscribe = listenToDoc(docRef, (snap) => {
      if (!snap.exists()) return;
      const remote = sanitizeDynamicServerConfig(snap.data());
      const current = get().config;
      const remoteTs = Date.parse(remote.updatedAt || "");
      const localTs = Date.parse(current.updatedAt || "");
      if (!Number.isNaN(remoteTs) && (Number.isNaN(localTs) || remoteTs >= localTs)) {
        set({ config: remote, hydrated: true });
        writeLocalServerConfig(remote, profile.id);
      }
    });

    return () => {
      unsubscribe();
    };
  },

  addBuiltInServer: async (kind, serverId) => {
    const current = get().config;
    const now = new Date().toISOString();
    const listKey = kind === "tmdb" ? "tmdbActiveIds" : "animeActiveIds";
    if (current[listKey].includes(serverId)) return;

    const next = sanitizeDynamicServerConfig({
      ...current,
      [listKey]: [...current[listKey], serverId],
      updatedAt: now,
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  removeActiveServer: async (kind, serverId) => {
    const current = get().config;
    const listKey = kind === "tmdb" ? "tmdbActiveIds" : "animeActiveIds";
    const remaining = current[listKey].filter((id) => id !== serverId);
    if (remaining.length === 0) return;

    const next = sanitizeDynamicServerConfig({
      ...current,
      [listKey]: remaining,
      updatedAt: new Date().toISOString(),
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  moveActiveServer: async (kind, serverId, direction) => {
    const current = get().config;
    const listKey = kind === "tmdb" ? "tmdbActiveIds" : "animeActiveIds";
    const list = [...current[listKey]];
    const idx = list.indexOf(serverId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
    const next = sanitizeDynamicServerConfig({
      ...current,
      [listKey]: list,
      updatedAt: new Date().toISOString(),
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  addAllBuiltIns: async (kind) => {
    const current = get().config;
    const allIds =
      kind === "tmdb"
        ? EMBED_SERVER_CATALOG.map((s) => s.id)
        : ANIME_EMBED_SERVER_CATALOG.map((s) => s.id);
    const listKey = kind === "tmdb" ? "tmdbActiveIds" : "animeActiveIds";
    const merged = [...new Set([...current[listKey], ...allIds])];

    const next = sanitizeDynamicServerConfig({
      ...current,
      [listKey]: merged,
      updatedAt: new Date().toISOString(),
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  resetDefaults: async (kind) => {
    const current = get().config;
    const now = new Date().toISOString();
    const next = sanitizeDynamicServerConfig(
      kind === "tmdb"
        ? {
            ...current,
            tmdbActiveIds: [
              ...DEFAULT_ACTIVE_TMDB_SERVER_IDS,
              ...current.customTmdbServers.map((s) => s.id),
            ],
            updatedAt: now,
          }
        : {
            ...current,
            animeActiveIds: [
              ...DEFAULT_ACTIVE_ANIME_SERVER_IDS,
              ...current.customAnimeServers.map((s) => s.id),
            ],
            updatedAt: now,
          }
    );
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  addCustomTmdbServer: async (input) => {
    const result = validateCustomTmdbServer(input);
    if (!result.ok) return result;
    const current = get().config;
    const nextCustom = [
      ...current.customTmdbServers.filter((s) => s.id !== result.server.id),
      result.server,
    ];
    const nextActive = [
      result.server.id,
      ...current.tmdbActiveIds.filter((id) => id !== result.server.id),
    ];
    const next = sanitizeDynamicServerConfig({
      ...current,
      customTmdbServers: nextCustom,
      tmdbActiveIds: nextActive,
      updatedAt: new Date().toISOString(),
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
    return { ok: true, server: result.server };
  },

  addCustomAnimeServer: async (input) => {
    const result = validateCustomAnimeServer(input);
    if (!result.ok) return result;
    const current = get().config;
    const nextCustom = [
      ...current.customAnimeServers.filter((s) => s.id !== result.server.id),
      result.server,
    ];
    const nextActive = [
      result.server.id,
      ...current.animeActiveIds.filter((id) => id !== result.server.id),
    ];
    const next = sanitizeDynamicServerConfig({
      ...current,
      customAnimeServers: nextCustom,
      animeActiveIds: nextActive,
      updatedAt: new Date().toISOString(),
    });
    set({ config: next });
    await persistDynamicServerConfig(next);
    return { ok: true, server: result.server };
  },

  deleteCustomServer: async (kind, serverId) => {
    const current = get().config;
    const now = new Date().toISOString();
    const next = sanitizeDynamicServerConfig(
      kind === "tmdb"
        ? {
            ...current,
            customTmdbServers: current.customTmdbServers.filter((s) => s.id !== serverId),
            tmdbActiveIds: current.tmdbActiveIds.filter((id) => id !== serverId),
            updatedAt: now,
          }
        : {
            ...current,
            customAnimeServers: current.customAnimeServers.filter((s) => s.id !== serverId),
            animeActiveIds: current.animeActiveIds.filter((id) => id !== serverId),
            updatedAt: now,
          }
    );
    set({ config: next });
    await persistDynamicServerConfig(next);
  },

  importConfigJson: async (rawJson, mode) => {
    const current = get().config;
    const result = importServerConfigJson(rawJson, current, mode);
    if (!result.ok) return result;
    set({ config: result.config });
    await persistDynamicServerConfig(result.config);
    return result;
  },
}));

// === 6. CUSTOM COLLECTIONS & LIBRARY BACKUP STORE ===

interface CustomCollectionsState {
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

    // 1. Apply Watchlist
    await watchlistStore.importItems(result.watchlist, mode === "replace");

    // 2. Apply Custom Collections
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

    // 3. Apply Watch History
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

// === 7. GLOBAL QUICK TRAILER OVERLAY STORE ===

export interface QuickTrailerClip {
  id: string;
  key: string;
  name: string;
  site: "YouTube";
  type: string;
  official?: boolean;
}

interface QuickTrailerState {
  open: boolean;
  loading: boolean;
  title: string;
  videos: QuickTrailerClip[];
  error: string | null;
  openTmdbTrailer: (mediaType: "movie" | "tv", id: number, title: string) => Promise<void>;
  openAnimeTrailer: (anilistId: number, title: string) => Promise<void>;
  close: () => void;
}

export const useQuickTrailerStore = create<QuickTrailerState>((set) => ({
  open: false,
  loading: false,
  title: "",
  videos: [],
  error: null,

  openTmdbTrailer: async (mediaType, id, title) => {
    set({ open: true, loading: true, title, videos: [], error: null });
    try {
      const raw: TMDBVideo[] = await getVideos(mediaType, id);
      const yt = raw
        .filter((v) => v.site === "YouTube" && Boolean(v.key))
        .map((v) => ({
          id: v.id,
          key: v.key,
          name: v.name,
          site: "YouTube" as const,
          type: v.type,
          official: v.type === "Trailer",
        }));
      if (yt.length === 0) {
        set({
          loading: false,
          videos: [],
          error: `No official YouTube trailer is available for ${title}.`,
        });
        return;
      }
      set({ loading: false, videos: yt, error: null });
    } catch {
      set({
        loading: false,
        videos: [],
        error: "Unable to load trailer right now. Please try again shortly.",
      });
    }
  },

  openAnimeTrailer: async (anilistId, title) => {
    set({ open: true, loading: true, title, videos: [], error: null });
    try {
      const detail = await getAnimeDetails(anilistId);
      if (detail?.trailer?.site?.toLowerCase() === "youtube" && detail.trailer.id) {
        set({
          loading: false,
          videos: [
            {
              id: detail.trailer.id,
              key: detail.trailer.id,
              name: `${title} — Official Trailer`,
              site: "YouTube",
              type: "Trailer",
              official: true,
            },
          ],
          error: null,
        });
        return;
      }
      set({
        loading: false,
        videos: [],
        error: `No official YouTube trailer is available for ${title}.`,
      });
    } catch {
      set({
        loading: false,
        videos: [],
        error: "Unable to load anime trailer right now.",
      });
    }
  },

  close: () => set({ open: false, loading: false, error: null }),
}));

// === 8. GLOBAL COMMAND PALETTE STORE ===

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

// Re-export authentication helpers for clean access from page controllers
export { 
  loginWithEmail, 
  signupWithEmail, 
  loginWithGoogle,
  signInWithGoogle,
  logout 
} from "@/lib/firebase";


