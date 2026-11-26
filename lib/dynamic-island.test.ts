import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDynamicIslandState, type DynamicIslandInput } from "./dynamic-island";

const baseInput: DynamicIslandInput = {
  activity: null,
  isOnline: true,
  isWatchRoute: false,
  playerTelemetry: null,
  latestContinueWatching: null,
  catalogMode: "tmdb",
  watchlistCount: 4,
  isKidMode: false,
};

describe("resolveDynamicIslandState priority hierarchy", () => {
  it("prioritizes transient activity over offline, player, resume, and ambient", () => {
    const state = resolveDynamicIslandState({
      ...baseInput,
      isOnline: false,
      activity: { id: 1, label: "Saved to Watchlist", detail: "Dune: Part Two", tone: "success" },
    });
    assert.equal(state.mode, "activity");
    assert.equal(state.label, "Saved to Watchlist");
    assert.equal(state.tone, "success");
  });

  it("surfaces offline warning above player and resume when disconnected", () => {
    const state = resolveDynamicIslandState({
      ...baseInput,
      isOnline: false,
      latestContinueWatching: {
        media_type: "movie",
        tmdbId: 101,
        title: "Inception",
        last_watched_at: "2026-11-26T00:00:00Z",
        progress_percent: 42,
      },
    });
    assert.equal(state.mode, "offline");
    assert.equal(state.tone, "warning");
  });

  it("shows live theater server telemetry on /watch/* routes", () => {
    const state = resolveDynamicIslandState({
      ...baseInput,
      isWatchRoute: true,
      playerTelemetry: {
        title: "Andor",
        serverName: "VidLink Pro",
        synced: true,
      },
    });
    assert.equal(state.mode, "player");
    assert.equal(state.label, "VidLink Pro");
    assert.equal(state.sublabel, "Synced");
    assert.equal(state.tone, "success");
  });

  it("shows latest continue watching item with progress and episode tag", () => {
    const state = resolveDynamicIslandState({
      ...baseInput,
      latestContinueWatching: {
        media_type: "tv",
        tmdbId: 202,
        season: 2,
        episode: 5,
        title: "Severance",
        last_watched_at: "2026-11-26T00:00:00Z",
        progress_percent: 64,
      },
    });
    assert.equal(state.mode, "resume");
    assert.equal(state.label, "Severance");
    assert.equal(state.sublabel, "S2·E5");
    assert.equal(state.progressPercent, 64);
  });

  it("falls back to ambient catalog and Kids Safe status when idle", () => {
    const kidsState = resolveDynamicIslandState({
      ...baseInput,
      catalogMode: "anime",
      isKidMode: true,
    });
    assert.equal(kidsState.mode, "ambient");
    assert.equal(kidsState.label, "Anime");
    assert.equal(kidsState.sublabel, "Kids Safe");
    assert.equal(kidsState.tone, "warning");
  });
});
