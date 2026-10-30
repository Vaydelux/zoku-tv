export type CatalogMode = "tmdb" | "anime";
export type MediaType = "movie" | "tv" | "anime";

export function watchlistEntryKey(media_type: MediaType, id: number) {
  return `${media_type}_${id}`;
}

export function getWatchlistItemId(item: { media_type: MediaType; tmdbId?: number | null; anilistId?: number | null }) {
  if (item.media_type === "anime") return item.anilistId ?? 0;
  return item.tmdbId ?? 0;
}

export function isReleasedWithinLast30Days(
  releaseDate?: string | null,
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null,
  referenceTime: number = Date.now()
): boolean {
  let releaseTimestamp = Number.NaN;

  if (releaseDate && releaseDate.trim().length > 0) {
    const trimmed = releaseDate.trim();
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      releaseTimestamp = new Date(year, month - 1, day).getTime();
    } else {
      releaseTimestamp = Date.parse(trimmed);
    }
  } else if (startDate?.year && startDate?.month) {
    const day = startDate.day && startDate.day > 0 ? startDate.day : 1;
    releaseTimestamp = new Date(startDate.year, startDate.month - 1, day).getTime();
  }

  if (Number.isNaN(releaseTimestamp)) return false;

  const diffMs = referenceTime - releaseTimestamp;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const futureToleranceMs = 2 * 24 * 60 * 60 * 1000;

  return diffMs >= -futureToleranceMs && diffMs <= thirtyDaysMs;
}


