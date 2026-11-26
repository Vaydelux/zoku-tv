import { NextRequest, NextResponse } from "next/server";
import { restrictedMovieCatalog } from "@/lib/server/tmdb-company-catalog";
import { extractClientIp, rateLimitHeaders, vivamaxRateLimiter } from "@/lib/server/rate-limit";
import { logServerEvent, resolveRequestId } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const ip = extractClientIp(request.headers);
  const limitResult = vivamaxRateLimiter.consume(`vivamax:${ip}`);
  const traceHeaders: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
    ...rateLimitHeaders(limitResult),
  };

  if (!limitResult.allowed) {
    return NextResponse.json(
      { ids: [], complete: false, error: "Too many catalog requests" },
      { status: 429, headers: traceHeaders }
    );
  }

  try {
    const catalog = await restrictedMovieCatalog();
    return NextResponse.json({ ...catalog, complete: true }, { headers: traceHeaders });
  } catch (error) {
    logServerEvent("error", {
      route: "/api/vivamax-ids",
      event: "catalog_unavailable",
      requestId,
      status: 503,
      meta: { reason: error instanceof Error ? error.message : "unknown" },
    });
    return NextResponse.json(
      { ids: [], complete: false, error: "Company catalog unavailable" },
      { status: 503, headers: { ...traceHeaders, "Cache-Control": "no-store" } }
    );
  }
}
