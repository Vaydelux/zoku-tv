/** Pure, profile-scoped Search persistence. Keep query text only.
 * Never store full TMDB/AniList results, because content eligibility can
 * change after a profile switch or adult-content relock.
 */
export interface SavedSearchQuery {
  profileId: string;
  query: string;
}

export const LEGACY_SEARCH_SESSION_KEY = "zoku_last_search_session_v1";

export function searchViewScopeKey(profileId: string | null | undefined, kidsMode: boolean): string {
  return `${profileId || "no-profile"}:${kidsMode ? "kids" : "standard"}`;
}

export function searchQueryStorageKey(profileId: string | null | undefined): string | null {
  if (!profileId) return null;
  return `zoku_last_search_query_v2_${profileId}`;
}

export function sanitizeSavedSearchQuery(raw: unknown, profileId: string): SavedSearchQuery | null {
  if (!profileId || !raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.profileId !== profileId || typeof data.query !== "string") return null;
  const query = data.query.trim().slice(0, 250);
  return query ? { profileId, query } : null;
}
