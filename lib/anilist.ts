const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface AniListTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface AniListMedia {
  id: number;
  type?: string | null;
  title: AniListTitle;
  coverImage?: { large?: string | null; extraLarge?: string | null; color?: string | null } | null;
  bannerImage?: string | null;
  description?: string | null;
  genres?: string[] | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  trending?: number | null;
  episodes?: number | null;
  status?: string | null;
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  media_type?: "anime";
}

export interface AniListStreamingEpisode {
  title?: string | null;
  thumbnail?: string | null;
  url?: string | null;
  site?: string | null;
}

export interface AniListRelationEdge {
  relationType?: string | null;
  node?: AniListMedia | null;
}

export interface AniListMediaDetail extends AniListMedia {
  trailer?: { id?: string | null; site?: string | null; thumbnail?: string | null } | null;
  streamingEpisodes?: AniListStreamingEpisode[] | null;
  relations?: { edges?: AniListRelationEdge[] | null } | null;
  characters?: {
    edges?: {
      role?: string | null;
      node?: { id: number; name?: { full?: string | null }; image?: { large?: string | null } | null } | null;
    }[] | null;
  } | null;
  recommendations?: {
    nodes?: { mediaRecommendation?: AniListMedia | null }[] | null;
  } | null;
}

export type AniListBrowseFilters = {
  search?: string;
  genres?: string[];
  season?: string;
  seasonYear?: number;
  sort?: string[];
  page?: number;
  perPage?: number;
};

export const ANILIST_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];

export const ANILIST_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

const cache: Record<string, { data: unknown; expiry: number }> = {};
const inflight: Record<string, Promise<unknown>> = {};
let rateLimitRemaining = 90;

function stripHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").trim();
}

export function getAnimeDisplayTitle(media: Pick<AniListMedia, "title">): string {
  return media.title.english || media.title.romaji || media.title.native || "Untitled";
}

export function getAnimePoster(media: AniListMedia): string | null {
  return media.coverImage?.large || media.coverImage?.extraLarge || null;
}

function getCached<T>(key: string): T | null {
  const hit = cache[key];
  if (hit && hit.expiry > Date.now()) return hit.data as T;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`zoku_anilist_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiry > Date.now()) {
          cache[key] = parsed;
          return parsed.data as T;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCached(key: string, data: unknown) {
  const entry = { data, expiry: Date.now() + CACHE_TTL_MS };
  cache[key] = entry;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`zoku_anilist_cache_${key}`, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

async function anilistFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  if (cacheKey in inflight) return inflight[cacheKey] as Promise<T>;

  const promise = (async () => {
    if (rateLimitRemaining <= 2) {
      await new Promise((r) => setTimeout(r, 1500));
    }

    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const remaining = response.headers.get("X-RateLimit-Remaining");
    if (remaining) rateLimitRemaining = Number.parseInt(remaining, 10);

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "60", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return anilistFetch<T>(query, variables);
    }

    const json = await response.json();
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message || "AniList request failed");
    }

    setCached(cacheKey, json.data);
    return json.data as T;
  })();

  inflight[cacheKey] = promise;
  try {
    return await promise;
  } finally {
    delete inflight[cacheKey];
  }
}

const BROWSE_MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  popularity
  episodes
  status
  format
  season
  seasonYear
`;

const BROWSE_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $genre_in: [String], $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(search: $search, genre_in: $genre_in, season: $season, seasonYear: $seasonYear, type: ANIME, sort: $sort) {
      ${BROWSE_MEDIA_FIELDS}
    }
  }
}`;

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large color }
    bannerImage
    description(asHtml: false)
    genres
    averageScore
    meanScore
    popularity
    episodes
    status
    format
    season
    seasonYear
    startDate { year month day }
    trailer { id site thumbnail }
    streamingEpisodes { title thumbnail url site }
    relations {
      edges {
        relationType
        node {
          id
          type
          title { romaji english }
          episodes
          format
          season
          seasonYear
          startDate { year month day }
          coverImage { large }
        }
      }
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 8) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    recommendations(perPage: 8, sort: [RATING_DESC]) {
      nodes {
        mediaRecommendation {
          ${BROWSE_MEDIA_FIELDS}
        }
      }
    }
  }
}`;

export async function browseAnime(filters: AniListBrowseFilters = {}) {
  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
      media: AniListMedia[];
    };
  }>(BROWSE_QUERY, {
    page: filters.page ?? 1,
    perPage: filters.perPage ?? 20,
    search: filters.search || undefined,
    genre_in: filters.genres?.length ? filters.genres : undefined,
    season: filters.season || undefined,
    seasonYear: filters.seasonYear || undefined,
    sort: filters.sort ?? ["POPULARITY_DESC"],
  });

  const media = (data.Page?.media ?? []).map((item) => ({
    ...item,
    media_type: "anime" as const,
    description: stripHtml(item.description),
  }));

  return { pageInfo: data.Page.pageInfo, media };
}

export async function searchAnime(query: string, page = 1, perPage = 20) {
  return browseAnime({ search: query, page, perPage, sort: ["SEARCH_MATCH"] });
}

export async function getAnimeDetails(anilistId: number): Promise<AniListMediaDetail | null> {
  const data = await anilistFetch<{ Media: AniListMediaDetail | null }>(DETAIL_QUERY, { id: anilistId });
  const media = data.Media;
  if (!media) return null;
  return {
    ...media,
    media_type: "anime",
    description: stripHtml(media.description),
  };
}

export async function getTrendingAnime(perPage = 12) {
  return browseAnime({ page: 1, perPage, sort: ["TRENDING_DESC"] });
}

export async function getPopularAnime(perPage = 12) {
  return browseAnime({ page: 1, perPage, sort: ["POPULARITY_DESC"] });
}

export async function getAnimeByGenre(genre: string, perPage = 12) {
  return browseAnime({ page: 1, perPage, genres: [genre], sort: ["POPULARITY_DESC"] });
}
