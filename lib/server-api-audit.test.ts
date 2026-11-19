import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ServerApiCache } from "./server/api-cache";
import {
  parseTmdbScope,
  sanitizeAppendToResponse,
  sanitizedTmdbQuery,
} from "./server/tmdb-proxy-policy";

describe("ServerApiCache TTL, LRU & Request Coalescing", () => {
  it("returns cached entries before TTL expiry and evicts after expiry", () => {
    const cache = new ServerApiCache<string>(16);
    cache.set("safe:/trending/all/week", "payload-a", 5000, 1000);
    assert.equal(cache.get("safe:/trending/all/week", 4999), "payload-a");
    assert.equal(cache.get("safe:/trending/all/week", 6000), undefined);
  });

  it("isolates policy-prefixed keys and evicts oldest LRU entry at capacity", () => {
    const cache = new ServerApiCache<number>(16);
    cache.set("safe:item", 1, 60_000, 1000);
    cache.set("open:item", 2, 60_000, 1000);
    assert.equal(cache.get("safe:item", 1001), 1);
    assert.equal(cache.get("open:item", 1001), 2);

    // Fill past 16 entries and confirm LRU eviction
    for (let i = 0; i < 16; i++) {
      cache.set(`key-${i}`, i, 60_000, 2000 + i);
    }
    assert.equal(cache.size, 16);
    assert.equal(cache.get("safe:item", 3000), undefined);
  });

  it("coalesces concurrent in-flight requests for the same key", async () => {
    const cache = new ServerApiCache<{ count: number }>(16);
    let fetchCalls = 0;
    const fetcher = async () => {
      fetchCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return { count: fetchCalls };
    };

    const [a, b, c] = await Promise.all([
      cache.getOrFetch("safe:coalesce", 60_000, fetcher),
      cache.getOrFetch("safe:coalesce", 60_000, fetcher),
      cache.getOrFetch("safe:coalesce", 60_000, fetcher),
    ]);

    assert.equal(fetchCalls, 1);
    assert.deepEqual(a, { count: 1 });
    assert.deepEqual(b, { count: 1 });
    assert.deepEqual(c, { count: 1 });
  });
});

describe("TMDB Proxy Policy Extensions (Collections, Person & append_to_response)", () => {
  it("accepts /collection/{id} and /person/{id} with valid positive numeric IDs", () => {
    const col = parseTmdbScope(["collection", "10"]);
    assert.deepEqual(col, {
      kind: "collection",
      media: "movie",
      id: 10,
      path: "/collection/10",
    });

    const person = parseTmdbScope(["person", "500"]);
    assert.deepEqual(person, {
      kind: "person",
      media: "all",
      id: 500,
      path: "/person/500",
    });

    assert.equal(parseTmdbScope(["collection", "0"]), null);
    assert.equal(parseTmdbScope(["person", "abc"]), null);
    assert.equal(parseTmdbScope(["person", "500", "extra"]), null);
  });

  it("whitelists append_to_response tokens and drops disallowed endpoints", () => {
    assert.equal(
      sanitizeAppendToResponse("credits, videos, evil_endpoint, similar, videos"),
      "credits,videos,similar"
    );

    const params = sanitizedTmdbQuery(
      new URLSearchParams({
        append_to_response: "credits,recommendations,account_states",
        page: "2",
        api_key: "leaked",
      })
    );
    assert.equal(params.get("append_to_response"), "credits,recommendations");
    assert.equal(params.get("page"), "2");
    assert.equal(params.get("api_key"), null);
  });
});
