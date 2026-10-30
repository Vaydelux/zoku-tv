import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sortWatchlistItems,
  filterWatchlistItems,
  getWatchlistItemCreator,
  getWatchlistItemGenres,
  computeWatchlistAnalytics,
  type WatchlistSortableItem,
} from "./watchlist";
import { filterWatchHistoryByType, type WatchHistoryItem } from "./watch-history";

describe("Watchlist sorting pure domain logic", () => {
  const sampleItems: WatchlistSortableItem[] = [
    {
      media_type: "movie",
      tmdbId: 101,
      title: "Zack Snyder's Justice League",
      creator: "Zack Snyder",
      genres: ["Action", "Adventure", "Fantasy"],
      added_at: "2026-10-20T10:00:00Z",
      release_date: "2021-03-18",
      vote_average: 8.1,
    },
    {
      media_type: "tv",
      tmdbId: 202,
      title: "Arcane",
      creator: "Christian Linke & Alex Yee",
      genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure"],
      added_at: "2026-10-25T14:00:00Z",
      release_date: "2021-11-06",
      vote_average: 9.0,
    },
    {
      media_type: "movie",
      tmdbId: 303,
      title: "Avatar: The Way of Water",
      creator: "James Cameron",
      genres: ["Science Fiction", "Action", "Adventure"],
      added_at: "2026-10-22T08:00:00Z",
      release_date: "2022-12-16",
      vote_average: 7.6,
    },
    {
      media_type: "anime",
      anilistId: 404,
      title: "Bleach",
      creator: "Tite Kubo / Studio Pierrot",
      genres: ["Action", "Adventure", "Supernatural"],
      added_at: "2026-10-28T09:00:00Z",
      release_date: "2004-10-05",
      vote_average: 8.2,
    },
    {
      media_type: "movie",
      tmdbId: 505,
      title: "Interstellar",
      creator: "Christopher Nolan",
      genres: ["Adventure", "Drama", "Science Fiction"],
      added_at: "2026-10-15T12:00:00Z",
      release_date: "2014-11-05",
      vote_average: 8.6,
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

describe("Watchlist search live-filter pure domain logic", () => {
  const catalogItems: WatchlistSortableItem[] = [
    {
      media_type: "movie",
      tmdbId: 157336,
      title: "Interstellar",
      creator: "Christopher Nolan",
      genres: ["Adventure", "Drama", "Science Fiction"],
      added_at: "2026-10-20T10:00:00Z",
    },
    {
      media_type: "movie",
      tmdbId: 693134,
      title: "Dune: Part Two",
      creator: "Denis Villeneuve",
      genres: ["Science Fiction", "Adventure"],
      added_at: "2026-10-21T10:00:00Z",
    },
    {
      media_type: "tv",
      tmdbId: 1396,
      title: "Breaking Bad",
      creator: "Vince Gilligan",
      genres: ["Drama", "Crime"],
      added_at: "2026-10-22T10:00:00Z",
    },
    {
      media_type: "anime",
      anilistId: 113415,
      title: "Jujutsu Kaisen",
      creator: "Gege Akutami / MAPPA",
      genres: ["Action", "Fantasy", "Supernatural"],
      added_at: "2026-10-23T10:00:00Z",
    },
    {
      // Item with no explicit creator: should resolve via catalog lookup
      media_type: "movie",
      tmdbId: 872585,
      title: "Oppenheimer",
      added_at: "2026-10-24T10:00:00Z",
    },
  ];

  it("returns all items when search query is empty or whitespace", () => {
    assert.equal(filterWatchlistItems(catalogItems, "").length, 5);
    assert.equal(filterWatchlistItems(catalogItems, "   ").length, 5);
  });

  it("filters live by title case-insensitively", () => {
    const results = filterWatchlistItems(catalogItems, "interstellar");
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Interstellar");

    const partial = filterWatchlistItems(catalogItems, "dune");
    assert.equal(partial.length, 1);
    assert.equal(partial[0].title, "Dune: Part Two");
  });

  it("filters live by creator name (explicit property)", () => {
    const nolanResults = filterWatchlistItems(catalogItems, "nolan");
    // Interstellar and Oppenheimer (both Nolan)
    assert.equal(nolanResults.length, 2);
    const titles = nolanResults.map((r) => r.title);
    assert.ok(titles.includes("Interstellar"));
    assert.ok(titles.includes("Oppenheimer"));

    const villeneuve = filterWatchlistItems(catalogItems, "villeneuve");
    assert.equal(villeneuve.length, 1);
    assert.equal(villeneuve[0].title, "Dune: Part Two");

    const gilligan = filterWatchlistItems(catalogItems, "vince gilligan");
    assert.equal(gilligan.length, 1);
    assert.equal(gilligan[0].title, "Breaking Bad");

    const mappa = filterWatchlistItems(catalogItems, "mappa");
    assert.equal(mappa.length, 1);
    assert.equal(mappa[0].title, "Jujutsu Kaisen");
  });

  it("resolves creator name via known catalog when item lacks explicit creator", () => {
    const oppenheimerItem = catalogItems.find((i) => i.title === "Oppenheimer")!;
    const creator = getWatchlistItemCreator(oppenheimerItem);
    assert.equal(creator, "Christopher Nolan");
  });

  it("returns empty array when no titles or creators match", () => {
    const noResults = filterWatchlistItems(catalogItems, "nonexistent title or creator 12345");
    assert.equal(noResults.length, 0);
  });
});

describe("Watchlist Analytics pure domain logic", () => {
  const mixedItems: WatchlistSortableItem[] = [
    {
      media_type: "movie",
      tmdbId: 101,
      title: "Movie A",
      creator: "Director One",
      genres: ["Action", "Sci-Fi"],
      vote_average: 8.0,
      added_at: "2026-10-01T00:00:00Z",
    },
    {
      media_type: "movie",
      tmdbId: 102,
      title: "Movie B",
      creator: "Director Two",
      genres: ["Action", "Adventure"],
      vote_average: 7.0,
      added_at: "2026-10-02T00:00:00Z",
    },
    {
      media_type: "tv",
      tmdbId: 201,
      title: "TV Show A",
      creator: "Showrunner One",
      genres: ["Drama", "Action"],
      vote_average: 9.0,
      added_at: "2026-10-03T00:00:00Z",
    },
    {
      media_type: "anime",
      anilistId: 301,
      title: "Anime A",
      creator: "Studio A",
      genres: ["Action", "Fantasy", "Animation"],
      vote_average: 8.5,
      added_at: "2026-10-04T00:00:00Z",
    },
  ];

  it("computes media type distribution (Movies vs TV vs Anime) accurately", () => {
    const analytics = computeWatchlistAnalytics(mixedItems);

    assert.equal(analytics.totalItems, 4);
    assert.equal(analytics.movieCount, 2);
    assert.equal(analytics.tvCount, 1);
    assert.equal(analytics.animeCount, 1);

    const movieDist = analytics.mediaTypeDistribution.find((d) => d.type === "movie")!;
    assert.equal(movieDist.count, 2);
    assert.equal(movieDist.percentage, 50.0);

    const tvDist = analytics.mediaTypeDistribution.find((d) => d.type === "tv")!;
    assert.equal(tvDist.count, 1);
    assert.equal(tvDist.percentage, 25.0);

    const animeDist = analytics.mediaTypeDistribution.find((d) => d.type === "anime")!;
    assert.equal(animeDist.count, 1);
    assert.equal(animeDist.percentage, 25.0);
  });

  it("computes genre composition and identifies top genre", () => {
    const analytics = computeWatchlistAnalytics(mixedItems);

    // Action appears in all 4 titles: count 4, 100%
    assert.equal(analytics.topGenre, "Action");

    const actionGenre = analytics.genreComposition.find((g) => g.genre === "Action")!;
    assert.ok(actionGenre);
    assert.equal(actionGenre.count, 4);
    assert.equal(actionGenre.percentage, 100);

    // Check sorted descending
    for (let i = 0; i < analytics.genreComposition.length - 1; i++) {
      assert.ok(analytics.genreComposition[i].count >= analytics.genreComposition[i + 1].count);
    }
  });

  it("computes average rating correctly", () => {
    const analytics = computeWatchlistAnalytics(mixedItems);
    // (8.0 + 7.0 + 9.0 + 8.5) / 4 = 32.5 / 4 = 8.125 -> 8.1
    assert.equal(analytics.averageRating, 8.1);
  });

  it("handles empty watchlist gracefully", () => {
    const analytics = computeWatchlistAnalytics([]);
    assert.equal(analytics.totalItems, 0);
    assert.equal(analytics.movieCount, 0);
    assert.equal(analytics.tvCount, 0);
    assert.equal(analytics.animeCount, 0);
    assert.equal(analytics.genreComposition.length, 0);
    assert.equal(analytics.topGenre, null);
    assert.equal(analytics.averageRating, null);
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
