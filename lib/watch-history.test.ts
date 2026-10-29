import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  upsertWatchHistoryEntry,
  removeWatchHistoryEntry,
  purgeLocalWatchedAndMediaCaches,
  resetWatchHistoryProgress,
  sanitizeWatchHistoryItems,
  mergeWatchHistory,
  filterWatchHistoryByCatalog,
  filterWatchHistoryByStatus,
  buildRewatchUrl,
  type WatchHistoryItem,
  type StorageLike,
} from "./watch-history";
import { sanitizeContinueWatchingItems, type ContinueWatchingItem } from "./continue-watching";

describe("watch-history pure domain logic", () => {
  it("records partially watched items and preserves progress", () => {
    const result = upsertWatchHistoryEntry(
      [],
      {
        media_type: "movie",
        tmdbId: 550,
        title: "Fight Club",
        progress_percent: 42,
        current_time_sec: 3400,
        duration_sec: 8100,
      },
      "2026-10-29T10:00:00.000Z"
    );

    assert.ok(result);
    assert.equal(result.entry.completed, false);
    assert.equal(result.entry.progress_percent, 42);
    assert.equal(result.entry.watch_count, 1);
    assert.equal(result.items.length, 1);
  });

  it("marks items >= 95% progress as completed with 100% progress and increments watch_count on transition", () => {
    const initial = upsertWatchHistoryEntry(
      [],
      {
        media_type: "tv",
        tmdbId: 1399,
        season: 1,
        episode: 4,
        title: "Game of Thrones",
        progress_percent: 60,
        current_time_sec: 1800,
      },
      "2026-10-29T10:00:00.000Z"
    )!;

    const completed = upsertWatchHistoryEntry(
      initial.items,
      {
        media_type: "tv",
        tmdbId: 1399,
        season: 1,
        episode: 4,
        title: "Game of Thrones",
        progress_percent: 96,
      },
      "2026-10-29T11:00:00.000Z"
    )!;

    assert.equal(completed.entry.completed, true);
    assert.equal(completed.entry.progress_percent, 100);
    assert.equal(completed.entry.current_time_sec, 0);
    assert.equal(completed.entry.watch_count, 2);
  });

  it("merges local, cloud, and continueWatching items without duplicates", () => {
    const cloud: WatchHistoryItem[] = [
      {
        media_type: "movie",
        tmdbId: 101,
        title: "Cloud Movie",
        last_watched_at: "2026-10-29T08:00:00.000Z",
        progress_percent: 100,
        completed: true,
        watch_count: 2,
      },
    ];
    const local: WatchHistoryItem[] = [
      {
        media_type: "anime",
        anilistId: 202,
        season: 1,
        episode: 12,
        title: "Local Anime",
        last_watched_at: "2026-10-29T09:00:00.000Z",
        progress_percent: 100,
        completed: true,
        watch_count: 1,
      },
    ];
    const cw = [
      {
        media_type: "tv" as const,
        tmdbId: 303,
        season: 2,
        episode: 5,
        title: "In Progress Show",
        last_watched_at: "2026-10-29T10:00:00.000Z",
        progress_percent: 48,
      },
    ];

    const merged = mergeWatchHistory(local, cloud, cw);
    assert.equal(merged.length, 3);
    assert.equal(merged[0].title, "In Progress Show");
    assert.equal(merged[1].title, "Local Anime");
    assert.equal(merged[2].title, "Cloud Movie");

    const tmdbOnly = filterWatchHistoryByCatalog(merged, "tmdb");
    assert.equal(tmdbOnly.length, 2);

    const animeOnly = filterWatchHistoryByCatalog(merged, "anime");
    assert.equal(animeOnly.length, 1);

    const completedOnly = filterWatchHistoryByStatus(merged, "completed");
    assert.equal(completedOnly.length, 2);

    const partialOnly = filterWatchHistoryByStatus(merged, "partial");
    assert.equal(partialOnly.length, 1);
  });

  it("builds clean rewatch URLs without resume time query params", () => {
    const tvItem: WatchHistoryItem = {
      media_type: "tv",
      tmdbId: 1396,
      season: 3,
      episode: 7,
      title: "Breaking Bad",
      last_watched_at: "2026-10-29T10:00:00.000Z",
      progress_percent: 80,
      current_time_sec: 1420,
      completed: false,
      watch_count: 1,
    };
    assert.equal(buildRewatchUrl(tvItem), "/watch/tv/1396/3/7");

    const animeItem: WatchHistoryItem = {
      media_type: "anime",
      anilistId: 21,
      season: 1,
      episode: 1,
      title: "One Piece",
      last_watched_at: "2026-10-29T10:00:00.000Z",
      progress_percent: 100,
      completed: true,
      watch_count: 3,
    };
    assert.equal(buildRewatchUrl(animeItem), "/watch/anime/21/1/1");
  });

  it("quick-removes a target watch history entry while keeping others intact", () => {
    const first = upsertWatchHistoryEntry(
      [],
      { media_type: "movie", tmdbId: 693134, title: "Dune: Part Two", completed: true },
      "2026-10-29T10:00:00.000Z"
    )!;
    const second = upsertWatchHistoryEntry(
      first.items,
      { media_type: "movie", tmdbId: 872585, title: "Oppenheimer", completed: true },
      "2026-10-29T11:00:00.000Z"
    )!;

    const afterRemove = removeWatchHistoryEntry(second.items, "movie", 693134);
    assert.equal(afterRemove.length, 1);
    assert.equal(afterRemove[0].tmdbId, 872585);
  });

  it("purges local watched and catalog caches while preserving active profile session keys", () => {
    const store = new Map<string, string>([
      ["zoku_watch_history_profile_1", "[]"],
      ["zoku_continue_profile_1", "[]"],
      ["zoku_tmdb_cache_/trending/movie/day", "{}"],
      ["zoku_anilist_cache_trending", "{}"],
      ["zoku_profiles_cache_user_1", "[]"],
      ["zoku_active_profile_user_1", "{}"],
      ["zoku_local_auth_user", "{}"],
    ]);

    const mockStorage: StorageLike = {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
    };

    const removed = purgeLocalWatchedAndMediaCaches(mockStorage, "profile_1");
    assert.equal(removed.length, 4);
    assert.equal(store.has("zoku_watch_history_profile_1"), false);
    assert.equal(store.has("zoku_continue_profile_1"), false);
    assert.equal(store.has("zoku_tmdb_cache_/trending/movie/day"), false);
    assert.equal(store.has("zoku_anilist_cache_trending"), false);
    assert.equal(store.has("zoku_profiles_cache_user_1"), true);
    assert.equal(store.has("zoku_active_profile_user_1"), true);
    assert.equal(store.has("zoku_local_auth_user"), true);
  });

  it("resets completed title progress to 0% and completed: false for Watch Again", () => {
    const completed = upsertWatchHistoryEntry(
      [],
      {
        media_type: "movie",
        tmdbId: 872585,
        title: "Oppenheimer",
        progress_percent: 100,
        completed: true,
      },
      "2026-10-29T10:00:00.000Z"
    )!;

    const reset = resetWatchHistoryProgress(
      completed.items,
      completed.entry,
      "2026-10-29T12:00:00.000Z"
    );

    assert.ok(reset);
    assert.equal(reset.entry.progress_percent, 0);
    assert.equal(reset.entry.current_time_sec, 0);
    assert.equal(reset.entry.completed, false);
    assert.equal(reset.entry.watch_count, 2);
    assert.equal(reset.items[0].progress_percent, 0);
  });

  it("strips synthetic auto-seeded entries from Continue Watching and Watch History while keeping genuine watched titles", () => {
    const baseMs = 1793284572564;
    const cwItems: ContinueWatchingItem[] = [
      {
        media_type: "movie",
        tmdbId: 9991,
        title: "Unwatched Trending Movie",
        last_watched_at: new Date(baseMs - 2 * 3600_000).toISOString(),
        progress_percent: 68,
        current_time_sec: 2840,
        duration_sec: 4400,
      },
      {
        media_type: "movie",
        tmdbId: 550,
        title: "Fight Club (Actually Watched)",
        last_watched_at: "2026-10-29T14:22:19.123Z",
        progress_percent: 37,
        current_time_sec: 1920,
        duration_sec: 5180,
      },
    ];

    const sanitizedCw = sanitizeContinueWatchingItems(cwItems);
    assert.equal(sanitizedCw.removed.length, 1);
    assert.equal(sanitizedCw.removed[0].tmdbId, 9991);
    assert.equal(sanitizedCw.valid.length, 1);
    assert.equal(sanitizedCw.valid[0].tmdbId, 550);

    const historyItems: WatchHistoryItem[] = [
      {
        media_type: "movie",
        tmdbId: 9992,
        title: "Seeded Completed 1",
        last_watched_at: new Date(baseMs - 1.5 * 3600_000).toISOString(),
        progress_percent: 100,
        completed: true,
        watch_count: 2,
      },
      {
        media_type: "movie",
        tmdbId: 9993,
        title: "Seeded Completed 2",
        last_watched_at: new Date(baseMs - 3.0 * 3600_000).toISOString(),
        progress_percent: 100,
        completed: true,
        watch_count: 1,
      },
      {
        media_type: "movie",
        tmdbId: 872585,
        title: "Oppenheimer (Actually Watched)",
        last_watched_at: "2026-10-29T16:05:11.987Z",
        progress_percent: 100,
        completed: true,
        watch_count: 1,
      },
    ];

    const sanitizedHistory = sanitizeWatchHistoryItems(historyItems);
    assert.equal(sanitizedHistory.removed.length, 2);
    assert.equal(sanitizedHistory.valid.length, 1);
    assert.equal(sanitizedHistory.valid[0].tmdbId, 872585);
  });
});



