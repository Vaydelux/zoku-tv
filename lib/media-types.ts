export type CatalogMode = "tmdb" | "anime";
export type MediaType = "movie" | "tv" | "anime";

export function watchlistEntryKey(media_type: MediaType, id: number) {
  return `${media_type}_${id}`;
}

export function getWatchlistItemId(item: { media_type: MediaType; tmdbId?: number | null; anilistId?: number | null }) {
  if (item.media_type === "anime") return item.anilistId ?? 0;
  return item.tmdbId ?? 0;
}
