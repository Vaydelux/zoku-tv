import { NextRequest, NextResponse } from "next/server";
import {
  ADULT_COOKIE_NAME,
  ADULT_PREFERENCE_TTL_SECONDS,
  adultFilterEnabledForCookie,
} from "@/lib/server/adult-session";
import { adultPrefRateLimiter, extractClientIp, rateLimitHeaders } from "@/lib/server/rate-limit";
import { logServerEvent, resolveRequestId } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: object, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders },
  });
}

/** Changing this browser preference must originate from this exact site. */
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
    const allowHttp = process.env.NODE_ENV !== "production" || loopback;
    return parsed.host === host &&
      (parsed.protocol === "https:" || (allowHttp && parsed.protocol === "http:")) &&
      !parsed.username && !parsed.password &&
      !parsed.pathname.replace(/\//g, "") && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

function checkLimit(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const ip = extractClientIp(request.headers);
  const result = adultPrefRateLimiter.consume(`adult:${ip}`);
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
    ...rateLimitHeaders(result),
  };
  if (!result.allowed) {
    logServerEvent("warn", {
      route: "/api/adult-content",
      event: "rate_limited",
      requestId,
      status: 429,
      meta: { ip, retryAfterSec: result.retryAfterSec },
    });
  }
  return { requestId, result, headers };
}

export async function GET(request: NextRequest) {
  const { result, headers } = checkLimit(request);
  if (!result.allowed) return json({ error: "Too many requests" }, 429, headers);
  return json({
    filterEnabled: adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value),
  }, 200, headers);
}

/** Opt into adult titles; no password or server environment variable required. */
export async function POST(request: NextRequest) {
  const { result, headers } = checkLimit(request);
  if (!result.allowed) return json({ error: "Too many requests" }, 429, headers);
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403, headers);
  const response = json({ filterEnabled: false }, 200, headers);
  response.cookies.set(ADULT_COOKIE_NAME, "on", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADULT_PREFERENCE_TTL_SECONDS,
  });
  return response;
}

/** Restore the default server-side filtering policy. */
export async function DELETE(request: NextRequest) {
  const { result, headers } = checkLimit(request);
  if (!result.allowed) return json({ error: "Too many requests" }, 429, headers);
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403, headers);
  const response = json({ filterEnabled: true }, 200, headers);
  response.cookies.set(ADULT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
