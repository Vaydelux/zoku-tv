import {
  getTrendingAnime,
  getPopularAnime,
  getAnimeByGenre,
  type AniListMedia,
} from "@/lib/anilist";

const DEFAULT_ANIME_GENRES = ["Action", "Fantasy", "Romance", "Comedy"];
const ANIME_HOME_CACHE_KEY = "zoku_home_anime_v2";
const CACHE_TTL_MS = 10 * 60 * 1000;

export type AnimeHomeContent = {
  heroSlides: AniListMedia[];
  trending: AniListMedia[];
  popular: AniListMedia[];
  genreRails: { genre: string; items: AniListMedia[] }[];
};

export async function loadAnimeHomeContent(): Promise<AnimeHomeContent> {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(ANIME_HOME_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: AnimeHomeContent };
        if (parsed?.at && Date.now() - parsed.at < CACHE_TTL_MS && parsed.data) {
          return parsed.data;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const [trending, popular, ...genreResults] = await Promise.all([
    getTrendingAnime(12),
    getPopularAnime(12),
    ...DEFAULT_ANIME_GENRES.map((genre) => getAnimeByGenre(genre, 12)),
  ]);

  const genreRails = DEFAULT_ANIME_GENRES.map((genre, index) => ({
    genre,
    items: genreResults[index]?.media ?? [],
  }));

  const result = {
    heroSlides: trending.media.slice(0, 6),
    trending: trending.media,
    popular: popular.media,
    genreRails,
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        ANIME_HOME_CACHE_KEY,
        JSON.stringify({ at: Date.now(), data: result })
      );
    } catch {
      /* ignore */
    }
  }

  return result;
}
