import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_PATTERN_OPTIONS,
  DEFAULT_PATTERN_ID,
  normalizePatternId,
  getPatternOption,
} from "./background-patterns";
import {
  DEFAULT_STORED_THEME_PREFERENCE,
  readPreAuthThemePreference,
  writePreAuthThemePreference,
  readPendingLoginThemeHandoff,
  consumePendingLoginThemeHandoff,
  readProfilePatternPreference,
  writeProfilePatternPreference,
  type StorageLike,
} from "./preauth-theme";
import { DEFAULT_THEME_ID } from "./themes";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("background patterns & pre-auth theme persistence", () => {
  it("provides 8 theme-reactive background patterns with safe fallback normalization", () => {
    assert.equal(BACKGROUND_PATTERN_OPTIONS.length, 8);
    const ids = new Set(BACKGROUND_PATTERN_OPTIONS.map((p) => p.id));
    assert.equal(ids.size, 8);
    assert.equal(normalizePatternId("architect-grid"), "architect-grid");
    assert.equal(normalizePatternId("unknown-pattern"), DEFAULT_PATTERN_ID);
    assert.equal(getPatternOption("dot-matrix").name, "Studio Dots");
  });

  it("reads default preference when storage is empty or corrupted", () => {
    const localStore = createMemoryStorage();
    assert.deepEqual(
      readPreAuthThemePreference(localStore),
      DEFAULT_STORED_THEME_PREFERENCE
    );

    localStore.setItem("zoku_preauth_theme_v1", "{bad-json");
    assert.deepEqual(
      readPreAuthThemePreference(localStore),
      DEFAULT_STORED_THEME_PREFERENCE
    );
  });

  it("persists login theme selection to localStorage and queues one-time session handoff", () => {
    const localStore = createMemoryStorage();
    const sessionStore = createMemoryStorage();

    const saved = writePreAuthThemePreference(
      {
        themeId: "theme-indigo",
        appearance: "light",
        patternId: "architect-grid",
      },
      {
        markForAuthHandoff: true,
        localStore,
        sessionStore,
      }
    );

    assert.equal(saved.themeId, "theme-indigo");
    assert.equal(saved.appearance, "light");
    assert.equal(saved.patternId, "architect-grid");

    assert.deepEqual(readPreAuthThemePreference(localStore), saved);
    assert.deepEqual(readPendingLoginThemeHandoff(sessionStore), saved);

    const consumed = consumePendingLoginThemeHandoff(sessionStore);
    assert.deepEqual(consumed, saved);
    assert.equal(readPendingLoginThemeHandoff(sessionStore), null);
  });

  it("normalizes invalid theme or pattern values written into storage", () => {
    const localStore = createMemoryStorage();
    localStore.setItem(
      "zoku_preauth_theme_v1",
      JSON.stringify({
        themeId: "not-a-theme",
        appearance: "sepia",
        patternId: "not-a-pattern",
      })
    );

    assert.deepEqual(readPreAuthThemePreference(localStore), {
      themeId: DEFAULT_THEME_ID,
      appearance: "dark",
      patternId: DEFAULT_PATTERN_ID,
    });
  });

  it("stores per-profile pattern preferences and falls back to pre-auth pattern", () => {
    const localStore = createMemoryStorage();
    writePreAuthThemePreference(
      { patternId: "diagonal-weave" },
      { localStore, sessionStore: null }
    );

    assert.equal(readProfilePatternPreference("profile_new", localStore), "diagonal-weave");

    writeProfilePatternPreference("profile_1", "aurora-rings", localStore);
    assert.equal(readProfilePatternPreference("profile_1", localStore), "aurora-rings");
    assert.equal(readProfilePatternPreference("profile_2", localStore), "diagonal-weave");
  });
});
