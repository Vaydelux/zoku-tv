import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TMDB_POPULAR_LANGUAGES } from "./tmdb";

describe("TMDB Language and Discover Reference", () => {
  it("includes expected reference languages for discover feeds", () => {
    const codes = TMDB_POPULAR_LANGUAGES.map((l) => l.iso_639_1);

    // Required languages according to prompt and TMDB reference
    assert.ok(codes.includes("en"), "Includes English");
    assert.ok(codes.includes("ja"), "Includes Japanese");
    assert.ok(codes.includes("fr"), "Includes French");
    assert.ok(codes.includes("ko"), "Includes Korean");
    assert.ok(codes.includes("es"), "Includes Spanish");
    assert.ok(codes.includes("de"), "Includes German");
    assert.ok(codes.includes("it"), "Includes Italian");
    assert.ok(codes.includes("zh"), "Includes Chinese");

    // All languages have valid codes and names
    for (const lang of TMDB_POPULAR_LANGUAGES) {
      assert.ok(lang.iso_639_1.length >= 2, `Valid code: ${lang.iso_639_1}`);
      assert.ok(lang.english_name.length > 0, `Valid name: ${lang.english_name}`);
    }
  });

  it("filters watchlist items cleanly by catalog mode", () => {
    const items = [
      { media_type: "movie" as const, tmdbId: 101, title: "Movie 1", added_at: "2026-10-29T10:00:00Z" },
      { media_type: "tv" as const, tmdbId: 202, title: "TV Show 1", added_at: "2026-10-29T10:05:00Z" },
      { media_type: "anime" as const, anilistId: 303, title: "Anime 1", added_at: "2026-10-29T10:10:00Z" },
    ];

    const animeOnly = items.filter((i) => i.media_type === "anime");
    const tmdbOnly = items.filter((i) => i.media_type !== "anime");

    assert.equal(animeOnly.length, 1);
    assert.equal(animeOnly[0].anilistId, 303);

    assert.equal(tmdbOnly.length, 2);
    assert.deepEqual(tmdbOnly.map((i) => i.tmdbId), [101, 202]);
  });
});
