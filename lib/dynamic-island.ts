import type { ContinueWatchingItem } from "@/lib/continue-watching";
import type { CatalogMode } from "@/lib/media-types";
import type { DynamicIslandActivity, PlayerTelemetry } from "@/stores/ui.store";

export type DynamicIslandMode =
  | "activity"
  | "offline"
  | "player"
  | "resume"
  | "ambient";

export type DynamicIslandTone = "accent" | "success" | "warning" | "neutral";

export interface DynamicIslandDisplay {
  mode: DynamicIslandMode;
  label: string;
  sublabel: string;
  tone: DynamicIslandTone;
  progressPercent: number | null;
}

export interface DynamicIslandInput {
  activity: DynamicIslandActivity | null;
  isOnline: boolean;
  isWatchRoute: boolean;
  playerTelemetry: PlayerTelemetry | null;
  latestContinueWatching: ContinueWatchingItem | null;
  catalogMode: CatalogMode;
  watchlistCount: number;
  isKidMode: boolean;
}

function truncateText(text: string, maxLen: number): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

/**
 * Deterministically resolves the prioritized compact state shown inside
 * Zoku TV's floating iOS 27/28 Dynamic Island pill.
 *
 * Priority:
 * 1. Transient Live Activity toast (Saved to Watchlist, Server Switched, etc.)
 * 2. Offline warning when browser loses connectivity
 * 3. Active Theater Player telemetry while on /watch/*
 * 4. Latest Continue Watching title with progress ring
 * 5. Ambient Workspace status (Catalog + Kids/Watchlist count)
 */
export function resolveDynamicIslandState(
  input: DynamicIslandInput
): DynamicIslandDisplay {
  if (input.activity) {
    return {
      mode: "activity",
      label: truncateText(input.activity.label, 24),
      sublabel: input.activity.detail ? truncateText(input.activity.detail, 20) : "Live",
      tone: input.activity.tone,
      progressPercent: null,
    };
  }

  if (!input.isOnline) {
    return {
      mode: "offline",
      label: "Offline Mode",
      sublabel: "Local Cache",
      tone: "warning",
      progressPercent: null,
    };
  }

  if (input.isWatchRoute && input.playerTelemetry) {
    return {
      mode: "player",
      label: truncateText(input.playerTelemetry.serverName || "Theater", 22),
      sublabel: input.playerTelemetry.synced ? "Synced" : "Ready",
      tone: input.playerTelemetry.synced ? "success" : "accent",
      progressPercent: null,
    };
  }

  if (input.latestContinueWatching) {
    const item = input.latestContinueWatching;
    const pct =
      typeof item.progress_percent === "number" && Number.isFinite(item.progress_percent)
        ? Math.max(0, Math.min(100, Math.round(item.progress_percent)))
        : null;
    const epTag =
      item.media_type !== "movie" && item.season && item.episode
        ? `S${item.season}·E${item.episode}`
        : pct !== null
        ? `${pct}%`
        : "Resume";

    return {
      mode: "resume",
      label: truncateText(item.title || "Continue Watching", 22),
      sublabel: epTag,
      tone: "accent",
      progressPercent: pct,
    };
  }

  const catalogLabel = input.catalogMode === "anime" ? "Anime" : "Movies & TV";
  const sublabel = input.isKidMode
    ? "Kids Safe"
    : input.watchlistCount > 0
    ? `${input.watchlistCount} saved`
    : "Synced";

  return {
    mode: "ambient",
    label: catalogLabel,
    sublabel,
    tone: input.isKidMode ? "warning" : "success",
    progressPercent: null,
  };
}
