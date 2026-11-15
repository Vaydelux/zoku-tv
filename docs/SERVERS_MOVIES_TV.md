# Movies & TV Shows — Embed Servers

> Source of truth: [`lib/embed.ts`](../lib/embed.ts) (`EMBED_SERVER_CATALOG`). This document describes configured integrations, **not verified server availability, playback success, safety, or licensing**.

**Total configured entries:** 46 (13 `new`, 33 `default`). Each entry defines both a movie and TV-episode URL template. Anime integrations are documented separately in [Anime servers](./SERVERS_ANIME.md).

## URL construction

- Application utility: `getEmbedUrl(server, type, tmdbId, season?, episode?, options?)` from `lib/embed.ts`.
- `{tmdbId}` is the TMDB title ID; `{id}` receives the same argument; `{season}` and `{episode}` are one-based numeric TV selectors (both default to `1`).
- `idTypes` below is the **declared server capability**. The current `getEmbedUrl` helper substitutes the supplied `tmdbId` into both `{tmdbId}` and `{id}`, even for entries declaring IMDb support; it does not perform IMDb/TMDB conversion.
- The templates below are the **base templates**. `getEmbedUrl` adds `defaultParams` as query parameters and may set `startAt` on supported servers.
- The `new` and `default` categories control the server selector grouping (`Recommended servers` / `All servers`). They do not constitute uptime or quality rankings.

## New / recommended group (13)

| Server | ID | Accepted IDs (declared) | Configured domains | Movie URL template | TV episode URL template |
| --- | --- | --- | --- | --- | --- |
| OVIDADS | `ovidads` | tmdb | `0vidads.top` | `https://0vidads.top/embed/movie/{tmdbId}` | `https://0vidads.top/embed/tv/{tmdbId}/{season}/{episode}` |
| Atlantic | `atlantic` | tmdb | `atlantic.st` | `https://atlantic.st/embed/movie/{tmdbId}` | `https://atlantic.st/embed/tv/{tmdbId}/{season}/{episode}` |
| Cinetaro | `cinetaro` | tmdb | `cinextream.cc` | `https://cinextream.cc/api/embed/movie/{tmdbId}` | `https://cinextream.cc/api/embed/tv/{tmdbId}/{season}/{episode}` |
| Cinezo | `cinezo` | tmdb | `player.cinezo.live` | `https://player.cinezo.live/embed/movie/{tmdbId}` | `https://player.cinezo.live/embed/tv/{tmdbId}/{season}/{episode}` |
| FMOV | `fmov` | tmdb | `fmov.my` | `https://fmov.my/embed/movie/{tmdbId}` | `https://fmov.my/embed/tv/{tmdbId}/{season}/{episode}` |
| FrameXTV | `framextv` | tmdb | `framextv.xyz` | `https://framextv.xyz/embed/{tmdbId}` | `https://framextv.xyz/embed/{tmdbId}/{season}/{episode}` |
| Stellar | `stellar` | tmdb | `stellar.rip` | `https://stellar.rip/en/watch/embed/movie/{tmdbId}` | `https://stellar.rip/en/watch/embed/tv/{tmdbId}-{season}-{episode}` |
| Velarium | `velarium` | tmdb | `velarium.cc` | `https://velarium.cc/en/watch/movie/{tmdbId}` | `https://velarium.cc/en/watch/tv/{tmdbId}-{season}-{episode}` |
| Viduki (Multi Server) | `viduki-1` | tmdb, imdb | `viduki.net` | `https://viduki.net/1/movie/{id}` | `https://viduki.net/1/tv/{id}/{season}/{episode}` |
| Viduki (Multi Language) | `viduki-2` | tmdb, imdb | `viduki.net` | `https://viduki.net/2/movie/{id}` | `https://viduki.net/2/tv/{id}/{season}/{episode}` |
| Viduki (Multi Embeds) | `viduki-3` | tmdb, imdb | `viduki.net` | `https://viduki.net/3/movie/{id}` | `https://viduki.net/3/tv/{id}/{season}/{episode}` |
| Viduki (Premium) | `viduki-4` | tmdb, imdb | `viduki.net` | `https://viduki.net/4/movie/{id}` | `https://viduki.net/4/tv/{id}/{season}/{episode}` |
| Vidy | `vidy` | tmdb | `vidy.st` | `https://vidy.st/movie/{tmdbId}` | `https://vidy.st/tv/{tmdbId}/{season}/{episode}` |

## Default / all-servers group (33)

| Server | ID | Accepted IDs (declared) | Configured domains | Movie URL template | TV episode URL template |
| --- | --- | --- | --- | --- | --- |
| 111Movies | `111movies` | tmdb, imdb | `111movies.net` | `https://111movies.net/movie/{id}` | `https://111movies.net/tv/{id}/{season}/{episode}` |
| 1Embed | `1embed` | tmdb, imdb | `1embed.cc` | `https://1embed.cc/embed/movie/{id}` | `https://1embed.cc/embed/tv/{id}/{season}/{episode}` |
| 2Embed | `2embed` | tmdb, imdb | `www.2embed.cc`, `www.2embed.skin`, `2embed.stream`, `2embed.skin` | `https://www.2embed.cc/embed/{id}` | `https://www.2embed.cc/embedtv/{id}?s={season}&e={episode}` |
| AutoEmbed | `autoembed` | tmdb, imdb | `player.autoembed.app`, `autoembed.app` | `https://player.autoembed.app/embed/movie/{id}` | `https://player.autoembed.app/embed/tv/{id}/{season}/{episode}` |
| CinemaOS | `cinemaos` | tmdb | `cinemaos.tech` | `https://cinemaos.tech/player/{tmdbId}` | `https://cinemaos.tech/player/{tmdbId}/{season}/{episode}` |
| CineSrc | `cinesrc` | tmdb | `cinesrc.st` | `https://cinesrc.st/embed/movie/{tmdbId}` | `https://cinesrc.st/embed/tv/{tmdbId}?s={season}&e={episode}` |
| Icefy | `icefy` | tmdb, imdb | `embed.icefy.top` | `https://embed.icefy.top/movie/{id}` | `https://embed.icefy.top/tv/{id}/{season}/{episode}` |
| MappleTV | `mapple` | tmdb | `mappletv.uk`, `mapple.uk` | `https://mappletv.uk/watch/movie/{tmdbId}` | `https://mappletv.uk/watch/tv/{tmdbId}-{season}-{episode}` |
| NontonGo | `nontongo` | tmdb, imdb | `nontongo.win` | `https://nontongo.win/embed/movie/{id}` | `https://nontongo.win/embed/tv/{id}/{season}/{episode}` |
| Nxsha | `nxsha` | tmdb, imdb | `web.nxsha.app` | `https://web.nxsha.app/embed/movie/{id}` | `https://web.nxsha.app/embed/tv/{id}/{season}/{episode}` |
| Peachify | `peachify` | tmdb, imdb | `peachify.top` | `https://peachify.top/embed/movie/{id}` | `https://peachify.top/embed/tv/{id}/{season}/{episode}` |
| PrimeSrc | `primesrc` | tmdb, imdb | `primesrc.me` | `https://primesrc.me/embed/movie?tmdb={tmdbId}` | `https://primesrc.me/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}` |
| SmashyStream | `smashystream` | tmdb, imdb | `player.smashystream.com`, `player.smashy.stream` | `https://player.smashystream.com/movie/{id}` | `https://player.smashystream.com/tv/{id}?s={season}&e={episode}` |
| StreamVault | `streamvault` | tmdb, imdb | `streamvaultsrc.click` | `https://streamvaultsrc.click/embed/movie/{id}` | `https://streamvaultsrc.click/embed/tv/{id}/{season}/{episode}` |
| SuperEmbed | `superembed` | tmdb, imdb | `multiembed.mov`, `www.superembed.stream` | `https://multiembed.mov/?video_id={id}&tmdb=1` | `https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}` |
| ThisIsCinema | `thisiscinema` | tmdb, imdb | `thisiscinema.pages.dev` | `https://thisiscinema.pages.dev/embed/movie/{id}` | `https://thisiscinema.pages.dev/embed/tv/{id}/{season}/{episode}` |
| VidAPI | `vidapi` | tmdb, imdb | `vidapi.xyz`, `vidapi.ru` | `https://vidapi.xyz/embed/movie/{id}` | `https://vidapi.xyz/embed/tv/{id}/{season}/{episode}` |
| VidFast | `vidfast` | tmdb, imdb | `vidfast.pro`, `vidfast.xyz`, `vidfast.pm`, `vidfast.net`, `vidfast.me`, `vidfast.io`, `vidfast.in` | `https://vidfast.pro/movie/{id}` | `https://vidfast.pro/tv/{id}/{season}/{episode}` |
| VidJoy | `vidjoy` | tmdb | `vidjoy.pro` | `https://vidjoy.pro/embed/movie/{tmdbId}` | `https://vidjoy.pro/embed/tv/{tmdbId}/{season}/{episode}` |
| VidKing | `vidking` | tmdb, imdb | `www.vidking.net`, `vidking.net` | `https://www.vidking.net/embed/movie/{id}` | `https://www.vidking.net/embed/tv/{id}/{season}/{episode}` |
| VidLink | `vidlink` | tmdb | `vidlink.pro` | `https://vidlink.pro/movie/{tmdbId}` | `https://vidlink.pro/tv/{tmdbId}/{season}/{episode}` |
| VidPlays | `vidplays` | tmdb | `vidplays.fun` | `https://vidplays.fun/embed/movie/{tmdbId}` | `https://vidplays.fun/embed/tv/{tmdbId}/{season}/{episode}` |
| VidRock | `vidrock` | tmdb, imdb | `vidrock.ru` | `https://vidrock.ru/movie/{id}` | `https://vidrock.ru/tv/{id}/{season}/{episode}` |
| VidSrc | `vidsrc` | tmdb, imdb | `vidsrc.to`, `vidsrc.su`, `vidsrc.rip`, `www.vidsrc.wtf`, `vidsrcme.ru`, `vidsrc-me.ru`, `vidsrc-me.su`, `vsembed.ru` | `https://vidsrc.to/embed/movie/{id}` | `https://vidsrc.to/embed/tv/{id}/{season}/{episode}` |
| VidSrc Embed | `vidsrc-embed` | tmdb | `vidsrc-embed.ru` | `https://vidsrc-embed.ru/embed/movie?tmdb={tmdbId}` | `https://vidsrc-embed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}` |
| VidSync | `vidsync` | tmdb, imdb | `vidsync.xyz` | `https://vidsync.xyz/embed/movie/{id}` | `https://vidsync.xyz/embed/tv/{id}/{season}/{episode}` |
| VidUp | `vidup` | tmdb, imdb | `vidup.to` | `https://vidup.to/embed/{id}` | `https://vidup.to/embed/tv/{id}/{season}/{episode}` |
| VidZee | `vidzee` | tmdb | `player.vidzee.wtf`, `vidzee.wtf` | `https://player.vidzee.wtf/embed/movie/{tmdbId}` | `https://player.vidzee.wtf/embed/tv/{tmdbId}/{season}/{episode}` |
| VidZen | `vidzen` | tmdb | `vidzen.fun` | `https://vidzen.fun/movie/{tmdbId}` | `https://vidzen.fun/tv/{tmdbId}/{season}/{episode}` |
| VidCore | `vidcore` | tmdb, imdb | `vidcore.net` | `https://vidcore.net/embed/movie/{id}` | `https://vidcore.net/embed/tv/{id}/{season}/{episode}` |
| VixSrc | `vixsrc` | tmdb, imdb | `vixsrc.to` | `https://vixsrc.to/movie/{id}` | `https://vixsrc.to/tv/{id}/{season}/{episode}` |
| VSEmbed | `vsembed` | tmdb | `vsembed.ru` | `https://vsembed.ru/embed/movie?tmdb={tmdbId}` | `https://vsembed.ru/embed/tv?tmdb={tmdbId}&season={season}&episode={episode}` |
| Embed SU (High Quality) | `embed-su` | tmdb | `embed.filmu.in` | `https://embed.filmu.in/movie/{tmdbId}` | `https://embed.filmu.in/tv/{tmdbId}/{season}/{episode}` |

## Automatically applied default query parameters

These parameters are appended by `getEmbedUrl` rather than being part of the URL templates above.

| Server | Parameters |
| --- | --- |
| `vidfast` | `autoPlay=true` |
| `ovidads` | `branding=bousy`, `server=orion`, `subtitle=English`, `color=FF0000`, `loading=2`, `back=true` |
| `cinetaro` | `color=e91e63` |
| `cinezo` | `CINEZO_PLAYER_PARAMS` |
| `framextv` | `autoplay=1`, `muted=0` |
| `stellar` | `theme=9B8CFF`, `title=true`, `poster=true`, `autoPlay=false`, `startAt=0`, `nextButton=true`, `autoNext=false` |
| `velarium` | `autoPlay=false`, `theme=A8E6CF`, `title=true`, `poster=true`, `startAt=0`, `nextButton=true`, `autoNext=false`, `autoSkipIntro=false`, `autoSkipOutro=false` |
| `viduki-1` | `color=DC2626` |
| `viduki-2` | `color=DC2626` |
| `viduki-3` | `color=DC2626` |
| `viduki-4` | `color=DC2626` |
| `vidy` | `color=DC2626` |

## Implementation notes

- `CINEZO_PLAYER_PARAMS` is declared in `lib/embed.ts` and shared by the `cinezo` movie/TV server. See that constant for the full set of player styling and behavior values.
- The optional resume-position query key `startAt` is added only for `vidfast`, `peachify`, and `primesrc` when `options.startAtSec > 0`.
- The code marks `2embed`, `superembed`, `vidsrc`, `vidup`, and `smashystream` as compatibility-only (with different iframe sandbox / popup defaults); other entries can also override ad or sandbox flags.
- `testedOnAndroidTV` is a static configuration flag, not a live device-health result. Only `embed-su` sets it to `true` in the current catalog.
- Removed inactive `vidsrc-xyz` (active hostname `vidsrc.xyz` failed two DNS lookups), removed obsolete alias `vidsrc.vip`, and removed `superembed-vip` because its default `/se_player.php` requires PHP execution unavailable to the Vercel/Next.js deployment. `embed-su` metadata now matches its actual Filmu host.
- `vidflix` and `wfs` were retired after two distinct external audits consistently returned HTTP 520 or 525 (upstream/server-side failures) at their hosts. This is a conservative availability decision, **not a playback verification**; the entries can be reconsidered if service recovers.
- Remaining providers with HTTP 403, HTTP 404 or HTTPS timeout are **not proven broken embeds** by a root-domain probe. Audit details are published by the Zoku Server Domain Inventory workflow.
- Third-party sites can change URLs, content, embed restrictions, advertisements, and availability independently of this repository. Validate ownership, permissions, and provider behavior before using an integration.

## Maintaining this list

Update the relevant object in [`lib/embed.ts`](../lib/embed.ts) first, then update this documentation to match. For URL-shape changes, update [`lib/embed.test.ts`](../lib/embed.test.ts). This Markdown file is not loaded as runtime configuration.
