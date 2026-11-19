import { searchMulti, type TMDBTitle } from "@/lib/tmdb";
import {
  searchAnime,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
  type AniListMediaDetail,
} from "@/lib/anilist";
import { classifyAnimeMedia, classifyTmdbTitle } from "@/lib/kids-mode";

export interface CatalogBridgeMatch {
  targetCatalog: "tmdb" | "anime";
  targetId: number;
  targetMediaType: "movie" | "tv" | "anime";
  matchedTitle: string;
  secondaryTitle?: string | null;
  releaseYear: number | null;
  formatLabel: string;
  scoreLabel: string | null;
  episodesCount?: number | null;
  posterUrl: string | null;
  confidence: number;
  href: string;
  watchHref: string;
}

const BRIDGE_CONFIDENCE_THRESHOLD = 0.72;
const bridgeSessionCache = new Map<string, CatalogBridgeMatch | null>();

/**
 * Normalizes a catalog title for deterministic cross-catalog comparison.
 * Strips season/part suffixes, punctuation, parenthetical years, and extra whitespace.
 */
export function normalizeCatalogTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\(\d{4}\)/g, " ")
    .replace(/\b(season|part|cour)\s*\d+\b/gi, " ")
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes similarity in [0, 1] between two titles using normalized exact,
 * prefix/containment, and token Jaccard overlap.
 */
export function computeTitleSimilarity(
  titleA: string | null | undefined,
  titleB: string | null | undefined
): number {
  const normA = normalizeCatalogTitle(titleA);
  const normB = normalizeCatalogTitle(titleB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const tokensA = normA.split(" ").filter(Boolean);
  const tokensB = normB.split(" ").filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const tok of setA) {
    if (setB.has(tok)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  if (normA.includes(normB) || normB.includes(normA)) {
    const lengthRatio =
      Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    return Math.max(jaccard, 0.78 + 0.2 * lengthRatio);
  }

  return jaccard;
}

/**
 * Determines whether a TMDB title is likely a Japanese Animation / Anime title
 * that should attempt cross-catalog resolution against AniList.
 */
export function isTmdbAnimeCandidate(
  details: Pick<TMDBTitle, "genres" | "genre_ids" | "title" | "name"> & {
    original_language?: string;
    origin_country?: string[];
  }
): boolean {
  const hasAnimationGenre =
    Boolean(details.genre_ids?.includes(16)) ||
    Boolean(
      details.genres?.some(
        (g) => g.id === 16 || g.name.toLowerCase() === "animation"
      )
    );
  if (!hasAnimationGenre) return false;

  const lang = details.original_language?.toLowerCase();
  const countries = (details.origin_country ?? []).map((c) => c.toUpperCase());
  if (lang === "ja" || countries.includes("JP")) {
    return true;
  }

  // If original_language is omitted on a partial TMDB payload, check if CJK characters exist
  const rawName = `${details.title || ""} ${details.name || ""}`;
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(rawName)) {
    return true;
  }

  return false;
}

export function extractTmdbReleaseYear(title: Pick<TMDBTitle, "release_date" | "first_air_date">): number | null {
  const raw = title.release_date || title.first_air_date || "";
  const year = Number(raw.slice(0, 4));
  return Number.isInteger(year) && year >= 1950 && year <= 2100 ? year : null;
}

export function extractAnimeReleaseYear(media: Pick<AniListMedia, "seasonYear" | "startDate">): number | null {
  const year = media.seasonYear ?? media.startDate?.year ?? null;
  return typeof year === "number" && Number.isInteger(year) && year >= 1950 && year <= 2100
    ? year
    : null;
}

export function scoreTmdbToAnimeCandidate(
  source: {
    title: string;
    originalTitle?: string | null;
    releaseYear?: number | null;
    mediaType: "movie" | "tv";
  },
  candidate: AniListMedia
): number {
  const sourceTitles = [source.title, source.originalTitle].filter(
    (t): t is string => Boolean(t && t.trim())
  );
  const candidateTitles = [
    candidate.title.english,
    candidate.title.romaji,
    candidate.title.native,
  ].filter((t): t is string => Boolean(t && t.trim()));

  let bestTitleScore = 0;
  for (const sTitle of sourceTitles) {
    for (const cTitle of candidateTitles) {
      const sim = computeTitleSimilarity(sTitle, cTitle);
      if (sim > bestTitleScore) bestTitleScore = sim;
    }
  }

  if (bestTitleScore < 0.5) return 0;

  let score = bestTitleScore * 0.78;

  // Format alignment (up to +0.12)
  const candFormat = (candidate.format || "").toUpperCase();
  if (source.mediaType === "movie") {
    if (candFormat === "MOVIE") score += 0.12;
    else if (candFormat === "OVA" || candFormat === "SPECIAL") score += 0.06;
    else if (candFormat === "TV") score -= 0.08;
  } else {
    if (candFormat === "TV" || candFormat === "TV_SHORT" || candFormat === "ONA") {
      score += 0.12;
    } else if (candFormat === "OVA") {
      score += 0.06;
    } else if (candFormat === "MOVIE") {
      score -= 0.08;
    }
  }

  // Release year alignment (up to +0.10)
  const candYear = extractAnimeReleaseYear(candidate);
  if (source.releaseYear && candYear) {
    const diff = Math.abs(source.releaseYear - candYear);
    if (diff === 0) score += 0.1;
    else if (diff === 1) score += 0.06;
    else if (diff <= 2) score += 0.02;
    else if (diff >= 5) score -= 0.12;
  } else {
    score += 0.04;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export function scoreAnimeToTmdbCandidate(
  source: {
    englishTitle?: string | null;
    romajiTitle?: string | null;
    nativeTitle?: string | null;
    releaseYear?: number | null;
    format?: string | null;
  },
  candidate: TMDBTitle & { original_title?: string; original_name?: string; original_language?: string }
): number {
  const sourceTitles = [
    source.englishTitle,
    source.romajiTitle,
    source.nativeTitle,
  ].filter((t): t is string => Boolean(t && t.trim()));

  const candidateTitles = [
    candidate.title,
    candidate.name,
    candidate.original_title,
    candidate.original_name,
  ].filter((t): t is string => Boolean(t && t.trim()));

  let bestTitleScore = 0;
  for (const sTitle of sourceTitles) {
    for (const cTitle of candidateTitles) {
      const sim = computeTitleSimilarity(sTitle, cTitle);
      if (sim > bestTitleScore) bestTitleScore = sim;
    }
  }

  if (bestTitleScore < 0.5) return 0;

  let score = bestTitleScore * 0.76;

  // Animation genre bonus
  const hasAnimGenre =
    Boolean(candidate.genre_ids?.includes(16)) ||
    Boolean(candidate.genres?.some((g) => g.id === 16));
  if (hasAnimGenre) {
    score += 0.08;
  } else {
    score -= 0.12;
  }

  // Format alignment
  const srcFormat = (source.format || "TV").toUpperCase();
  const candType = candidate.media_type || (candidate.title ? "movie" : "tv");
  if (srcFormat === "MOVIE") {
    if (candType === "movie") score += 0.08;
    else score -= 0.08;
  } else {
    if (candType === "tv") score += 0.08;
    else if (srcFormat === "OVA" || srcFormat === "SPECIAL") score += 0.02;
    else score -= 0.08;
  }

  // Year alignment
  const candYear = extractTmdbReleaseYear(candidate);
  if (source.releaseYear && candYear) {
    const diff = Math.abs(source.releaseYear - candYear);
    if (diff === 0) score += 0.08;
    else if (diff === 1) score += 0.05;
    else if (diff >= 5) score -= 0.12;
  } else {
    score += 0.03;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export function findBestAnimeMatchForTmdb(
  source: {
    title: string;
    originalTitle?: string | null;
    releaseYear?: number | null;
    mediaType: "movie" | "tv";
  },
  candidates: AniListMedia[],
  minConfidence = BRIDGE_CONFIDENCE_THRESHOLD
): CatalogBridgeMatch | null {
  let bestCandidate: AniListMedia | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const score = scoreTmdbToAnimeCandidate(source, cand);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  if (!bestCandidate || bestScore < minConfidence) return null;

  const displayTitle = getAnimeDisplayTitle(bestCandidate);
  const romaji = bestCandidate.title.romaji;
  const secondaryTitle =
    romaji && romaji.toLowerCase() !== displayTitle.toLowerCase() ? romaji : null;

  return {
    targetCatalog: "anime",
    targetId: bestCandidate.id,
    targetMediaType: "anime",
    matchedTitle: displayTitle,
    secondaryTitle,
    releaseYear: extractAnimeReleaseYear(bestCandidate),
    formatLabel: bestCandidate.format || "ANIME",
    scoreLabel: bestCandidate.averageScore
      ? `${(bestCandidate.averageScore / 10).toFixed(1)}`
      : null,
    episodesCount: bestCandidate.episodes ?? null,
    posterUrl: getAnimePoster(bestCandidate),
    confidence: bestScore,
    href: `/anime/${bestCandidate.id}`,
    watchHref: `/watch/anime/${bestCandidate.id}/1/1`,
  };
}

export function findBestTmdbMatchForAnime(
  source: {
    englishTitle?: string | null;
    romajiTitle?: string | null;
    nativeTitle?: string | null;
    releaseYear?: number | null;
    format?: string | null;
  },
  candidates: TMDBTitle[],
  minConfidence = BRIDGE_CONFIDENCE_THRESHOLD
): CatalogBridgeMatch | null {
  let bestCandidate: TMDBTitle | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const score = scoreAnimeToTmdbCandidate(source, cand);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  if (!bestCandidate || bestScore < minConfidence) return null;

  const mediaType: "movie" | "tv" =
    bestCandidate.media_type === "movie" || (!bestCandidate.media_type && bestCandidate.title)
      ? "movie"
      : "tv";
  const matchedTitle = bestCandidate.title || bestCandidate.name || "Untitled";

  return {
    targetCatalog: "tmdb",
    targetId: bestCandidate.id,
    targetMediaType: mediaType,
    matchedTitle,
    secondaryTitle: null,
    releaseYear: extractTmdbReleaseYear(bestCandidate),
    formatLabel: mediaType === "movie" ? "MOVIE" : "TV SERIES",
    scoreLabel:
      bestCandidate.vote_average && bestCandidate.vote_average > 0
        ? bestCandidate.vote_average.toFixed(1)
        : null,
    episodesCount: bestCandidate.number_of_episodes ?? null,
    posterUrl: bestCandidate.poster_path
      ? `https://image.tmdb.org/t/p/w342${bestCandidate.poster_path}`
      : null,
    confidence: bestScore,
    href: `/title/${mediaType}/${bestCandidate.id}`,
    watchHref:
      mediaType === "movie"
        ? `/watch/movie/${bestCandidate.id}`
        : `/watch/tv/${bestCandidate.id}/1/1`,
  };
}

/**
 * Resolves the AniList counterpart for a TMDB movie/TV title when it qualifies as an anime.
 */
export async function resolveAnimeBridgeForTmdb(
  details: TMDBTitle & {
    original_title?: string;
    original_name?: string;
    original_language?: string;
    origin_country?: string[];
  },
  mediaType: "movie" | "tv",
  isKidMode = false
): Promise<CatalogBridgeMatch | null> {
  if (!isTmdbAnimeCandidate(details)) return null;

  const cacheKey = `tmdb_to_anime_${mediaType}_${details.id}_kid_${isKidMode ? 1 : 0}`;
  if (bridgeSessionCache.has(cacheKey)) {
    return bridgeSessionCache.get(cacheKey) ?? null;
  }

  const primaryTitle = (details.title || details.name || "").trim();
  const originalTitle = (details.original_title || details.original_name || "").trim();
  if (!primaryTitle) return null;

  try {
    const res = await searchAnime(primaryTitle, 1, 10);
    let pool = res.media ?? [];
    if (pool.length === 0 && originalTitle && originalTitle !== primaryTitle) {
      const fallbackRes = await searchAnime(originalTitle, 1, 10);
      pool = fallbackRes.media ?? [];
    }

    if (isKidMode) {
      pool = pool.filter((item) => classifyAnimeMedia(item).kidsSafe);
    }

    const match = findBestAnimeMatchForTmdb(
      {
        title: primaryTitle,
        originalTitle: originalTitle || null,
        releaseYear: extractTmdbReleaseYear(details),
        mediaType,
      },
      pool
    );

    bridgeSessionCache.set(cacheKey, match);
    return match;
  } catch {
    return null;
  }
}

/**
 * Resolves the TMDB Cinema/TV counterpart for an AniList Anime entry.
 */
export async function resolveTmdbBridgeForAnime(
  details: AniListMediaDetail,
  isKidMode = false
): Promise<CatalogBridgeMatch | null> {
  const cacheKey = `anime_to_tmdb_${details.id}_kid_${isKidMode ? 1 : 0}`;
  if (bridgeSessionCache.has(cacheKey)) {
    return bridgeSessionCache.get(cacheKey) ?? null;
  }

  const englishQuery = details.title.english?.trim() || "";
  const romajiQuery = details.title.romaji?.trim() || "";
  const query = englishQuery || romajiQuery;
  if (!query) return null;

  try {
    let pool = await searchMulti(query, 1);
    if (pool.length === 0 && romajiQuery && romajiQuery !== query) {
      pool = await searchMulti(romajiQuery, 1);
    }

    if (isKidMode) {
      pool = pool.filter((item) => classifyTmdbTitle(item).kidsSafe);
    }

    const match = findBestTmdbMatchForAnime(
      {
        englishTitle: details.title.english,
        romajiTitle: details.title.romaji,
        nativeTitle: details.title.native,
        releaseYear: extractAnimeReleaseYear(details),
        format: details.format,
      },
      pool
    );

    bridgeSessionCache.set(cacheKey, match);
    return match;
  } catch {
    return null;
  }
}
