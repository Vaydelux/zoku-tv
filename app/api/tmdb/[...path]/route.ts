import { NextRequest, NextResponse } from "next/server";
import { ADULT_COOKIE_NAME, adultFilterEnabledForCookie } from "@/lib/server/adult-session";
import { restrictedMovieCatalog, tmdbReadAccessToken } from "@/lib/server/tmdb-company-catalog";
import { parseTmdbScope, sanitizedTmdbQuery, type TmdbMediaKind } from "@/lib/server/tmdb-proxy-policy";
import { BLOCKED_COMPANY_IDS, BLOCKED_KEYWORD_IDS, isRestrictedTmdbTitle } from "@/lib/adult-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_BASE = "https://api.themoviedb.org/3";
const RESPONSE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const MOVIE_DENYLIST = new Set(
  (process.env.BLOCKED_TMDB_MOVIE_IDS || process.env.NEXT_PUBLIC_BLOCKED_TMDB_MOVIE_IDS || "")
    .split(",").map(Number).filter((value) => Number.isSafeInteger(value) && value > 0)
);

function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: RESPONSE_HEADERS });
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

async function verifiedDetails(media: TmdbMediaKind, id: number, restrictedIds: Set<number> | null) {
  const query = new URLSearchParams();
  query.set("append_to_response", "release_dates,content_ratings,keywords");
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
  return { ...details, media_type: media };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;
  const scope = parseTmdbScope(segments);
  if (!scope) return json({ error: "Unsupported catalog endpoint" }, 404);

  let query: URLSearchParams;
  try {
    query = sanitizedTmdbQuery(request.nextUrl.searchParams);
  } catch {
    return json({ error: "Invalid catalog query" }, 400);
  }

  const filtering = adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value);
  let restrictedIds: Set<number> | null = null;

  try {
    // Fail closed for movie surfaces if company discovery is missing, stale or truncated.
    if (filtering && scope.media !== "tv" && scope.media !== "genre") {
      restrictedIds = new Set((await restrictedMovieCatalog()).ids);
    } else if (filtering && scope.kind !== "catalog" && scope.media === "movie") {
      restrictedIds = new Set((await restrictedMovieCatalog()).ids);
    }

    if (scope.kind === "detail" || scope.kind === "child") {
      if (filtering && scope.media === "movie" && !restrictedIds) {
        restrictedIds = new Set((await restrictedMovieCatalog()).ids);
      }
      const details = await verifiedDetails(scope.media, scope.id, filtering ? restrictedIds || new Set() : null);
      if (!details) return json({ error: "Title unavailable" }, 404);
      if (scope.kind === "detail") return json(details);
      const child = await fetchTmdb(scope.path, query);
      if (scope.path.endsWith("/similar") || scope.path.endsWith("/recommendations")) {
        if (!Array.isArray(child.results)) throw new Error("Malformed related-title results");
        return json({ ...child, results: child.results.filter((item: Record<string, any>) => {
          if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return false;
          if (!filtering) return true;
          if (scope.media === "movie" && (MOVIE_DENYLIST.has(item.id) || restrictedIds?.has(item.id))) return false;
          return !isRestrictedTmdbTitle({ ...item, id: item.id, media_type: scope.media });
        }) });
      }
      return json(child);
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

    const data = await fetchTmdb(scope.path, query);
    if (scope.media === "genre") return json(data);
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
    return json({ ...data, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not configured")) return json({ error: "TMDB server integration not configured" }, 503);
    return json({ error: "Content verification is temporarily unavailable" }, 503);
  }
}
