import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalMediaKey,
  isValidMediaKey,
  validateCollectionInput,
  createCollectionRecord,
  toggleItemInCollection,
  exportLibraryBackupJson,
  importLibraryBackupJson,
  type BackupWatchlistItem,
  type CustomCollection,
} from "./custom-collections";
import {
  resolveWatchShortcutAction,
  shouldIgnoreShortcutTarget,
  WATCH_SHORTCUT_DEFINITIONS,
} from "./watch-shortcuts";
import {
  normalizeCatalogType,
  buildGenresUrl,
  buildDiscoverUrl,
} from "./discover-url";

test("custom collections: canonicalMediaKey and validation", () => {
  assert.equal(canonicalMediaKey("movie", 550), "movie_550");
  assert.equal(canonicalMediaKey("tv", 1396), "tv_1396");
  assert.equal(canonicalMediaKey("anime", 21), "anime_21");

  assert.equal(isValidMediaKey("movie_550"), true);
  assert.equal(isValidMediaKey("anime_16498"), true);
  assert.equal(isValidMediaKey("movie_0"), false);
  assert.equal(isValidMediaKey("other_12"), false);
  assert.equal(isValidMediaKey("movie_-5"), false);

  const emptyErr = validateCollectionInput({ name: "   " });
  assert.equal(emptyErr.ok, false);

  const valid = validateCollectionInput({
    name: "  Weekend Sci-Fi  ",
    description: "  Mind-bending favorites  ",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.name, "Weekend Sci-Fi");
    assert.equal(valid.description, "Mind-bending favorites");
  }
});

test("custom collections: create and toggleItemInCollection deduplicates cleanly", () => {
  const created = createCollectionRecord({
    id: "col-scifi",
    name: "Sci-Fi Vault",
    itemKeys: ["movie_550", "movie_550", "invalid_key", "tv_1396"],
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.deepEqual(created.collection.itemKeys, ["movie_550", "tv_1396"]);

  // Adding a new key prepends it
  const added = toggleItemInCollection(created.collection, "anime_21");
  assert.deepEqual(added.itemKeys, ["anime_21", "movie_550", "tv_1396"]);

  // Toggling an existing key removes it
  const removed = toggleItemInCollection(added, "movie_550");
  assert.deepEqual(removed.itemKeys, ["anime_21", "tv_1396"]);

  // Invalid keys are ignored
  const unchanged = toggleItemInCollection(removed, "bad_0");
  assert.deepEqual(unchanged.itemKeys, ["anime_21", "tv_1396"]);
});

test("library backup JSON: export + import merge and replace modes", () => {
  const currentWatchlist: BackupWatchlistItem[] = [
    {
      media_type: "movie",
      tmdbId: 550,
      anilistId: null,
      added_at: "2026-01-01T00:00:00.000Z",
      title: "Fight Club",
    },
  ];
  const currentCollections: CustomCollection[] = [
    {
      id: "col-main",
      name: "Favorites",
      itemKeys: ["movie_550"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const exportedJson = exportLibraryBackupJson({
    profileName: "Alex",
    watchlist: [
      {
        media_type: "tv",
        tmdbId: 1396,
        anilistId: null,
        added_at: "2026-02-01T00:00:00.000Z",
        title: "Breaking Bad",
      },
      {
        media_type: "anime",
        tmdbId: null,
        anilistId: 16498,
        added_at: "2026-02-02T00:00:00.000Z",
        title: "Attack on Titan",
      },
    ],
    collections: [
      {
        id: "col-main",
        name: "All-Time Favorites",
        itemKeys: ["tv_1396"],
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
      {
        id: "col-anime",
        name: "Top Anime",
        itemKeys: ["anime_16498"],
        createdAt: "2026-02-02T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
    watchHistory: [],
  });

  // Merge mode preserves existing watchlist & merges collection keys
  const merged = importLibraryBackupJson(
    exportedJson,
    {
      watchlist: currentWatchlist,
      collections: currentCollections,
      watchHistory: [],
    },
    "merge"
  );
  assert.equal(merged.ok, true);
  if (merged.ok) {
    assert.equal(merged.watchlist.length, 3);
    assert.equal(merged.collections.length, 2);
    const mainCol = merged.collections.find((c) => c.id === "col-main");
    assert.ok(mainCol);
    assert.deepEqual(mainCol.itemKeys.sort(), ["movie_550", "tv_1396"]);
  }

  // Replace mode overwrites with backup contents
  const replaced = importLibraryBackupJson(
    exportedJson,
    {
      watchlist: currentWatchlist,
      collections: currentCollections,
      watchHistory: [],
    },
    "replace"
  );
  assert.equal(replaced.ok, true);
  if (replaced.ok) {
    assert.equal(replaced.watchlist.length, 2);
    assert.equal(replaced.collections.length, 2);
  }

  // Invalid JSON and unrelated objects are rejected
  const badSyntax = importLibraryBackupJson(
    "{broken",
    { watchlist: [], collections: [], watchHistory: [] },
    "merge"
  );
  assert.equal(badSyntax.ok, false);

  const unrelated = importLibraryBackupJson(
    JSON.stringify({ hello: "world" }),
    { watchlist: [], collections: [], watchHistory: [] },
    "merge"
  );
  assert.equal(unrelated.ok, false);
});

test("watch shortcuts: resolves all actions and suppresses modifier combos and inputs", () => {
  assert.equal(WATCH_SHORTCUT_DEFINITIONS.length, 9);
  assert.equal(resolveWatchShortcutAction({ key: "f" }), "toggle_fullscreen");
  assert.equal(resolveWatchShortcutAction({ key: "F" }), "toggle_fullscreen");
  assert.equal(resolveWatchShortcutAction({ key: "t" }), "toggle_theater");
  assert.equal(resolveWatchShortcutAction({ key: "e" }), "toggle_drawer");
  assert.equal(resolveWatchShortcutAction({ key: "Escape" }), "escape");
  assert.equal(resolveWatchShortcutAction({ key: "n" }), "next_episode");
  assert.equal(resolveWatchShortcutAction({ key: "N" }), "next_episode");
  assert.equal(resolveWatchShortcutAction({ key: "p" }), "prev_episode");
  assert.equal(resolveWatchShortcutAction({ key: "s" }), "next_server");
  assert.equal(resolveWatchShortcutAction({ key: "r" }), "retry_frame");
  assert.equal(resolveWatchShortcutAction({ key: "m" }), "toggle_watched");
  assert.equal(resolveWatchShortcutAction({ key: "?" }), "toggle_shortcuts_help");

  // Modifier keys must not hijack browser shortcuts (e.g. Ctrl+R reload, Cmd+N new window)
  assert.equal(resolveWatchShortcutAction({ key: "r", ctrlKey: true }), null);
  assert.equal(resolveWatchShortcutAction({ key: "n", metaKey: true }), null);
  assert.equal(resolveWatchShortcutAction({ key: "s", altKey: true }), null);
  assert.equal(resolveWatchShortcutAction({ key: "x" }), null);

  assert.equal(shouldIgnoreShortcutTarget({ tagName: "INPUT" } as unknown as EventTarget), true);
  assert.equal(shouldIgnoreShortcutTarget({ tagName: "TEXTAREA" } as unknown as EventTarget), true);
  assert.equal(shouldIgnoreShortcutTarget({ tagName: "SELECT" } as unknown as EventTarget), true);
  assert.equal(
    shouldIgnoreShortcutTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget),
    true
  );
  assert.equal(shouldIgnoreShortcutTarget({ tagName: "BUTTON" } as unknown as EventTarget), false);
  assert.equal(shouldIgnoreShortcutTarget(null), false);
});

test("discover URL helpers: normalizeCatalogType, buildGenresUrl, buildDiscoverUrl", () => {
  assert.equal(normalizeCatalogType("movie"), "movie");
  assert.equal(normalizeCatalogType("tv"), "tv");
  assert.equal(normalizeCatalogType("anime"), "anime");
  assert.equal(normalizeCatalogType("unknown", "tv"), "tv");
  assert.equal(normalizeCatalogType(null, "anime"), "anime");

  assert.equal(buildGenresUrl("anime"), "/genres?type=anime");
  assert.equal(buildGenresUrl("tv"), "/genres?type=tv");

  assert.equal(
    buildDiscoverUrl({ type: "movie", genre: 28, sortBy: "vote_average.desc" }),
    "/discover?type=movie&with_genres=28&sort_by=vote_average.desc"
  );
  assert.equal(
    buildDiscoverUrl({ type: "anime", genre: "Action", sortBy: "SCORE_DESC" }),
    "/discover?type=anime&genres=Action&sort=SCORE_DESC"
  );
  assert.equal(
    buildDiscoverUrl({ type: "anime", view: "schedule" }),
    "/discover?type=anime&view=schedule"
  );
});
