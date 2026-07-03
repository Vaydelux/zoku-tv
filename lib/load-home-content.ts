import { discoverMedia, getGenres, getTrending, TMDBGenre, TMDBTitle } from "@/lib/tmdb";

export type GenreRail = { genre: TMDBGenre; titles: TMDBTitle[] };

export async function loadHomeTrending(): Promise<{
  heroTitle: TMDBTitle | null;
  trendingMovies: TMDBTitle[];
  trendingTV: TMDBTitle[];
}> {
  const [trendingAll, movies, tv] = await Promise.all([
    getTrending("all", "week"),
    getTrending("movie", "day"),
    getTrending("tv", "day"),
  ]);

  const candidates = trendingAll.filter((title) => title.backdrop_path && title.overview);
  const hero =
    candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))] ||
    candidates[0] ||
    null;

  return {
    heroTitle: hero,
    trendingMovies: movies,
    trendingTV: tv,
  };
}

export async function loadHomeGenreRails(prefGenreIds: number[]): Promise<GenreRail[]> {
  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  const allGenres = [...movieGenres, ...tvGenres].reduce((acc, genre) => {
    if (!acc.some((item) => item.id === genre.id)) acc.push(genre);
    return acc;
  }, [] as TMDBGenre[]);

  const railResults = await Promise.all(
    prefGenreIds.map(async (genreId) => {
      const matchedGenre = allGenres.find((genre) => genre.id === genreId);
      if (!matchedGenre) return null;

      const mediaType: "movie" | "tv" = genreId % 2 === 0 ? "movie" : "tv";
      const titles = await discoverMedia(mediaType, {
        with_genres: String(genreId),
        sort_by: "popularity.desc",
        page: 1,
      });

      if (titles.length === 0) return null;
      return { genre: matchedGenre, titles };
    })
  );

  return railResults.filter((rail): rail is GenreRail => rail !== null);
}
