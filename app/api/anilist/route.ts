import { NextRequest, NextResponse } from "next/server";
import { ADULT_COOKIE_NAME, adultFilterEnabledForCookie } from "@/lib/server/adult-session";
import { isRestrictedAniListMedia, filterAniListMedia, sanitizeAniListDetail, type AniListSafetyMedia } from "@/lib/anilist-content-policy";
import { BROWSE_QUERY, STUDIO_BROWSE_QUERY, DETAIL_QUERY, ELIGIBILITY_QUERY } from "@/lib/anilist-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
type Operation = "browse" | "studio" | "detail" | "eligibility";
const OPERATIONS: Record<Operation, string> = {
  browse: BROWSE_QUERY,
  studio: STUDIO_BROWSE_QUERY,
  detail: DETAIL_QUERY,
  eligibility: ELIGIBILITY_QUERY,
};

const BLOCKED_ANIME_IDS = new Set(
  (process.env.BLOCKED_ANILIST_ANIME_IDS || "").split(",").map(Number).filter((value) => Number.isSafeInteger(value) && value > 0)
);
function excluded(media: AniListSafetyMedia): boolean {
  return BLOCKED_ANIME_IDS.has(media.id) || isRestrictedAniListMedia(media);
}
function responseJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: HEADERS });
}
function validPositive(value: unknown, max: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= max;
}
function validVariables(op: Operation, variables: Record<string, unknown>): boolean {
  const keys: Record<Operation, string[]> = {
    browse: ["page","perPage","search","genre_in","season","seasonYear","format","source","sort","isAdult"],
    studio: ["studio","page","perPage","sort"],
    detail: ["id"],
    eligibility: ["ids"],
  };
  if (Object.keys(variables).some((key) => !keys[op].includes(key))) return false;
  if ("page" in variables && !validPositive(variables.page, 250)) return false;
  if ("perPage" in variables && !validPositive(variables.perPage, 50)) return false;
  if ("id" in variables && !validPositive(variables.id, 2147483647)) return false;
  if ("search" in variables && (typeof variables.search !== "string" || variables.search.length > 120)) return false;
  if ("studio" in variables && (typeof variables.studio !== "string" || variables.studio.length > 120)) return false;
  if ("seasonYear" in variables && !validPositive(variables.seasonYear, 3000)) return false;
  if ("sort" in variables && (!Array.isArray(variables.sort) || variables.sort.length > 3 ||
       variables.sort.some((value) => typeof value !== "string" || !/^[A-Z_]{1,40}$/.test(value)))) return false;
  if ("genre_in" in variables && (!Array.isArray(variables.genre_in) || variables.genre_in.length > 8 ||
      variables.genre_in.some((value) => typeof value !== "string" || value.length > 40))) return false;
  for (const key of ["season", "format", "source"]) {
    if (key in variables && (typeof variables[key] !== "string" || !/^[A-Z_]{2,40}$/.test(variables[key] as string))) return false;
  }
  if ("isAdult" in variables && typeof variables.isAdult !== "boolean") return false;
  if (op === "detail" && !validPositive(variables.id, 2147483647)) return false;
  if (op === "eligibility" && (!Array.isArray(variables.ids) || variables.ids.length === 0 || variables.ids.length > 50 ||
      variables.ids.some((id) => !validPositive(id, 2147483647)))) return false;
  return true;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return responseJson({ error: "Invalid request origin" }, 403);
  }
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return responseJson({ error: "JSON required" }, 415);
  if (Number(request.headers.get("content-length") || 0) > 4096) return responseJson({ error: "Request too large" }, 413);
  let payload: { operation?: unknown; variables?: unknown };
  try {
    const body = await request.text();
    if (body.length > 4096) return responseJson({ error: "Request too large" }, 413);
    payload = JSON.parse(body) as typeof payload;
  } catch {
    return responseJson({ error: "Invalid JSON" }, 400);
  }
  const operation = payload?.operation;
  if (typeof operation !== "string" || !Object.hasOwn(OPERATIONS, operation)) {
    return responseJson({ error: "Unsupported AniList operation" }, 404);
  }
  const op = operation as Operation;
  const vars = payload?.variables ?? {};
  if (!vars || typeof vars !== "object" || Array.isArray(vars) || !validVariables(op, vars as Record<string, unknown>)) {
    return responseJson({ error: "Invalid AniList parameters" }, 400);
  }
  const variables = vars as Record<string, unknown>;
  const filterEnabled = adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value);
  if (filterEnabled && variables.isAdult === true) return responseJson({ error: "Adult catalog search is unavailable" }, 403);
  if (filterEnabled && op === "browse") variables.isAdult = false;

  try {
    const upstream = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: OPERATIONS[op], variables }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!upstream.ok) return responseJson({ error: "AniList temporarily unavailable" }, 503);
    const json = await upstream.json() as { data?: Record<string, any>; errors?: { message?: string }[] };
    if (json.errors?.length || !json.data) return responseJson({ error: "AniList returned an invalid response" }, 503);

    if (op === "browse") {
      if (!Array.isArray(json.data.Page?.media)) throw new Error("Malformed AniList page");
      json.data.Page.media = filterAniListMedia(json.data.Page.media, filterEnabled)
        .filter((item: AniListSafetyMedia) => !filterEnabled || !BLOCKED_ANIME_IDS.has(item.id));
    } else if (op === "studio") {
      if (json.data.Studio && !Array.isArray(json.data.Studio.media?.nodes)) throw new Error("Malformed AniList studio");
      if (json.data.Studio) {
        json.data.Studio.media.nodes = filterAniListMedia(json.data.Studio.media.nodes, filterEnabled)
          .filter((item: AniListSafetyMedia) => !filterEnabled || !BLOCKED_ANIME_IDS.has(item.id));
      }
    } else if (op === "detail") {
      const media = json.data.Media as AniListSafetyMedia | null;
      if (!media) return responseJson({ error: "Anime not found" }, 404);
      if (filterEnabled && excluded(media)) return responseJson({ error: "Anime unavailable" }, 404);
      json.data.Media = sanitizeAniListDetail(media, filterEnabled);
      if (filterEnabled) {
        json.data.Media.relations.edges = (json.data.Media.relations?.edges || []).filter((edge: { node?: AniListSafetyMedia | null }) =>
          edge.node && !BLOCKED_ANIME_IDS.has(edge.node.id)
        );
        json.data.Media.recommendations.nodes = (json.data.Media.recommendations?.nodes || []).filter((node: { mediaRecommendation?: AniListSafetyMedia | null }) =>
          node.mediaRecommendation && !BLOCKED_ANIME_IDS.has(node.mediaRecommendation.id)
        );
      }
    } else {
      if (!Array.isArray(json.data.Page?.media)) throw new Error("Malformed AniList eligibility");
      const safe = json.data.Page.media.filter((item: AniListSafetyMedia) => !filterEnabled || !excluded(item));
      return responseJson({ data: { ids: safe.map((item: AniListSafetyMedia) => item.id) } });
    }
    return responseJson({ data: json.data });
  } catch {
    return responseJson({ error: "AniList verification is temporarily unavailable" }, 503);
  }
}
