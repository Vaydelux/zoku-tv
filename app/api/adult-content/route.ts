import { NextRequest, NextResponse } from "next/server";
import {
  ADULT_COOKIE_NAME,
  ADULT_PREFERENCE_TTL_SECONDS,
  adultFilterEnabledForCookie,
} from "@/lib/server/adult-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: object, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Changing this browser preference must originate from this exact site. */
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Next's internal request.nextUrl.origin can be normalized to localhost
  // even when the browser requested 127.0.0.1 or a custom Vercel domain.
  // The Host header is the browser-facing destination and must match Origin.
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

export async function GET(request: NextRequest) {
  return json({
    filterEnabled: adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value),
  });
}

/** Opt into adult titles; no password or server environment variable required. */
export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const response = json({ filterEnabled: false });
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
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const response = json({ filterEnabled: true });
  response.cookies.set(ADULT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
