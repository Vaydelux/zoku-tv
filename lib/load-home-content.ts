import { discoverMedia, getGenres, getTrending, TMDBGenre, TMDBTitle } from "@/lib/tmdb";
import { filterRestrictedTmdbTitles, syncAdultFilterState } from "@/lib/adult-content";

export type GenreRail = { genre: TMDBGenre; titles: TMDBTitle[] };

const HERO_SLIDE_COUNT = 6;
const TRENDING_CACHE_KEY = "zoku_home_tmdb_trending_v2";
const GENRE_CATALOG_CACHE_KEY = "zoku_home_tmdb_genre_catalog_v2";
const GENRE_ITEM_CACHE_PREFIX = "zoku_home_tmdb_genre_rail_v2_";
const CACHE_TTL_MS = 10 * 60 * 1000;
const CONCURRENCY_BATCH_SIZE = 6;

/**
 * Preserve a featured hero when TMDB returns legitimate titles but no
 * backdrops. HeroCarousel already supplies artwork fallback presentation.
 * Prefer real image-bearing movies, then image-bearing all-media results,
 * then safe synopsis-bearing titles, and finally any safe catalog result.
 * Input lists are already server-policy filtered; never synthesize IDs.
 */
export function pickFeaturedHeroSlides(
  movies: readonly TMDBTitle[],
  trendingAll: readonly TMDBTitle[],
  count = HERO_SLIDE_COUNT,
): TMDBTitle[] {
  if (count <= 0) return [];
  const catalogs = [movies, trendingAll];
  for (const preferred of [
    (title: TMDBTitle) => Boolean(title.backdrop_path && title.overview),
    (title: TMDBTitle) => Boolean(title.overview),
    (_title: TMDBTitle) => true,
  ]) {
    const chosen: TMDBTitle[] = [];
    const seen = new Set<string>();
    for (const catalog of catalogs) {
      for (const title of catalog) {
        const kind = title.media_type === "tv" ? "tv" : "movie";
        const key = `${kind}_${title.id}`;
        if (!Number.isSafeInteger(title.id) || title.id <= 0 || seen.has(key) || !preferred(title)) continue;
        seen.add(key);
        chosen.push(title);
        if (chosen.length >= count) return chosen;
      }
    }
    if (chosen.length > 0) return chosen;
  }
  return [];
}

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
  await syncAdultFilterState();
  const cached = readSessionCache<{
    heroSlides: TMDBTitle[];
    trendingMovies: TMDBTitle[];
    trendingTV: TMDBTitle[];
  }>(TRENDING_CACHE_KEY);
  if (cached) return {
    heroSlides: filterRestrictedTmdbTitles(cached.heroSlides),
    trendingMovies: filterRestrictedTmdbTitles(cached.trendingMovies),
    trendingTV: filterRestrictedTmdbTitles(cached.trendingTV),
  };

  const feeds = await Promise.allSettled([
    getTrending("all", "week"),
    getTrending("movie", "day"),
    getTrending("tv", "day"),
  ]);
  const result = combineHomeTrendingFeeds(feeds);
  // Never keep a transient partial/empty feed for ten minutes.
  if (feeds.every((feed) => feed.status === "fulfilled") &&
      result.trendingMovies.length + result.trendingTV.length > 0) {
    writeSessionCache(TRENDING_CACHE_KEY, result);
  }
  return result;
}

/** A failed independent endpoint must not discard the other policy-filtered feeds. */
export function combineHomeTrendingFeeds(feeds: readonly PromiseSettledResult<TMDBTitle[]>[]) {
  if (feeds.every((feed) => feed.status === "rejected")) throw new Error("Trending catalog temporarily unavailable");
  const [all, movie, tv] = feeds;
  const trendingAll = all?.status === "fulfilled" ? all.value : [];
  const trendingMovies = movie?.status === "fulfilled" ? movie.value : trendingAll.filter((item) => item.media_type === "movie");
  const trendingTV = tv?.status === "fulfilled" ? tv.value : trendingAll.filter((item) => item.media_type === "tv");
  return { heroSlides: pickFeaturedHeroSlides(trendingMovies, [...trendingAll, ...trendingTV]), trendingMovies, trendingTV };
}

interface CachedGenreCatalog {
  all: TMDBGenre[];
  movieIds: number[];
  tvIds: number[];
}

async function loadAllTmdbGenres(): Promise<CachedGenreCatalog> {
  const cached = readSessionCache<CachedGenreCatalog | TMDBGenre[]>(GENRE_CATALOG_CACHE_KEY);
  if (cached && !Array.isArray(cached) && cached.all?.length > 0) {
    return cached;
  }

  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  const all = [...movieGenres, ...tvGenres].reduce((acc, genre) => {
    if (!acc.some((item) => item.id === genre.id)) acc.push(genre);
    return acc;
  }, [] as TMDBGenre[]);

  const catalog: CachedGenreCatalog = {
    all,
    movieIds: movieGenres.map((g) => g.id),
    tvIds: tvGenres.map((g) => g.id),
  };

  if (all.length > 0) {
    writeSessionCache(GENRE_CATALOG_CACHE_KEY, catalog);
  }
  return catalog;
}

export async function loadHomeGenreRails(prefGenreIds: number[]): Promise<GenreRail[]> {
  if (prefGenreIds.length === 0) return [];
  await syncAdultFilterState();

  const { all: allGenres, movieIds, tvIds } = await loadAllTmdbGenres();
  const movieGenreSet = new Set(movieIds);
  const tvGenreSet = new Set(tvIds);
  const resultsById = new Map<number, GenreRail>();
  const uncachedGenreIds: number[] = [];

  for (const genreId of prefGenreIds) {
    const cachedRail = readSessionCache<GenreRail>(`${GENRE_ITEM_CACHE_PREFIX}${genreId}`);
    if (cachedRail && cachedRail.titles?.length > 0) {
      resultsById.set(genreId, { ...cachedRail, titles: filterRestrictedTmdbTitles(cachedRail.titles) });
    } else {
      uncachedGenreIds.push(genreId);
    }
  }

  // Fetch uncached genres in controlled batches of 6 to prevent API rate-limiting or UI lag
  for (let i = 0; i < uncachedGenreIds.length; i += CONCURRENCY_BATCH_SIZE) {
    const batch = uncachedGenreIds.slice(i, i + CONCURRENCY_BATCH_SIZE);
    await Promise.all(
      batch.map(async (genreId) => {
        const matchedGenre = allGenres.find((genre) => genre.id === genreId);
        if (!matchedGenre) return;

        // Accurately route TMDB genre IDs to Movie or TV instead of using parity
        const mediaType: "movie" | "tv" =
          tvGenreSet.has(genreId) && !movieGenreSet.has(genreId) ? "tv" : "movie";
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
