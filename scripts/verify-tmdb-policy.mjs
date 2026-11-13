#!/usr/bin/env node
/**
 * Live preview smoke verification. Requires only a deployed Zoku TV URL,
 * not a TMDB token in the browser or terminal arguments.
 *
 * ZOKU_BASE_URL=https://your-preview-host.example node scripts/verify-tmdb-policy.mjs
 */
const base = process.env.ZOKU_BASE_URL;
if (!base || !/^https:\/\//.test(base)) {
  process.stderr.write("Set ZOKU_BASE_URL to the HTTPS preview deployment URL.\n");
  process.exit(2);
}
const origin = new URL(base).origin;
async function get(path) {
  const response = await fetch(new URL(path, origin), { cache: "no-store", redirect: "manual" });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const company = await get("/api/vivamax-ids");
  assert(company.status === 200 && company.body.complete === true, "Company ID sync unavailable or incomplete");
  const ids = company.body.ids;
  assert(Array.isArray(ids) && ids.length > 0, "No verified Vivamax movie IDs were returned");
  const id = ids[0];
  assert(Number.isSafeInteger(id) && id > 0, "Company movie ID invalid");

  const blockedDetail = await get(`/api/tmdb/movie/${id}`);
  assert(blockedDetail.status === 404, `Direct blocked movie ID ${id} returned ${blockedDetail.status}`);

  const blockedRelated = await get(`/api/tmdb/movie/${id}/recommendations`);
  assert(blockedRelated.status === 404, "Blocked movie related data was accessible");

  const blockedCredits = await get(`/api/tmdb/movie/${id}/credits`);
  assert(blockedCredits.status === 404, "Blocked movie credits were accessible");

  const catalog = await get("/api/tmdb/discover/movie?page=1&include_adult=true");
  assert(catalog.status === 200 && Array.isArray(catalog.body.results), "Protected catalog unavailable");
  const blocked = new Set(ids);
  assert(catalog.body.results.every((item) => !blocked.has(item.id) && item.adult !== true), "Catalog disclosed a restricted movie");
  const invalid = await get("/api/tmdb/person/1");
  assert(invalid.status === 404, "Non-allowlisted TMDB endpoint was reachable");
  const invalidPage = await get("/api/tmdb/discover/movie?page=501");
  assert(invalidPage.status === 400, "Invalid TMDB pagination was accepted");

  const anime = await fetch(new URL("/api/anilist", origin), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "browse", variables: { page: 1, perPage: 20 } }),
  });
  const animeBody = await anime.json().catch(() => ({}));
  assert(anime.status === 200 && Array.isArray(animeBody.data?.Page?.media), "AniList protected catalog unavailable");
  for (const item of animeBody.data.Page.media) {
    assert(item.isAdult === false, "AniList adult-rated media leaked to default catalog");
    assert(!item.genres?.some((genre) => ["hentai", "ecchi"].includes(genre.toLowerCase())), "AniList explicit genre leaked");
    assert(!item.tags?.some((tag) => tag.isAdult === true), "AniList adult topic tag leaked");
  }
  const arbitrary = await fetch(new URL("/api/anilist", origin), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "arbitrary", variables: {} }),
  });
  assert(arbitrary.status === 404, "AniList unrestricted GraphQL operation accepted");

  process.stdout.write(`PASS — ${ids.length} company IDs; blocked movie ID ${id} denied; TMDB and AniList catalog checks passed.\n`);
} catch (error) {
  process.stderr.write(`FAIL — ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
