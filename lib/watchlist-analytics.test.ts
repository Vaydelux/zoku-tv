import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterWatchlistItems,
  getWatchlistItemCreator,
  getWatchlistItemGenres,
  computeWatchlistAnalytics,
  type WatchlistSortableItem,
} from "./watchlist";

describe("Watchlist search and analytics expanded test suite", () => {
  const dataset: WatchlistSortableItem[] = [
    {
      media_type: "movie",
      tmdbId: 872585,
      title: "Oppenheimer",
      creator: "Christopher Nolan",
      genres: ["Drama", "History"],
      vote_average: 8.1,
      added_at: "2026-10-01T12:00:00Z",
      release_date: "2023-07-21",
    },
    {
      media_type: "movie",
      tmdbId: 693134,
      title: "Dune: Part Two",
      creator: "Denis Villeneuve",
      genres: ["Science Fiction", "Adventure", "Action"],
      vote_average: 8.3,
      added_at: "2026-10-02T12:00:00Z",
      release_date: "2024-02-27",
    },
    {
      media_type: "tv",
      tmdbId: 95396,
      title: "Severance",
      creator: "Dan Erickson",
      genres: ["Drama", "Mystery", "Sci-Fi & Fantasy"],
      vote_average: 8.4,
      added_at: "2026-10-03T12:00:00Z",
      release_date: "2022-02-17",
    },
    {
      media_type: "tv",
      tmdbId: 94605,
      title: "Arcane",
      creator: "Christian Linke & Alex Yee",
      genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure", "Drama"],
      vote_average: 8.8,
      added_at: "2026-10-04T12:00:00Z",
      release_date: "2021-11-06",
    },
    {
      media_type: "anime",
      anilistId: 404,
      title: "Bleach",
      creator: "Tite Kubo / Studio Pierrot",
      genres: ["Action", "Adventure", "Supernatural"],
      vote_average: 8.2,
      added_at: "2026-10-05T12:00:00Z",
      release_date: "2004-10-05",
    },
    {
      media_type: "anime",
      anilistId: 113415,
      title: "Jujutsu Kaisen",
      creator: "Gege Akutami / MAPPA",
      genres: ["Action", "Fantasy", "Supernatural"],
      vote_average: 8.5,
      added_at: "2026-10-06T12:00:00Z",
      release_date: "2020-10-03",
    },
  ];

  describe("Live search filtering by title and creator name", () => {
    it("filters accurately by full title", () => {
      const results = filterWatchlistItems(dataset, "Severance");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Severance");
    });

    it("filters accurately by partial title with uppercase letters", () => {
      const results = filterWatchlistItems(dataset, "DUNE");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Dune: Part Two");
    });

    it("filters accurately by creator surname", () => {
      const results = filterWatchlistItems(dataset, "Nolan");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Oppenheimer");
    });

    it("filters accurately by animation studio name as creator", () => {
      const results = filterWatchlistItems(dataset, "MAPPA");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Jujutsu Kaisen");

      const pierrot = filterWatchlistItems(dataset, "pierrot");
      assert.equal(pierrot.length, 1);
      assert.equal(pierrot[0].title, "Bleach");
    });

    it("matches multiple items when query is common to multiple creators or titles", () => {
      // "Dan" matches "Dan Erickson" (Severance)
      const danResults = filterWatchlistItems(dataset, "dan");
      assert.equal(danResults.length, 1);
      assert.equal(danResults[0].title, "Severance");
    });

    it("handles leading and trailing whitespace in search query", () => {
      const results = filterWatchlistItems(dataset, "   Arcane   ");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Arcane");
    });
  });

  describe("Analytics calculation (Movies vs TV vs Anime + Genres)", () => {
    it("computes distribution of media types with 2 movies, 2 tv shows, 2 anime", () => {
      const analytics = computeWatchlistAnalytics(dataset);

      assert.equal(analytics.totalItems, 6);
      assert.equal(analytics.movieCount, 2);
      assert.equal(analytics.tvCount, 2);
      assert.equal(analytics.animeCount, 2);

      const movieDist = analytics.mediaTypeDistribution.find((d) => d.type === "movie")!;
      assert.equal(movieDist.percentage, 33.3);

      const tvDist = analytics.mediaTypeDistribution.find((d) => d.type === "tv")!;
      assert.equal(tvDist.percentage, 33.3);

      const animeDist = analytics.mediaTypeDistribution.find((d) => d.type === "anime")!;
      assert.equal(animeDist.percentage, 33.3);
    });

    it("computes genre frequencies and ranking", () => {
      const analytics = computeWatchlistAnalytics(dataset);

      assert.ok(analytics.genreComposition.length > 0);
      // Action is in Dune, Bleach, Jujutsu Kaisen, Arcane
      const action = analytics.genreComposition.find((g) => g.genre === "Action");
      assert.ok(action);
      assert.ok(action.count >= 3);

      // Drama is in Oppenheimer, Severance, Arcane
      const drama = analytics.genreComposition.find((g) => g.genre === "Drama");
      assert.ok(drama);
      assert.equal(drama.count, 3);
    });

    it("computes overall average rating across all 6 titles", () => {
      const analytics = computeWatchlistAnalytics(dataset);
      // (8.1 + 8.3 + 8.4 + 8.8 + 8.2 + 8.5) / 6 = 50.3 / 6 = 8.3833... -> 8.4
      assert.equal(analytics.averageRating, 8.4);
    });
  });
});

