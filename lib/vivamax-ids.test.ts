import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/vivamax-ids/route";

test("Vivamax ID endpoint fetches every TMDB page and deduplicates IDs", async () => {
  const oldToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const oldFetch = globalThis.fetch;
  process.env.TMDB_API_READ_ACCESS_TOKEN = "eyJ.fixture.token";
  const pages: number[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/3/discover/movie");
    assert.equal(url.searchParams.get("with_companies"), "149142");
    assert.equal(url.searchParams.get("include_adult"), "true");
    const page = Number(url.searchParams.get("page"));
    pages.push(page);
    return Response.json({
      total_pages: 3,
      results: page === 1 ? [{ id: 1100 }, { id: 1101 }] : page === 2 ? [{ id: 1101 }, { id: 1102 }] : [{ id: 1103 }],
    });
  }) as typeof fetch;
  try {
    const response = await GET();
    assert.equal(response.status, 200);
    const data = await response.json() as { ids: number[]; complete: boolean };
    assert.equal(data.complete, true);
    assert.deepEqual(data.ids.sort((a, b) => a - b), [1100, 1101, 1102, 1103]);
    assert.deepEqual(pages.sort((a, b) => a - b), [1, 2, 3]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.TMDB_API_READ_ACCESS_TOKEN;
    else process.env.TMDB_API_READ_ACCESS_TOKEN = oldToken;
  }
});
