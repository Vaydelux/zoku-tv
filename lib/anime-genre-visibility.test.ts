import assert from "node:assert/strict";
import test from "node:test";
import { isAnimeGenreVisible, visibleAnimeGenres } from "./anime-genre-visibility";

test("default adult filtering hides explicit anime categories, independent of Kids Mode", () => {
  assert.equal(isAnimeGenreVisible("Ecchi", false, true), false);
  assert.equal(isAnimeGenreVisible(" HENTAI ", false, true), false);
  assert.equal(isAnimeGenreVisible("erotica", false, true), false);
  assert.equal(isAnimeGenreVisible("Action", false, true), true);
  assert.equal(isAnimeGenreVisible("", false, true), false);
});

test("password unlock can expose adult genre chips for non-Kids profiles", () => {
  assert.equal(isAnimeGenreVisible("Ecchi", false, false), true);
  assert.equal(isAnimeGenreVisible("Hentai", false, false), true);
});

test("Kids Mode stays stricter even with adult-content password unlocked", () => {
  assert.equal(isAnimeGenreVisible("Ecchi", true, false), false);
  assert.equal(isAnimeGenreVisible("Horror", true, false), false);
  assert.equal(isAnimeGenreVisible("Psychological", true, false), false);
  assert.equal(isAnimeGenreVisible("Comedy", true, false), true);
});

test("genres remain consistently filtered across the Genres and Discover surfaces", () => {
  const source = ["Action", "Ecchi", "Horror", "Romance", "Hentai"] as const;
  assert.deepEqual(visibleAnimeGenres(source, false, true), ["Action", "Horror", "Romance"]);
  assert.deepEqual(visibleAnimeGenres(source, true, false), ["Action", "Romance"]);
  assert.deepEqual(visibleAnimeGenres(source, true, true), ["Action", "Romance"]);
});
