import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  THEME_OPTIONS,
  THEME_CATEGORIES,
  resolveThemeTokens,
  normalizeThemeId,
  DEFAULT_THEME_ID,
} from "./themes";

describe("themes token system", () => {
  it("defines 25 distinct themes including flagship iOS Liquid Glass with substantial gradients", () => {
    assert.equal(THEME_OPTIONS.length, 25);
    assert.equal(DEFAULT_THEME_ID, "theme-liquid-glass");

    const seenBackgroundGradients = new Set<string>();
    const seenButtonGradients = new Set<string>();

    for (const option of THEME_OPTIONS) {
      assert.ok(THEME_CATEGORIES.includes(option.category));
      assert.ok(option.preview.startsWith("linear-gradient("));
      for (const mode of ["dark", "light"] as const) {
        const tokens = resolveThemeTokens(option.id, mode);
        assert.ok(tokens.backgroundGradient.includes("radial-gradient"));
        assert.ok(tokens.backgroundGradient.includes("linear-gradient"));
        assert.ok(tokens.surfaceGradient.includes("linear-gradient"));
        assert.ok(tokens.buttonGradient.includes("linear-gradient"));
        assert.ok(tokens.orbA.includes("radial-gradient"));
        assert.ok(tokens.orbB.includes("radial-gradient"));
        assert.ok(tokens.orbC.includes("radial-gradient"));
      }
      seenBackgroundGradients.add(option.tokens.backgroundGradient);
      seenButtonGradients.add(option.tokens.buttonGradient);
    }

    assert.equal(seenBackgroundGradients.size, 25);
    assert.equal(seenButtonGradients.size, 25);
  });

  it("normalizes legacy and new theme names and falls back safely to flagship Liquid Glass default", () => {
    assert.equal(normalizeThemeId("iOS Liquid Glass"), "theme-liquid-glass");
    assert.equal(normalizeThemeId("Crimson Cinema"), "theme-crimson");
    assert.equal(normalizeThemeId("Dark Aurora"), "theme-aurora");
    assert.equal(normalizeThemeId("Void Purple"), "theme-void");
    assert.equal(normalizeThemeId("Sakura Noir"), "theme-sakura");
    assert.equal(normalizeThemeId("Noir Gilded"), "theme-gilded");
    assert.equal(normalizeThemeId("Studio Indigo"), "theme-indigo");
    assert.equal(normalizeThemeId("unknown-theme"), DEFAULT_THEME_ID);
  });
});
