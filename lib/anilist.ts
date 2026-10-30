const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface AniListTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface AniListStudioNode {
  id: number;
  name: string;
  isAnimationStudio?: boolean | null;
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
  source?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  studios?: { nodes?: AniListStudioNode[] | null } | null;
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
  format?: string;
  source?: string;
  studio?: string;
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

export const ANILIST_FORMATS = [
  { value: "TV", label: "TV Series" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
  { value: "TV_SHORT", label: "TV Short" },
] as const;

export const ANILIST_SOURCES = [
  { value: "MANGA", label: "Manga" },
  { value: "LIGHT_NOVEL", label: "Light Novel" },
  { value: "ORIGINAL", label: "Original" },
  { value: "VISUAL_NOVEL", label: "Visual Novel" },
  { value: "VIDEO_GAME", label: "Video Game" },
  { value: "WEB_NOVEL", label: "Web Novel" },
  { value: "NOVEL", label: "Novel" },
] as const;

export const ANILIST_STUDIOS = [
  "MAPPA",
  "ufotable",
  "Kyoto Animation",
  "Madhouse",
  "Bones",
  "Wit Studio",
  "CloverWorks",
  "A-1 Pictures",
  "Production I.G",
  "Studio Pierrot",
  "Toei Animation",
  "Trigger",
  "Shaft",
  "Sunrise",
  "White Fox",
  "J.C.Staff",
  "David Production",
  "Science SARU",
  "P.A. Works",
  "Studio Ghibli",
] as const;

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
  type
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
  source
  season
  seasonYear
  startDate { year month day }
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
`;

const BROWSE_QUERY = `
query (
  $page: Int,
  $perPage: Int,
  $search: String,
  $genre_in: [String],
  $season: MediaSeason,
  $seasonYear: Int,
  $format: MediaFormat,
  $source: MediaSource,
  $sort: [MediaSort]
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      search: $search,
      genre_in: $genre_in,
      season: $season,
      seasonYear: $seasonYear,
      format: $format,
      source: $source,
      type: ANIME,
      sort: $sort
    ) {
      ${BROWSE_MEDIA_FIELDS}
    }
  }
}`;

const STUDIO_BROWSE_QUERY = `
query ($studio: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
  Studio(search: $studio) {
    id
    name
    media(isMain: true, sort: $sort, page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      nodes {
        ${BROWSE_MEDIA_FIELDS}
      }
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
    source
    season
    seasonYear
    startDate { year month day }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
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
  const studioFilter = filters.studio?.trim();

  if (studioFilter) {
    try {
      const studioData = await anilistFetch<{
        Studio: {
          id: number;
          name: string;
          media: {
            pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
            nodes: AniListMedia[];
          };
        } | null;
      }>(STUDIO_BROWSE_QUERY, {
        studio: studioFilter,
        page: filters.page ?? 1,
        perPage: 50,
        sort: filters.sort ?? ["POPULARITY_DESC"],
      });

      if (studioData.Studio?.media?.nodes) {
        let nodes = studioData.Studio.media.nodes.filter(
          (item) => !item.type || item.type === "ANIME"
        );

        if (filters.format) {
          nodes = nodes.filter((item) => item.format === filters.format);
        }
        if (filters.source) {
          nodes = nodes.filter((item) => item.source === filters.source);
        }
        if (filters.season) {
          nodes = nodes.filter((item) => item.season === filters.season);
        }
        if (filters.seasonYear) {
          nodes = nodes.filter((item) => item.seasonYear === filters.seasonYear);
        }
        if (filters.genres?.length) {
          nodes = nodes.filter((item) =>
            filters.genres!.every((g) => item.genres?.includes(g))
          );
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          nodes = nodes.filter(
            (item) =>
              item.title.english?.toLowerCase().includes(q) ||
              item.title.romaji?.toLowerCase().includes(q) ||
              item.title.native?.toLowerCase().includes(q)
          );
        }

        const media = nodes.map((item) => ({
          ...item,
          media_type: "anime" as const,
          description: stripHtml(item.description),
        }));

        return {
          pageInfo: studioData.Studio.media.pageInfo,
          media,
        };
      }
    } catch {
      // Fallback to standard Page.media query with client-side studio filtering
    }
  }

  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
      media: AniListMedia[];
    };
  }>(BROWSE_QUERY, {
    page: filters.page ?? 1,
    perPage: studioFilter ? 50 : (filters.perPage ?? 20),
    search: filters.search || undefined,
    genre_in: filters.genres?.length ? filters.genres : undefined,
    season: filters.season || undefined,
    seasonYear: filters.seasonYear || undefined,
    format: filters.format || undefined,
    source: filters.source || undefined,
    sort: filters.sort ?? ["POPULARITY_DESC"],
  });

  let rawMedia = data.Page?.media ?? [];
  if (studioFilter) {
    const normalizedStudio = studioFilter.toLowerCase();
    rawMedia = rawMedia.filter((item) =>
      item.studios?.nodes?.some((s) => s.name.toLowerCase().includes(normalizedStudio))
    );
  }

  const media = rawMedia.map((item) => ({
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
