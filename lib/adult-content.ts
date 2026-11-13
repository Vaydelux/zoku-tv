export interface AdultContentTitle {
  id: number;
  media_type?: string;
  adult?: boolean;
  title?: string;
  name?: string;
  original_title?: string;
  overview?: string;
  certification?: string;
  production_companies?: { id: number }[];
  keywords?: { keywords?: { id: number }[]; results?: { id: number }[] };
  release_dates?: { results?: { iso_3166_1: string; release_dates: { certification?: string }[] }[] };
  content_ratings?: { results?: { iso_3166_1: string; rating?: string }[] };
}

export const BLOCKED_COMPANY_IDS = [149142] as const;
export const BLOCKED_KEYWORD_IDS = [159551, 9715, 190370, 293198] as const;
const BLOCKED_CERTIFICATIONS = new Set(["R-18", "R18", "NC-17", "X", "XXX", "TV-MA", "18+", "18"]);
const BLOCKED_MOVIE_IDS = new Set(
  (process.env.NEXT_PUBLIC_BLOCKED_TMDB_MOVIE_IDS || "")
    .split(",").map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
);
const PROMOTIONAL_TERMS = /\b(?:vivamax|vmx original|softcore|erotic (?:film|movie)|pink film)\b/i;
let filterEnabled = true;
const companyCatalogIds = new Set<number>();
let catalogPromise: Promise<void> | undefined;
let companyCatalogReady = false;
let catalogAttemptAt = 0;
const CATALOG_RETRY_MS = 60 * 1000;
const CATALOG_REFRESH_MS = 60 * 60 * 1000;

let syncPromise: Promise<void> | undefined;
let policyCheckedAt = 0;
const POLICY_REFRESH_MS = 30 * 1000;

export function isAdultFilterEnabled(): boolean {
  return filterEnabled;
}
export function setAdultFilterEnabled(enabled: boolean): void {
  filterEnabled = enabled;
  syncPromise = undefined;
  policyCheckedAt = 0;
}
export function syncAdultFilterState(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!catalogPromise || Date.now() - catalogAttemptAt >= (companyCatalogReady ? CATALOG_REFRESH_MS : CATALOG_RETRY_MS)) {
    catalogAttemptAt = Date.now();
    companyCatalogReady = false;
    catalogPromise = fetch("/api/vivamax-ids", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Company catalog unavailable");
        const payload = await response.json() as { ids?: number[]; complete?: boolean };
        if (payload.complete !== true || !Array.isArray(payload.ids)) throw new Error("Incomplete company catalog");
        companyCatalogIds.clear();
        for (const id of payload.ids || []) if (Number.isSafeInteger(id) && id > 0) companyCatalogIds.add(id);
        companyCatalogReady = true;
      })
      .catch(() => { companyCatalogReady = false; /* Fail closed on movie routes until IDs can be checked. */ });
  }
  if (!syncPromise || Date.now() - policyCheckedAt >= POLICY_REFRESH_MS) {
    policyCheckedAt = Date.now();
    syncPromise = fetch("/api/adult-content", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Content filter status unavailable");
        const data = await response.json() as { filterEnabled?: boolean };
        filterEnabled = data.filterEnabled !== false;
      })
      .catch(() => { filterEnabled = true; });
  }
  return Promise.all([syncPromise, catalogPromise]).then(() => undefined);
}
export function isRestrictedTmdbTitle(title: AdultContentTitle): boolean {
  if (title.adult === true) return true;
  if (title.media_type !== "tv" && (BLOCKED_MOVIE_IDS.has(title.id) || companyCatalogIds.has(title.id))) return true;
  if (title.production_companies?.some((company) => BLOCKED_COMPANY_IDS.includes(company.id as 149142))) return true;
  const keywords = [...(title.keywords?.keywords || []), ...(title.keywords?.results || [])];
  if (keywords.some((keyword) => BLOCKED_KEYWORD_IDS.includes(keyword.id as typeof BLOCKED_KEYWORD_IDS[number]))) return true;
  const ratings = [
    title.certification,
    ...(title.release_dates?.results || []).flatMap((entry) => entry.release_dates.map((date) => date.certification)),
    ...(title.content_ratings?.results || []).map((entry) => entry.rating),
  ];
  if (ratings.some((rating) => BLOCKED_CERTIFICATIONS.has((rating || "").trim().toUpperCase()))) return true;
  return PROMOTIONAL_TERMS.test([title.title, title.name, title.original_title, title.overview].filter(Boolean).join(" "));
}
export function requireMovieCatalogAvailable(): void {
  if (filterEnabled && !companyCatalogReady && typeof window !== "undefined") {
    throw new Error("Movie content verification is temporarily unavailable.");
  }
}
export function filterRestrictedTmdbTitles<T extends AdultContentTitle>(titles: T[]): T[] {
  return filterEnabled ? titles.filter((item) => (item.media_type === "tv" || companyCatalogReady || typeof window === "undefined") && !isRestrictedTmdbTitle(item)) : titles;
}

/** Keep old watchlist, history, and resume items private while the filter is active. */
export function filterSavedMediaItems<T extends { media_type: string; tmdbId?: number | null; anilistId?: number | null; title?: string }>(items: T[], safeAnimeIds?: ReadonlySet<number>): T[] {
  if (!filterEnabled) return items;
  return items.filter((item) => {
    if (item.media_type === "anime") return Boolean(item.anilistId && safeAnimeIds?.has(item.anilistId));
    if (item.media_type !== "movie") return true;
    if (!companyCatalogReady || !item.tmdbId) return false;
    return !isRestrictedTmdbTitle({ id: item.tmdbId, media_type: "movie", title: item.title });
  });
}
