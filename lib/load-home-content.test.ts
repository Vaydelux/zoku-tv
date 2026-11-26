import assert from "node:assert/strict";
import test from "node:test";
import type { TMDBTitle } from "./tmdb";
import { pickFeaturedHeroSlides, combineHomeTrendingFeeds } from "./load-home-content";

function item(id: number, backdrop_path: string | null, overview = "Safe synopsis"): TMDBTitle {
  return {
    id, media_type: "movie", title: `Movie ${id}`,
    backdrop_path, poster_path: null, overview,
    release_date: "2026-01-01", vote_average: 7,
  };
}

test("featured hero prefers titles with artwork and synopsis without mutating inputs", () => {
  const movies = [item(1, null), item(2, "/backdrop.jpg")];
  const all = [item(3, "/other.jpg")];
  assert.deepEqual(pickFeaturedHeroSlides(movies, all).map(x => x.id), [2, 3]);
  assert.equal(movies[0].id, 1);
});

test("featured hero remains visible when safe titles have no backdrops", () => {
  const movies = [item(1, null), item(2, null)];
  assert.deepEqual(pickFeaturedHeroSlides(movies, []).map(x => x.id), [1, 2]);
});

test("featured hero falls back to all-media feed when movies are empty", () => {
  assert.deepEqual(pickFeaturedHeroSlides([], [item(10, null)]).map(x => x.id), [10]);
});

test("featured selection deduplicates IDs and rejects invalid entries", () => {
  const movies = [item(0, "/invalid.jpg"), item(2, "/good.jpg")];
  const all = [item(2, "/good.jpg"), item(3, "/new.jpg")];
  assert.deepEqual(pickFeaturedHeroSlides(movies, all, 2).map(x => x.id), [2, 3]);
});

test("featured selection returns empty only when the catalog itself has no safe entries", () => {
  assert.deepEqual(pickFeaturedHeroSlides([], []), []);
  assert.deepEqual(pickFeaturedHeroSlides([item(5, null)], [], 0), []);
});

test("cold Home preserves available feeds when an independent endpoint fails", () => {
  const movie = item(10, "/movie.jpg");
  const tv: TMDBTitle = { ...item(20, "/tv.jpg"), media_type: "tv" };
  const rejected: PromiseRejectedResult = { status: "rejected", reason: new Error("503") };
  const fulfilled = (value: TMDBTitle[]): PromiseFulfilledResult<TMDBTitle[]> => ({ status: "fulfilled", value });
  const partial = combineHomeTrendingFeeds([rejected, fulfilled([movie]), fulfilled([tv])]);
  assert.deepEqual(partial.trendingMovies, [movie]);
  assert.deepEqual(partial.trendingTV, [tv]);
  assert.ok(partial.heroSlides.length > 0);
  const fallback = combineHomeTrendingFeeds([fulfilled([movie, tv]), rejected, rejected]);
  assert.deepEqual(fallback.trendingMovies, [movie]);
  assert.deepEqual(fallback.trendingTV, [tv]);
  assert.throws(() => combineHomeTrendingFeeds([rejected, rejected, rejected]), /temporarily unavailable/);
});
