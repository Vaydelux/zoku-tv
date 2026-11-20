import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PROFILE_AVATAR,
  DEFAULT_PROFILE_AVATAR_COLOR,
  PROFILE_AVATAR_COLORS,
  PROFILE_AVATAR_OPTIONS,
  PROFILE_AVATAR_PRELOAD_URLS,
  PROFILE_PREMIUM_AVATAR_OPTIONS,
  PROFILE_PREMIUM_COLLECTIONS,
  fallbackPremiumAvatarForPresetIndex,
  getAvatarCollectionSlug,
  getPremiumAvatarsByCollection,
  getProfileAvatarOption,
  isPremiumAvatarPath,
  isPresetAvatarPath,
  normalizeProfileAvatarColor,
  profileAvatarSrc,
  randomPremiumAvatarId,
  randomPresetAvatarId,
  resolveAvatarId,
} from "./profile-avatars";

describe("profile-avatars catalog & legacy SVG fallback", () => {
  it("exposes only Premium PNG avatars as selectable catalog options and default", () => {
    assert.equal(PROFILE_AVATAR_OPTIONS.length, 25);
    assert.equal(PROFILE_PREMIUM_AVATAR_OPTIONS.length, 25);
    assert.equal(DEFAULT_PROFILE_AVATAR.group, "premium");
    assert.equal(DEFAULT_PROFILE_AVATAR.id, "premium-avengers-1");
    assert.ok(isPremiumAvatarPath(DEFAULT_PROFILE_AVATAR.src));
    assert.equal(
      PROFILE_AVATAR_PRELOAD_URLS.every((url) => !isPresetAvatarPath(url)),
      true
    );
  });

  it("organizes avatars across Avengers (8), One Piece (10), and Sanrio (7)", () => {
    assert.deepEqual(
      PROFILE_PREMIUM_COLLECTIONS.map((c) => [c.slug, c.count]),
      [
        ["avengers", 8],
        ["onepiece", 10],
        ["sanrio", 7],
      ]
    );
    assert.equal(getPremiumAvatarsByCollection("all").length, 25);
    assert.equal(getPremiumAvatarsByCollection("avengers").length, 8);
    assert.equal(getPremiumAvatarsByCollection("onepiece").length, 10);
    assert.equal(getPremiumAvatarsByCollection("sanrio").length, 7);
  });

  it("deterministically maps legacy SVG preset IDs and URLs to distinct Premium PNG avatars", () => {
    assert.equal(resolveAvatarId("preset-1"), "premium-avengers-1");
    assert.equal(resolveAvatarId("preset-2"), "premium-avengers-2");
    assert.equal(resolveAvatarId("preset-9"), "premium-onepiece-1");
    assert.equal(resolveAvatarId("preset-19"), "premium-sanrio-1");
    // Wraps cleanly modulo 25
    assert.equal(resolveAvatarId("preset-26"), "premium-avengers-1");

    // Encoded and unencoded legacy preset URLs
    assert.equal(resolveAvatarId("/avatars/presets/presets%20(3).svg"), "premium-avengers-3");
    assert.equal(resolveAvatarId("/avatars/presets/presets (10).svg"), "premium-onepiece-2");
    assert.equal(resolveAvatarId("/avatars/presets/unknown.svg"), DEFAULT_PROFILE_AVATAR.id);

    // Helper returns valid Premium options
    assert.equal(fallbackPremiumAvatarForPresetIndex(1).id, "premium-avengers-1");
    assert.equal(getProfileAvatarOption("preset-4").id, "premium-avengers-4");
    assert.equal(profileAvatarSrc("preset-4"), getProfileAvatarOption("premium-avengers-4").src);
  });

  it("resolves Premium IDs, Premium URLs, external HTTP URLs, and empty values accurately", () => {
    const onePieceUrl = profileAvatarSrc("premium-onepiece-5");
    assert.equal(resolveAvatarId("premium-onepiece-5"), "premium-onepiece-5");
    assert.equal(resolveAvatarId(onePieceUrl), "premium-onepiece-5");
    assert.equal(resolveAvatarId(decodeURIComponent(onePieceUrl)), "premium-onepiece-5");
    assert.equal(resolveAvatarId("https://example.com/custom-avatar.png"), "legacy");
    assert.equal(resolveAvatarId(undefined), DEFAULT_PROFILE_AVATAR.id);
    assert.equal(resolveAvatarId(""), DEFAULT_PROFILE_AVATAR.id);
    assert.equal(getAvatarCollectionSlug("premium-sanrio-3"), "sanrio");
  });

  it("returns valid Premium PNG IDs from both randomizers and preserves color normalization", () => {
    const validIds = new Set(PROFILE_PREMIUM_AVATAR_OPTIONS.map((o) => o.id));
    for (let i = 0; i < 30; i += 1) {
      assert.ok(validIds.has(randomPremiumAvatarId()));
      assert.ok(validIds.has(randomPresetAvatarId()));
    }
    assert.equal(normalizeProfileAvatarColor(PROFILE_AVATAR_COLORS[3]), PROFILE_AVATAR_COLORS[3]);
    assert.equal(normalizeProfileAvatarColor("#000000"), DEFAULT_PROFILE_AVATAR_COLOR);
  });
});
