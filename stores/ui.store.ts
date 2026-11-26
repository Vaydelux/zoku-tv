import { create } from "zustand";
import { getVideos, type TMDBVideo } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";

// === QUICK TRAILER OVERLAY STORE ===

export interface QuickTrailerClip {
  id: string;
  key: string;
  name: string;
  site: "YouTube";
  type: string;
  official?: boolean;
}

export interface QuickTrailerState {
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

// === COMMAND PALETTE (SPOTLIGHT) STORE ===

export interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

// === KAKEI-STYLE QUICK INSPECTOR DRAWER STORE ===

export interface QuickInspectorTarget {
  mediaType: "movie" | "tv" | "anime";
  id: number;
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  year?: string;
  rating?: string;
  overview?: string;
  episodes?: number | null;
}

export interface QuickInspectorState {
  open: boolean;
  target: QuickInspectorTarget | null;
  openInspector: (target: QuickInspectorTarget) => void;
  closeInspector: () => void;
}

export const useQuickInspectorStore = create<QuickInspectorState>((set) => ({
  open: false,
  target: null,
  openInspector: (target) => set({ open: true, target }),
  closeInspector: () => set({ open: false }),
}));

// === DYNAMIC ISLAND LIVE-ACTIVITY STORE ===

export type DynamicIslandActivityTone = "accent" | "success" | "warning" | "neutral";

export interface DynamicIslandActivity {
  id: number;
  label: string;
  detail?: string;
  tone: DynamicIslandActivityTone;
}

export interface PlayerTelemetry {
  title: string;
  subtitle?: string;
  serverName: string;
  synced: boolean;
  onNextServer?: () => void;
  onRetryFrame?: () => void;
}

export interface DynamicIslandState {
  expanded: boolean;
  activity: DynamicIslandActivity | null;
  playerTelemetry: PlayerTelemetry | null;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  pushActivity: (label: string, options?: { detail?: string; tone?: DynamicIslandActivityTone; durationMs?: number }) => void;
  clearActivity: () => void;
  setPlayerTelemetry: (telemetry: PlayerTelemetry | null) => void;
}

let activitySeq = 0;
let activityTimer: ReturnType<typeof setTimeout> | null = null;

export const useDynamicIslandStore = create<DynamicIslandState>((set) => ({
  expanded: false,
  activity: null,
  playerTelemetry: null,

  setExpanded: (expanded) => set({ expanded }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

  pushActivity: (label, options) => {
    const id = ++activitySeq;
    const tone = options?.tone ?? "accent";
    const durationMs = options?.durationMs ?? 2800;

    if (activityTimer) {
      clearTimeout(activityTimer);
      activityTimer = null;
    }

    set({
      activity: {
        id,
        label,
        detail: options?.detail,
        tone,
      },
    });

    if (typeof window !== "undefined") {
      activityTimer = setTimeout(() => {
        set((state) => (state.activity?.id === id ? { activity: null } : state));
      }, durationMs);
    }
  },

  clearActivity: () => {
    if (activityTimer) {
      clearTimeout(activityTimer);
      activityTimer = null;
    }
    set({ activity: null });
  },

  setPlayerTelemetry: (playerTelemetry) => set({ playerTelemetry }),
}));
