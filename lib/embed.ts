// Zoku TV - Embed servers configuration and utilities
export type EmbedServerCategory = "default" | "new";

export interface EmbedServer {
  id: string;
  name: string;
  domains: string[];
  idTypes: ("tmdb" | "imdb")[];
  movieTemplate: string; // e.g. "https://vidsrc.to/embed/movie/{tmdbId}"
  tvTemplate: string;    // e.g. "https://vidsrc.to/embed/tv/{tmdbId}/{season}/{episode}"
  defaultParams?: Record<string, string>;
  docs?: string;
  category?: EmbedServerCategory;
  sandboxPolicy: string; // sandbox value
  supportsSandbox: boolean;
  allowsPopups: boolean;
  allowsFullscreen: boolean;
  testedOnAndroidTV: boolean;
  isAdHeavy?: boolean;
}

type EmbedServerInput = Omit<
  EmbedServer,
  "sandboxPolicy" | "supportsSandbox" | "allowsPopups" | "allowsFullscreen" | "testedOnAndroidTV" | "isAdHeavy"
> &
  Partial<Pick<EmbedServer, "sandboxPolicy" | "supportsSandbox" | "allowsPopups" | "allowsFullscreen" | "testedOnAndroidTV" | "isAdHeavy">>;

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

const COMPATIBILITY_ONLY_SERVERS = new Set(["2embed", "superembed", "vidsrc", "vidup", "smashystream"]);

// Self-hosted se_player.php URL — set NEXT_PUBLIC_SUPEREMBED_VIP_URL if hosted elsewhere
const SUPEREMBED_VIP_PLAYER =
  process.env.NEXT_PUBLIC_SUPEREMBED_VIP_URL ?? "/se_player.php";

const EMBED_SERVER_INPUTS: EmbedServerInput[] = [
  {
    id: "111movies",
    name: "111Movies",
    domains: ["111movies.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://111movies.net/movie/{id}",
    tvTemplate: "https://111movies.net/tv/{id}/{season}/{episode}",
    docs: "https://111movies.net/",
  },
  {
    id: "1embed",
    name: "1Embed",
    domains: ["1embed.cc"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://1embed.cc/embed/movie/{id}",
    tvTemplate: "https://1embed.cc/embed/tv/{id}/{season}/{episode}",
    docs: "https://1embed.cc/",
  },
  {
    id: "2embed",
    name: "2Embed",
    domains: ["www.2embed.cc", "www.2embed.skin", "2embed.stream", "2embed.skin"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://www.2embed.cc/embed/{id}",
    tvTemplate: "https://www.2embed.cc/embedtv/{id}?s={season}&e={episode}",
    docs: "https://www.2embed.cc/",
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    domains: ["player.autoembed.app", "autoembed.app"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://player.autoembed.app/embed/movie/{id}",
    tvTemplate: "https://player.autoembed.app/embed/tv/{id}/{season}/{episode}",
    docs: "https://autoembed.app/",
  },
  {
    id: "cinemaos",
    name: "CinemaOS",
    domains: ["cinemaos.tech"],
    idTypes: ["tmdb"],
    movieTemplate: "https://cinemaos.tech/player/{tmdbId}",
    tvTemplate: "https://cinemaos.tech/player/{tmdbId}/{season}/{episode}",
    docs: "https://cinemaos.tech/embed",
  },
  {
    id: "cinesrc",
    name: "CineSrc",
    domains: ["cinesrc.st"],
    idTypes: ["tmdb"],
    movieTemplate: "https://cinesrc.st/embed/movie/{tmdbId}",
    tvTemplate: "https://cinesrc.st/embed/tv/{tmdbId}?s={season}&e={episode}",
    docs: "https://cinesrc.st/",
  },
  {
    id: "icefy",
    name: "Icefy",
    domains: ["embed.icefy.top"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://embed.icefy.top/movie/{id}",
    tvTemplate: "https://embed.icefy.top/tv/{id}/{season}/{episode}",
    docs: "https://embed.icefy.top/",
  },
  {
    id: "mapple",
    name: "MappleTV",
    domains: ["mappletv.uk", "mapple.uk"],
    idTypes: ["tmdb"],
    movieTemplate: "https://mappletv.uk/watch/movie/{tmdbId}",
    tvTemplate: "https://mappletv.uk/watch/tv/{tmdbId}-{season}-{episode}",
    docs: "https://mappletv.uk/",
  },
  {
    id: "nontongo",
    name: "NontonGo",
    domains: ["nontongo.win"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://nontongo.win/embed/movie/{id}",
    tvTemplate: "https://nontongo.win/embed/tv/{id}/{season}/{episode}",
    docs: "https://nontongo.win/",
  },
  {
    id: "nxsha",
    name: "Nxsha",
    domains: ["web.nxsha.app"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://web.nxsha.app/embed/movie/{id}",
    tvTemplate: "https://web.nxsha.app/embed/tv/{id}/{season}/{episode}",
    docs: "https://web.nxsha.app/embed",
  },
  {
    id: "peachify",
    name: "Peachify",
    domains: ["peachify.top"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://peachify.top/embed/movie/{id}",
    tvTemplate: "https://peachify.top/embed/tv/{id}/{season}/{episode}",
    docs: "https://peachify.top/",
  },
  {
    id: "primesrc",
    name: "PrimeSrc",
    domains: ["primesrc.me"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://primesrc.me/embed/movie?tmdb={tmdbId}",
    tvTemplate: "https://primesrc.me/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}",
    docs: "https://primesrc.me/",
  },
  {
    id: "smashystream",
    name: "SmashyStream",
    domains: ["player.smashystream.com", "player.smashy.stream"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://player.smashystream.com/movie/{id}",
    tvTemplate: "https://player.smashystream.com/tv/{id}?s={season}&e={episode}",
    docs: "https://player.smashystream.com/",
  },
  {
    id: "streamvault",
    name: "StreamVault",
    domains: ["streamvaultsrc.click"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://streamvaultsrc.click/embed/movie/{id}",
    tvTemplate: "https://streamvaultsrc.click/embed/tv/{id}/{season}/{episode}",
    docs: "https://streamvaultsrc.click/",
  },
  {
    id: "superembed",
    name: "SuperEmbed",
    domains: ["multiembed.mov", "www.superembed.stream"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://multiembed.mov/?video_id={id}&tmdb=1",
    tvTemplate: "https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}",
    docs: "https://www.superembed.stream/",
  },
  {
    id: "superembed-vip",
    name: "SuperEmbed VIP",
    domains: ["getsuperembed.link"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: `${SUPEREMBED_VIP_PLAYER}?video_id={tmdbId}&tmdb=1`,
    tvTemplate: `${SUPEREMBED_VIP_PLAYER}?video_id={tmdbId}&tmdb=1&s={season}&e={episode}`,
    docs: "https://www.superembed.stream/",
    sandboxPolicy: "allow-scripts allow-same-origin allow-forms allow-popups",
    supportsSandbox: true,
    allowsPopups: true,
    isAdHeavy: true,
  },
  {
    id: "thisiscinema",
    name: "ThisIsCinema",
    domains: ["thisiscinema.pages.dev"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://thisiscinema.pages.dev/embed/movie/{id}",
    tvTemplate: "https://thisiscinema.pages.dev/embed/tv/{id}/{season}/{episode}",
    docs: "https://thisiscinema.pages.dev/",
  },
  {
    id: "vidapi",
    name: "VidAPI",
    domains: ["vidapi.xyz", "vidapi.ru"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidapi.xyz/embed/movie/{id}",
    tvTemplate: "https://vidapi.xyz/embed/tv/{id}/{season}/{episode}",
    docs: "https://vidapi.xyz/",
  },
  {
    id: "vidfast",
    name: "VidFast",
    domains: ["vidfast.pro", "vidfast.xyz", "vidfast.pm", "vidfast.net", "vidfast.me", "vidfast.io", "vidfast.in"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidfast.pro/movie/{id}",
    tvTemplate: "https://vidfast.pro/tv/{id}/{season}/{episode}",
    defaultParams: { autoPlay: "true" },
    docs: "https://vidfast.pro/",
  },
  {
    id: "vidflix",
    name: "VidFlix",
    domains: ["vidflix.club"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidflix.club/movie/{tmdbId}",
    tvTemplate: "https://vidflix.club/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidflix.club/",
  },
  {
    id: "vidjoy",
    name: "VidJoy",
    domains: ["vidjoy.pro"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidjoy.pro/embed/movie/{tmdbId}",
    tvTemplate: "https://vidjoy.pro/embed/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidjoy.pro/embed/doc",
  },
  {
    id: "vidking",
    name: "VidKing",
    domains: ["www.vidking.net", "vidking.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://www.vidking.net/embed/movie/{id}",
    tvTemplate: "https://www.vidking.net/embed/tv/{id}/{season}/{episode}",
    docs: "https://www.vidking.net/",
  },
  {
    id: "vidlink",
    name: "VidLink",
    domains: ["vidlink.pro"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidlink.pro/movie/{tmdbId}",
    tvTemplate: "https://vidlink.pro/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidlink.pro/",
  },
  {
    id: "vidplays",
    name: "VidPlays",
    domains: ["vidplays.fun"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidplays.fun/embed/movie/{tmdbId}",
    tvTemplate: "https://vidplays.fun/embed/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidplays.fun/",
  },
  {
    id: "vidrock",
    name: "VidRock",
    domains: ["vidrock.ru"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidrock.ru/movie/{id}",
    tvTemplate: "https://vidrock.ru/tv/{id}/{season}/{episode}",
    docs: "https://vidrock.ru/",
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    domains: ["vidsrc.to", "vidsrc.su", "vidsrc.vip", "vidsrc.rip", "www.vidsrc.wtf", "vidsrcme.ru", "vidsrc-me.ru", "vidsrc-me.su", "vsembed.ru"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidsrc.to/embed/movie/{id}",
    tvTemplate: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    docs: "https://vidsrc.to/",
  },
  {
    id: "vidsrc-xyz",
    name: "VidSrc Pro",
    domains: ["vidsrc.xyz", "vidsrc.me"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidsrc.xyz/embed/movie/{tmdbId}",
    tvTemplate: "https://vidsrc.xyz/embed/tv/{tmdbId}/{season}/{episode}",
    isAdHeavy: true,
  },
  {
    id: "vidsrc-embed",
    name: "VidSrc Embed",
    domains: ["vidsrc-embed.ru"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidsrc-embed.ru/embed/movie?tmdb={tmdbId}",
    tvTemplate: "https://vidsrc-embed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}",
    docs: "https://vidsrc-embed.ru/",
  },
  {
    id: "vidsync",
    name: "VidSync",
    domains: ["vidsync.xyz"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidsync.xyz/embed/movie/{id}",
    tvTemplate: "https://vidsync.xyz/embed/tv/{id}/{season}/{episode}",
    docs: "https://vidsync.xyz/",
  },
  {
    id: "vidup",
    name: "VidUp",
    domains: ["vidup.to"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidup.to/embed/{id}",
    tvTemplate: "https://vidup.to/embed/tv/{id}/{season}/{episode}",
    docs: "https://vidup.to/",
  },
  {
    id: "vidzee",
    name: "VidZee",
    domains: ["player.vidzee.wtf", "vidzee.wtf"],
    idTypes: ["tmdb"],
    movieTemplate: "https://player.vidzee.wtf/embed/movie/{tmdbId}",
    tvTemplate: "https://player.vidzee.wtf/embed/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidzee.wtf/",
  },
  {
    id: "vidzen",
    name: "VidZen",
    domains: ["vidzen.fun"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidzen.fun/movie/{tmdbId}",
    tvTemplate: "https://vidzen.fun/tv/{tmdbId}/{season}/{episode}",
    docs: "https://vidzen.fun/",
  },
  {
    id: "vidcore",
    name: "VidCore",
    domains: ["vidcore.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vidcore.net/embed/movie/{id}",
    tvTemplate: "https://vidcore.net/embed/tv/{id}/{season}/{episode}",
    docs: "https://vidcore.net/",
  },
  {
    id: "vixsrc",
    name: "VixSrc",
    domains: ["vixsrc.to"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://vixsrc.to/movie/{id}",
    tvTemplate: "https://vixsrc.to/tv/{id}/{season}/{episode}",
    docs: "https://vixsrc.to/",
  },
  {
    id: "vsembed",
    name: "VSEmbed",
    domains: ["vsembed.ru"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vsembed.ru/embed/movie?tmdb={tmdbId}",
    tvTemplate: "https://vsembed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}",
    docs: "https://vsembed.ru/",
  },
  {
    id: "wfs",
    name: "WatchFreeStreams",
    domains: ["embed.wfs.lol", "wfs.lol"],
    idTypes: ["tmdb"],
    movieTemplate: "https://embed.wfs.lol/embed/movie/{tmdbId}",
    tvTemplate: "https://embed.wfs.lol/embed/tv/{tmdbId}/{season}/{episode}",
    docs: "https://wfs.lol/embed-api",
  },
  {
    id: "embed-su",
    name: "Embed SU (High Quality)",
    domains: ["embed.su"],
    idTypes: ["tmdb"],
    movieTemplate: "https://embed.filmu.in/movie/{tmdbId}",
    tvTemplate: "https://embed.filmu.in/tv/{tmdbId}/{season}/{episode}",
    testedOnAndroidTV: true,
  },
  // --- New servers ---
  {
    id: "ovidads",
    name: "OVIDADS",
    domains: ["0vidads.top"],
    idTypes: ["tmdb"],
    movieTemplate: "https://0vidads.top/embed/movie/{tmdbId}",
    tvTemplate: "https://0vidads.top/embed/tv/{tmdbId}/{season}/{episode}",
    defaultParams: {
      branding: "bousy",
      server: "orion",
      subtitle: "English",
      color: "FF0000",
      loading: "2",
      back: "true",
    },
    category: "new",
  },
  {
    id: "atlantic",
    name: "Atlantic",
    domains: ["atlantic.st"],
    idTypes: ["tmdb"],
    movieTemplate: "https://atlantic.st/embed/movie/{tmdbId}",
    tvTemplate: "https://atlantic.st/embed/tv/{tmdbId}/{season}/{episode}",
    category: "new",
  },
  {
    id: "cinetaro",
    name: "Cinetaro",
    domains: ["cinextream.cc"],
    idTypes: ["tmdb"],
    movieTemplate: "https://cinextream.cc/api/embed/movie/{tmdbId}",
    tvTemplate: "https://cinextream.cc/api/embed/tv/{tmdbId}/{season}/{episode}",
    defaultParams: { color: "e91e63" },
    category: "new",
  },
  {
    id: "cinezo",
    name: "Cinezo",
    domains: ["player.cinezo.live"],
    idTypes: ["tmdb"],
    movieTemplate: "https://player.cinezo.live/embed/movie/{tmdbId}",
    tvTemplate: "https://player.cinezo.live/embed/tv/{tmdbId}/{season}/{episode}",
    defaultParams: CINEZO_PLAYER_PARAMS,
    category: "new",
  },
  {
    id: "fmov",
    name: "FMOV",
    domains: ["fmov.my"],
    idTypes: ["tmdb"],
    movieTemplate: "https://fmov.my/embed/movie/{tmdbId}",
    tvTemplate: "https://fmov.my/embed/tv/{tmdbId}/{season}/{episode}",
    category: "new",
  },
  {
    id: "framextv",
    name: "FrameXTV",
    domains: ["framextv.xyz"],
    idTypes: ["tmdb"],
    movieTemplate: "https://framextv.xyz/embed/{tmdbId}",
    tvTemplate: "https://framextv.xyz/embed/{tmdbId}/{season}/{episode}",
    defaultParams: { autoplay: "1", muted: "0" },
    category: "new",
  },
  {
    id: "stellar",
    name: "Stellar",
    domains: ["stellar.rip"],
    idTypes: ["tmdb"],
    movieTemplate: "https://stellar.rip/en/watch/embed/movie/{tmdbId}",
    tvTemplate: "https://stellar.rip/en/watch/embed/tv/{tmdbId}-{season}-{episode}",
    defaultParams: {
      theme: "9B8CFF",
      title: "true",
      poster: "true",
      autoPlay: "false",
      startAt: "0",
      nextButton: "true",
      autoNext: "false",
    },
    category: "new",
  },
  {
    id: "velarium",
    name: "Velarium",
    domains: ["velarium.cc"],
    idTypes: ["tmdb"],
    movieTemplate: "https://velarium.cc/en/watch/movie/{tmdbId}",
    tvTemplate: "https://velarium.cc/en/watch/tv/{tmdbId}-{season}-{episode}",
    defaultParams: {
      autoPlay: "false",
      theme: "A8E6CF",
      title: "true",
      poster: "true",
      startAt: "0",
      nextButton: "true",
      autoNext: "false",
      autoSkipIntro: "false",
      autoSkipOutro: "false",
    },
    category: "new",
  },
  {
    id: "viduki-1",
    name: "Viduki (Multi Server)",
    domains: ["viduki.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://viduki.net/1/movie/{id}",
    tvTemplate: "https://viduki.net/1/tv/{id}/{season}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
  {
    id: "viduki-2",
    name: "Viduki (Multi Language)",
    domains: ["viduki.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://viduki.net/2/movie/{id}",
    tvTemplate: "https://viduki.net/2/tv/{id}/{season}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
  {
    id: "viduki-3",
    name: "Viduki (Multi Embeds)",
    domains: ["viduki.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://viduki.net/3/movie/{id}",
    tvTemplate: "https://viduki.net/3/tv/{id}/{season}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
  {
    id: "viduki-4",
    name: "Viduki (Premium)",
    domains: ["viduki.net"],
    idTypes: ["tmdb", "imdb"],
    movieTemplate: "https://viduki.net/4/movie/{id}",
    tvTemplate: "https://viduki.net/4/tv/{id}/{season}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
  {
    id: "vidy",
    name: "Vidy",
    domains: ["vidy.st"],
    idTypes: ["tmdb"],
    movieTemplate: "https://vidy.st/movie/{tmdbId}",
    tvTemplate: "https://vidy.st/tv/{tmdbId}/{season}/{episode}",
    defaultParams: { color: "DC2626" },
    category: "new",
  },
];

export const EMBED_SERVER_CATALOG: EmbedServer[] = EMBED_SERVER_INPUTS.map((server) => {
  const compatibilityOnly = COMPATIBILITY_ONLY_SERVERS.has(server.id);
  return {
    sandboxPolicy: "allow-scripts allow-same-origin allow-forms",
    supportsSandbox: !compatibilityOnly,
    allowsPopups: compatibilityOnly,
    allowsFullscreen: true,
    testedOnAndroidTV: false,
    isAdHeavy: compatibilityOnly,
    category: "default",
    ...server,
  };
});

export function getServersByCategory(category: EmbedServerCategory): EmbedServer[] {
  return EMBED_SERVER_CATALOG.filter((s) => (s.category ?? "default") === category);
}

export function groupEmbedServers(servers: EmbedServer[] = EMBED_SERVER_CATALOG): {
  newServers: EmbedServer[];
  defaultServers: EmbedServer[];
} {
  const newServers: EmbedServer[] = [];
  const defaultServers: EmbedServer[] = [];
  for (const server of servers) {
    if ((server.category ?? "default") === "new") {
      newServers.push(server);
    } else {
      defaultServers.push(server);
    }
  }
  return { newServers, defaultServers };
}

export function getEmbedUrl(
  server: EmbedServer,
  type: "movie" | "tv",
  tmdbId: number | string,
  season?: number | string,
  episode?: number | string,
  options?: { startAtSec?: number }
): string {
  const template = type === "movie" ? server.movieTemplate : server.tvTemplate;
  let url = template
    .replace("{tmdbId}", String(tmdbId))
    .replace("{id}", String(tmdbId));

  if (type === "tv") {
    url = url
      .replace("{season}", String(season || 1))
      .replace("{episode}", String(episode || 1));
  }

  const parsedUrl = new URL(url);

  if (server.defaultParams) {
    Object.entries(server.defaultParams).forEach(([k, v]) => {
      parsedUrl.searchParams.set(k, v);
    });
  }

  if (
    options?.startAtSec != null &&
    options.startAtSec > 0 &&
    (server.id === "vidfast" || server.id === "peachify" || server.id === "primesrc")
  ) {
    parsedUrl.searchParams.set("startAt", String(Math.floor(options.startAtSec)));
  }

  return parsedUrl.toString();
}
