export type AnimeEmbedServerCategory = "default" | "new";

export interface AnimeEmbedServer {
  id: string;
  name: string;
  domains: string[];
  /** Placeholders: {anilistId}, {season}, {episode} */
  template: string;
  category?: AnimeEmbedServerCategory;
  defaultParams?: Record<string, string>;
  docs?: string;
}

const CINEZO_PLAYER_PARAMS: Record<string, string> = {
  autoplay: "true",
  poster: "true",
  chromecast: "true",
  servericon: "true",
  setting: "true",
  pip: "true",
  download: "true",
  font: "Roboto",
  fontcolor: "6f63ff",
  fontsize: "20",
  opacity: "0.5",
  primarycolor: "e8b86d",
  secondarycolor: "0a0a12",
  iconcolor: "ffffff",
};

export const DEFAULT_ANIME_SERVER_ID = "filmu";

export const ANIME_EMBED_SERVER_CATALOG: AnimeEmbedServer[] = [
  {
    id: "filmu",
    name: "Filmu",
    domains: ["embed.filmu.in"],
    template: "https://embed.filmu.in/anime/{anilistId}/{season}/{episode}",
    category: "default",
  },
  {
    id: "cinezo",
    name: "Cinezo",
    domains: ["player.cinezo.live"],
    template: "https://player.cinezo.live/embed/anime/{anilistId}",
    defaultParams: CINEZO_PLAYER_PARAMS,
    category: "new",
  },
  {
    id: "fmov",
    name: "FMOV",
    domains: ["fmov.my"],
    template: "https://fmov.my/embed/anime/{anilistId}/{season}/{episode}",
    category: "new",
  },
  {
    id: "cinetaro",
    name: "Cinetaro",
    domains: ["cinextream.cc"],
    template: "https://cinextream.cc/api/embed/anime/sub/{anilistId}/{episode}",
    defaultParams: { color: "e91e63" },
    category: "new",
  },
  {
    id: "vidy",
    name: "Vidy",
    domains: ["vidy.st"],
    template: "https://vidy.st/anime/{anilistId}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
];

/** @deprecated Prefer ANIME_EMBED_SERVER_CATALOG domains via selected server */
export const FILMU_ANIME_DOMAINS = ["embed.filmu.in"];

export function groupAnimeEmbedServers(
  servers: AnimeEmbedServer[] = ANIME_EMBED_SERVER_CATALOG
): {
  newServers: AnimeEmbedServer[];
  defaultServers: AnimeEmbedServer[];
} {
  const newServers: AnimeEmbedServer[] = [];
  const defaultServers: AnimeEmbedServer[] = [];
  for (const server of servers) {
    if ((server.category ?? "default") === "new") {
      newServers.push(server);
    } else {
      defaultServers.push(server);
    }
  }
  return { newServers, defaultServers };
}

export function getAnimeServerById(id: string): AnimeEmbedServer {
  return (
    ANIME_EMBED_SERVER_CATALOG.find((s) => s.id === id) ||
    ANIME_EMBED_SERVER_CATALOG.find((s) => s.id === DEFAULT_ANIME_SERVER_ID) ||
    ANIME_EMBED_SERVER_CATALOG[0]
  );
}

export function getAnimeEmbedUrl(
  anilistIdOrServer: number | AnimeEmbedServer,
  seasonOrAnilistId: number = 1,
  episodeOrSeason: number = 1,
  maybeEpisode?: number
): string {
  // Back-compat: getAnimeEmbedUrl(anilistId, season, episode)
  if (typeof anilistIdOrServer === "number") {
    const server = getAnimeServerById(DEFAULT_ANIME_SERVER_ID);
    return buildAnimeEmbedUrl(server, anilistIdOrServer, seasonOrAnilistId, episodeOrSeason);
  }

  const server = anilistIdOrServer;
  const anilistId = seasonOrAnilistId;
  const season = episodeOrSeason;
  const episode = maybeEpisode ?? 1;
  return buildAnimeEmbedUrl(server, anilistId, season, episode);
}

function buildAnimeEmbedUrl(
  server: AnimeEmbedServer,
  anilistId: number,
  season: number = 1,
  episode: number = 1
): string {
  let url = server.template
    .replace("{anilistId}", String(anilistId))
    .replace("{season}", String(season || 1))
    .replace("{episode}", String(episode || 1));

  const parsedUrl = new URL(url);

  if (server.defaultParams) {
    Object.entries(server.defaultParams).forEach(([k, v]) => {
      parsedUrl.searchParams.set(k, v);
    });
  }

  return parsedUrl.toString();
}
