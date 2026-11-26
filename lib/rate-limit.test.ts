import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SlidingWindowRateLimiter,
  extractClientIp,
  rateLimitHeaders,
} from "./server/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests within quota, rejects bursts with retryAfterSec, and recovers after window", () => {
    const limiter = new SlidingWindowRateLimiter(3, 10_000, 32);

    const r1 = limiter.consume("ip:1", 1000);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    const r2 = limiter.consume("ip:1", 2000);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = limiter.consume("ip:1", 3000);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    const r4 = limiter.consume("ip:1", 4000);
    assert.equal(r4.allowed, false);
    assert.equal(r4.remaining, 0);
    assert.equal(r4.retryAfterSec, 7);

    const headers = rateLimitHeaders(r4);
    assert.equal(headers["X-RateLimit-Limit"], "3");
    assert.equal(headers["X-RateLimit-Remaining"], "0");
    assert.equal(headers["Retry-After"], "7");

    // Once earliest timestamp expires (> 11000ms), quota opens again
    const r5 = limiter.consume("ip:1", 11_001);
    assert.equal(r5.allowed, true);
    assert.equal(r5.remaining, 0);
  });

  it("caps stored buckets to maxKeys using LRU eviction", () => {
    const limiter = new SlidingWindowRateLimiter(5, 60_000, 32);
    for (let i = 0; i < 40; i++) {
      limiter.consume(`client:${i}`, 1000 + i);
    }
    assert.equal(limiter.size, 32);
  });

  it("extracts client IP safely from forwarded headers", () => {
    const h1 = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    assert.equal(extractClientIp(h1), "203.0.113.10");

    const h2 = new Headers({ "x-real-ip": "198.51.100.4" });
    assert.equal(extractClientIp(h2), "198.51.100.4");

    assert.equal(extractClientIp(new Headers()), "local");
  });
});
