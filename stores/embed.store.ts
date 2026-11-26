import { create } from "zustand";
import { EMBED_SERVER_CATALOG } from "@/lib/embed";
import { readLocalServerConfig } from "@/lib/dynamic-servers";
import { useSessionStore } from "./session.store";
import { useDynamicServerStore } from "./dynamic-servers.store";
import { useDynamicIslandStore } from "./ui.store";

export interface EmbedState {
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
    const builtIn = EMBED_SERVER_CATALOG.find((server) => server.id === id);
    const custom = customTmdb.find((server) => server.id === id);
    const nextId = builtIn || custom ? id : "vidsrc";
    set({ selectedServerId: nextId });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zoku_selected_server_id", nextId);
      } catch {
        /* private mode */
      }
    }
    const label = builtIn?.name || custom?.name || nextId;
    useDynamicIslandStore.getState().pushActivity("Server Switched", {
      detail: label,
      tone: "accent",
    });
  },

  setIframeMode: (mode) => {
    set({ iframeMode: mode });
    if (typeof window !== "undefined") {
      localStorage.setItem("zoku_iframe_mode", mode);
    }
    const session = useSessionStore.getState();
    if (session.user && session.currentProfile) {
      void session
        .updateProfile(session.currentProfile.id, { iframeModePreference: mode })
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
