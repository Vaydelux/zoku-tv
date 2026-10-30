import type { TMDBTitle } from "@/lib/tmdb";
import type { AniListMedia } from "@/lib/anilist";

export type ContentMaturityBadge = {
  code: "TV-Y7" | "PG" | "PG-13" | "TV-14" | "R" | "TV-MA";
  label: string;
  kidsSafe: boolean;
  reason: string;
};

/**
 * TMDB Genre IDs that are restricted in Kids Mode:
 * - 27: Horror
 * - 53: Thriller
 * - 80: Crime
 * - 10752: War
 * - 10768: War & Politics
 */
export const RESTRICTED_TMDB_GENRE_IDS = new Set<number>([
  27, 53, 80, 10752, 10768,
]);

/**
 * TMDB Genre IDs recognized as family/youth-appropriate when not paired with restricted genres:
 * - 12: Adventure
 * - 14: Fantasy
 * - 16: Animation
 * - 35: Comedy
 * - 878: Science Fiction
 * - 99: Documentary
 * - 10402: Music
 * - 10751: Family
 * - 10759: Action & Adventure
 * - 10762: Kids
 * - 10765: Sci-Fi & Fantasy
 * - 28: Action (when not Crime/Thriller/Horror/War)
 */
export const SAFE_TMDB_GENRE_IDS = new Set<number>([
  12, 14, 16, 28, 35, 99, 878, 10402, 10751, 10759, 10762, 10765,
]);

/**
 * Known R / TV-MA catalog IDs that do not carry Crime/Thriller/Horror genre IDs
 * in basic TMDB genre lists (e.g., pure Drama/History adult titles).
 */
const KNOWN_MATURE_TMDB_IDS = new Set<string>([
  "movie_872585", // Oppenheimer (R)
  "movie_335984", // Blade Runner 2049 (R)
  "movie_545611", // Everything Everywhere All at Once (R)
  "movie_603", // The Matrix (R)
  "movie_414906", // The Batman (PG-13 dark crime thriller)
  "movie_155", // The Dark Knight (Crime/Thriller)
  "movie_496243", // Parasite (R)
  "movie_550", // Fight Club (R)
  "tv_95396", // Severance (TV-MA)
  "tv_126308", // Shogun (TV-MA)
  "tv_136315", // The Bear (TV-MA)
  "tv_1396", // Breaking Bad (TV-MA)
  "tv_94997", // House of the Dragon (TV-MA)
  "tv_76331", // Succession (TV-MA)
  "tv_105248", // Cyberpunk: Edgerunners (TV-MA)
  "tv_87108", // Chernobyl (TV-MA)
]);

/**
 * Known family/teen-safe TMDB IDs (PG / PG-13 / TV-14)
 */
const KNOWN_KIDS_SAFE_TMDB_IDS = new Set<string>([
  "movie_569094", // Spider-Man: Across the Spider-Verse (PG)
  "movie_157336", // Interstellar (PG-13)
  "movie_693134", // Dune: Part Two (PG-13)
  "movie_27205", // Inception (PG-13)
  "tv_94605", // Arcane (TV-14)
  "tv_66732", // Stranger Things (TV-14)
]);

/**
 * Restricted AniList genres in Kids Mode
 */
export const RESTRICTED_ANILIST_GENRES = new Set<string>([
  "ecchi",
  "hentai",
  "horror",
  "psychological",
  "thriller",
]);

const MATURE_TEXT_KEYWORDS = [
  "serial killer",
  "nudity",
  "erotic",
  "sexually explicit",
  "graphic violence",
  "drug cartel",
  "methamphetamine",
  "prostitution",
  "sadistic",
  "gore",
];

function hasMatureKeyword(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return MATURE_TEXT_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractTmdbGenreIds(
  title: Partial<TMDBTitle> & { genre_ids?: number[]; genres?: { id: number; name: string }[] }
): number[] {
  const ids = new Set<number>();
  if (Array.isArray(title.genre_ids)) {
    for (const id of title.genre_ids) {
      if (typeof id === "number") ids.add(id);
    }
  }
  if (Array.isArray(title.genres)) {
    for (const g of title.genres) {
      if (g && typeof g.id === "number") ids.add(g.id);
    }
  }
  return Array.from(ids);
}

/**
 * Classifies a TMDB title and determines whether it is safe for Kids Mode.
 * Conservative policy: if a title has explicit adult flags, restricted genres,
 * mature keywords, or completely missing genre/classification metadata (unless known safe),
 * it is blocked in Kids Mode.
 */
export function classifyTmdbTitle(
  title: Partial<TMDBTitle> & { adult?: boolean; certification?: string }
): ContentMaturityBadge {
  const mediaType = title.media_type === "tv" || (!title.title && !!title.name) ? "tv" : "movie";
  const canonicalKey = typeof title.id === "number" ? `${mediaType}_${title.id}` : "";

  if (title.adult === true) {
    return {
      code: "R",
      label: "18+ Adult",
      kidsSafe: false,
      reason: "Explicit adult content flag",
    };
  }

  if (title.certification) {
    const cert = title.certification.toUpperCase().trim();
    if (["R", "NC-17", "TV-MA", "18+", "X"].includes(cert)) {
      return {
        code: mediaType === "tv" ? "TV-MA" : "R",
        label: cert,
        kidsSafe: false,
        reason: `Mature certification (${cert})`,
      };
    }
    if (["G", "PG", "TV-Y", "TV-Y7", "TV-G", "TV-PG"].includes(cert)) {
      return {
        code: "PG",
        label: cert,
        kidsSafe: true,
        reason: `Family-friendly certification (${cert})`,
      };
    }
  }

  if (canonicalKey && KNOWN_MATURE_TMDB_IDS.has(canonicalKey)) {
    return {
      code: mediaType === "tv" ? "TV-MA" : "R",
      label: mediaType === "tv" ? "TV-MA · Mature" : "R · Mature",
      kidsSafe: false,
      reason: "Classified as mature drama/thriller",
    };
  }

  const genreIds = extractTmdbGenreIds(title);
  const hasRestrictedGenre = genreIds.some((id) => RESTRICTED_TMDB_GENRE_IDS.has(id));
  if (hasRestrictedGenre) {
    return {
      code: mediaType === "tv" ? "TV-MA" : "R",
      label: mediaType === "tv" ? "TV-MA · Restricted Genre" : "R · Restricted Genre",
      kidsSafe: false,
      reason: "Contains restricted mature genres (Horror, Thriller, Crime, or War)",
    };
  }

  if (hasMatureKeyword(title.title || title.name) || hasMatureKeyword(title.overview)) {
    return {
      code: mediaType === "tv" ? "TV-MA" : "R",
      label: mediaType === "tv" ? "TV-MA · Mature Themes" : "R · Mature Themes",
      kidsSafe: false,
      reason: "Synopsis contains mature content descriptors",
    };
  }

  if (canonicalKey && KNOWN_KIDS_SAFE_TMDB_IDS.has(canonicalKey)) {
    const isAnimation = genreIds.includes(16) || genreIds.includes(10751);
    return {
      code: isAnimation ? "PG" : "PG-13",
      label: isAnimation ? "PG · Family & Animation" : "PG-13 · Youth & Family Safe",
      kidsSafe: true,
      reason: "Verified family/teen appropriate catalog entry",
    };
  }

  // Conservative handling when genre metadata is completely missing
  if (genreIds.length === 0) {
    return {
      code: mediaType === "tv" ? "TV-14" : "PG-13",
      label: "Unrated · Metadata Pending",
      kidsSafe: false,
      reason: "Missing genre/certification metadata — blocked conservatively in Kids Mode",
    };
  }

  const hasFamilyOrAnimation =
    genreIds.includes(16) || genreIds.includes(10751) || genreIds.includes(10762);
  if (hasFamilyOrAnimation) {
    return {
      code: "PG",
      label: "PG · Family Friendly",
      kidsSafe: true,
      reason: "Animation / Family / Kids genre classification",
    };
  }

  const hasSafeGenre = genreIds.some((id) => SAFE_TMDB_GENRE_IDS.has(id));
  if (hasSafeGenre) {
    return {
      code: mediaType === "tv" ? "TV-14" : "PG-13",
      label: mediaType === "tv" ? "TV-14 · General Audience" : "PG-13 · General Audience",
      kidsSafe: true,
      reason: "General adventure, sci-fi, comedy, or fantasy without restricted genres",
    };
  }

  // Pure Drama/History/Romance without safe adventure/family genres: treat conservatively in Kids Mode
  return {
    code: mediaType === "tv" ? "TV-MA" : "R",
    label: mediaType === "tv" ? "TV-MA · Adult Drama" : "R · Adult Drama",
    kidsSafe: false,
    reason: "Adult drama classification without youth/family genre indicators",
  };
}

/**
 * Classifies an AniList anime entry and determines whether it is safe for Kids Mode.
 */
export function classifyAnimeMedia(
  media: Partial<AniListMedia> & { isAdult?: boolean | null }
): ContentMaturityBadge {
  if (media.isAdult === true) {
    return {
      code: "TV-MA",
      label: "18+ Adult Anime",
      kidsSafe: false,
      reason: "Explicit adult anime flag",
    };
  }

  const genres = (media.genres || []).filter((g): g is string => typeof g === "string");
  if (genres.length === 0) {
    return {
      code: "TV-14",
      label: "Unrated Anime",
      kidsSafe: false,
      reason: "Missing anime genre metadata — blocked conservatively in Kids Mode",
    };
  }

  const lowerGenres = genres.map((g) => g.toLowerCase().trim());
  const restrictedHit = lowerGenres.find((g) => RESTRICTED_ANILIST_GENRES.has(g));
  if (restrictedHit) {
    return {
      code: "TV-MA",
      label: "TV-MA · Mature Anime",
      kidsSafe: false,
      reason: `Contains restricted anime genre (${restrictedHit})`,
    };
  }

  const titleText =
    media.title?.english || media.title?.romaji || media.title?.native || "";
  if (hasMatureKeyword(titleText) || hasMatureKeyword(media.description)) {
    return {
      code: "TV-MA",
      label: "TV-MA · Mature Themes",
      kidsSafe: false,
      reason: "Description contains mature content descriptors",
    };
  }

  const isKidsOrSliceOfLife =
    lowerGenres.includes("slice of life") ||
    lowerGenres.includes("sports") ||
    lowerGenres.includes("music") ||
    lowerGenres.includes("mahou shoujo") ||
    lowerGenres.includes("comedy");

  return {
    code: isKidsOrSliceOfLife ? "PG" : "TV-14",
    label: isKidsOrSliceOfLife ? "PG · Youth Anime" : "TV-14 · Teen Anime",
    kidsSafe: true,
    reason: "Standard anime genres without mature/restricted tags",
  };
}

export function isTmdbAllowedInKidsMode(
  title: Partial<TMDBTitle> & { adult?: boolean; certification?: string }
): boolean {
  return classifyTmdbTitle(title).kidsSafe;
}

export function isAnimeAllowedInKidsMode(
  media: Partial<AniListMedia> & { isAdult?: boolean | null }
): boolean {
  return classifyAnimeMedia(media).kidsSafe;
}

export function filterTmdbForKidsMode<T extends Partial<TMDBTitle>>(
  items: T[],
  kidMode?: boolean | null
): T[] {
  if (!kidMode) return items;
  return items.filter((item) => isTmdbAllowedInKidsMode(item));
}

export function filterAnimeForKidsMode<T extends Partial<AniListMedia>>(
  items: T[],
  kidMode?: boolean | null
): T[] {
  if (!kidMode) return items;
  return items.filter((item) => isAnimeAllowedInKidsMode(item));
}

export function isGenreIdAllowedInKidsMode(genreId: number): boolean {
  return !RESTRICTED_TMDB_GENRE_IDS.has(genreId);
}

export function isAnimeGenreAllowedInKidsMode(genre: string): boolean {
  return !RESTRICTED_ANILIST_GENRES.has(genre.toLowerCase().trim());
}

