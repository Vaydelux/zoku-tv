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

let syncPromise: Promise<void> | undefined;

export function isAdultFilterEnabled(): boolean {
  return filterEnabled;
}
export function setAdultFilterEnabled(enabled: boolean): void {
  filterEnabled = enabled;
  syncPromise = undefined;
}
export function syncAdultFilterState(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!catalogPromise) {
    catalogPromise = fetch("/api/vivamax-ids", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Company catalog unavailable");
        const payload = await response.json() as { ids?: number[] };
        for (const id of payload.ids || []) if (Number.isSafeInteger(id) && id > 0) companyCatalogIds.add(id);
      })
      .catch(() => { /* The direct company, metadata, and keyword checks remain active. */ });
  }
  if (!syncPromise) {
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
export function filterRestrictedTmdbTitles<T extends AdultContentTitle>(titles: T[]): T[] {
  return filterEnabled ? titles.filter((item) => !isRestrictedTmdbTitle(item)) : titles;
}
