import type { TMDBTitle } from "@/lib/tmdb";
import type { AniListMedia } from "@/lib/anilist";

export type RailSortOption =
  | "popularity"
  | "newest"
  | "ratings"
  | "most_watched";

export interface RailSortDescriptor {
  id: RailSortOption;
  label: string;
}

export const RAIL_SORT_OPTIONS: RailSortDescriptor[] = [
  { id: "popularity", label: "Popularity" },
  { id: "newest", label: "Newest Releases" },
  { id: "ratings", label: "My Ratings" },
  { id: "most_watched", label: "Most Watched" },
];

export interface RailSortContext {
  /** Optional map of user-specific ratings keyed by `${media_type}_${id}` or `${id}` (0-10 scale) */
  userRatings?: Record<string, number>;
  /** Optional set of keys (`${media_type}_${id}` or `${id}`) present in user's Watchlist or Watch History */
  userSavedKeys?: Set<string>;
  /** Optional map of user watch counts / engagement scores keyed by `${media_type}_${id}` or `${id}` */
  userWatchCounts?: Record<string, number>;
}

/**
 * Parses a TMDB date string (YYYY-MM-DD) into a comparable epoch timestamp.
 * Returns -Infinity for missing or invalid dates so they sort to the end.
 */
export function parseTmdbReleaseTimestamp(
  item: Pick<TMDBTitle, "release_date" | "first_air_date">
): number {
  const raw = (item.release_date || item.first_air_date || "").trim();
  if (!raw) return -Infinity;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

/**
 * Parses an AniList startDate or seasonYear into a comparable epoch timestamp.
 * Returns -Infinity for missing dates so they sort to the end.
 */
export function parseAnimeReleaseTimestamp(
  item: Pick<AniListMedia, "startDate" | "seasonYear">
): number {
  const year = item.startDate?.year ?? item.seasonYear ?? null;
  if (!year || year <= 0) return -Infinity;
  const month = Math.max(1, Math.min(12, item.startDate?.month ?? 1));
  const day = Math.max(1, Math.min(31, item.startDate?.day ?? 1));
  return Date.UTC(year, month - 1, day);
}

/**
 * Resolves the effective rating (0-10 scale) for a TMDB item when sorting by "My Ratings".
 */
export function getTmdbEffectiveRating(
  item: TMDBTitle,
  mediaType?: "movie" | "tv",
  context?: RailSortContext
): number {
  const resolvedType = item.media_type ?? mediaType ?? "movie";
  const compositeKey = `${resolvedType}_${item.id}`;
  const idKey = String(item.id);

  const explicitUserRating =
    context?.userRatings?.[compositeKey] ?? context?.userRatings?.[idKey];
  if (
    typeof explicitUserRating === "number" &&
    !Number.isNaN(explicitUserRating)
  ) {
    return explicitUserRating;
  }

  const baseRating =
    typeof item.vote_average === "number" && !Number.isNaN(item.vote_average)
      ? item.vote_average
      : 0;

  const isSavedByUser =
    context?.userSavedKeys?.has(compositeKey) ||
    context?.userSavedKeys?.has(idKey);

  // Subtle tie-breaker boost for titles in the user's personal library/history
  return isSavedByUser ? baseRating + 0.001 : baseRating;
}

/**
 * Resolves the effective rating (0-10 scale) for an AniList item when sorting by "My Ratings".
 */
export function getAnimeEffectiveRating(
  item: AniListMedia,
  context?: RailSortContext
): number {
  const compositeKey = `anime_${item.id}`;
  const idKey = String(item.id);

  const explicitUserRating =
    context?.userRatings?.[compositeKey] ?? context?.userRatings?.[idKey];
  if (
    typeof explicitUserRating === "number" &&
    !Number.isNaN(explicitUserRating)
  ) {
    return explicitUserRating;
  }

  const rawScore = item.averageScore ?? item.meanScore ?? 0;
  const baseRating =
    typeof rawScore === "number" && !Number.isNaN(rawScore) ? rawScore / 10 : 0;

  const isSavedByUser =
    context?.userSavedKeys?.has(compositeKey) ||
    context?.userSavedKeys?.has(idKey);

  return isSavedByUser ? baseRating + 0.001 : baseRating;
}

/**
 * Resolves the watch frequency / engagement score for a TMDB item when sorting by "Most Watched".
 */
export function getTmdbWatchEngagement(
  item: TMDBTitle,
  mediaType?: "movie" | "tv",
  context?: RailSortContext
): number {
  const resolvedType = item.media_type ?? mediaType ?? "movie";
  const compositeKey = `${resolvedType}_${item.id}`;
  const idKey = String(item.id);

  const count =
    context?.userWatchCounts?.[compositeKey] ??
    context?.userWatchCounts?.[idKey];
  if (typeof count === "number" && Number.isFinite(count) && count > 0) {
    return count;
  }

  if (
    context?.userSavedKeys?.has(compositeKey) ||
    context?.userSavedKeys?.has(idKey)
  ) {
    return 0.25;
  }

  return 0;
}

/**
 * Resolves the watch frequency / engagement score for an AniList item when sorting by "Most Watched".
 */
export function getAnimeWatchEngagement(
  item: AniListMedia,
  context?: RailSortContext
): number {
  const compositeKey = `anime_${item.id}`;
  const idKey = String(item.id);

  const count =
    context?.userWatchCounts?.[compositeKey] ??
    context?.userWatchCounts?.[idKey];
  if (typeof count === "number" && Number.isFinite(count) && count > 0) {
    return count;
  }

  if (
    context?.userSavedKeys?.has(compositeKey) ||
    context?.userSavedKeys?.has(idKey)
  ) {
    return 0.25;
  }

  return 0;
}

/**
 * Sorts an array of TMDB titles non-destructively according to the selected RailSortOption.
 */
export function sortTmdbRailItems(
  items: TMDBTitle[],
  sortBy: RailSortOption,
  mediaType?: "movie" | "tv",
  context?: RailSortContext
): TMDBTitle[] {
  if (items.length <= 1) return [...items];

  const indexed = items.map((item, index) => ({ item, index }));

  indexed.sort((a, b) => {
    if (sortBy === "newest") {
      const timeA = parseTmdbReleaseTimestamp(a.item);
      const timeB = parseTmdbReleaseTimestamp(b.item);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return a.index - b.index;
    }

    if (sortBy === "ratings") {
      const ratingA = getTmdbEffectiveRating(a.item, mediaType, context);
      const ratingB = getTmdbEffectiveRating(b.item, mediaType, context);
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return a.index - b.index;
    }

    if (sortBy === "most_watched") {
      const watchA = getTmdbWatchEngagement(a.item, mediaType, context);
      const watchB = getTmdbWatchEngagement(b.item, mediaType, context);
      if (watchA !== watchB) {
        return watchB - watchA;
      }
      const popA =
        typeof a.item.popularity === "number" ? a.item.popularity : null;
      const popB =
        typeof b.item.popularity === "number" ? b.item.popularity : null;
      if (popA !== null && popB !== null && popA !== popB) {
        return popB - popA;
      }
      return a.index - b.index;
    }

    // Default: "popularity"
    const popA =
      typeof a.item.popularity === "number" ? a.item.popularity : null;
    const popB =
      typeof b.item.popularity === "number" ? b.item.popularity : null;
    if (popA !== null && popB !== null && popA !== popB) {
      return popB - popA;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.item);
}

/**
 * Sorts an array of AniList anime items non-destructively according to the selected RailSortOption.
 */
export function sortAnimeRailItems(
  items: AniListMedia[],
  sortBy: RailSortOption,
  context?: RailSortContext
): AniListMedia[] {
  if (items.length <= 1) return [...items];

  const indexed = items.map((item, index) => ({ item, index }));

  indexed.sort((a, b) => {
    if (sortBy === "newest") {
      const timeA = parseAnimeReleaseTimestamp(a.item);
      const timeB = parseAnimeReleaseTimestamp(b.item);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return a.index - b.index;
    }

    if (sortBy === "ratings") {
      const ratingA = getAnimeEffectiveRating(a.item, context);
      const ratingB = getAnimeEffectiveRating(b.item, context);
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return a.index - b.index;
    }

    if (sortBy === "most_watched") {
      const watchA = getAnimeWatchEngagement(a.item, context);
      const watchB = getAnimeWatchEngagement(b.item, context);
      if (watchA !== watchB) {
        return watchB - watchA;
      }
      const popA =
        typeof a.item.popularity === "number"
          ? a.item.popularity
          : typeof a.item.trending === "number"
          ? a.item.trending
          : null;
      const popB =
        typeof b.item.popularity === "number"
          ? b.item.popularity
          : typeof b.item.trending === "number"
          ? b.item.trending
          : null;
      if (popA !== null && popB !== null && popA !== popB) {
        return popB - popA;
      }
      return a.index - b.index;
    }

    // Default: "popularity"
    const popA =
      typeof a.item.popularity === "number"
        ? a.item.popularity
        : typeof a.item.trending === "number"
        ? a.item.trending
        : null;
    const popB =
      typeof b.item.popularity === "number"
        ? b.item.popularity
        : typeof b.item.trending === "number"
        ? b.item.trending
        : null;
    if (popA !== null && popB !== null && popA !== popB) {
      return popB - popA;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.item);
}

/**
 * Sorts TMDB category rails in All Rails view when 'most_watched' is active,
 * bringing the user's most frequently accessed content categories to the top.
 */
export function sortTmdbCategoryRails<
  T extends { genre: { id: number; name: string }; titles: TMDBTitle[] }
>(rails: T[], sortBy: RailSortOption, context?: RailSortContext): T[] {
  if (sortBy !== "most_watched" || rails.length <= 1) {
    return [...rails];
  }

  const indexed = rails.map((rail, index) => {
    let watchScore = 0;
    let popularitySum = 0;
    for (const title of rail.titles) {
      watchScore += getTmdbWatchEngagement(title, title.media_type, context);
      if (typeof title.popularity === "number" && Number.isFinite(title.popularity)) {
        popularitySum += title.popularity;
      }
    }
    return { rail, index, watchScore, popularitySum };
  });

  indexed.sort((a, b) => {
    if (b.watchScore !== a.watchScore) {
      return b.watchScore - a.watchScore;
    }
    if (b.popularitySum !== a.popularitySum) {
      return b.popularitySum - a.popularitySum;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.rail);
}

/**
 * Sorts Anime category rails in All Rails view when 'most_watched' is active,
 * bringing the user's most frequently accessed anime categories to the top.
 */
export function sortAnimeCategoryRails<
  T extends { genre: string; items: AniListMedia[] }
>(rails: T[], sortBy: RailSortOption, context?: RailSortContext): T[] {
  if (sortBy !== "most_watched" || rails.length <= 1) {
    return [...rails];
  }

  const indexed = rails.map((rail, index) => {
    let watchScore = 0;
    let popularitySum = 0;
    for (const item of rail.items) {
      watchScore += getAnimeWatchEngagement(item, context);
      const pop =
        typeof item.popularity === "number"
          ? item.popularity
          : typeof item.trending === "number"
          ? item.trending
          : 0;
      popularitySum += pop;
    }
    return { rail, index, watchScore, popularitySum };
  });

  indexed.sort((a, b) => {
    if (b.watchScore !== a.watchScore) {
      return b.watchScore - a.watchScore;
    }
    if (b.popularitySum !== a.popularitySum) {
      return b.popularitySum - a.popularitySum;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.rail);
}

