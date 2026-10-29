import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortWatchlistItems, type WatchlistSortableItem } from "./watchlist";
import { filterWatchHistoryByType, type WatchHistoryItem } from "./watch-history";

describe("Watchlist sorting pure domain logic", () => {
  const sampleItems: WatchlistSortableItem[] = [
    {
      media_type: "movie",
      tmdbId: 101,
      title: "Zack Snyder's Justice League",
      added_at: "2026-10-20T10:00:00Z",
      release_date: "2021-03-18",
    },
    {
      media_type: "tv",
      tmdbId: 202,
      title: "Arcane",
      added_at: "2026-10-25T14:00:00Z",
      release_date: "2021-11-06",
    },
    {
      media_type: "movie",
      tmdbId: 303,
      title: "Avatar: The Way of Water",
      added_at: "2026-10-22T08:00:00Z",
      release_date: "2022-12-16",
    },
    {
      media_type: "anime",
      anilistId: 404,
      title: "Bleach",
      added_at: "2026-10-28T09:00:00Z",
      release_date: "2004-10-05",
    },
    {
      media_type: "movie",
      tmdbId: 505,
      title: "Interstellar",
      added_at: "2026-10-15T12:00:00Z",
      release_date: "2014-11-05",
    },
  ];

  it("sorts by 'recently_added' descending", () => {
    const sorted = sortWatchlistItems(sampleItems, "recently_added");
    const titles = sorted.map((s) => s.title);
    assert.deepEqual(titles, [
      "Bleach", // Oct 28
      "Arcane", // Oct 25
      "Avatar: The Way of Water", // Oct 22
      "Zack Snyder's Justice League", // Oct 20
      "Interstellar", // Oct 15
    ]);
  });

  it("sorts by 'alphabetical' ascending A-Z", () => {
    const sorted = sortWatchlistItems(sampleItems, "alphabetical");
    const titles = sorted.map((s) => s.title);
    assert.deepEqual(titles, [
      "Arcane",
      "Avatar: The Way of Water",
      "Bleach",
      "Interstellar",
      "Zack Snyder's Justice League",
    ]);
  });

  it("sorts by 'release_date' descending (newest release first)", () => {
    const sorted = sortWatchlistItems(sampleItems, "release_date");
    const titles = sorted.map((s) => s.title);
    assert.deepEqual(titles, [
      "Avatar: The Way of Water", // 2022-12-16
      "Arcane", // 2021-11-06
      "Zack Snyder's Justice League", // 2021-03-18
      "Interstellar", // 2014-11-05
      "Bleach", // 2004-10-05
    ]);
  });

  it("handles items missing release_date gracefully by placing them at the end", () => {
    const itemsWithMissing: WatchlistSortableItem[] = [
      {
        media_type: "movie",
        tmdbId: 1,
        title: "Mystery Movie",
        added_at: "2026-10-20T10:00:00Z",
        release_date: null,
      },
      {
        media_type: "movie",
        tmdbId: 2,
        title: "Oppenheimer",
        added_at: "2026-10-21T10:00:00Z",
        release_date: "2023-07-21",
      },
      {
        media_type: "tv",
        tmdbId: 3,
        title: "Stranger Things",
        added_at: "2026-10-22T10:00:00Z",
        release_date: "2016-07-15",
      },
    ];

    const sorted = sortWatchlistItems(itemsWithMissing, "release_date");
    assert.equal(sorted[0].title, "Oppenheimer");
    assert.equal(sorted[1].title, "Stranger Things");
    assert.equal(sorted[2].title, "Mystery Movie");
  });
});

describe("Watch History type filter pure domain logic", () => {
  const historyItems: WatchHistoryItem[] = [
    {
      media_type: "movie",
      tmdbId: 101,
      title: "Inception",
      completed: true,
      watch_count: 2,
      last_watched_at: "2026-10-20T10:00:00Z",
    },
    {
      media_type: "tv",
      tmdbId: 202,
      title: "Breaking Bad",
      season: 3,
      episode: 10,
      completed: false,
      watch_count: 1,
      last_watched_at: "2026-10-22T10:00:00Z",
    },
    {
      media_type: "anime",
      anilistId: 303,
      title: "Demon Slayer the Movie: Mugen Train",
      completed: true,
      watch_count: 1,
      last_watched_at: "2026-10-24T10:00:00Z",
    },
    {
      media_type: "anime",
      anilistId: 404,
      title: "Jujutsu Kaisen",
      season: 2,
      episode: 12,
      completed: false,
      watch_count: 1,
      last_watched_at: "2026-10-25T10:00:00Z",
    },
  ];

  it("filters 'all' returning all items", () => {
    const filtered = filterWatchHistoryByType(historyItems, "all");
    assert.equal(filtered.length, 4);
  });

  it("filters 'movie' returning movies and anime movies", () => {
    const filtered = filterWatchHistoryByType(historyItems, "movie");
    assert.equal(filtered.length, 2);
    const titles = filtered.map((f) => f.title);
    assert.ok(titles.includes("Inception"));
    assert.ok(titles.includes("Demon Slayer the Movie: Mugen Train"));
    assert.ok(!titles.includes("Breaking Bad"));
    assert.ok(!titles.includes("Jujutsu Kaisen"));
  });

  it("filters 'tv' returning TV shows and episodic anime", () => {
    const filtered = filterWatchHistoryByType(historyItems, "tv");
    assert.equal(filtered.length, 2);
    const titles = filtered.map((f) => f.title);
    assert.ok(titles.includes("Breaking Bad"));
    assert.ok(titles.includes("Jujutsu Kaisen"));
    assert.ok(!titles.includes("Inception"));
    assert.ok(!titles.includes("Demon Slayer the Movie: Mugen Train"));
  });
});
