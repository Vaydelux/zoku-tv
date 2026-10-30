import type { CatalogMode, MediaType } from "@/lib/media-types";

export function filterWatchlistByCatalog<T extends { media_type: MediaType }>(
  items: T[],
  catalogMode: CatalogMode
): T[] {
  return items.filter((item) =>
    catalogMode === "anime"
      ? item.media_type === "anime"
      : item.media_type === "movie" || item.media_type === "tv"
  );
}

export type WatchlistSortOption = "recently_added" | "alphabetical" | "release_date";

export interface WatchlistSortableItem {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  added_at: string;
  title?: string;
  creator?: string | null;
  genres?: string[] | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string | null;
}

export const WATCHLIST_SORT_OPTIONS: { id: WatchlistSortOption; label: string }[] = [
  { id: "recently_added", label: "Recently Added" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "release_date", label: "Release Date" },
];

export interface KnownMediaMetadata {
  creator: string;
  genres: string[];
}

/**
 * Known metadata for authentic catalog fallback titles and popular items.
 * Allows instant synchronous lookup of creator and genres for items saved
 * prior to explicit creator storage or when added from simplified cards.
 */
export const KNOWN_MEDIA_CATALOG: Record<string, KnownMediaMetadata> = {
  // Movies
  "movie_693134": { creator: "Denis Villeneuve", genres: ["Science Fiction", "Adventure", "Action"] },
  "movie_872585": { creator: "Christopher Nolan", genres: ["Drama", "History"] },
  "movie_157336": { creator: "Christopher Nolan", genres: ["Adventure", "Drama", "Science Fiction"] },
  "movie_414906": { creator: "Matt Reeves", genres: ["Crime", "Mystery", "Thriller", "Action"] },
  "movie_335984": { creator: "Denis Villeneuve", genres: ["Science Fiction", "Drama", "Mystery"] },
  "movie_569094": { creator: "Joaquim Dos Santos", genres: ["Animation", "Action", "Adventure", "Science Fiction"] },
  "movie_545611": { creator: "Daniel Kwan & Daniel Scheinert", genres: ["Action", "Adventure", "Science Fiction", "Comedy"] },
  "movie_27205": { creator: "Christopher Nolan", genres: ["Action", "Science Fiction", "Adventure"] },
  "movie_155": { creator: "Christopher Nolan", genres: ["Drama", "Action", "Crime", "Thriller"] },
  "movie_496243": { creator: "Bong Joon-ho", genres: ["Comedy", "Thriller", "Drama"] },
  "movie_603": { creator: "Lana & Lilly Wachowski", genres: ["Action", "Science Fiction"] },
  "movie_550": { creator: "David Fincher", genres: ["Drama"] },
  "movie_101": { creator: "Zack Snyder", genres: ["Action", "Adventure", "Fantasy"] },
  "movie_303": { creator: "James Cameron", genres: ["Science Fiction", "Action", "Adventure"] },
  "movie_505": { creator: "Christopher Nolan", genres: ["Adventure", "Drama", "Science Fiction"] },

  // TV Shows
  "tv_95396": { creator: "Dan Erickson", genres: ["Drama", "Mystery", "Sci-Fi & Fantasy"] },
  "tv_126308": { creator: "Rachel Kondo & Justin Marks", genres: ["Drama", "War & Politics", "Action & Adventure"] },
  "tv_94605": { creator: "Christian Linke & Alex Yee", genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure", "Drama"] },
  "tv_136315": { creator: "Christopher Storer", genres: ["Comedy", "Drama"] },
  "tv_1396": { creator: "Vince Gilligan", genres: ["Drama", "Crime"] },
  "tv_66732": { creator: "The Duffer Brothers", genres: ["Sci-Fi & Fantasy", "Drama", "Mystery"] },
  "tv_94997": { creator: "Ryan J. Condal & George R. R. Martin", genres: ["Sci-Fi & Fantasy", "Drama", "Action & Adventure"] },
  "tv_76331": { creator: "Jesse Armstrong", genres: ["Drama"] },
  "tv_105248": { creator: "Rafal Jaki & Studio Trigger", genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure"] },
  "tv_87108": { creator: "Craig Mazin", genres: ["Drama", "History"] },
  "tv_202": { creator: "Christian Linke & Alex Yee", genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure"] },

  // Anime
  "anime_404": { creator: "Tite Kubo / Studio Pierrot", genres: ["Action", "Adventure", "Supernatural"] },
  "anime_303": { creator: "Koyoharu Gotouge / ufotable", genres: ["Action", "Fantasy", "Animation"] },
  "anime_16498": { creator: "Hajime Isayama / Wit Studio", genres: ["Action", "Drama", "Fantasy", "Mystery"] },
  "anime_1535": { creator: "Tsugumi Ohba / Madhouse", genres: ["Mystery", "Psychological", "Supernatural", "Thriller"] },
  "anime_21": { creator: "Eiichiro Oda / Toei Animation", genres: ["Action", "Adventure", "Comedy", "Fantasy"] },
  "anime_20": { creator: "Masashi Kishimoto / Studio Pierrot", genres: ["Action", "Adventure", "Fantasy"] },
  "anime_5114": { creator: "Hiromu Arakawa / Bones", genres: ["Action", "Adventure", "Drama", "Fantasy"] },
  "anime_113415": { creator: "Gege Akutami / MAPPA", genres: ["Action", "Fantasy", "Supernatural"] },
  "anime_154587": { creator: "Kanehito Yamada / Madhouse", genres: ["Adventure", "Drama", "Fantasy"] },
  "anime_1": { creator: "Shinichirō Watanabe / Sunrise", genres: ["Action", "Sci-Fi", "Drama"] },
};

function normalizeTitleKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const KNOWN_TITLE_TO_MEDIA: Record<string, KnownMediaMetadata> = {
  [normalizeTitleKey("Dune: Part Two")]: { creator: "Denis Villeneuve", genres: ["Science Fiction", "Adventure", "Action"] },
  [normalizeTitleKey("Oppenheimer")]: { creator: "Christopher Nolan", genres: ["Drama", "History"] },
  [normalizeTitleKey("Interstellar")]: { creator: "Christopher Nolan", genres: ["Adventure", "Drama", "Science Fiction"] },
  [normalizeTitleKey("The Batman")]: { creator: "Matt Reeves", genres: ["Crime", "Mystery", "Thriller", "Action"] },
  [normalizeTitleKey("Blade Runner 2049")]: { creator: "Denis Villeneuve", genres: ["Science Fiction", "Drama", "Mystery"] },
  [normalizeTitleKey("Spider-Man: Across the Spider-Verse")]: { creator: "Joaquim Dos Santos", genres: ["Animation", "Action", "Adventure", "Science Fiction"] },
  [normalizeTitleKey("Everything Everywhere All at Once")]: { creator: "Daniel Kwan & Daniel Scheinert", genres: ["Action", "Adventure", "Science Fiction", "Comedy"] },
  [normalizeTitleKey("Inception")]: { creator: "Christopher Nolan", genres: ["Action", "Science Fiction", "Adventure"] },
  [normalizeTitleKey("The Dark Knight")]: { creator: "Christopher Nolan", genres: ["Drama", "Action", "Crime", "Thriller"] },
  [normalizeTitleKey("Parasite")]: { creator: "Bong Joon-ho", genres: ["Comedy", "Thriller", "Drama"] },
  [normalizeTitleKey("The Matrix")]: { creator: "Lana & Lilly Wachowski", genres: ["Action", "Science Fiction"] },
  [normalizeTitleKey("Fight Club")]: { creator: "David Fincher", genres: ["Drama"] },
  [normalizeTitleKey("Zack Snyder's Justice League")]: { creator: "Zack Snyder", genres: ["Action", "Adventure", "Fantasy"] },
  [normalizeTitleKey("Avatar: The Way of Water")]: { creator: "James Cameron", genres: ["Science Fiction", "Action", "Adventure"] },
  [normalizeTitleKey("Severance")]: { creator: "Dan Erickson", genres: ["Drama", "Mystery", "Sci-Fi & Fantasy"] },
  [normalizeTitleKey("Shōgun")]: { creator: "Rachel Kondo & Justin Marks", genres: ["Drama", "War & Politics", "Action & Adventure"] },
  [normalizeTitleKey("Shogun")]: { creator: "Rachel Kondo & Justin Marks", genres: ["Drama", "War & Politics", "Action & Adventure"] },
  [normalizeTitleKey("Arcane")]: { creator: "Christian Linke & Alex Yee", genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure", "Drama"] },
  [normalizeTitleKey("The Bear")]: { creator: "Christopher Storer", genres: ["Comedy", "Drama"] },
  [normalizeTitleKey("Breaking Bad")]: { creator: "Vince Gilligan", genres: ["Drama", "Crime"] },
  [normalizeTitleKey("Stranger Things")]: { creator: "The Duffer Brothers", genres: ["Sci-Fi & Fantasy", "Drama", "Mystery"] },
  [normalizeTitleKey("House of the Dragon")]: { creator: "Ryan J. Condal & George R. R. Martin", genres: ["Sci-Fi & Fantasy", "Drama", "Action & Adventure"] },
  [normalizeTitleKey("Succession")]: { creator: "Jesse Armstrong", genres: ["Drama"] },
  [normalizeTitleKey("Cyberpunk: Edgerunners")]: { creator: "Rafal Jaki & Studio Trigger", genres: ["Animation", "Sci-Fi & Fantasy", "Action & Adventure"] },
  [normalizeTitleKey("Chernobyl")]: { creator: "Craig Mazin", genres: ["Drama", "History"] },
  [normalizeTitleKey("Bleach")]: { creator: "Tite Kubo / Studio Pierrot", genres: ["Action", "Adventure", "Supernatural"] },
  [normalizeTitleKey("Demon Slayer the Movie: Mugen Train")]: { creator: "Koyoharu Gotouge / ufotable", genres: ["Action", "Fantasy", "Animation"] },
  [normalizeTitleKey("Demon Slayer")]: { creator: "Koyoharu Gotouge / ufotable", genres: ["Action", "Fantasy", "Animation"] },
  [normalizeTitleKey("Jujutsu Kaisen")]: { creator: "Gege Akutami / MAPPA", genres: ["Action", "Fantasy", "Supernatural"] },
  [normalizeTitleKey("Attack on Titan")]: { creator: "Hajime Isayama / Wit Studio", genres: ["Action", "Drama", "Fantasy", "Mystery"] },
  [normalizeTitleKey("Death Note")]: { creator: "Tsugumi Ohba / Madhouse", genres: ["Mystery", "Psychological", "Supernatural", "Thriller"] },
  [normalizeTitleKey("One Piece")]: { creator: "Eiichiro Oda / Toei Animation", genres: ["Action", "Adventure", "Comedy", "Fantasy"] },
  [normalizeTitleKey("Naruto")]: { creator: "Masashi Kishimoto / Studio Pierrot", genres: ["Action", "Adventure", "Fantasy"] },
  [normalizeTitleKey("Fullmetal Alchemist: Brotherhood")]: { creator: "Hiromu Arakawa / Bones", genres: ["Action", "Adventure", "Drama", "Fantasy"] },
  [normalizeTitleKey("Cowboy Bebop")]: { creator: "Shinichirō Watanabe / Sunrise", genres: ["Action", "Sci-Fi", "Drama"] },
  [normalizeTitleKey("Frieren: Beyond Journey's End")]: { creator: "Kanehito Yamada / Madhouse", genres: ["Adventure", "Drama", "Fantasy"] },
};

/**
 * Resolves the creator / director / author name for a watchlist item.
 * Prioritizes item's explicit creator property, then catalog ID, then normalized title.
 */
export function getWatchlistItemCreator(item: WatchlistSortableItem): string {
  if (item.creator && item.creator.trim().length > 0) {
    return item.creator.trim();
  }
  const id = item.media_type === "anime" ? item.anilistId : item.tmdbId;
  if (id) {
    const key = `${item.media_type}_${id}`;
    if (KNOWN_MEDIA_CATALOG[key]?.creator) {
      return KNOWN_MEDIA_CATALOG[key].creator;
    }
  }
  if (item.title) {
    const norm = normalizeTitleKey(item.title);
    if (KNOWN_TITLE_TO_MEDIA[norm]?.creator) {
      return KNOWN_TITLE_TO_MEDIA[norm].creator;
    }
  }
  return "";
}

/**
 * Resolves the genres for a watchlist item.
 * Prioritizes item's explicit genres array, then catalog ID, then normalized title,
 * falling back to a sensible default based on media type.
 */
export function getWatchlistItemGenres(item: WatchlistSortableItem): string[] {
  if (item.genres && item.genres.length > 0) {
    return item.genres;
  }
  const id = item.media_type === "anime" ? item.anilistId : item.tmdbId;
  if (id) {
    const key = `${item.media_type}_${id}`;
    if (KNOWN_MEDIA_CATALOG[key]?.genres && KNOWN_MEDIA_CATALOG[key].genres.length > 0) {
      return KNOWN_MEDIA_CATALOG[key].genres;
    }
  }
  if (item.title) {
    const norm = normalizeTitleKey(item.title);
    if (KNOWN_TITLE_TO_MEDIA[norm]?.genres && KNOWN_TITLE_TO_MEDIA[norm].genres.length > 0) {
      return KNOWN_TITLE_TO_MEDIA[norm].genres;
    }
  }
  // Default fallback category if unknown
  if (item.media_type === "anime") return ["Anime", "Action"];
  if (item.media_type === "tv") return ["Drama", "Series"];
  return ["Drama", "Feature"];
}

/**
 * Filters watchlist items in real-time by matching query against title OR creator name.
 * Case-insensitive and trimmed.
 */
export function filterWatchlistItems<T extends WatchlistSortableItem>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const titleMatch = (item.title || "").toLowerCase().includes(q);
    const creator = getWatchlistItemCreator(item).toLowerCase();
    const creatorMatch = creator.includes(q);
    return titleMatch || creatorMatch;
  });
}

/**
 * Sorts watchlist items according to the selected option:
 * - 'recently_added': newest added_at timestamp first
 * - 'alphabetical': A-Z by title (case-insensitive)
 * - 'release_date': newest release date first; items without date appear at the end
 */
export function sortWatchlistItems<T extends WatchlistSortableItem>(
  items: T[],
  sortBy: WatchlistSortOption
): T[] {
  const copy = [...items];

  switch (sortBy) {
    case "recently_added":
      return copy.sort((a, b) => {
        const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
        const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        return (a.title || "").localeCompare(b.title || "");
      });

    case "alphabetical":
      return copy.sort((a, b) => {
        const titleA = (a.title || "").trim().toLowerCase();
        const titleB = (b.title || "").trim().toLowerCase();
        return titleA.localeCompare(titleB);
      });

    case "release_date":
      return copy.sort((a, b) => {
        const timeA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const timeB = b.release_date ? new Date(b.release_date).getTime() : 0;

        // If both have valid release dates, sort newest first
        if (timeA && timeB) {
          if (timeA !== timeB) return timeB - timeA;
          return (a.title || "").localeCompare(b.title || "");
        }
        // Items with known release dates appear before unknown
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;

        // Fallback to title
        return (a.title || "").localeCompare(b.title || "");
      });

    default:
      return copy;
  }
}

export interface MediaTypeDistribution {
  type: "movie" | "tv" | "anime";
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface GenreComposition {
  genre: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WatchlistAnalytics {
  totalItems: number;
  movieCount: number;
  tvCount: number;
  animeCount: number;
  mediaTypeDistribution: MediaTypeDistribution[];
  genreComposition: GenreComposition[];
  topGenre: string | null;
  averageRating: number | null;
}

export const MEDIA_TYPE_COLORS: Record<"movie" | "tv" | "anime", string> = {
  movie: "#6366f1", // Indigo
  tv: "#06b6d4",    // Cyan
  anime: "#ec4899", // Pink
};

const GENRE_PALETTE = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#e11d48", // Rose
  "#84cc16", // Lime
];

/**
 * Computes analytics over a set of watchlist items:
 * - Media type distribution (Movies vs TV vs Anime) with counts and percentages
 * - Genre composition ranked by count
 * - Top genre and average rating
 */
export function computeWatchlistAnalytics<T extends WatchlistSortableItem>(
  items: T[]
): WatchlistAnalytics {
  const totalItems = items.length;

  if (totalItems === 0) {
    return {
      totalItems: 0,
      movieCount: 0,
      tvCount: 0,
      animeCount: 0,
      mediaTypeDistribution: [
        { type: "movie", label: "Movies", count: 0, percentage: 0, color: MEDIA_TYPE_COLORS.movie },
        { type: "tv", label: "TV Shows", count: 0, percentage: 0, color: MEDIA_TYPE_COLORS.tv },
        { type: "anime", label: "Anime", count: 0, percentage: 0, color: MEDIA_TYPE_COLORS.anime },
      ],
      genreComposition: [],
      topGenre: null,
      averageRating: null,
    };
  }

  let movieCount = 0;
  let tvCount = 0;
  let animeCount = 0;
  const genreCountMap: Record<string, number> = {};
  let ratingSum = 0;
  let ratingCount = 0;

  for (const item of items) {
    if (item.media_type === "movie") movieCount++;
    else if (item.media_type === "tv") tvCount++;
    else if (item.media_type === "anime") animeCount++;

    const itemGenres = getWatchlistItemGenres(item);
    for (const g of itemGenres) {
      const cleanG = g.trim();
      if (!cleanG) continue;
      genreCountMap[cleanG] = (genreCountMap[cleanG] || 0) + 1;
    }

    if (typeof item.vote_average === "number" && item.vote_average > 0) {
      ratingSum += item.vote_average;
      ratingCount++;
    }
  }

  const mediaTypeDistribution: MediaTypeDistribution[] = [
    {
      type: "movie",
      label: "Movies",
      count: movieCount,
      percentage: Number(((movieCount / totalItems) * 100).toFixed(1)),
      color: MEDIA_TYPE_COLORS.movie,
    },
    {
      type: "tv",
      label: "TV Shows",
      count: tvCount,
      percentage: Number(((tvCount / totalItems) * 100).toFixed(1)),
      color: MEDIA_TYPE_COLORS.tv,
    },
    {
      type: "anime",
      label: "Anime",
      count: animeCount,
      percentage: Number(((animeCount / totalItems) * 100).toFixed(1)),
      color: MEDIA_TYPE_COLORS.anime,
    },
  ];

  const sortedGenres = Object.entries(genreCountMap)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genre, count], idx): GenreComposition => ({
      genre,
      count,
      percentage: Number(((count / totalItems) * 100).toFixed(1)),
      color: GENRE_PALETTE[idx % GENRE_PALETTE.length],
    }));

  const topGenre = sortedGenres.length > 0 ? sortedGenres[0].genre : null;
  const averageRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : null;

  return {
    totalItems,
    movieCount,
    tvCount,
    animeCount,
    mediaTypeDistribution,
    genreComposition: sortedGenres,
    topGenre,
    averageRating,
  };
}
