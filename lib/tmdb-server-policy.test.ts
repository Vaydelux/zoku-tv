import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/tmdb/[...path]/route";
import { parseTmdbScope, sanitizedTmdbQuery } from "./server/tmdb-proxy-policy";
import { tmdbProxyCache } from "./server/api-cache";

test("TMDB proxy endpoint allowlist rejects arbitrary paths and invalid pagination", () => {
  assert.equal(parseTmdbScope(["discover", "movie"])?.media, "movie");
  assert.equal(parseTmdbScope(["tv", "21", "season", "2"])?.kind, "child");
  assert.equal(parseTmdbScope(["tv", "21", "season", "0"])?.kind, "child");
  assert.equal(parseTmdbScope(["tv", "21", "season", "00"]), null);
  assert.equal(parseTmdbScope(["tv", "21", "season", "-1"]), null);
  assert.equal(parseTmdbScope(["movie", "42", "credits"])?.kind, "child");
  assert.equal(parseTmdbScope(["person", "1"])?.kind, "person");
  assert.equal(parseTmdbScope(["collection", "10"])?.kind, "collection");
  assert.equal(parseTmdbScope(["account", "1"]), null);
  assert.equal(parseTmdbScope(["search", "company"]), null);
  assert.equal(parseTmdbScope(["movie", "42", "external_ids"]), null);
  assert.equal(parseTmdbScope(["movie", "..", "credits"]), null);
  assert.throws(() => sanitizedTmdbQuery(new URLSearchParams("page=501")), /Invalid page/);
  assert.equal(sanitizedTmdbQuery(new URLSearchParams("api_key=secret&include_adult=true&page=2")).toString(), "page=2");
});

test("server excludes blocked ID on discovery and rejects direct title and child routes", async () => {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  process.env.TMDB_API_READ_ACCESS_TOKEN = "eyJ.mock.token";
  const accessed: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    accessed.push(url.pathname);
    if (url.pathname === "/3/discover/movie" && url.searchParams.has("with_companies")) {
      return Response.json({ total_pages: 1, results: [{ id: 991111 }] });
    }
    if (url.pathname === "/3/discover/movie") {
      assert.equal(url.searchParams.get("include_adult"), "false");
      assert.equal(url.searchParams.get("without_companies"), "149142");
      return Response.json({ results: [
        { id: 991111, media_type: "movie", adult: false, title: "Blocked" },
        { id: 222, media_type: "movie", adult: true, title: "Explicit" },
        { id: 100, media_type: "movie", adult: false, title: "Allowed" },
      ] });
    }
    if (url.pathname === "/3/movie/991111") {
      return Response.json({ id: 991111, production_companies: [{ id: 149142 }], adult: false });
    }
    if (url.pathname === "/3/movie/100") {
      return Response.json({ id: 100, production_companies: [{ id: 9 }], adult: false, release_dates: { results: [] } });
    }
    if (url.pathname === "/3/movie/991111/credits") throw new Error("Blocked credits unexpectedly fetched");
    throw new Error("Unexpected TMDB path: " + url.pathname);
  }) as typeof fetch;
  try {
    const discover = new NextRequest("https://zoku.example/api/tmdb/discover/movie?page=1");
    const listing = await GET(discover, { params: Promise.resolve({ path: ["discover", "movie"] }) });
    assert.equal(listing.status, 200);
    assert.deepEqual((await listing.json()).results.map((x: { id: number }) => x.id), [100]);

    const direct = await GET(
      new NextRequest("https://zoku.example/api/tmdb/movie/991111"),
      { params: Promise.resolve({ path: ["movie", "991111"] }) },
    );
    assert.equal(direct.status, 404);
    const child = await GET(
      new NextRequest("https://zoku.example/api/tmdb/movie/991111/credits"),
      { params: Promise.resolve({ path: ["movie", "991111", "credits"] }) },
    );
    assert.equal(child.status, 404);
    assert.ok(!accessed.includes("/3/movie/991111/credits"));
    const allowed = await GET(
      new NextRequest("https://zoku.example/api/tmdb/movie/100"),
      { params: Promise.resolve({ path: ["movie", "100"] }) },
    );
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).id, 100);
  } finally {
    globalThis.fetch = oldFetch;
    tmdbProxyCache.clear();
    if (oldToken === undefined) delete process.env.TMDB_API_READ_ACCESS_TOKEN;
    else process.env.TMDB_API_READ_ACCESS_TOKEN = oldToken;
  }
});

test("server respects passwordless adult preference cookie for unfiltered catalog", async () => {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  process.env.TMDB_API_READ_ACCESS_TOKEN = "eyJ.mock.token";
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    return Response.json({ results: [{ id: 991111, title: "Blocked by default", adult: false }] });
  }) as typeof fetch;
  try {
    const unlock = "on";
    const request = new NextRequest("https://zoku.example/api/tmdb/search/multi?query=movie", {
      headers: { cookie: `zoku_adult_filter_unlock=${unlock}` },
    });
    const response = await GET(request, { params: Promise.resolve({ path: ["search", "multi"] }) });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).results.map((x: { id: number }) => x.id), [991111]);
    assert.deepEqual(calls, ["/3/search/multi"]);
  } finally {
    globalThis.fetch = oldFetch;
    tmdbProxyCache.clear();
    if (oldToken === undefined) delete process.env.TMDB_API_READ_ACCESS_TOKEN;
    else process.env.TMDB_API_READ_ACCESS_TOKEN = oldToken;
  }
});
