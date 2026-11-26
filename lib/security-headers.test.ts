import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./server/security-headers";

describe("Enterprise HTTP security headers", () => {
  it("builds a CSP that locks down ancestors/plugins while allowing TMDB, AniList, and HTTPS embeds", () => {
    const prodCsp = buildContentSecurityPolicy(true);
    assert.match(prodCsp, /object-src 'none'/);
    assert.match(prodCsp, /frame-ancestors 'self'/);
    assert.match(prodCsp, /base-uri 'self'/);
    assert.match(prodCsp, /https:\/\/image\.tmdb\.org/);
    assert.match(prodCsp, /https:\/\/s4\.anilist\.co/);
    assert.match(prodCsp, /frame-src 'self' https:/);
    assert.match(prodCsp, /upgrade-insecure-requests/);
    assert.doesNotMatch(prodCsp, /unsafe-eval/);

    const devCsp = buildContentSecurityPolicy(false);
    assert.match(devCsp, /unsafe-eval/);
    assert.doesNotMatch(devCsp, /upgrade-insecure-requests/);
  });

  it("includes HSTS only in production alongside standard defense headers", () => {
    const prodHeaders = buildSecurityHeaders(true);
    const prodKeys = new Set(prodHeaders.map((h) => h.key));
    assert.ok(prodKeys.has("Content-Security-Policy"));
    assert.ok(prodKeys.has("Strict-Transport-Security"));
    assert.ok(prodKeys.has("X-Content-Type-Options"));
    assert.ok(prodKeys.has("X-Frame-Options"));
    assert.ok(prodKeys.has("Referrer-Policy"));
    assert.ok(prodKeys.has("Permissions-Policy"));

    const devHeaders = buildSecurityHeaders(false);
    const devKeys = new Set(devHeaders.map((h) => h.key));
    assert.ok(!devKeys.has("Strict-Transport-Security"));
  });
});
