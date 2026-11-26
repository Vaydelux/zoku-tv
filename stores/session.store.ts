import { create } from "zustand";
import {
  onAuthChanged,
  setDocument,
  getCollectionRef,
  getDocRef,
  getCollectionDocs,
  listenToCollection,
  updateDocument,
  deleteDocument,
  purgeProfileData,
} from "@/lib/firebase";
import {
  applyTheme,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from "@/lib/themes";
import { applyBackgroundPattern } from "@/lib/background-patterns";
import {
  readPendingLoginThemeHandoff,
  readPreAuthThemePreference,
  readProfilePatternPreference,
  writeProfilePatternPreference,
} from "@/lib/preauth-theme";
import { canAddProfile, MAX_PROFILES } from "@/lib/profile-limits";
import { clearLocalContinueWatching } from "@/lib/continue-watching";
import { clearLocalWatchHistory } from "@/lib/watch-history";
import type { CatalogMode } from "@/lib/media-types";

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

export interface SessionState {
  user: any | null;
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  initializing: boolean;
  profilesReady: boolean;
  setProfile: (profile: Profile | null) => void;
  createProfile: (
    name: string,
    avatar: string,
    kidMode: boolean,
    avatarColor?: string
  ) => Promise<{ success: boolean; error?: string }>;
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
      const pendingHandoff = readPendingLoginThemeHandoff();
      if (pendingHandoff) {
        applyTheme(pendingHandoff.themeId, pendingHandoff.appearance);
        applyBackgroundPattern(pendingHandoff.patternId);
      } else {
        applyTheme(
          profile.themePreference,
          normalizeAppearance(profile.appearancePreference ?? DEFAULT_APPEARANCE)
        );
        applyBackgroundPattern(readProfilePatternPreference(profile.id));
      }
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
      const profileId = "profile_" + Math.random().toString(36).slice(2, 11);
      const now = new Date().toISOString();
      const preAuth = readPreAuthThemePreference();
      const newProfile: Profile = {
        id: profileId,
        name,
        avatar,
        avatarColor,
        kidMode,
        themePreference: preAuth.themeId,
        appearancePreference: preAuth.appearance,
        iframeModePreference: "Strict",
        catalogMode: "tmdb",
        homeGenreRailPreferences: [28, 12, 35, 18],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = getDocRef(`users/${user.uid}/profiles`, profileId);
      await setDocument(docRef, newProfile);
      writeProfilePatternPreference(profileId, preAuth.patternId);
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
      await updateDocument(docRef, { ...updates, updatedAt });

      const { profiles, currentProfile } = get();
      const updatedProfiles = profiles.map((profile) =>
        profile.id === profileId ? normalizeProfile({ ...profile, ...updates, updatedAt }) : profile
      );
      const updatedCurrent =
        currentProfile?.id === profileId
          ? normalizeProfile({ ...currentProfile, ...updates, updatedAt })
          : currentProfile;
      set({ profiles: updatedProfiles, currentProfile: updatedCurrent });
      writeProfilesCache(user.uid, updatedProfiles);

      if (updatedCurrent && currentProfile?.id === profileId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`zoku_active_profile_${user.uid}`, JSON.stringify(updatedCurrent));
        } catch {
          /* Storage may be blocked; Firestore is the source of truth. */
        }
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
    if (!user) throw new Error("Sign in before deleting a profile.");
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
      throw e;
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
      const matched = storedId ? normalizedProfiles.find((p) => p.id === storedId) : null;

      let nextCurrent = get().currentProfile;
      if (matched) {
        nextCurrent = matched;
      } else if (normalizedProfiles.length === 0) {
        nextCurrent = null;
      } else if (nextCurrent && !normalizedProfiles.some((p) => p.id === nextCurrent!.id)) {
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
          applyProfilesList(uid, cached, { persistCache: false, finishBoot: true });
          set({ user: firebaseUser });
        } else {
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

        const bootTimeout = window.setTimeout(() => {
          if (bootId !== profilesBootGeneration) return;
          if (get().initializing) {
            set({ initializing: false, profilesReady: true });
          }
        }, 8000);

        void getCollectionDocs(colRef)
          .then((snapshot) => {
            if (bootId !== profilesBootGeneration) return;
            window.clearTimeout(bootTimeout);
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
        const preAuth = readPreAuthThemePreference();
        applyTheme(preAuth.themeId, preAuth.appearance);
        applyBackgroundPattern(preAuth.patternId);
      }
    });

    return () => {
      if (unsubscribeProfiles) {
        unsubscribeProfiles();
      }
      unsubscribeAuth();
    };
  },
}));
