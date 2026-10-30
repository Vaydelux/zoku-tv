import { searchMulti, TMDBTitle } from "./tmdb";
import { searchAnime, type AniListMedia, getAnimeDisplayTitle, getAnimePoster } from "./anilist";
import { filterTmdbForKidsMode, filterAnimeForKidsMode } from "./kids-mode";

export interface AutocompleteSuggestion {
  id: string;
  numericId: number;
  title: string;
  mediaType: "movie" | "tv" | "anime";
  year?: string;
  rating?: number;
  posterUrl?: string | null;
  href: string;
}

export function interleaveAutocompleteSuggestions(
  tmdbItems: TMDBTitle[],
  animeItems: AniListMedia[],
  maxTotal = 8,
  kidMode = false
): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];
  const maxEach = Math.ceil(maxTotal / 2);

  const safeTmdb = filterTmdbForKidsMode(tmdbItems || [], kidMode);
  const safeAnime = filterAnimeForKidsMode(animeItems || [], kidMode);

  const normalizedTmdb: AutocompleteSuggestion[] = safeTmdb
    .filter((item) => (item.title || item.name) && (item.media_type === "movie" || item.media_type === "tv"))
    .slice(0, maxEach)
    .map((item) => {
      const type = (item.media_type as "movie" | "tv") || "movie";
      const title = item.title || item.name || "Untitled";
      const year = (item.release_date || item.first_air_date || "").split("-")[0];
      const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
        : null;
      return {
        id: `tmdb_${type}_${item.id}`,
        numericId: item.id,
        title,
        mediaType: type,
        year: year || undefined,
        rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
        posterUrl,
        href: `/title/${type}/${item.id}`,
      };
    });

  const normalizedAnime: AutocompleteSuggestion[] = safeAnime
    .slice(0, maxEach)
    .map((item) => {
      const title = getAnimeDisplayTitle(item);
      const posterUrl = getAnimePoster(item);
      const rating = item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : undefined;
      return {
        id: `anime_${item.id}`,
        numericId: item.id,
        title,
        mediaType: "anime",
        year: item.seasonYear ? String(item.seasonYear) : undefined,
        rating,
        posterUrl,
        href: `/anime/${item.id}`,
      };
    });

  const maxI = Math.max(normalizedTmdb.length, normalizedAnime.length);
  for (let i = 0; i < maxI && suggestions.length < maxTotal; i++) {
    if (i < normalizedTmdb.length && suggestions.length < maxTotal) {
      suggestions.push(normalizedTmdb[i]);
    }
    if (i < normalizedAnime.length && suggestions.length < maxTotal) {
      suggestions.push(normalizedAnime[i]);
    }
  }

  return suggestions;
}

// In-memory LRU-like cache for instant typing suggestions
const autocompleteCache = new Map<string, AutocompleteSuggestion[]>();
const MAX_CACHE_SIZE = 100;

export async function fetchRealtimeAutocomplete(
  query: string,
  maxTotal = 8,
  kidMode = false
): Promise<AutocompleteSuggestion[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const cacheKey = `${kidMode ? "kid" : "std"}_${maxTotal}_${normalizedQuery}`;
  if (autocompleteCache.has(cacheKey)) {
    return autocompleteCache.get(cacheKey)!;
  }

  try {
    const [tmdbResult, animeResult] = await Promise.allSettled([
      searchMulti(normalizedQuery, 1),
      searchAnime(normalizedQuery, 1, 6),
    ]);

    const tmdbItems: TMDBTitle[] = tmdbResult.status === "fulfilled" ? tmdbResult.value : [];
    const animeItems: AniListMedia[] =
      animeResult.status === "fulfilled" ? animeResult.value.media || [] : [];

    const suggestions = interleaveAutocompleteSuggestions(
      tmdbItems,
      animeItems,
      maxTotal,
      kidMode
    );

    if (autocompleteCache.size >= MAX_CACHE_SIZE) {
      const firstKey = autocompleteCache.keys().next().value;
      if (firstKey) autocompleteCache.delete(firstKey);
    }
    autocompleteCache.set(cacheKey, suggestions);

    return suggestions;
  } catch (err) {
    console.warn("Autocomplete fetch failed:", err);
    return [];
  }
}
