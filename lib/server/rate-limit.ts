/**
 * Bounded sliding-window in-memory rate limiter for Next.js Route Handlers.
 * Protects upstream TMDB/AniList quotas and mutation routes from burst abuse
 * while capping memory usage via LRU eviction.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSec: number;
}

interface BucketRecord {
  timestamps: number[];
  lastSeen: number;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, BucketRecord>();
  private readonly maxKeys: number;
  readonly limit: number;
  readonly windowMs: number;

  constructor(limit: number, windowMs: number, maxKeys = 4096) {
    this.limit = Math.max(1, Math.floor(limit));
    this.windowMs = Math.max(1_000, Math.floor(windowMs));
    this.maxKeys = Math.max(32, Math.floor(maxKeys));
  }

  consume(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const existing = this.buckets.get(key);
    const active = existing
      ? existing.timestamps.filter((ts) => ts > windowStart)
      : [];

    if (active.length >= this.limit) {
      const oldest = active[0] ?? now;
      const resetAtMs = oldest + this.windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
      // Refresh LRU ordering
      this.buckets.delete(key);
      this.buckets.set(key, { timestamps: active, lastSeen: now });
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        resetAtMs,
        retryAfterSec,
      };
    }

    active.push(now);
    if (this.buckets.has(key)) {
      this.buckets.delete(key);
    } else if (this.buckets.size >= this.maxKeys) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey !== undefined) {
        this.buckets.delete(oldestKey);
      }
    }
    this.buckets.set(key, { timestamps: active, lastSeen: now });

    const remaining = Math.max(0, this.limit - active.length);
    const resetAtMs = (active[0] ?? now) + this.windowMs;

    return {
      allowed: true,
      limit: this.limit,
      remaining,
      resetAtMs,
      retryAfterSec: 0,
    };
  }

  get size(): number {
    return this.buckets.size;
  }

  clear(): void {
    this.buckets.clear();
  }
}

export function extractClientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "local";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAtMs / 1000)),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }
  return headers;
}

// Pre-configured route-level limiters (generous for real browsing, protective against burst abuse)
export const tmdbRateLimiter = new SlidingWindowRateLimiter(180, 60_000);
export const anilistRateLimiter = new SlidingWindowRateLimiter(120, 60_000);
export const adultPrefRateLimiter = new SlidingWindowRateLimiter(45, 60_000);
export const vivamaxRateLimiter = new SlidingWindowRateLimiter(45, 60_000);
