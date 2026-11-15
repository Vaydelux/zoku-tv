/**
 * Adult Content is a user-controlled browser preference, not an authentication
 * or parental-control boundary. The server defaults to filtering ON.
 * Kids Mode is a separate profile policy.
 *
 * Deliberately keep the existing cookie name for compatibility. Old signed
 * password-unlock cookies do not match the new explicit "on" preference and
 * therefore fail closed until the user chooses to enable mature content.
 */
export const ADULT_COOKIE_NAME = "zoku_adult_filter_unlock";
export const ADULT_PREFERENCE_TTL_SECONDS = 30 * 24 * 60 * 60;

export function adultFilterEnabledForCookie(raw: string | undefined): boolean {
  return raw !== "on";
}
