const TMDB_ACCESS_TOKEN = (
  process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN ||
  process.env.TMDB_API_READ_ACCESS_TOKEN ||
  ""
).trim();
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// A valid TMDB v4 Read Access Token is a signed JWT starting with "eyJ"
const HAS_VALID_V4_JWT =
  TMDB_ACCESS_TOKEN.startsWith("eyJ") &&
  TMDB_ACCESS_TOKEN.split(".").length === 3 &&
  TMDB_ACCESS_TOKEN.length > 100;

let tmdbFallbackMode = !HAS_VALID_V4_JWT;

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

// Authentic TMDB catalog entries (real TMDB IDs + public CDN poster/backdrop paths)
const FALLBACK_MOVIES: TMDBTitle[] = [
  {
    id: 693134,
    title: "Dune: Part Two",
    overview:
      "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    media_type: "movie",
    release_date: "2024-02-27",
    vote_average: 8.3,
    genre_ids: [878, 12, 28],
    runtime: 167,
  },
  {
    id: 872585,
    title: "Oppenheimer",
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II and the geopolitical fallout that followed.",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    media_type: "movie",
    release_date: "2023-07-19",
    vote_average: 8.1,
    genre_ids: [18, 36],
    runtime: 181,
  },
  {
    id: 157336,
    title: "Interstellar",
    overview:
      "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    media_type: "movie",
    release_date: "2014-11-05",
    vote_average: 8.4,
    genre_ids: [12, 18, 878],
    runtime: 169,
  },
  {
    id: 414906,
    title: "The Batman",
    overview:
      "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    poster_path: "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdrop_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    media_type: "movie",
    release_date: "2022-03-01",
    vote_average: 7.7,
    genre_ids: [80, 9648, 53, 28],
    runtime: 176,
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    overview:
      "Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos.",
    poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdrop_path: "/ilRyazdMJwN05exqhwK4tMKBYZs.jpg",
    media_type: "movie",
    release_date: "2017-10-04",
    vote_average: 7.6,
    genre_ids: [878, 18, 9648],
    runtime: 164,
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    overview:
      "After reuniting with Gwen Stacy, Brooklyn's full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider Society.",
    poster_path: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop_path: "/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    media_type: "movie",
    release_date: "2023-05-31",
    vote_average: 8.4,
    genre_ids: [16, 28, 12, 878],
    runtime: 140,
  },
  {
    id: 545611,
    title: "Everything Everywhere All at Once",
    overview:
      "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what's important to her by connecting with the lives she could have led in other universes.",
    poster_path: "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    backdrop_path: "/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
    media_type: "movie",
    release_date: "2022-03-24",
    vote_average: 7.8,
    genre_ids: [28, 12, 878, 35],
    runtime: 139,
  },
  {
    id: 27205,
    title: "Inception",
    overview:
      "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible.",
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    media_type: "movie",
    release_date: "2010-07-15",
    vote_average: 8.4,
    genre_ids: [28, 878, 12],
    runtime: 148,
  },
  {
    id: 155,
    title: "The Dark Knight",
    overview:
      "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    media_type: "movie",
    release_date: "2008-07-16",
    vote_average: 8.5,
    genre_ids: [18, 28, 80, 53],
    runtime: 152,
  },
  {
    id: 496243,
    title: "Parasite",
    overview:
      "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdrop_path: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    media_type: "movie",
    release_date: "2019-05-30",
    vote_average: 8.5,
    genre_ids: [35, 53, 18],
    runtime: 133,
  },
  {
    id: 603,
    title: "The Matrix",
    overview:
      "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdrop_path: "/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
    media_type: "movie",
    release_date: "1999-03-30",
    vote_average: 8.2,
    genre_ids: [28, 878],
    runtime: 136,
  },
  {
    id: 550,
    title: "Fight Club",
    overview:
      "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    media_type: "movie",
    release_date: "1999-10-15",
    vote_average: 8.4,
    genre_ids: [18, 53, 35],
    runtime: 139,
  },
];

const FALLBACK_TV: TMDBTitle[] = [
  {
    id: 95396,
    name: "Severance",
    overview:
      "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth.",
    poster_path: "/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
    backdrop_path: "/ixgFmf1X59PUZam2qbAfskx2gQr.jpg",
    media_type: "tv",
    first_air_date: "2022-02-17",
    vote_average: 8.4,
    genre_ids: [18, 9648, 10765],
    number_of_seasons: 2,
    number_of_episodes: 19,
  },
  {
    id: 126308,
    name: "Shōgun",
    overview:
      "In Japan in the year 1600, at the dawn of a century-defining civil war, Lord Yoshii Toranaga is fighting for his life as his enemies on the Council of Regents unite against him.",
    poster_path: "/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    backdrop_path: "/5zmiBoMzeeVdQ62no55JOJMY498.jpg",
    media_type: "tv",
    first_air_date: "2024-02-27",
    vote_average: 8.6,
    genre_ids: [18, 10768, 10759],
    number_of_seasons: 1,
    number_of_episodes: 10,
  },
  {
    id: 94605,
    name: "Arcane",
    overview:
      "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.",
    poster_path: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    backdrop_path: "/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg",
    media_type: "tv",
    first_air_date: "2021-11-06",
    vote_average: 8.8,
    genre_ids: [16, 10765, 10759, 18],
    number_of_seasons: 2,
    number_of_episodes: 18,
  },
  {
    id: 136315,
    name: "The Bear",
    overview:
      "Carmy, a young fine-dining chef, comes home to Chicago to run his family Sandwich shop. As he fights to transform the shop and himself, he works alongside a rough-around-the-edges crew.",
    poster_path: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    backdrop_path: "/z18KvDvFftrNyAMPOVFHkt8Bj8E.jpg",
    media_type: "tv",
    first_air_date: "2022-06-23",
    vote_average: 8.3,
    genre_ids: [18, 35],
    number_of_seasons: 3,
    number_of_episodes: 28,
  },
  {
    id: 1396,
    name: "Breaking Bad",
    overview:
      "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and enters the underworld.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop_path: "/gc8PfyTqzqltKPW3X0cIVUGmagz.jpg",
    media_type: "tv",
    first_air_date: "2008-01-20",
    vote_average: 8.9,
    genre_ids: [18, 80],
    number_of_seasons: 5,
    number_of_episodes: 62,
  },
  {
    id: 66732,
    name: "Stranger Things",
    overview:
      "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    media_type: "tv",
    first_air_date: "2016-07-15",
    vote_average: 8.6,
    genre_ids: [18, 10765, 9648],
    number_of_seasons: 4,
    number_of_episodes: 34,
  },
  {
    id: 94997,
    name: "House of the Dragon",
    overview:
      "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under their yoke. Most empires crumble from such heights.",
    poster_path: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
    backdrop_path: "/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg",
    media_type: "tv",
    first_air_date: "2022-08-21",
    vote_average: 8.4,
    genre_ids: [10765, 18, 10759],
    number_of_seasons: 2,
    number_of_episodes: 18,
  },
  {
    id: 76331,
    name: "Succession",
    overview:
      "Follow the lives of the Roy family as they contemplate their future once their aging father begins to step back from the media and entertainment conglomerate they control.",
    poster_path: "/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg",
    backdrop_path: "/ac0kn22V1c3Rn2R1ncabCx8c0UV.jpg",
    media_type: "tv",
    first_air_date: "2018-06-03",
    vote_average: 8.3,
    genre_ids: [18, 35],
    number_of_seasons: 4,
    number_of_episodes: 39,
  },
  {
    id: 105248,
    name: "Cyberpunk: Edgerunners",
    overview:
      "In a dystopia riddled with corruption and cybernetic implants, a talented but reckless street kid strives to become a mercenary outlaw — an edgerunner.",
    poster_path: "/7jSWOc6jWSw5hZ78HB8Hw3pJxuk.jpg",
    backdrop_path: "/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg",
    media_type: "tv",
    first_air_date: "2022-09-13",
    vote_average: 8.6,
    genre_ids: [16, 10759, 10765],
    number_of_seasons: 1,
    number_of_episodes: 10,
  },
  {
    id: 87108,
    name: "Chernobyl",
    overview:
      "The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl. A tale of the brave men and women who sacrificed to save Europe.",
    poster_path: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    backdrop_path: "/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg",
    media_type: "tv",
    first_air_date: "2019-05-06",
    vote_average: 8.7,
    genre_ids: [18, 36],
    number_of_seasons: 1,
    number_of_episodes: 5,
  },
];

const FALLBACK_MOVIE_GENRES: TMDBGenre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 9648, name: "Mystery" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
];

const FALLBACK_TV_GENRES: TMDBGenre[] = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 9648, name: "Mystery" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
];

// In-memory + LocalStorage TTL Cache wrapper for server/client fetching
const cache: Record<string, { data: any; expiry: number }> = {};
const inflight: Record<string, Promise<any>> = {};

function isPersistedRequest(key: string): boolean {
  return (
    key.includes("genre") ||
    key.includes("with_genres") ||
    key.includes("/trending/") ||
    key.includes("/genre/") ||
    key.includes("/discover/")
  );
}

function getCachedData(key: string): any | null {
  const cached = cache[key];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  if (typeof window !== "undefined" && isPersistedRequest(key)) {
    try {
      const stored = localStorage.getItem(`zoku_tmdb_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.expiry > Date.now()) {
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

function setCachedData(key: string, data: any, ttlMs: number = 300000) {
  const actualTtl = isPersistedRequest(key) ? Math.max(120000, ttlMs) : ttlMs;
  const expiry = Date.now() + actualTtl;

  cache[key] = {
    data,
    expiry,
  };

  if (typeof window !== "undefined" && isPersistedRequest(key)) {
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

function resolveFallbackResponse(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): any {
  if (endpoint === "/trending/movie/day" || endpoint === "/trending/movie/week") {
    return { results: FALLBACK_MOVIES };
  }
  if (endpoint === "/trending/tv/day" || endpoint === "/trending/tv/week") {
    return { results: FALLBACK_TV };
  }
  if (endpoint.startsWith("/trending/all")) {
    return {
      results: [
        FALLBACK_MOVIES[0],
        FALLBACK_TV[0],
        FALLBACK_MOVIES[1],
        FALLBACK_TV[1],
        FALLBACK_MOVIES[2],
        FALLBACK_TV[2],
      ],
    };
  }
  if (endpoint === "/genre/movie/list") {
    return { genres: FALLBACK_MOVIE_GENRES };
  }
  if (endpoint === "/genre/tv/list") {
    return { genres: FALLBACK_TV_GENRES };
  }
  if (endpoint === "/discover/movie") {
    const withGenres = params.with_genres ? String(params.with_genres) : "";
    const genreId = Number(withGenres.split(",")[0]);
    const filtered = genreId
      ? FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(genreId))
      : FALLBACK_MOVIES;
    const remainder = FALLBACK_MOVIES.filter(
      (m) => !filtered.some((f) => f.id === m.id)
    );
    return {
      results: (filtered.length >= 6 ? filtered : [...filtered, ...remainder]).slice(0, 10),
    };
  }
  if (endpoint === "/discover/tv") {
    const withGenres = params.with_genres ? String(params.with_genres) : "";
    const genreId = Number(withGenres.split(",")[0]);
    const filtered = genreId
      ? FALLBACK_TV.filter((t) => t.genre_ids?.includes(genreId))
      : FALLBACK_TV;
    const remainder = FALLBACK_TV.filter(
      (t) => !filtered.some((f) => f.id === t.id)
    );
    return {
      results: (filtered.length >= 6 ? filtered : [...filtered, ...remainder]).slice(0, 10),
    };
  }
  if (endpoint === "/search/multi") {
    const q = String(params.query ?? "").toLowerCase().trim();
    const all = [...FALLBACK_MOVIES, ...FALLBACK_TV];
    const results = q
      ? all.filter(
          (item) =>
            (item.title || item.name || "").toLowerCase().includes(q) ||
            item.overview.toLowerCase().includes(q)
        )
      : all;
    return { results };
  }

  const seasonMatch = endpoint.match(/^\/tv\/(\d+)\/season\/(\d+)$/);
  if (seasonMatch) {
    const tvId = Number(seasonMatch[1]);
    const seasonNum = Number(seasonMatch[2]);
    const show = FALLBACK_TV.find((t) => t.id === tvId) || FALLBACK_TV[0];
    return {
      id: tvId * 100 + seasonNum,
      name: `Season ${seasonNum}`,
      overview: show.overview,
      season_number: seasonNum,
      poster_path: show.poster_path,
      episodes: Array.from({ length: 8 }, (_, idx) => ({
        id: tvId * 1000 + seasonNum * 100 + idx + 1,
        name: `Chapter ${idx + 1}`,
        overview: show.overview,
        episode_number: idx + 1,
        season_number: seasonNum,
        still_path: show.backdrop_path,
        air_date: show.first_air_date || "2024-01-01",
        vote_average: show.vote_average,
      })),
    };
  }

  const recMatch = endpoint.match(/^\/(movie|tv)\/(\d+)\/(recommendations|similar)$/);
  if (recMatch) {
    const mediaType = recMatch[1] as "movie" | "tv";
    const id = Number(recMatch[2]);
    const list = mediaType === "movie" ? FALLBACK_MOVIES : FALLBACK_TV;
    return { results: list.filter((item) => item.id !== id).slice(0, 8) };
  }

  const creditsMatch = endpoint.match(/^\/(movie|tv)\/(\d+)\/credits$/);
  if (creditsMatch) {
    return {
      cast: [
        { id: 1, name: "Timothée Chalamet", character: "Lead Role", profile_path: null },
        { id: 2, name: "Zendaya", character: "Co-Lead", profile_path: null },
        { id: 3, name: "Rebecca Ferguson", character: "Supporting", profile_path: null },
        { id: 4, name: "Cillian Murphy", character: "Protagonist", profile_path: null },
      ],
    };
  }

  const videosMatch = endpoint.match(/^\/(movie|tv)\/(\d+)\/videos$/);
  if (videosMatch) {
    return { results: [] };
  }

  const detailMatch = endpoint.match(/^\/(movie|tv)\/(\d+)$/);
  if (detailMatch) {
    const mediaType = detailMatch[1] as "movie" | "tv";
    const id = Number(detailMatch[2]);
    const pool = mediaType === "movie" ? FALLBACK_MOVIES : FALLBACK_TV;
    const found = pool.find((item) => item.id === id) || pool[0];
    const genreCatalog = mediaType === "movie" ? FALLBACK_MOVIE_GENRES : FALLBACK_TV_GENRES;
    return {
      ...found,
      id,
      media_type: mediaType,
      genres: (found.genre_ids || [28, 18]).map(
        (gid) => genreCatalog.find((g) => g.id === gid) || { id: gid, name: "Drama" }
      ),
      seasons:
        mediaType === "tv"
          ? Array.from({ length: found.number_of_seasons || 2 }, (_, idx) => ({
              id: id * 10 + idx + 1,
              name: `Season ${idx + 1}`,
              overview: found.overview,
              season_number: idx + 1,
              episode_count: 8,
              poster_path: found.poster_path,
            }))
          : undefined,
    };
  }

  return { results: FALLBACK_MOVIES };
}

async function tmdbFetch(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  if (tmdbFallbackMode) {
    return resolveFallbackResponse(endpoint, params);
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

  if (url in inflight) {
    return inflight[url];
  }

  const request = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
          Accept: "application/json",
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          tmdbFallbackMode = true;
        }
        return resolveFallbackResponse(endpoint, params);
      }

      const data = await res.json();
      setCachedData(url, data);
      return data;
    } catch {
      tmdbFallbackMode = true;
      return resolveFallbackResponse(endpoint, params);
    }
  })();

  inflight[url] = request;

  try {
    return await request;
  } finally {
    delete inflight[url];
  }
}

export async function getTrending(
  type: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "day"
): Promise<TMDBTitle[]> {
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

export async function discoverMedia(
  type: "movie" | "tv",
  params: DiscoverParams = {}
): Promise<TMDBTitle[]> {
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

export async function getRecommendations(
  type: "movie" | "tv",
  id: number
): Promise<TMDBTitle[]> {
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
