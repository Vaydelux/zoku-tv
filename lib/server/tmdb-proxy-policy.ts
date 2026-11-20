export type TmdbMediaKind = "movie" | "tv";
export type TmdbRequestScope =
  | { kind: "catalog"; media: TmdbMediaKind | "all" | "genre"; path: string }
  | { kind: "detail"; media: TmdbMediaKind; id: number; path: string }
  | { kind: "child"; media: TmdbMediaKind; id: number; path: string }
  | { kind: "collection"; media: "movie"; id: number; path: string }
  | { kind: "person"; media: "all"; id: number; path: string };

const POSITIVE_ID = /^[1-9]\d{0,9}$/;
// TMDB season 0 is valid and represents specials.
const NONNEGATIVE_SEASON = /^(?:0|[1-9]\d{0,9})$/;

export const ALLOWED_APPEND_TOKENS = new Set([
  "credits",
  "videos",
  "similar",
  "recommendations",
  "combined_credits",
  "release_dates",
  "content_ratings",
  "keywords",
]);

/** Only routes used by Zoku TV are exposed; this is not an open TMDB proxy. */
export function parseTmdbScope(segments: string[]): TmdbRequestScope | null {
  if (!Array.isArray(segments) || segments.length < 2 || segments.length > 4) return null;
  const path = "/" + segments.join("/");
  if (/^\/trending\/(all|movie|tv)\/(day|week)$/.test(path)) {
    return { kind: "catalog", media: segments[1] as TmdbMediaKind | "all", path };
  }
  if (/^\/genre\/(movie|tv)\/list$/.test(path)) {
    return { kind: "catalog", media: "genre", path };
  }
  if (path === "/search/multi") return { kind: "catalog", media: "all", path };
  if (path === "/discover/movie" || path === "/discover/tv") {
    return { kind: "catalog", media: segments[1] as TmdbMediaKind, path };
  }
  if (segments.length === 2 && segments[0] === "collection" && POSITIVE_ID.test(segments[1])) {
    const id = Number(segments[1]);
    if (!Number.isSafeInteger(id)) return null;
    return { kind: "collection", media: "movie", id, path };
  }
  if (segments.length === 2 && segments[0] === "person" && POSITIVE_ID.test(segments[1])) {
    const id = Number(segments[1]);
    if (!Number.isSafeInteger(id)) return null;
    return { kind: "person", media: "all", id, path };
  }
  if ((segments[0] === "movie" || segments[0] === "tv") && POSITIVE_ID.test(segments[1])) {
    const id = Number(segments[1]);
    if (!Number.isSafeInteger(id)) return null;
    if (segments.length === 2) return { kind: "detail", media: segments[0], id, path };
    if (segments.length === 3 && ["credits", "videos", "similar", "recommendations"].includes(segments[2])) {
      return { kind: "child", media: segments[0], id, path };
    }
    if (segments[0] === "tv" && segments.length === 4 && segments[2] === "season" && NONNEGATIVE_SEASON.test(segments[3])) {
      return { kind: "child", media: "tv", id, path };
    }
  }
  return null;
}

const ALLOWED_QUERY_KEYS = new Set([
  "query", "page", "sort_by", "with_genres", "release_date.gte", "release_date.lte",
  "primary_release_year", "first_air_date.gte", "first_air_date.lte", "with_runtime.gte",
  "with_runtime.lte", "vote_average.gte", "region", "with_original_language",
  "append_to_response",
]);

export function sanitizeAppendToResponse(raw: string): string {
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => ALLOWED_APPEND_TOKENS.has(t));
  return [...new Set(tokens)].join(",");
}

export function sanitizedTmdbQuery(input: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of input) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (value.length > 180) throw new Error("Query parameter too long");
    if (key === "page") {
      if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > 500) throw new Error("Invalid page");
    }
    if (key === "query" && value.trim().length > 120) throw new Error("Query too long");
    if (key === "append_to_response") {
      const cleaned = sanitizeAppendToResponse(value);
      if (cleaned) params.set(key, cleaned);
      continue;
    }
    params.set(key, value);
  }
  return params;
}
