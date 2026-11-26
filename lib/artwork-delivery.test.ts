import assert from "node:assert/strict";
import test from "node:test";
import { tmdbArtworkFallback } from "./artwork-delivery";

test("only canonical TMDB CDN artwork can use the same-origin fallback", () => {
  const poster = "https://image.tmdb.org/t/p/w500/example.jpg";
  const result = tmdbArtworkFallback(poster);
  assert.ok(result);
  const parsed = new URL(result, "https://zoku.example");
  assert.equal(parsed.pathname, "/_next/image");
  assert.equal(parsed.searchParams.get("url"), poster);
  assert.equal(parsed.searchParams.get("w"), "384");
  assert.equal(new URL(tmdbArtworkFallback("https://image.tmdb.org/t/p/w1280/backdrop.jpg")!, "https://zoku.example").searchParams.get("w"), "1080");
  for (const url of ["https://image.tmdb.org.evil.example/t/p/w500/x.jpg", "http://image.tmdb.org/t/p/w500/x.jpg", "https://image.tmdb.org/t/p/w500/x.svg", "https://image.tmdb.org/t/p/w500/x.jpg?redirect=1", "https://image.tmdb.org@evil.example/t/p/w500/x.jpg", "/avatars/x.png", "data:image/png;base64,abc"]) {
    assert.equal(tmdbArtworkFallback(url), null, url);
  }
});
