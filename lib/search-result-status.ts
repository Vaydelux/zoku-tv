/** Search combines TMDB's filtered list (which exposes no pageInfo in our
 * existing public client) and AniList's explicit pageInfo. Stop offering
 * requests once both catalogs have no more visible results, and bound page
 * counts so an empty or repetitive provider cannot create unbounded traffic.
 */
export function shouldOfferMoreSearchResults({
  page,
  tmdbResultCount,
  animeHasNextPage,
}: {
  page: number;
  tmdbResultCount: number;
  animeHasNextPage: boolean;
}): boolean {
  return page >= 1 && page < 100 && (tmdbResultCount > 0 || animeHasNextPage);
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
