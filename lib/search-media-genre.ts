import type { AniListMedia } from "./anilist";
import type { TMDBTitle } from "./tmdb";

/** Common cross-provider genre labels for the reference-style search chips.
 * Numeric IDs follow TMDB's published movie/TV genre identifiers; AniList
 * names are matched against the metadata actually returned by its server API.
 */
export const SEARCH_MEDIA_GENRES = [
  { label: "Action", ids: [28, 10759], animeNames: ["action"] },
  { label: "Adventure", ids: [12, 10759], animeNames: ["adventure"] },
  { label: "Animation", ids: [16], animeNames: ["animation"] },
  { label: "Comedy", ids: [35], animeNames: ["comedy"] },
  { label: "Crime", ids: [80], animeNames: ["crime"] },
  { label: "Drama", ids: [18], animeNames: ["drama"] },
  { label: "Family", ids: [10751, 10762], animeNames: ["family"] },
  { label: "Fantasy", ids: [14, 10765], animeNames: ["fantasy"] },
  { label: "Horror", ids: [27], animeNames: ["horror"] },
  { label: "Mystery", ids: [9648], animeNames: ["mystery"] },
  { label: "Romance", ids: [10749], animeNames: ["romance"] },
  { label: "Sci-Fi", ids: [878, 10765], animeNames: ["sci-fi", "sci fi", "science fiction"] },
  { label: "Thriller", ids: [53], animeNames: ["thriller"] },
] as const;

export type SearchGenreLabel = "All genres" | (typeof SEARCH_MEDIA_GENRES)[number]["label"];

export function matchesSearchGenre(
  entry: { kind: "anime"; data: AniListMedia } | { kind: "movie" | "tv"; data: TMDBTitle },
  label: SearchGenreLabel,
): boolean {
  if (label === "All genres") return true;
  const genre = SEARCH_MEDIA_GENRES.find((x) => x.label === label);
  if (!genre) return false;

  if (entry.kind === "anime") {
    const names = (entry.data.genres || []).map((name) => name.toLowerCase().trim());
    return names.some((name) => (genre.animeNames as readonly string[]).includes(name));
  }

  const ids = [
    ...(entry.data.genre_ids || []),
    ...(entry.data.genres || []).map((genreInfo) => genreInfo.id),
  ];
  return ids.some((id) => (genre.ids as readonly number[]).includes(id));
}
