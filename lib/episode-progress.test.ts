import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  episodeProgressKey,
  upsertEpisodeProgressRecord,
  resetEpisodeProgressRecord,
  mergeEpisodeProgress,
  type EpisodeProgressRecord,
} from "./episode-progress";

describe("episode-progress pure domain logic", () => {
  it("generates deterministic episode keys for TV and Anime", () => {
    assert.equal(episodeProgressKey("tv", 1399, 1, 4), "tv_1399_s1_e4");
    assert.equal(episodeProgressKey("anime", 16498, 2, 10), "anime_16498_s2_e10");
  });

  it("records partial episode progress and sets percent accurately", () => {
    const res = upsertEpisodeProgressRecord(
      {},
      {
        media_type: "tv",
        tmdbId: 1399,
        season: 1,
        episode: 2,
        progress_percent: 45.4,
        current_time_sec: 1320,
        duration_sec: 3000,
      },
      "2026-10-29T12:00:00.000Z"
    );

    assert.ok(res);
    assert.equal(res.key, "tv_1399_s1_e2");
    assert.equal(res.record.progress_percent, 45);
    assert.equal(res.record.current_time_sec, 1320);
    assert.equal(res.record.completed, false);
    assert.equal(res.records["tv_1399_s1_e2"].progress_percent, 45);
  });

  it("marks episode completed when progress reaches threshold >= 90%", () => {
    const res = upsertEpisodeProgressRecord(
      {},
      {
        media_type: "anime",
        anilistId: 21,
        season: 1,
        episode: 1,
        progress_percent: 92,
        current_time_sec: 1400,
        duration_sec: 1450,
      },
      "2026-10-29T12:00:00.000Z"
    );

    assert.ok(res);
    assert.equal(res.record.completed, true);
    assert.equal(res.record.progress_percent, 100);
    assert.equal(res.record.current_time_sec, 0);
  });

  it("resets episode progress to 0% and completed to false", () => {
    const initial = upsertEpisodeProgressRecord(
      {},
      {
        media_type: "anime",
        anilistId: 21,
        season: 1,
        episode: 1,
        progress_percent: 100,
        completed: true,
      }
    )!.records;

    const reset = resetEpisodeProgressRecord(
      initial,
      "anime",
      21,
      1,
      1,
      "2026-10-29T13:00:00.000Z"
    );

    assert.equal(reset.record.progress_percent, 0);
    assert.equal(reset.record.current_time_sec, 0);
    assert.equal(reset.record.completed, false);
    assert.equal(reset.records["anime_21_s1_e1"].progress_percent, 0);
  });

  it("merges local and cloud episode progress by latest updated_at", () => {
    const local: Record<string, EpisodeProgressRecord> = {
      tv_100_s1_e1: {
        media_type: "tv",
        tmdbId: 100,
        season: 1,
        episode: 1,
        progress_percent: 30,
        current_time_sec: 600,
        completed: false,
        updated_at: "2026-10-29T08:00:00.000Z",
      },
      tv_100_s1_e2: {
        media_type: "tv",
        tmdbId: 100,
        season: 1,
        episode: 2,
        progress_percent: 75,
        current_time_sec: 1500,
        completed: false,
        updated_at: "2026-10-29T11:00:00.000Z",
      },
    };

    const cloud: EpisodeProgressRecord[] = [
      {
        media_type: "tv",
        tmdbId: 100,
        season: 1,
        episode: 1,
        progress_percent: 95,
        current_time_sec: 0,
        completed: true,
        updated_at: "2026-10-29T09:00:00.000Z", // newer than local e1
      },
      {
        media_type: "tv",
        tmdbId: 100,
        season: 1,
        episode: 2,
        progress_percent: 50,
        current_time_sec: 1000,
        completed: false,
        updated_at: "2026-10-29T10:00:00.000Z", // older than local e2
      },
    ];

    const merged = mergeEpisodeProgress(local, cloud);
    assert.equal(merged["tv_100_s1_e1"].progress_percent, 95);
    assert.equal(merged["tv_100_s1_e1"].completed, true);
    assert.equal(merged["tv_100_s1_e2"].progress_percent, 75);
    assert.equal(merged["tv_100_s1_e2"].completed, false);
  });
});
