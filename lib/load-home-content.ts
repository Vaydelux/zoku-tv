import { discoverMedia, getGenres, getTrending, TMDBGenre, TMDBTitle } from "@/lib/tmdb";

export type GenreRail = { genre: TMDBGenre; titles: TMDBTitle[] };

const HERO_SLIDE_COUNT = 6;
const TRENDING_CACHE_KEY = "zoku_home_tmdb_trending_v1";
const GENRE_CATALOG_CACHE_KEY = "zoku_home_tmdb_genre_catalog_v2";
const GENRE_ITEM_CACHE_PREFIX = "zoku_home_tmdb_genre_rail_v2_";
const CACHE_TTL_MS = 10 * 60 * 1000;
const CONCURRENCY_BATCH_SIZE = 6;

function readSessionCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

export async function loadHomeTrending(): Promise<{
  heroSlides: TMDBTitle[];
  trendingMovies: TMDBTitle[];
  trendingTV: TMDBTitle[];
}> {
  const cached = readSessionCache<{
    heroSlides: TMDBTitle[];
    trendingMovies: TMDBTitle[];
    trendingTV: TMDBTitle[];
  }>(TRENDING_CACHE_KEY);
  if (cached) return cached;

  const [trendingAll, movies, tv] = await Promise.all([
    getTrending("all", "week"),
    getTrending("movie", "day"),
    getTrending("tv", "day"),
  ]);

  const movieCandidates = movies.filter((title) => title.backdrop_path && title.overview);
  let heroSlides = movieCandidates.slice(0, HERO_SLIDE_COUNT);

  if (heroSlides.length === 0) {
    const fallback = trendingAll.filter((title) => title.backdrop_path && title.overview);
    heroSlides = fallback.slice(0, HERO_SLIDE_COUNT);
  }

  const result = {
    heroSlides,
    trendingMovies: movies,
    trendingTV: tv,
  };
  writeSessionCache(TRENDING_CACHE_KEY, result);
  return result;
}

async function loadAllTmdbGenres(): Promise<TMDBGenre[]> {
  const cached = readSessionCache<TMDBGenre[]>(GENRE_CATALOG_CACHE_KEY);
  if (cached && cached.length > 0) return cached;

  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  const allGenres = [...movieGenres, ...tvGenres].reduce((acc, genre) => {
    if (!acc.some((item) => item.id === genre.id)) acc.push(genre);
    return acc;
  }, [] as TMDBGenre[]);

  if (allGenres.length > 0) {
    writeSessionCache(GENRE_CATALOG_CACHE_KEY, allGenres);
  }
  return allGenres;
}

export async function loadHomeGenreRails(prefGenreIds: number[]): Promise<GenreRail[]> {
  if (prefGenreIds.length === 0) return [];

  const allGenres = await loadAllTmdbGenres();
  const resultsById = new Map<number, GenreRail>();
  const uncachedGenreIds: number[] = [];

  for (const genreId of prefGenreIds) {
    const cachedRail = readSessionCache<GenreRail>(`${GENRE_ITEM_CACHE_PREFIX}${genreId}`);
    if (cachedRail && cachedRail.titles?.length > 0) {
      resultsById.set(genreId, cachedRail);
    } else {
      uncachedGenreIds.push(genreId);
    }
  }

  // Fetch uncached genres in controlled batches of 6 to prevent API rate-limiting or UI lag
  // even when all 19+ genres are selected.
  for (let i = 0; i < uncachedGenreIds.length; i += CONCURRENCY_BATCH_SIZE) {
    const batch = uncachedGenreIds.slice(i, i + CONCURRENCY_BATCH_SIZE);
    await Promise.all(
      batch.map(async (genreId) => {
        const matchedGenre = allGenres.find((genre) => genre.id === genreId);
        if (!matchedGenre) return;

        const mediaType: "movie" | "tv" = genreId % 2 === 0 ? "movie" : "tv";
        const titles = await discoverMedia(mediaType, {
          with_genres: String(genreId),
          sort_by: "popularity.desc",
          page: 1,
        });

        if (titles.length > 0) {
          const rail: GenreRail = { genre: matchedGenre, titles };
          resultsById.set(genreId, rail);
          writeSessionCache(`${GENRE_ITEM_CACHE_PREFIX}${genreId}`, rail);
        }
      })
    );
  }

  return prefGenreIds
    .map((id) => resultsById.get(id))
    .filter((rail): rail is GenreRail => Boolean(rail));
}
