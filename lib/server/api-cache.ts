/**
 * Lightweight bounded in-memory TTL cache with in-flight request deduplication.
 * Used exclusively inside Next.js server route handlers (TMDB & AniList proxies)
 * so repeated requests coalesce cleanly and stay within upstream rate limits.
 *
 * Cache keys MUST always encode the active adult-filter state (e.g. `safe:` vs `unfiltered:`)
 * so policy-filtered and unlocked responses are strictly isolated.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ServerApiCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 240) {
    this.maxEntries = Math.max(16, maxEntries);
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    if (ttlMs <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: now + ttlMs });
  }

  async getOrFetch(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const task = fetcher()
      .then((result) => {
        this.set(key, result, ttlMs);
        return result;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, task);
    return task;
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const tmdbProxyCache = new ServerApiCache<Record<string, unknown>>(260);
export const anilistProxyCache = new ServerApiCache<Record<string, unknown>>(180);
