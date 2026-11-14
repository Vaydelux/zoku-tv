import assert from "node:assert/strict";
import test from "node:test";
import { shouldHideZokuFooter } from "./site-footer-routing";

test("Watchlist and history views retain themed footer and valid navigation", () => {
  assert.equal(shouldHideZokuFooter("/watchlist"), false);
  assert.equal(shouldHideZokuFooter("/watchlist?tab=history"), false);
  assert.equal(shouldHideZokuFooter("/home"), false);
  assert.equal(shouldHideZokuFooter("/genres"), false);
});

test("immersive watch and brand screens do not render the footer", () => {
  assert.equal(shouldHideZokuFooter("/watch"), true);
  assert.equal(shouldHideZokuFooter("/watch/movie/16"), true);
  assert.equal(shouldHideZokuFooter("/watch/anime/3/1/1"), true);
  assert.equal(shouldHideZokuFooter("/login"), true);
  assert.equal(shouldHideZokuFooter("/profiles"), true);
});
