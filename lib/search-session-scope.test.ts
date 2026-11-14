import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_SEARCH_SESSION_KEY,
  searchQueryStorageKey,
  searchViewScopeKey,
  sanitizeSavedSearchQuery,
} from "./search-session-scope";

test("search view remounts on profile and Kids Mode changes", () => {
  assert.notEqual(searchViewScopeKey("adult", false), searchViewScopeKey("kids", false));
  assert.notEqual(searchViewScopeKey("shared", false), searchViewScopeKey("shared", true));
  assert.equal(searchViewScopeKey(undefined, true), "no-profile:kids");
});

test("persisted search state is profile scoped and query-only", () => {
  assert.notEqual(searchQueryStorageKey("profile-a"), searchQueryStorageKey("profile-b"));
  assert.equal(searchQueryStorageKey(""), null);
  assert.equal(LEGACY_SEARCH_SESSION_KEY, "zoku_last_search_session_v1");
  const formerlyStoredAdultMedia = {
    profileId: "profile-a", query: "sample title",
    results: [{ id: 17, title: "Previously unlocked title" }],
    animeResults: [{ id: 72, isAdult: true }],
    page: 8, isKidMode: false,
  };
  assert.deepEqual(
    sanitizeSavedSearchQuery(formerlyStoredAdultMedia, "profile-a"),
    { profileId: "profile-a", query: "sample title" },
  );
  assert.equal(sanitizeSavedSearchQuery(formerlyStoredAdultMedia, "profile-b"), null);
});

test("invalid queries cannot be persisted and excessively long terms are bounded", () => {
  assert.equal(sanitizeSavedSearchQuery({ profileId: "a", query: "" }, "a"), null);
  assert.equal(sanitizeSavedSearchQuery({ profileId: "a", query: 1 }, "a"), null);
  assert.equal(sanitizeSavedSearchQuery(null, "a"), null);
  assert.equal(sanitizeSavedSearchQuery({ profileId: "a", query: "hello" }, ""), null);
  assert.deepEqual(
    sanitizeSavedSearchQuery({ profileId: "a", query: "x".repeat(1000) }, "a"),
    { profileId: "a", query: "x".repeat(250) },
  );
});
