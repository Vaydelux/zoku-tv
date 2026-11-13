import assert from "node:assert/strict";
import test from "node:test";
import { ZOKU_NAV_ITEMS, activeZokuNavHref, showZokuMobileNav } from "./design-navigation";

test("cinematic shell has five unique real Next.js destinations", () => {
  assert.deepEqual(ZOKU_NAV_ITEMS.map((x) => x.href), [
    "/home", "/search", "/discover", "/watchlist", "/settings",
  ]);
  assert.equal(new Set(ZOKU_NAV_ITEMS.map((x) => x.href)).size, 5);
  assert.ok(ZOKU_NAV_ITEMS.every((x) => x.href.startsWith("/") && !x.href.includes("#")));
});

test("route-aware navigation keeps discovery and avoids false current links", () => {
  assert.equal(activeZokuNavHref("/home"), "/home");
  assert.equal(activeZokuNavHref("/search"), "/search");
  assert.equal(activeZokuNavHref("/discover"), "/discover");
  assert.equal(activeZokuNavHref("/genre/28"), "/discover");
  assert.equal(activeZokuNavHref("/watchlist"), "/watchlist");
  assert.equal(activeZokuNavHref("/settings"), "/settings");
  assert.equal(activeZokuNavHref("/watch/movie/5"), null);
  assert.equal(activeZokuNavHref("/title/movie/5"), null);
  assert.equal(activeZokuNavHref("/homebrew"), null);
});

test("one mobile tab bar skips auth/profile and immersive player routes", () => {
  for (const path of ["/", "/login", "/signup", "/profiles", "/watch/anime/3/1/1", "/watch/movie/4"]) {
    assert.equal(showZokuMobileNav(path), false, path);
  }
  for (const path of ["/home", "/discover", "/search", "/settings", "/watchlist"]) {
    assert.equal(showZokuMobileNav(path), true, path);
  }
});
