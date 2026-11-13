import assert from "node:assert/strict";
import test from "node:test";
import { filterRestrictedTmdbTitles, isRestrictedTmdbTitle, setAdultFilterEnabled } from "./adult-content";

test("blocks explicit adult flag and VMX company regardless of TMDB adult flag", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 12, adult: true }), true);
  assert.equal(isRestrictedTmdbTitle({ id: 13, adult: false, production_companies: [{ id: 149142 }] }), true);
});
test("blocks R-18 release data and erotic keyword metadata", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 14, release_dates: { results: [{ iso_3166_1: "PH", release_dates: [{ certification: "R-18" }] }] } }), true);
  assert.equal(isRestrictedTmdbTitle({ id: 15, keywords: { keywords: [{ id: 9715 }] } }), true);
});
test("retains ordinary romance and mature-themed drama without explicit classifications", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 16, title: "An Ordinary Romance", overview: "A forbidden affair." }), false);
  assert.equal(isRestrictedTmdbTitle({ id: 17, adult: false, title: "A Drama" }), false);
});
test("respects filter switch", () => {
  const items = [{ id: 1, adult: true }, { id: 2, adult: false }];
  setAdultFilterEnabled(true);
  assert.deepEqual(filterRestrictedTmdbTitles(items).map((item) => item.id), [2]);
  setAdultFilterEnabled(false);
  assert.deepEqual(filterRestrictedTmdbTitles(items).map((item) => item.id), [1, 2]);
  setAdultFilterEnabled(true);
});
