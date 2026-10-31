import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RAIL_SORT_OPTIONS,
  sortTmdbRailItems,
  sortAnimeRailItems,
  sortTmdbCategoryRails,
  sortAnimeCategoryRails,
  parseTmdbReleaseTimestamp,
  parseAnimeReleaseTimestamp,
} from "./rail-sorting";
import type { TMDBTitle } from "./tmdb";
import type { AniListMedia } from "./anilist";

describe("Rail Sorting Pure Domain Logic (Popularity, Newest Releases, My Ratings, Most Watched)", () => {
  const sampleMovies: TMDBTitle[] = [
    {
      id: 1,
      title: "Popular Blockbuster",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      media_type: "movie",
      release_date: "2022-05-10",
      vote_average: 7.4,
      popularity: 950,
    },
    {
      id: 2,
      title: "Brand New Premiere",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      media_type: "movie",
      release_date: "2026-10-20",
      vote_average: 8.1,
      popularity: 620,
    },
    {
      id: 3,
      title: "Critically Acclaimed Classic",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      media_type: "movie",
      release_date: "2014-11-05",
      vote_average: 9.2,
      popularity: 410,
    },
  ];

  const sampleAnime: AniListMedia[] = [
    {
      id: 101,
      title: { english: "Viral Hit Anime" },
      popularity: 180000,
      averageScore: 78,
      startDate: { year: 2021, month: 4, day: 10 },
    },
    {
      id: 102,
      title: { english: "Simulcast Premiere" },
      popularity: 85000,
      averageScore: 84,
      startDate: { year: 2026, month: 10, day: 12 },
    },
    {
      id: 103,
      title: { english: "Masterpiece OVA" },
      popularity: 110000,
      averageScore: 93,
      startDate: { year: 2019, month: 1, day: 15 },
    },
  ];

  it("exposes exact option labels for Popularity, Newest Releases, My Ratings, and Most Watched", () => {
    assert.deepEqual(RAIL_SORT_OPTIONS, [
      { id: "popularity", label: "Popularity" },
      { id: "newest", label: "Newest Releases" },
      { id: "ratings", label: "My Ratings" },
      { id: "most_watched", label: "Most Watched" },
    ]);
  });

  it("sorts TMDB rail items by 'popularity' descending without mutating input", () => {
    const shuffled = [sampleMovies[2], sampleMovies[0], sampleMovies[1]];
    const sorted = sortTmdbRailItems(shuffled, "popularity");
    assert.deepEqual(
      sorted.map((m) => m.id),
      [1, 2, 3]
    );
    assert.equal(shuffled[0].id, 3, "Original array must not be mutated");
  });

  it("sorts TMDB rail items by 'newest' (Newest Releases) descending", () => {
    const sorted = sortTmdbRailItems(sampleMovies, "newest");
    assert.deepEqual(
      sorted.map((m) => m.id),
      [2, 1, 3]
    );
  });

  it("sorts TMDB rail items by 'ratings' (My Ratings) descending and respects user rating overrides", () => {
    const sortedByDefaultRatings = sortTmdbRailItems(sampleMovies, "ratings");
    assert.deepEqual(
      sortedByDefaultRatings.map((m) => m.id),
      [3, 2, 1]
    );

    // When user has explicitly rated item 1 as 9.8
    const sortedWithUserOverride = sortTmdbRailItems(sampleMovies, "ratings", "movie", {
      userRatings: { movie_1: 9.8 },
    });
    assert.deepEqual(
      sortedWithUserOverride.map((m) => m.id),
      [1, 3, 2]
    );
  });

  it("sorts TMDB and Anime rail items by 'most_watched' using user watch frequency with popularity fallback", () => {
    const sortedMovies = sortTmdbRailItems(sampleMovies, "most_watched", "movie", {
      userWatchCounts: {
        movie_3: 4,
        movie_2: 1.5,
      },
    });
    assert.deepEqual(
      sortedMovies.map((m) => m.id),
      [3, 2, 1]
    );

    const sortedAnime = sortAnimeRailItems(sampleAnime, "most_watched", {
      userWatchCounts: {
        anime_102: 5,
      },
    });
    assert.deepEqual(
      sortedAnime.map((a) => a.id),
      [102, 101, 103]
    );
  });

  it("sorts All Rails content categories by 'most_watched' so the most frequently accessed categories appear first", () => {
    const tmdbCategories = [
      {
        genre: { id: 28, name: "Action" },
        titles: [sampleMovies[0]],
      },
      {
        genre: { id: 18, name: "Drama" },
        titles: [sampleMovies[2]],
      },
      {
        genre: { id: 878, name: "Sci-Fi" },
        titles: [sampleMovies[1]],
      },
    ];

    const sortedCategories = sortTmdbCategoryRails(tmdbCategories, "most_watched", {
      userWatchCounts: {
        movie_3: 6, // Drama watched 6 times
        movie_2: 2, // Sci-Fi watched 2 times
      },
    });

    assert.deepEqual(
      sortedCategories.map((c) => c.genre.name),
      ["Drama", "Sci-Fi", "Action"]
    );

    const animeCategories = [
      { genre: "Action", items: [sampleAnime[0]] },
      { genre: "Thriller", items: [sampleAnime[1]] },
    ];
    const sortedAnimeCategories = sortAnimeCategoryRails(
      animeCategories,
      "most_watched",
      {
        userWatchCounts: { anime_102: 3 },
      }
    );
    assert.deepEqual(
      sortedAnimeCategories.map((c) => c.genre),
      ["Thriller", "Action"]
    );
  });

  it("sorts AniList anime items accurately across Popularity, Newest Releases, and My Ratings", () => {
    const byPopularity = sortAnimeRailItems(sampleAnime, "popularity");
    assert.deepEqual(
      byPopularity.map((a) => a.id),
      [101, 103, 102]
    );

    const byNewest = sortAnimeRailItems(sampleAnime, "newest");
    assert.deepEqual(
      byNewest.map((a) => a.id),
      [102, 101, 103]
    );

    const byRatings = sortAnimeRailItems(sampleAnime, "ratings");
    assert.deepEqual(
      byRatings.map((a) => a.id),
      [103, 102, 101]
    );
  });

  it("handles missing release dates gracefully by placing undated items at the end", () => {
    assert.equal(parseTmdbReleaseTimestamp({}), -Infinity);
    assert.equal(parseAnimeReleaseTimestamp({}), -Infinity);
  });
});

