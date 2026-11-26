/**
 * Zoku TV Modular Zustand Store Barrel
 * Preserves 100% backwards-compatible `@/stores` imports while isolating each
 * domain slice into its own cohesive module.
 */

export { useSessionStore, type Profile, type SessionState } from "./session.store";
export { useWatchlistStore, type WatchlistItem, type WatchlistState } from "./watchlist.store";
export {
  useContinueWatchingStore,
  type ContinueWatchingRecordInput,
  type ContinueWatchingState,
} from "./continue-watching.store";
export { useWatchHistoryStore, type WatchHistoryState } from "./watch-history.store";
export { useEpisodeProgressStore, type EpisodeProgressState } from "./episode-progress.store";
export { useEmbedStore, type EmbedState } from "./embed.store";
export { useSearchHistoryStore, type SearchHistoryState } from "./search-history.store";
export {
  useRailFilterStore,
  type RailFilterOption,
  type RailSortMode,
  type RailFilterState,
} from "./rail-filter.store";
export { useDynamicServerStore, type DynamicServerState } from "./dynamic-servers.store";
export { useCustomCollectionsStore, type CustomCollectionsState } from "./collections.store";
export {
  useQuickTrailerStore,
  useCommandPaletteStore,
  useQuickInspectorStore,
  useDynamicIslandStore,
  type QuickTrailerClip,
  type QuickTrailerState,
  type CommandPaletteState,
  type QuickInspectorTarget,
  type QuickInspectorState,
  type DynamicIslandActivity,
  type DynamicIslandActivityTone,
  type PlayerTelemetry,
  type DynamicIslandState,
} from "./ui.store";

export {
  loginWithEmail,
  signupWithEmail,
  loginWithGoogle,
  signInWithGoogle,
  logout,
} from "@/lib/firebase";
