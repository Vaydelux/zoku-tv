import assert from "node:assert/strict";
import test from "node:test";
import { genrePreferencesMatch } from "./genre-preferences";

test("Firestore genre readback accepts exact ordered numeric profile values", () => {
  assert.equal(genrePreferencesMatch([28, 12, 35, 18], [28, 12, 35, 18]), true);
  assert.equal(genrePreferencesMatch([], []), true);
});

test("Firestore genre readback rejects missing, reordered, or malformed values", () => {
  const expected = [28, 12, 35];
  for (const actual of [
    null, undefined, {}, "28,12,35", [28, 35, 12], [28, 12],
    ["28", 12, 35], [28, 12, 35, 99], [28, NaN, 35],
    [28, Infinity, 35], [28, 12.5, 35],
  ]) {
    assert.equal(genrePreferencesMatch(actual, expected), false, JSON.stringify(actual));
  }
});
