import { isAnimeGenreAllowedInKidsMode } from "@/lib/kids-mode";

/** One presentation-level policy shared by Genres and advanced Discover.
 * This does not replace the server's AniList maturity checks.
 */
const EXPLICIT_ANIME_GENRES = new Set(["ecchi", "hentai", "erotica"]);

export function isAnimeGenreVisible(genre: string, kidMode: boolean, adultFilterEnabled: boolean): boolean {
  const normalized = genre.trim().toLowerCase();
  if (!normalized) return false;
  return (!kidMode || isAnimeGenreAllowedInKidsMode(genre)) &&
    (!adultFilterEnabled || !EXPLICIT_ANIME_GENRES.has(normalized));
}

export function visibleAnimeGenres<T extends string>(
  genres: readonly T[],
  kidMode: boolean,
  adultFilterEnabled: boolean
): T[] {
  return genres.filter((genre) => isAnimeGenreVisible(genre, kidMode, adultFilterEnabled));
}
