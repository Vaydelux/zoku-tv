/**
 * Structured JSON logger for Next.js Route Handlers with request correlation IDs
 * and automatic redaction of sensitive headers/credentials.
 */

export type LogLevel = "info" | "warn" | "error";

const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "token",
  "password",
  "secret",
  "apikey",
  "api_key",
]);

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
      continue;
    }
    if (value instanceof Error) {
      clean[key] = { name: value.name, message: value.message };
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

export function resolveRequestId(headers?: Pick<Headers, "get">): string {
  const incoming = headers?.get("x-request-id")?.trim();
  if (incoming && /^[a-zA-Z0-9._-]{4,64}$/.test(incoming)) {
    return incoming;
  }
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function logServerEvent(
  level: LogLevel,
  payload: {
    route: string;
    event: string;
    requestId: string;
    status?: number;
    durationMs?: number;
    meta?: Record<string, unknown>;
  }
): void {
  const record = {
    ts: new Date().toISOString(),
    level,
    service: "zoku-tv",
    route: payload.route,
    event: payload.event,
    requestId: payload.requestId,
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.durationMs !== undefined ? { durationMs: payload.durationMs } : {}),
    ...(payload.meta ? { meta: sanitizeMeta(payload.meta) } : {}),
  };

  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else if (process.env.NODE_ENV !== "test") {
    console.info(line);
  }
}
