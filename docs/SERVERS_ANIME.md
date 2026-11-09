# Anime — Embed Servers

> Source of truth: [`lib/anime-embed.ts`](../lib/anime-embed.ts) (`ANIME_EMBED_SERVER_CATALOG`). This lists **configured** third-party embeds, not verified stream availability, playback, safety, or licensing.

**Total configured entries:** 5 (4 `new`, 1 `default`). Movies and TV use a distinct catalog: [Movie & TV servers](./SERVERS_MOVIES_TV.md).

## Server catalog

| Server | ID | Group | Configured domains | Anime episode URL template | Default query parameters |
| --- | --- | --- | --- | --- | --- |
| Filmu | `filmu` | default | `embed.filmu.in` | `https://embed.filmu.in/anime/{anilistId}/{season}/{episode}` | — |
| Cinezo | `cinezo` | new | `player.cinezo.live` | `https://player.cinezo.live/embed/anime/{anilistId}` | `CINEZO_PLAYER_PARAMS` |
| FMOV | `fmov` | new | `fmov.my` | `https://fmov.my/embed/anime/{anilistId}/{season}/{episode}` | — |
| Cinetaro | `cinetaro` | new | `cinextream.cc` | `https://cinextream.cc/api/embed/anime/sub/{anilistId}/{episode}` | `color=e91e63` |
| Vidy | `vidy` | new | `vidy.st` | `https://vidy.st/anime/{anilistId}/{episode}` | `color=DC2626` |

## URL construction

- Application utility: `getAnimeEmbedUrl(server, anilistId, season, episode)` in `lib/anime-embed.ts`.
- `{anilistId}` is the AniList media ID. `{season}` and `{episode}` represent the one-based selectors; where present in a template, missing or falsy values are replaced by `1`.
- Only placeholders actually included in a server's template are substituted. The `cinezo` anime template uses **only** `{anilistId}`, while `cinetaro` and `vidy` use `{anilistId}` and `{episode}` but **not** `{season}`. This can limit episode selection depending on provider behavior.
- `defaultParams` are added as URL query parameters. `cinezo` uses the shared `CINEZO_PLAYER_PARAMS` styling/playback constant; see [`lib/anime-embed.ts`](../lib/anime-embed.ts).
- The current default server ID is `filmu` (`DEFAULT_ANIME_SERVER_ID`). An unknown selected ID falls back to `filmu` via `getAnimeServerById`.
- `new` and `default` groupings only affect display in the server picker; they do not guarantee availability or compatibility.

## Example

Using `filmu`, AniList ID `16498`, season `1`, episode `4` yields:

```text
https://embed.filmu.in/anime/16498/1/4
```

This example is based on the existing URL-construction test; it is not a verified playable stream.

## Maintaining this list

Update [`lib/anime-embed.ts`](../lib/anime-embed.ts) first, keep this document in sync, and update [`lib/embed.test.ts`](../lib/embed.test.ts) when URL behavior changes. This file is documentation, not a runtime source list. Check third-party permissions and embed restrictions before enabling servers.
