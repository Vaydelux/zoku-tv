import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE_NAME = "zoku_adult_filter_unlock";
const TTL_SECONDS = 4 * 60 * 60;

function configuration(): string | null {
  const password = process.env.ADULT_CONTENT_PASSWORD;
  return password && password.length >= 12 ? password : null;
}
function mac(input: string, key: string): string {
  return createHmac("sha256", key).update(input).digest("hex");
}
function validCookie(request: NextRequest, password: string): boolean {
  const raw = request.cookies.get(COOKIE_NAME)?.value || "";
  const [expires, signature] = raw.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expiry = Number(expires);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > Date.now() + TTL_SECONDS * 1000) return false;
  const expected = Buffer.from(mac(expires, password), "hex");
  const received = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, received);
}
function json(body: object, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const password = configuration();
  return json({ filterEnabled: !password || !validCookie(request, password), configured: !!password });
}
export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const password = configuration();
  if (!password) return json({ error: "Set ADULT_CONTENT_PASSWORD (12+ characters) on the server" }, 503);
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
  if (!timingSafeEqual(expected, actual)) return json({ error: "Invalid password" }, 401);
  const expiry = String(Date.now() + TTL_SECONDS * 1000);
  const response = json({ filterEnabled: false });
  response.cookies.set(COOKIE_NAME, expiry + "." + mac(expiry, password), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: TTL_SECONDS,
  });
  return response;
}
export async function DELETE(request: NextRequest) {
  if (!originAllowed(request)) return json({ error: "Invalid request origin" }, 403);
  const response = json({ filterEnabled: true });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
