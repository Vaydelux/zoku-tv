import assert from "node:assert/strict";
import test from "node:test";
import {
  getSearchPageResultStatus,
  shouldOfferMoreSearchResults,
} from "./search-result-status";

test("pagination stops after both protected providers are exhausted", () => {
  assert.equal(shouldOfferMoreSearchResults({ page: 1, tmdbResultCount: 0, animeHasNextPage: false }), false);
  assert.equal(shouldOfferMoreSearchResults({ page: 3, tmdbResultCount: 0, animeHasNextPage: true }), true);
  assert.equal(shouldOfferMoreSearchResults({ page: 3, tmdbResultCount: 8, animeHasNextPage: false }), true);
});

test("load-more guard caps excessive requests", () => {
  assert.equal(shouldOfferMoreSearchResults({ page: 100, tmdbResultCount: 20, animeHasNextPage: true }), false);
  assert.equal(shouldOfferMoreSearchResults({ page: 0, tmdbResultCount: 20, animeHasNextPage: true }), false);
});

test("search reports errors when providers fail rather than silently showing stale titles", () => {
  assert.equal(getSearchPageResultStatus({ tmdbFailed: false, animeFailed: false }), "ok");
  assert.equal(getSearchPageResultStatus({ tmdbFailed: true, animeFailed: false }), "partial");
  assert.equal(getSearchPageResultStatus({ tmdbFailed: false, animeFailed: true }), "partial");
  assert.equal(getSearchPageResultStatus({ tmdbFailed: true, animeFailed: true }), "unavailable");
});
