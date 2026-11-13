import { createHmac, timingSafeEqual } from "node:crypto";
import { ADULT_COOKIE_NAME, ADULT_UNLOCK_TTL_SECONDS, configuredAdultPassword, adultFilterEnabledForCookie, createAdultUnlockCookie } from "@/lib/server/adult-session";
import { NextRequest, NextResponse } from "next/server";
import { clearAdultUnlockFailures, isAdultUnlockLimited, recordAdultUnlockFailure } from "@/lib/adult-unlock-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function json(body: object, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  return json({ filterEnabled: adultFilterEnabledForCookie(request.cookies.get(ADULT_COOKIE_NAME)?.value), configured: !!configuredAdultPassword() });
}
export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const password = configuredAdultPassword();
  if (!password) return json({ error: "Set ADULT_CONTENT_PASSWORD (12+ characters) on the server" }, 503);
  const key = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown").slice(0, 128);
  const retryAfter = isAdultUnlockLimited(key);
  if (retryAfter) {
    const limited = json({ error: "Too many password attempts. Try again later." }, 429);
    limited.headers.set("Retry-After", String(retryAfter));
    return limited;
  }
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 4096) return json({ error: "Request too large" }, 413);
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("application/json")) return json({ error: "JSON required" }, 415);
  let supplied: unknown;
  try {
    const data = await request.json();
    supplied = data?.password;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (typeof supplied !== "string" || supplied.length > 1024) return json({ error: "Invalid password" }, 400);
  const expected = Buffer.from(mac(supplied, password), "hex");
  const actual = Buffer.from(mac(password, password), "hex");
  if (!timingSafeEqual(expected, actual)) {
    recordAdultUnlockFailure(key);
    return json({ error: "Invalid password" }, 401);
  }
  clearAdultUnlockFailures(key);
  const response = json({ filterEnabled: false });
  response.cookies.set(ADULT_COOKIE_NAME, createAdultUnlockCookie(password), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: ADULT_UNLOCK_TTL_SECONDS,
  });
  return response;
}
export async function DELETE(request: NextRequest) {
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const response = json({ filterEnabled: true });
  response.cookies.set(ADULT_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
