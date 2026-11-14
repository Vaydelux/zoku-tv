import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNextPath, resolvePostLoginPath, buildLoginRedirect } from "./auth-routes";

test("post-login redirect preserves valid same-origin navigation and query", () => {
  assert.equal(sanitizeNextPath("/home"), "/home");
  assert.equal(sanitizeNextPath("/watchlist?tab=history"), "/watchlist?tab=history");
  assert.equal(resolvePostLoginPath(true, "/search?q=anime"), "/search?q=anime");
  assert.equal(resolvePostLoginPath(false, "/search?q=anime"), "/profiles?next=%2Fsearch%3Fq%3Danime");
});

test("post-login redirect rejects external URL, slash normalization and URL encoded backslash", () => {
  const unsafe = [
    "//evil.example", "/\\evil.example", "/%5cevil.example",
    "/%2fevil.example", "https://evil.example", "javascript:alert(1)",
    "/home\\evil.example", "/home%5cevil.example", "/login",
    "/signup?next=/home", "/login/reset", "/home\nSet-Cookie: session=x",
  ];
  for (const candidate of unsafe) {
    assert.equal(sanitizeNextPath(candidate), null, `unsafe next was accepted: ${JSON.stringify(candidate)}`);
    assert.equal(resolvePostLoginPath(true, candidate), "/home");
  }
});

test("login redirect safely URL-encodes the requested path", () => {
  assert.equal(buildLoginRedirect("/search", "?q=star%20wars"), "/login?next=%2Fsearch%3Fq%3Dstar%2520wars");
});
