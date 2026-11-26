import { NextRequest, NextResponse } from "next/server";
import { ADULT_COOKIE_NAME, adultFilterEnabledForCookie } from "@/lib/server/adult-session";
import { restrictedMovieCatalog, tmdbReadAccessToken } from "@/lib/server/tmdb-company-catalog";
import { parseTmdbScope, sanitizedTmdbQuery, type TmdbMediaKind } from "@/lib/server/tmdb-proxy-policy";
import { BLOCKED_COMPANY_IDS, BLOCKED_KEYWORD_IDS, isRestrictedTmdbTitle } from "@/lib/adult-content";
import { tmdbProxyCache } from "@/lib/server/api-cache";
import { extractClientIp, rateLimitHeaders, tmdbRateLimiter } from "@/lib/server/rate-limit";
import { logServerEvent, resolveRequestId } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_BASE = "https://api.themoviedb.org/3";
const RESPONSE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const CATALOG_TTL_MS = 180_000;
const DETAIL_TTL_MS = 300_000;

const MOVIE_DENYLIST = new Set(
  (process.env.BLOCKED_TMDB_MOVIE_IDS || process.env.NEXT_PUBLIC_BLOCKED_TMDB_MOVIE_IDS || "")
    .split(",").map(Number).filter((value) => Number.isSafeInteger(value) && value > 0)
);

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(data, { status, headers: { ...RESPONSE_HEADERS, ...extraHeaders } });
}

function canonicalParams(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

function filterRelatedList(
  items: unknown,
  media: TmdbMediaKind,
  filtering: boolean,
  restrictedIds: Set<number> | null
): Record<string, any>[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item: Record<string, any>) => {
      if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return false;
      if (!filtering) return true;
      if (media === "movie" && (MOVIE_DENYLIST.has(item.id) || restrictedIds?.has(item.id))) return false;
      return !isRestrictedTmdbTitle({ ...item, id: item.id, media_type: media });
    })
    .map((item: Record<string, any>) => ({ ...item, media_type: item.media_type || media }));
}

async function fetchTmdb(path: string, params: URLSearchParams): Promise<Record<string, any>> {
  const token = tmdbReadAccessToken();
  const url = new URL(UPSTREAM_BASE + path);
  for (const [key, value] of params) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TMDB unavailable: ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Malformed TMDB response");
  return data as Record<string, any>;
}

async function verifiedDetails(
  media: TmdbMediaKind,
  id: number,
  restrictedIds: Set<number> | null,
  extraAppend: string[] = []
) {
  const filtering = restrictedIds !== null;
  const appendTokens = new Set(["release_dates", "content_ratings", "keywords"]);
  for (const token of extraAppend) {
    if (["credits", "videos", "similar", "recommendations"].includes(token)) {
      appendTokens.add(token);
    }
  }
  const appendStr = [...appendTokens].sort().join(",");
  const cacheKey = `${filtering ? "safe" : "open"}:detail:${media}:${id}:${appendStr}`;

  const cached = tmdbProxyCache.get(cacheKey);
  if (cached) return cached;

  const query = new URLSearchParams();
  query.set("append_to_response", appendStr);
  const details = await fetchTmdb(`/${media}/${id}`, query);
  if (details.id !== id) throw new Error("TMDB title ID mismatch");
  if (restrictedIds) {
    if (media === "movie" && !Array.isArray(details.production_companies)) {
      throw new Error("Missing production-company verification");
    }
    if (media === "tv" && !details.content_ratings) {
      throw new Error("Missing TV maturity metadata");
    }
    if (
      (media === "movie" && (restrictedIds.has(id) || MOVIE_DENYLIST.has(id))) ||
      isRestrictedTmdbTitle({ ...details, id, media_type: media })
    ) return null;
  }

  const sanitized: Record<string, any> = { ...details, media_type: media };
  if (details.similar && Array.isArray(details.similar.results)) {
    sanitized.similar = {
      ...details.similar,
      results: filterRelatedList(details.similar.results, media, filtering, restrictedIds),
    };
  }
  if (details.recommendations && Array.isArray(details.recommendations.results)) {
    sanitized.recommendations = {
      ...details.recommendations,
      results: filterRelatedList(details.recommendations.results, media, filtering, restrictedIds),
    };
  }

  tmdbProxyCache.set(cacheKey, sanitized, DETAIL_TTL_MS);
  return sanitized;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const startedAt = Date.now();
  const requestId = resolveRequestId(request.headers);
  const ip = extractClientIp(request.headers);
  const limitResult = tmdbRateLimiter.consume(`tmdb:${ip}`);
  const traceHeaders: Record<string, string> = {
    "X-Request-Id": requestId,
    ...rateLimitHeaders(limitResult),
  };
  if (!limitResult.allowed) {
    logServerEvent("warn", {
      route: "/api/tmdb",
      event: "rate_limited",
      requestId,
      status: 429,
      meta: { ip, retryAfterSec: limitResult.retryAfterSec },
    });
    return json({ error: "Too many catalog requests. Please slow down." }, 429, traceHeaders);
  }

  const segments = (await params).path;
  const scope = parseTmdbScope(segments);
  if (!scope) return json({ error: "Unsupported catalog endpoint" }, 404, traceHeaders);

  let query: URLSearchParams;
  try {
    query = sanitizedTmdbQuery(request.nextUrl.searchParams);
  } catch {
    return json({ error: "Invalid catalog query" }, 400, traceHeaders);
  }

  const filtering = adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value);
  const policyPrefix = filtering ? "safe" : "open";
  let restrictedIds: Set<number> | null = null;

  try {
    // Fail closed for movie surfaces if company discovery is missing, stale or truncated.
    if (filtering && scope.media !== "tv" && scope.media !== "genre") {
      restrictedIds = new Set((await restrictedMovieCatalog()).ids);
    } else if (filtering && scope.kind !== "catalog" && scope.media === "movie") {
      restrictedIds = new Set((await restrictedMovieCatalog()).ids);
    }

    if (scope.kind === "collection") {
      const cacheKey = `${policyPrefix}:collection:${scope.id}`;
      const collectionData = await tmdbProxyCache.getOrFetch(cacheKey, DETAIL_TTL_MS, async () => {
        const raw = await fetchTmdb(scope.path, new URLSearchParams());
        const parts = filterRelatedList(raw.parts, "movie", filtering, restrictedIds).sort((a, b) => {
          const da = a.release_date || "9999-12-31";
          const db = b.release_date || "9999-12-31";
          return da.localeCompare(db);
        });
        return { ...raw, parts };
      });
      return json(collectionData, 200, traceHeaders);
    }

    if (scope.kind === "person") {
      const cacheKey = `${policyPrefix}:person:${scope.id}`;
      const cached = tmdbProxyCache.get(cacheKey);
      if (cached) return json(cached, 200, traceHeaders);

      const personQuery = new URLSearchParams({ append_to_response: "combined_credits" });
      const raw = await fetchTmdb(scope.path, personQuery);
      if (filtering && raw.adult === true) {
        return json({ error: "Person unavailable" }, 404, traceHeaders);
      }

      const filterCredits = (credits: unknown): Record<string, any>[] => {
        if (!Array.isArray(credits)) return [];
        return credits.filter((item: Record<string, any>) => {
          if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return false;
          if (item.media_type !== "movie" && item.media_type !== "tv") return false;
          if (!filtering) return true;
          if (item.media_type === "movie" && (MOVIE_DENYLIST.has(item.id) || restrictedIds?.has(item.id))) {
            return false;
          }
          return !isRestrictedTmdbTitle({ ...item, id: item.id, media_type: item.media_type });
        });
      };

      const sanitized = {
        ...raw,
        combined_credits: {
          cast: filterCredits(raw.combined_credits?.cast),
          crew: filterCredits(raw.combined_credits?.crew),
        },
      };
      tmdbProxyCache.set(cacheKey, sanitized, DETAIL_TTL_MS);
      return json(sanitized, 200, traceHeaders);
    }

    if (scope.kind === "detail" || scope.kind === "child") {
      if (filtering && scope.media === "movie" && !restrictedIds) {
        restrictedIds = new Set((await restrictedMovieCatalog()).ids);
      }
      const requestedAppend =
        scope.kind === "detail" && query.has("append_to_response")
          ? query.get("append_to_response")!.split(",").filter(Boolean)
          : [];
      const details = await verifiedDetails(
        scope.media,
        scope.id,
        filtering ? restrictedIds || new Set() : null,
        requestedAppend
      );
      if (!details) return json({ error: "Title unavailable" }, 404, traceHeaders);
      if (scope.kind === "detail") return json(details, 200, traceHeaders);

      const childCacheKey = `${policyPrefix}:child:${scope.path}?${canonicalParams(query)}`;
      const childData = await tmdbProxyCache.getOrFetch(childCacheKey, DETAIL_TTL_MS, async () => {
        const child = await fetchTmdb(scope.path, query);
        if (scope.path.endsWith("/similar") || scope.path.endsWith("/recommendations")) {
          if (!Array.isArray(child.results)) throw new Error("Malformed related-title results");
          return {
            ...child,
            results: filterRelatedList(child.results, scope.media, filtering, restrictedIds),
          };
        }
        return child;
      });
      return json(childData, 200, traceHeaders);
    }

    if (filtering) {
      query.set("include_adult", "false");
      if (scope.media === "movie") {
        query.set("without_companies", BLOCKED_COMPANY_IDS.join(","));
        query.set("without_keywords", BLOCKED_KEYWORD_IDS.join("|"));
      }
    } else {
      query.set("include_adult", "true");
    }

    const catalogCacheKey = `${policyPrefix}:catalog:${scope.path}?${canonicalParams(query)}`;
    const catalogData = await tmdbProxyCache.getOrFetch(catalogCacheKey, CATALOG_TTL_MS, async () => {
      const data = await fetchTmdb(scope.path, query);
      if (scope.media === "genre") return data;
      if (!Array.isArray(data.results)) throw new Error("Malformed catalog results");

      const results = data.results.filter((item: Record<string, any>) => {
        if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return false;
        const media: TmdbMediaKind = item.media_type === "tv" || scope.media === "tv" ? "tv" : "movie";
        if (!filtering) return true;
        if (media === "movie" && (MOVIE_DENYLIST.has(item.id) || restrictedIds?.has(item.id))) return false;
        return !isRestrictedTmdbTitle({ ...item, id: item.id, media_type: media });
      }).map((item: Record<string, any>) => ({
        ...item, media_type: item.media_type || (scope.media === "all" ? "movie" : scope.media),
      }));
      return { ...data, results };
    });
    return json(catalogData, 200, traceHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    logServerEvent("error", {
      route: "/api/tmdb",
      event: "upstream_error",
      requestId,
      status: 503,
      durationMs: Date.now() - startedAt,
      meta: { path: scope.path, reason: message || "unknown" },
    });
    if (message.includes("not configured")) return json({ error: "TMDB server integration not configured" }, 503, traceHeaders);
    return json({ error: "Content verification is temporarily unavailable" }, 503, traceHeaders);
  }
}
