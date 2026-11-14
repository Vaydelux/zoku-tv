/** Only offer another page when at least one catalog's authoritative
 * pagination metadata says another page exists. Policy filtering can hide
 * items within a page; visible result count cannot indicate exhaustion.
 */
export function shouldOfferMoreSearchResults({
  page,
  tmdbHasNextPage,
  animeHasNextPage,
}: {
  page: number;
  tmdbHasNextPage: boolean;
  animeHasNextPage: boolean;
}): boolean {
  return page >= 1 && page < 100 && (tmdbHasNextPage || animeHasNextPage);
}

export function getSearchPageResultStatus({
  tmdbFailed,
  animeFailed,
}: {
  tmdbFailed: boolean;
  animeFailed: boolean;
}): "ok" | "partial" | "unavailable" {
  if (tmdbFailed && animeFailed) return "unavailable";
  if (tmdbFailed || animeFailed) return "partial";
  return "ok";
}

/** Reference-style media tabs keep Movies and TV Series separate.
 * Classification uses Zoku's existing provider-qualified media kinds.
 */
export type SearchMediaTab = "all" | "movie" | "tv" | "anime";

export function matchesSearchMediaTab(kind: "movie" | "tv" | "anime", selected: SearchMediaTab): boolean {
  return selected === "all" || selected === kind;
}
