import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { isRestrictedAniListMedia } from "./anilist-content-policy";
import { POST } from "../app/api/anilist/route";
import { createAdultUnlockCookie } from "./server/adult-session";

const safe = (id: number) => ({ id, type: "ANIME", title: { english: `Anime ${id}` }, isAdult: false, genres: ["Comedy"], tags: [] });
const hentai = { ...safe(80801), isAdult: true, genres: ["Hentai"] };
const ecchi = { ...safe(80802), genres: ["Ecchi"] };
const explicitTag = { ...safe(80803), tags: [{ name: "Sexual Content", isAdult: false }] };
const adultTag = { ...safe(80804), tags: [{ name: "Adult topic", isAdult: true }] };

test("anime maturity policy catches explicit flags, genre, sexual tags and missing metadata", () => {
  for (const item of [hentai, ecchi, explicitTag, adultTag, { id: 88, isAdult: false, genres: [] }]) {
    assert.equal(isRestrictedAniListMedia(item), true);
  }
  assert.equal(isRestrictedAniListMedia(safe(100)), false);
  assert.equal(isRestrictedAniListMedia({ ...safe(101), genres: ["Horror"] }), false);
});

test("server filters adult anime from pages, studio results and previously saved IDs", async () => {
  const originalFetch = globalThis.fetch;
  const password = process.env.ADULT_CONTENT_PASSWORD;
  delete process.env.ADULT_CONTENT_PASSWORD;
  globalThis.fetch = (async (_input: unknown, options: RequestInit) => {
    const payload = JSON.parse(String(options.body || "{}")) as { query: string; variables?: { ids?: number[]; isAdult?: boolean } };
    if (payload.query.includes("media(id_in:")) {
      return Response.json({ data: { Page: { media: [safe(100), hentai, ecchi, explicitTag, adultTag] } } });
    }
    if (payload.query.includes("Studio(search:")) {
      return Response.json({ data: { Studio: { media: { nodes: [safe(100), hentai, ecchi] } } } });
    }
    assert.equal(payload.variables?.isAdult, false);
    return Response.json({ data: { Page: { media: [safe(100), hentai, ecchi, explicitTag, adultTag] } } });
  }) as typeof fetch;
  const api = (operation: string, variables: Record<string, unknown>) =>
    POST(new NextRequest("https://zoku.example/api/anilist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, variables }),
    }));
  try {
    const browse = await api("browse", { page: 1 });
    assert.equal(browse.status, 200);
    assert.deepEqual((await browse.json()).data.Page.media.map((x: { id: number }) => x.id), [100]);
    const studio = await api("studio", { studio: "Example", page: 1 });
    assert.equal(studio.status, 200);
    assert.deepEqual((await studio.json()).data.Studio.media.nodes.map((x: { id: number }) => x.id), [100]);
    const eligibility = await api("eligibility", { ids: [100, 80801, 80802, 80803, 80804] });
    assert.equal(eligibility.status, 200);
    assert.deepEqual((await eligibility.json()).data.ids, [100]);
    const forbidden = await api("browse", { page: 1, isAdult: true });
    assert.equal(forbidden.status, 403);
    const arbitrary = await api("raw", {});
    assert.equal(arbitrary.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
    if (password === undefined) delete process.env.ADULT_CONTENT_PASSWORD;
    else process.env.ADULT_CONTENT_PASSWORD = password;
  }
});

test("server prevents restricted anime direct details and filters nested recommendations", async () => {
  const originalFetch = globalThis.fetch;
  const password = process.env.ADULT_CONTENT_PASSWORD;
  delete process.env.ADULT_CONTENT_PASSWORD;
  let calls = 0;
  globalThis.fetch = (async (_input: unknown, options: RequestInit) => {
    calls += 1;
    const variables = JSON.parse(String(options.body || "{}")).variables as { id: number };
    if (variables.id === 80801) return Response.json({ data: { Media: hentai } });
    return Response.json({ data: { Media: {
      ...safe(100),
      relations: { edges: [{ node: safe(101) }, { node: hentai }] },
      recommendations: { nodes: [{ mediaRecommendation: safe(102) }, { mediaRecommendation: ecchi }] },
    } } });
  }) as typeof fetch;
  try {
    const req = new NextRequest("https://zoku.example/api/anilist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "detail", variables: { id: 100 } }),
    });
    const res = await POST(req);
    assert.equal(res.status, 200);
    const data = (await res.json()).data.Media;
    assert.deepEqual(data.relations.edges.map((x: { node: { id: number } }) => x.node.id), [101]);
    assert.deepEqual(data.recommendations.nodes.map((x: { mediaRecommendation: { id: number } }) => x.mediaRecommendation.id), [102]);
    const restricted = await POST(new NextRequest("https://zoku.example/api/anilist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "detail", variables: { id: 80801 } }),
    }));
    assert.equal(restricted.status, 404);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (password === undefined) delete process.env.ADULT_CONTENT_PASSWORD;
    else process.env.ADULT_CONTENT_PASSWORD = password;
  }
});

test("signed adult unlock enables browse but a tampered cookie does not", async () => {
  const oldPassword = process.env.ADULT_CONTENT_PASSWORD;
  const oldFetch = globalThis.fetch;
  process.env.ADULT_CONTENT_PASSWORD = "super-secret-password-123";
  const seen: unknown[] = [];
  globalThis.fetch = (async (_input: unknown, options: RequestInit) => {
    const variables = JSON.parse(String(options.body || "{}")).variables;
    seen.push(variables);
    return Response.json({ data: { Page: { media: [hentai, safe(100)] } } });
  }) as typeof fetch;
  const request = (cookie: string) => new NextRequest("https://zoku.example/api/anilist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `zoku_adult_filter_unlock=${cookie}` },
    body: JSON.stringify({ operation: "browse", variables: { page: 1 } }),
  });
  try {
    const unlocked = await POST(request(createAdultUnlockCookie(process.env.ADULT_CONTENT_PASSWORD)));
    assert.equal(unlocked.status, 200);
    assert.deepEqual((await unlocked.json()).data.Page.media.map((item: { id: number }) => item.id), [80801, 100]);
    const tampered = await POST(request("invalid.cookie"));
    assert.equal(tampered.status, 200);
    assert.deepEqual((await tampered.json()).data.Page.media.map((item: { id: number }) => item.id), [100]);
    assert.equal((seen[0] as Record<string, unknown>).isAdult, undefined);
    assert.equal((seen[1] as Record<string, unknown>).isAdult, false);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldPassword === undefined) delete process.env.ADULT_CONTENT_PASSWORD;
    else process.env.ADULT_CONTENT_PASSWORD = oldPassword;
  }
});
