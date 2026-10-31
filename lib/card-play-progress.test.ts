import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveItemPlayProgress } from "./card-play-progress";
import type { ContinueWatchingItem } from "./continue-watching";
import type { WatchHistoryItem } from "./watch-history";

describe("Card Play Progress Indicator Logic", () => {
  it("returns zero progress when no continue-watching or history entry exists", () => {
    const result = resolveItemPlayProgress(null, null);
    assert.equal(result.hasProgress, false);
    assert.equal(result.progressPercent, 0);
  });

  it("resolves active play progress from Continue Watching percentage", () => {
    const cwItem: ContinueWatchingItem = {
      media_type: "movie",
      tmdbId: 550,
      title: "Fight Club",
      progress_percent: 42.4,
      current_time_sec: 3500,
      duration_sec: 8300,
      last_watched_at: "2026-10-31T00:00:00Z",
    };

    const result = resolveItemPlayProgress(cwItem, null);
    assert.equal(result.hasProgress, true);
    assert.equal(result.progressPercent, 42);
    assert.equal(result.label, "42% watched");
  });

  it("calculates progress from current_time_sec and duration_sec when percentage is omitted", () => {
    const cwItem: ContinueWatchingItem = {
      media_type: "tv",
      tmdbId: 1399,
      season: 1,
      episode: 3,
      title: "Game of Thrones",
      current_time_sec: 1500,
      duration_sec: 3000,
      last_watched_at: "2026-10-31T00:00:00Z",
    };

    const result = resolveItemPlayProgress(cwItem, null);
    assert.equal(result.hasProgress, true);
    assert.equal(result.progressPercent, 50);
    assert.equal(result.season, 1);
    assert.equal(result.episode, 3);
    assert.equal(result.label, "S1:E3 · 50% watched");
  });

  it("does not flag items as in-progress if completed or >= 95% threshold", () => {
    const completedCw: ContinueWatchingItem = {
      media_type: "movie",
      tmdbId: 550,
      title: "Fight Club",
      progress_percent: 96,
      current_time_sec: 7900,
      duration_sec: 8300,
      last_watched_at: "2026-10-31T00:00:00Z",
    };

    const resultCw = resolveItemPlayProgress(completedCw, null);
    assert.equal(resultCw.hasProgress, false);

    const completedHistory: WatchHistoryItem = {
      media_type: "movie",
      tmdbId: 550,
      title: "Fight Club",
      completed: true,
      progress_percent: 100,
      watch_count: 1,
      last_watched_at: "2026-10-31T00:00:00Z",
    };

    const resultHistory = resolveItemPlayProgress(null, completedHistory);
    assert.equal(resultHistory.hasProgress, false);
  });

  it("falls back to Watch History when Continue Watching is absent", () => {
    const historyItem: WatchHistoryItem = {
      media_type: "anime",
      anilistId: 16498,
      season: 1,
      episode: 12,
      title: "Attack on Titan",
      completed: false,
      progress_percent: 65,
      watch_count: 1,
      last_watched_at: "2026-10-31T00:00:00Z",
    };

    const result = resolveItemPlayProgress(null, historyItem);
    assert.equal(result.hasProgress, true);
    assert.equal(result.progressPercent, 65);
    assert.equal(result.season, 1);
    assert.equal(result.episode, 12);
    assert.equal(result.label, "S1:E12 · 65% watched");
  });

  it("prioritizes active Continue Watching over older Watch History entries", () => {
    const cwItem: ContinueWatchingItem = {
      media_type: "movie",
      tmdbId: 123,
      title: "Inception",
      progress_percent: 75,
      last_watched_at: "2026-10-31T01:00:00Z",
    };

    const historyItem: WatchHistoryItem = {
      media_type: "movie",
      tmdbId: 123,
      title: "Inception",
      completed: false,
      progress_percent: 30,
      watch_count: 1,
      last_watched_at: "2026-10-30T01:00:00Z",
    };

    const result = resolveItemPlayProgress(cwItem, historyItem);
    assert.equal(result.hasProgress, true);
    assert.equal(result.progressPercent, 75);
  });
});
