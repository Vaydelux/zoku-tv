import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearchGenre } from "./search-media-genre";
import type { TMDBTitle } from "./tmdb";
import type { AniListMedia } from "./anilist";

const movie: TMDBTitle = {
  id: 1, title: "Example", overview: "", poster_path: null,
  backdrop_path: null, vote_average: 8, genre_ids: [878, 12],
};
const anime: AniListMedia = {
  id: 2, title: { romaji: "Example" }, genres: ["Action", "Sci-Fi"],
};

test("TMDB numeric and AniList textual genres filter correctly without conflating providers", () => {
  assert.equal(matchesSearchGenre({ kind: "movie", data: movie }, "Sci-Fi"), true);
  assert.equal(matchesSearchGenre({ kind: "movie", data: movie }, "Adventure"), true);
  assert.equal(matchesSearchGenre({ kind: "movie", data: movie }, "Drama"), false);
  assert.equal(matchesSearchGenre({ kind: "anime", data: anime }, "Sci-Fi"), true);
  assert.equal(matchesSearchGenre({ kind: "anime", data: anime }, "Action"), true);
  assert.equal(matchesSearchGenre({ kind: "anime", data: anime }, "Horror"), false);
});

test("unknown metadata fails closed for selected genre but still appears in unfiltered results", () => {
  assert.equal(matchesSearchGenre({ kind: "movie", data: { ...movie, genre_ids: [] } }, "Action"), false);
  assert.equal(matchesSearchGenre({ kind: "anime", data: { ...anime, genres: null } }, "Drama"), false);
  assert.equal(matchesSearchGenre({ kind: "anime", data: { ...anime, genres: null } }, "All genres"), true);
});
