import assert from "node:assert/strict";
import test from "node:test";
import { searchMultiPage } from "./tmdb";

function movie(id: number) {
  return {
    id, media_type: "movie" as const, adult: false,
    title: `Demo ${id}`, overview: "Safe",
    poster_path: null, backdrop_path: null,
    vote_average: 7, release_date: "2026-01-01",
  };
}

test("TMDB search pagination respects upstream page numbers rather than post-policy item count", async () => {
  const previous = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://zoku.example");
    paths.push(url.pathname);
    return Response.json({
      page: Number(url.searchParams.get("page") || 1),
      total_pages: 3,
      results: [movie(100)],
    });
  }) as typeof fetch;
  try {
    const first = await searchMultiPage("demo", 1);
    assert.equal(first.results.length, 1);
    assert.equal(first.hasNextPage, true, "a filtered page with 1 result can still have more pages");
    const last = await searchMultiPage("demo", 3);
    assert.equal(last.hasNextPage, false);
    assert.deepEqual(paths, ["/api/tmdb/search/multi", "/api/tmdb/search/multi"]);
  } finally {
    globalThis.fetch = previous;
  }
});

test("TMDB search rejects missing pagination metadata instead of requesting forever", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ results: [movie(12)] })) as typeof fetch;
  try {
    const page = await searchMultiPage("demo", 1);
    assert.equal(page.results.length, 1);
    assert.equal(page.hasNextPage, false);
  } finally {
    globalThis.fetch = previous;
  }
});

test("TMDB empty queries return no pages without a network request", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("Network should not be requested"); }) as typeof fetch;
  try {
    assert.deepEqual(await searchMultiPage("   "), { results: [], hasNextPage: false });
  } finally {
    globalThis.fetch = previous;
  }
});
