import {
  getTrendingAnime,
  getPopularAnime,
  getAnimeByGenre,
  type AniListMedia,
} from "@/lib/anilist";

const DEFAULT_ANIME_GENRES = ["Action", "Fantasy", "Romance", "Comedy"];

export type AnimeHomeContent = {
  heroSlides: AniListMedia[];
  trending: AniListMedia[];
  popular: AniListMedia[];
  genreRails: { genre: string; items: AniListMedia[] }[];
};

export async function loadAnimeHomeContent(): Promise<AnimeHomeContent> {
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

  return result;
}
