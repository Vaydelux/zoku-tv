import assert from "node:assert/strict";
import test from "node:test";
import { filterRestrictedTmdbTitles, isRestrictedTmdbTitle, setAdultFilterEnabled, syncAdultFilterState, requireMovieCatalogAvailable } from "./adult-content";

test("blocks explicit adult flag and VMX company regardless of TMDB adult flag", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 12, adult: true }), true);
  assert.equal(isRestrictedTmdbTitle({ id: 13, adult: false, production_companies: [{ id: 149142 }] }), true);
});
test("blocks R-18 release data and erotic keyword metadata", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 14, release_dates: { results: [{ iso_3166_1: "PH", release_dates: [{ certification: "R-18" }] }] } }), true);
  assert.equal(isRestrictedTmdbTitle({ id: 15, keywords: { keywords: [{ id: 9715 }] } }), true);
});
test("retains ordinary romance and mature-themed drama without explicit classifications", () => {
  assert.equal(isRestrictedTmdbTitle({ id: 16, title: "An Ordinary Romance", overview: "A forbidden affair." }), false);
  assert.equal(isRestrictedTmdbTitle({ id: 17, adult: false, title: "A Drama" }), false);
});
test("respects filter switch", () => {
  const items = [{ id: 1, adult: true }, { id: 2, adult: false }];
  setAdultFilterEnabled(true);
  assert.deepEqual(filterRestrictedTmdbTitles(items).map((item) => item.id), [2]);
  setAdultFilterEnabled(false);
  assert.deepEqual(filterRestrictedTmdbTitles(items).map((item) => item.id), [1, 2]);
  setAdultFilterEnabled(true);
});

test("syncs multiple company IDs, blocks cached and direct-route titles by ID", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const endpoints: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const path = String(input);
    endpoints.push(path);
    if (path === "/api/vivamax-ids") {
      return Response.json({ ids: [543210, 543211], complete: true });
    }
    if (path === "/api/adult-content") {
      return Response.json({ filterEnabled: true });
    }
    throw new Error(`Unexpected URL: ${path}`);
  }) as typeof fetch;
  try {
    setAdultFilterEnabled(true);
    await syncAdultFilterState();
    assert.doesNotThrow(() => requireMovieCatalogAvailable());
    assert.deepEqual(
      filterRestrictedTmdbTitles([
        { id: 543210, media_type: "movie", adult: false },
        { id: 543211, media_type: "movie", adult: false },
        { id: 6, media_type: "movie", adult: false },
      ]).map((item) => item.id),
      [6]
    );
    const { getTitleDetails } = await import("./tmdb");
    await assert.rejects(getTitleDetails("movie", 543210), /unavailable while the adult-content filter is enabled/);
    assert.deepEqual(endpoints.sort(), ["/api/adult-content", "/api/vivamax-ids"].sort());
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    setAdultFilterEnabled(true);
  }
});
