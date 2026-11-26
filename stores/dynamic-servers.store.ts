import { create } from "zustand";
import { setDocument, getDocRef, listenToDoc } from "@/lib/firebase";
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
import { useSessionStore } from "./session.store";

export interface DynamicServerState {
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
