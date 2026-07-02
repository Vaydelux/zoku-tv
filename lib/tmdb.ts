const TMDB_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN ||
  process.env.TMDB_API_READ_ACCESS_TOKEN ||
  "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBTitle {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: {
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profile_path: string | null;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
}

export interface TMDBSeasonDetail {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  poster_path: string | null;
  episodes: TMDBEpisode[];
}

// In-memory + LocalStorage TTL Cache wrapper for server/client fetching
const cache: Record<string, { data: any; expiry: number }> = {};

function isGenreRequest(key: string): boolean {
  return key.includes("genre") || key.includes("with_genres");
}

function getCachedData(key: string): any | null {
  const cached = cache[key];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  // Check LocalStorage on client side for genre-specific results
  if (typeof window !== "undefined" && isGenreRequest(key)) {
    try {
      const stored = localStorage.getItem(`zoku_tmdb_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.expiry > Date.now()) {
          // Warm up in-memory cache
          cache[key] = { data: parsed.data, expiry: parsed.expiry };
          return parsed.data;
        } else {
          localStorage.removeItem(`zoku_tmdb_cache_${key}`);
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve cached genre data from localStorage:", e);
    }
  }
  return null;
}

function setCachedData(key: string, data: any, ttlMs: number = 300000) { // 5 minutes default
  // Use a shorter TTL for genre-specific localStorage caching (e.g. 2 minutes / 120000 ms)
  const actualTtl = isGenreRequest(key) ? Math.min(120000, ttlMs) : ttlMs;
  const expiry = Date.now() + actualTtl;

  cache[key] = {
    data,
    expiry,
  };

  // Persist genre-specific results to localStorage on client side
  if (typeof window !== "undefined" && isGenreRequest(key)) {
    try {
      localStorage.setItem(
        `zoku_tmdb_cache_${key}`,
        JSON.stringify({ data, expiry })
      );
    } catch (e) {
      console.warn("Failed to persist genre data to localStorage:", e);
    }
  }
}

async function tmdbFetch(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<any> {
  if (!TMDB_ACCESS_TOKEN) {
    throw new Error(
      "TMDB API token is missing. Set NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN in .env.local or Vercel environment variables."
    );
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      queryParams.append(key, String(val));
    }
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
  const cached = getCachedData(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // 5 minutes ISR
  });

  if (!res.ok) {
    throw new Error(`TMDB API call failed: ${res.statusText} for ${endpoint}`);
  }

  const data = await res.json();
  setCachedData(url, data);
  return data;
}

export async function getTrending(type: "all" | "movie" | "tv" = "all", timeWindow: "day" | "week" = "day"): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/trending/${type}/${timeWindow}`);
  return (data.results || []).map((item: any) => ({
    ...item,
    media_type: item.media_type || (type === "all" ? "movie" : type),
  }));
}

export async function getGenres(type: "movie" | "tv"): Promise<TMDBGenre[]> {
  const data = await tmdbFetch(`/genre/${type}/list`);
  return data.genres || [];
}

export async function searchMulti(query: string, page: number = 1): Promise<TMDBTitle[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch("/search/multi", { query, page });
  return (data.results || [])
    .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
    .map((item: any) => ({
      ...item,
      media_type: item.media_type,
    }));
}

export interface DiscoverParams {
  sort_by?: string;
  with_genres?: string;
  "release_date.gte"?: string;
  "release_date.lte"?: string;
  "primary_release_year"?: number;
  "first_air_date.gte"?: string;
  "first_air_date.lte"?: string;
  "with_runtime.gte"?: number;
  "with_runtime.lte"?: number;
  "vote_average.gte"?: number;
  region?: string;
  with_original_language?: string;
  page?: number;
}

export async function discoverMedia(type: "movie" | "tv", params: DiscoverParams = {}): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/discover/${type}`, {
    ...params,
    include_adult: false,
  });
  return (data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  }));
}

export async function getTitleDetails(type: "movie" | "tv", id: number): Promise<TMDBTitle> {
  const data = await tmdbFetch(`/${type}/${id}`);
  return {
    ...data,
    media_type: type,
  };
}

export async function getRecommendations(type: "movie" | "tv", id: number): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/${type}/${id}/recommendations`);
  return (data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  }));
}

export async function getSimilar(type: "movie" | "tv", id: number): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/${type}/${id}/similar`);
  return (data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  }));
}

export async function getCredits(type: "movie" | "tv", id: number): Promise<TMDBCredit[]> {
  const data = await tmdbFetch(`/${type}/${id}/credits`);
  return data.cast || [];
}

export async function getVideos(type: "movie" | "tv", id: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch(`/${type}/${id}/videos`);
  return (data.results || []).filter((video: any) => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"));
}

export async function getSeasonDetails(tvId: number, seasonNumber: number): Promise<TMDBSeasonDetail> {
  return await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}
