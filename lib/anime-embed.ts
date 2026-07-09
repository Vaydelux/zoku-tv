const FILMU_ANIME_BASE = "https://embed.filmu.in/anime";

export function getAnimeEmbedUrl(
  anilistId: number,
  season: number = 1,
  episode: number = 1
): string {
  return `${FILMU_ANIME_BASE}/${anilistId}/${season}/${episode}`;
}

export const FILMU_ANIME_DOMAINS = ["embed.filmu.in"];
