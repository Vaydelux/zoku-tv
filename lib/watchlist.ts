import type { MediaType } from "@/lib/media-types";

export type WatchlistSortOption = "recently_added" | "alphabetical" | "release_date";

export interface WatchlistSortableItem {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  added_at: string;
  title?: string;
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
