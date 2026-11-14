import type { AniListMedia } from "./anilist";
import type { TMDBTitle } from "./tmdb";

export type SearchSortMode = "relevance" | "rating" | "newest";
export type SearchSortableEntry =
  | { kind: "movie" | "tv"; data: TMDBTitle }
  | { kind: "anime"; data: AniListMedia };

function entryRating(entry: SearchSortableEntry): number {
  if (entry.kind === "anime") {
    const score = entry.data.averageScore;
    return typeof score === "number" && Number.isFinite(score) ? score / 10 : -1;
  }
  const rating = entry.data.vote_average;
  return typeof rating === "number" && Number.isFinite(rating) ? rating : -1;
}

function entryReleaseDate(entry: SearchSortableEntry): number {
  if (entry.kind === "anime") {
    const start = entry.data.startDate;
    const year = start?.year || entry.data.seasonYear || 0;
    return year * 10000 + (start?.month || 0) * 100 + (start?.day || 0);
  }
  const date = entry.data.release_date || entry.data.first_air_date || "";
  if (!/^\d{4}(-\d{2}){0,2}$/.test(date)) return 0;
  const [year, month = "0", day = "0"] = date.split("-");
  return Number(year) * 10000 + Number(month) * 100 + Number(day);
}

/** Relevance keeps provider-balanced order; other sorts use only metadata
 * returned from the existing policy-filtered catalogs, with no extra calls.
 * Missing scores/dates sort last, and ties retain previous order (stable sort).
 */
export function sortSearchEntries<T extends SearchSortableEntry>(
  items: readonly T[],
  mode: SearchSortMode,
): T[] {
  if (mode === "relevance") return [...items];
  const valueOf = mode === "rating" ? entryRating : entryReleaseDate;
  return [...items].sort((a, b) => valueOf(b) - valueOf(a));
}
