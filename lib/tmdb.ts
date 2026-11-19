import { filterRestrictedTmdbTitles, isAdultFilterEnabled, isRestrictedTmdbTitle, syncAdultFilterState, requireMovieCatalogAvailable, BLOCKED_COMPANY_IDS, BLOCKED_KEYWORD_IDS } from "@/lib/adult-content";
export interface TMDBTitle {
  id: number;
  adult?: boolean;
  certification?: string;
  production_companies?: { id: number; name?: string }[];
  keywords?: { keywords?: { id: number }[]; results?: { id: number }[] };
  release_dates?: { results?: { iso_3166_1: string; release_dates: { certification?: string }[] }[] };
  content_ratings?: { results?: { iso_3166_1: string; rating?: string }[] };
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  seasons?: {
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }[];
}

export interface TMDBCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBTitle[];
}

export interface TMDBPersonCredit extends TMDBTitle {
  character?: string;
  job?: string;
  department?: string;
  vote_count?: number;
}

export interface TMDBPersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  popularity: number;
  also_known_as?: string[];
  combined_credits?: {
    cast: TMDBPersonCredit[];
    crew: TMDBPersonCredit[];
  };
}

export interface TMDBFullTitleBundle {
  details: TMDBTitle;
  cast: TMDBCredit[];
  videos: TMDBVideo[];
  similar: TMDBTitle[];
  recommendations: TMDBTitle[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBLanguage {
  iso_639_1: string;
  english_name: string;
  name: string;
}

export const TMDB_POPULAR_LANGUAGES: TMDBLanguage[] = [
  { iso_639_1: "en", english_name: "English", name: "English" },
  { iso_639_1: "ja", english_name: "Japanese", name: "日本語" },
  { iso_639_1: "ko", english_name: "Korean", name: "한국어" },
  { iso_639_1: "fr", english_name: "French", name: "Français" },
  { iso_639_1: "es", english_name: "Spanish", name: "Español" },
  { iso_639_1: "de", english_name: "German", name: "Deutsch" },
  { iso_639_1: "it", english_name: "Italian", name: "Italiano" },
  { iso_639_1: "zh", english_name: "Chinese", name: "中文" },
  { iso_639_1: "hi", english_name: "Hindi", name: "हिन्दी" },
  { iso_639_1: "pt", english_name: "Portuguese", name: "Português" },
  { iso_639_1: "ru", english_name: "Russian", name: "Русский" },
  { iso_639_1: "ar", english_name: "Arabic", name: "العربية" },
  { iso_639_1: "th", english_name: "Thai", name: "ไทย" },
  { iso_639_1: "tr", english_name: "Turkish", name: "Türkçe" },
  { iso_639_1: "tl", english_name: "Tagalog", name: "Tagalog" },
  { iso_639_1: "id", english_name: "Indonesian", name: "Bahasa Indonesia" },
  { iso_639_1: "nl", english_name: "Dutch", name: "Nederlands" },
  { iso_639_1: "pl", english_name: "Polish", name: "Polski" },
  { iso_639_1: "sv", english_name: "Swedish", name: "Svenska" },
  { iso_639_1: "da", english_name: "Danish", name: "Dansk" },
  { iso_639_1: "no", english_name: "Norwegian", name: "Norsk" },
  { iso_639_1: "fi", english_name: "Finnish", name: "Suomi" },
  { iso_639_1: "vi", english_name: "Vietnamese", name: "Tiếng Việt" },
  { iso_639_1: "el", english_name: "Greek", name: "Ελληνικά" },
];

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

/**
 * Every browser TMDB request goes through the server policy boundary.
 * Do not cache unlocked content in localStorage or expose the TMDB token to clients.
 */
async function tmdbFetch(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  await syncAdultFilterState();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const response = await fetch(`/api/tmdb${endpoint}?${query.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`TMDB catalog is unavailable (${response.status})`);
  return response.json();
}

export async function getTrending(
  type: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "day"
): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/trending/${type}/${timeWindow}`);
  return filterRestrictedTmdbTitles((data.results || []).map((item: any) => ({
    ...item,
    media_type: item.media_type || (type === "all" ? "movie" : type),
  })));
}

export async function getGenres(type: "movie" | "tv"): Promise<TMDBGenre[]> {
  const data = await tmdbFetch(`/genre/${type}/list`);
  return data.genres || [];
}

export interface TMDBSearchPage {
  results: TMDBTitle[];
  /** Derived from upstream page metadata, not the policy-filtered item count. */
  hasNextPage: boolean;
}

export async function searchMultiPage(query: string, page: number = 1): Promise<TMDBSearchPage> {
  if (!query.trim()) return { results: [], hasNextPage: false };
  await syncAdultFilterState();
  const data = await tmdbFetch("/search/multi", { query, page, include_adult: !isAdultFilterEnabled() });
  if (!Array.isArray(data.results)) throw new Error("Invalid TMDB search results");
  const results = filterRestrictedTmdbTitles<TMDBTitle>((data.results as TMDBTitle[])
    .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
    .map((item: any) => ({
      ...item,
      media_type: item.media_type,
    })));
  const upstreamPage = Number(data.page);
  const totalPages = Number(data.total_pages);
  return {
    results,
    hasNextPage: Number.isSafeInteger(upstreamPage) &&
      Number.isSafeInteger(totalPages) && upstreamPage >= 1 &&
      totalPages > upstreamPage,
  };
}

/** Compatibility API used by autocomplete and other UI surfaces. */
export async function searchMulti(query: string, page: number = 1): Promise<TMDBTitle[]> {
  return (await searchMultiPage(query, page)).results;
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

export async function discoverMedia(
  type: "movie" | "tv",
  params: DiscoverParams = {}
): Promise<TMDBTitle[]> {
  await syncAdultFilterState();
  const filtered = isAdultFilterEnabled();
  const data = await tmdbFetch(`/discover/${type}`, {
    ...params,
    include_adult: !filtered,
    ...(filtered ? { without_companies: BLOCKED_COMPANY_IDS.join(","), without_keywords: BLOCKED_KEYWORD_IDS.join("|") } : {}),
  });
  return filterRestrictedTmdbTitles((data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  })));
}

export async function getTitleDetails(type: "movie" | "tv", id: number): Promise<TMDBTitle> {
  const data = await tmdbFetch(`/${type}/${id}`, { append_to_response: "release_dates,content_ratings,keywords" });
  if (type === "movie") {
    requireMovieCatalogAvailable();
    // A failed TMDB request can return a generic fallback title for any ID.
    // Never render a direct movie player without real company metadata.
    if (isAdultFilterEnabled() && (!Array.isArray(data.production_companies) || data.id !== id)) {
      throw new Error("This title is unavailable while the adult-content filter is enabled.");
    }
  }
  const title = { ...data, media_type: type };
  if (isAdultFilterEnabled() && isRestrictedTmdbTitle(title)) {
    throw new Error("This title is unavailable while the adult-content filter is enabled.");
  }
  return title;
}

export async function getRecommendations(
  type: "movie" | "tv",
  id: number
): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/${type}/${id}/recommendations`);
  return filterRestrictedTmdbTitles((data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  })));
}

export async function getSimilar(type: "movie" | "tv", id: number): Promise<TMDBTitle[]> {
  const data = await tmdbFetch(`/${type}/${id}/similar`);
  return filterRestrictedTmdbTitles((data.results || []).map((item: any) => ({
    ...item,
    media_type: type,
  })));
}

export async function getCredits(type: "movie" | "tv", id: number): Promise<TMDBCredit[]> {
  const data = await tmdbFetch(`/${type}/${id}/credits`);
  return data.cast || [];
}

export async function getVideos(type: "movie" | "tv", id: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch(`/${type}/${id}/videos`);
  return (data.results || []).filter(
    (video: any) =>
      video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser")
  );
}

export async function getSeasonDetails(
  tvId: number,
  seasonNumber: number
): Promise<TMDBSeasonDetail> {
  return await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

const PREFERRED_VIDEO_TYPES = new Set(["Trailer", "Teaser", "Clip", "Featurette"]);

/**
 * Fetches title details together with credits, trailers, similar, and recommendations
 * in a single server-verified request instead of a 4-request waterfall.
 */
export async function getFullTitleDetails(
  type: "movie" | "tv",
  id: number
): Promise<TMDBFullTitleBundle> {
  const data = await tmdbFetch(`/${type}/${id}`, {
    append_to_response: "release_dates,content_ratings,keywords,credits,videos,similar,recommendations",
  });
  if (type === "movie") {
    requireMovieCatalogAvailable();
    if (isAdultFilterEnabled() && (!Array.isArray(data.production_companies) || data.id !== id)) {
      throw new Error("This title is unavailable while the adult-content filter is enabled.");
    }
  }
  const details: TMDBTitle = { ...data, media_type: type };
  if (isAdultFilterEnabled() && isRestrictedTmdbTitle(details)) {
    throw new Error("This title is unavailable while the adult-content filter is enabled.");
  }

  const cast: TMDBCredit[] = Array.isArray(data.credits?.cast) ? data.credits.cast : [];
  const rawVideos: TMDBVideo[] = Array.isArray(data.videos?.results) ? data.videos.results : [];
  const videos = rawVideos
    .filter((video) => video.site === "YouTube" && PREFERRED_VIDEO_TYPES.has(video.type))
    .sort((a, b) => {
      const rank = (t: string) => (t === "Trailer" ? 0 : t === "Teaser" ? 1 : t === "Clip" ? 2 : 3);
      return rank(a.type) - rank(b.type);
    });

  const similar = filterRestrictedTmdbTitles<TMDBTitle>(
    (data.similar?.results || []).map((item: any) => ({ ...item, media_type: type }))
  );
  const recommendations = filterRestrictedTmdbTitles<TMDBTitle>(
    (data.recommendations?.results || []).map((item: any) => ({ ...item, media_type: type }))
  );

  return { details, cast, videos, similar, recommendations };
}

export async function getCollectionDetails(collectionId: number): Promise<TMDBCollection> {
  const data = await tmdbFetch(`/collection/${collectionId}`);
  const parts = filterRestrictedTmdbTitles<TMDBTitle>(
    (data.parts || []).map((item: any) => ({ ...item, media_type: "movie" as const }))
  ).sort((a, b) => (a.release_date || "9999-12-31").localeCompare(b.release_date || "9999-12-31"));
  return {
    id: data.id,
    name: data.name || "Collection",
    overview: data.overview || "",
    poster_path: data.poster_path || null,
    backdrop_path: data.backdrop_path || null,
    parts,
  };
}

export async function getPersonDetails(personId: number): Promise<TMDBPersonDetail> {
  const data = await tmdbFetch(`/person/${personId}`);
  const cast = filterRestrictedTmdbTitles<TMDBPersonCredit>(
    (data.combined_credits?.cast || []).filter(
      (item: any) => item && (item.media_type === "movie" || item.media_type === "tv")
    )
  );
  const crew = filterRestrictedTmdbTitles<TMDBPersonCredit>(
    (data.combined_credits?.crew || []).filter(
      (item: any) => item && (item.media_type === "movie" || item.media_type === "tv")
    )
  );
  return {
    id: data.id,
    name: data.name || "Unknown",
    biography: data.biography || "",
    birthday: data.birthday || null,
    deathday: data.deathday || null,
    place_of_birth: data.place_of_birth || null,
    known_for_department: data.known_for_department || "Acting",
    profile_path: data.profile_path || null,
    popularity: data.popularity || 0,
    also_known_as: Array.isArray(data.also_known_as) ? data.also_known_as : [],
    combined_credits: { cast, crew },
  };
}
