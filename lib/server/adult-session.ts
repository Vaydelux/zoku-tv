import { createHmac, timingSafeEqual } from "node:crypto";

export const ADULT_COOKIE_NAME = "zoku_adult_filter_unlock";
export const ADULT_UNLOCK_TTL_SECONDS = 4 * 60 * 60;

export function configuredAdultPassword(): string | null {
  const password = process.env.ADULT_CONTENT_PASSWORD;
  return password && password.length >= 12 ? password : null;
}

/** Keep existing sessions valid when the optional session secret is not set. */
function signingKey(password: string): string {
  const secret = process.env.ADULT_CONTENT_SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return createHmac("sha256", secret).update(password).digest("hex");
  }
  return password;
}

function signature(input: string, password: string): string {
  return createHmac("sha256", signingKey(password)).update(input).digest("hex");
}

export function isValidAdultUnlockCookie(
  raw: string | undefined,
  password: string,
  now = Date.now()
): boolean {
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 2) return false;
  const [expiryText, digest] = parts;
  if (!/^\d+$/.test(expiryText) || !/^[a-f0-9]{64}$/.test(digest)) return false;
  const expiry = Number(expiryText);
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + ADULT_UNLOCK_TTL_SECONDS * 1000) return false;
  const expected = Buffer.from(signature(expiryText, password), "hex");
  const received = Buffer.from(digest, "hex");
  return timingSafeEqual(expected, received);
}

export function createAdultUnlockCookie(password: string, now = Date.now()): string {
  const expiry = String(now + ADULT_UNLOCK_TTL_SECONDS * 1000);
  return `${expiry}.${signature(expiry, password)}`;
}

export function adultFilterEnabledForCookie(raw: string | undefined): boolean {
  const password = configuredAdultPassword();
  return !password || !isValidAdultUnlockCookie(raw, password);
}
