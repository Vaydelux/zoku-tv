import { NextRequest, NextResponse } from "next/server";
import { tmdbProxyCache, anilistProxyCache } from "@/lib/server/api-cache";
import { resolveRequestId, logServerEvent } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTED_AT_MS = Date.now();

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const tmdbConfigured = Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN?.trim());
  const firebaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  );

  const payload = {
    status: "ok" as const,
    service: "zoku-tv",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - STARTED_AT_MS) / 1000),
    checks: {
      tmdbConfigured,
      firebaseConfigured,
    },
    caches: {
      tmdbEntries: tmdbProxyCache.size,
      anilistEntries: anilistProxyCache.size,
    },
  };

  logServerEvent("info", {
    route: "/api/health",
    event: "health_check",
    requestId,
    status: 200,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  });
}
