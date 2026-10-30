import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EMBED_SERVER_CATALOG,
  groupEmbedServers,
  getEmbedUrl,
} from "./embed";
import {
  ANIME_EMBED_SERVER_CATALOG,
  DEFAULT_ANIME_SERVER_ID,
  groupAnimeEmbedServers,
  getAnimeServerById,
  getAnimeEmbedUrl,
} from "./anime-embed";

describe("External Player Embed URLs & Server Catalog (Immutable Contract)", () => {
  it("groups TMDB movie/TV servers into new and default categories without losing servers", () => {
    const { newServers, defaultServers } = groupEmbedServers(EMBED_SERVER_CATALOG);
    assert.ok(newServers.length > 0);
    assert.ok(defaultServers.length > 0);
    assert.equal(newServers.length + defaultServers.length, EMBED_SERVER_CATALOG.length);
  });

  it("constructs exact unmodified movie embed URLs with default params and startAt when supported", () => {
    const vidsrc = EMBED_SERVER_CATALOG.find((s) => s.id === "vidsrc")!;
    assert.equal(
      getEmbedUrl(vidsrc, "movie", 693134),
      "https://vidsrc.to/embed/movie/693134"
    );

    const vidfast = EMBED_SERVER_CATALOG.find((s) => s.id === "vidfast")!;
    assert.equal(
      getEmbedUrl(vidfast, "movie", 693134, undefined, undefined, { startAtSec: 125.8 }),
      "https://vidfast.pro/movie/693134?autoPlay=true&startAt=125"
    );
  });

  it("constructs exact unmodified TV episode embed URLs across path and query-based servers", () => {
    const vidsrc = EMBED_SERVER_CATALOG.find((s) => s.id === "vidsrc")!;
    assert.equal(
      getEmbedUrl(vidsrc, "tv", 95396, 1, 4),
      "https://vidsrc.to/embed/tv/95396/1/4"
    );

    const twoEmbed = EMBED_SERVER_CATALOG.find((s) => s.id === "2embed")!;
    assert.equal(
      getEmbedUrl(twoEmbed, "tv", 95396, 2, 5),
      "https://www.2embed.cc/embedtv/95396?s=2&e=5"
    );
  });

  it("groups anime embed servers and constructs exact anime embed URLs", () => {
    const { newServers, defaultServers } = groupAnimeEmbedServers(ANIME_EMBED_SERVER_CATALOG);
    assert.equal(
      newServers.length + defaultServers.length,
      ANIME_EMBED_SERVER_CATALOG.length
    );

    const defaultServer = getAnimeServerById(DEFAULT_ANIME_SERVER_ID);
    assert.equal(defaultServer.id, "filmu");
    assert.equal(
      getAnimeEmbedUrl(defaultServer, 16498, 1, 4),
      "https://embed.filmu.in/anime/16498/1/4"
    );
    assert.equal(
      getAnimeEmbedUrl(16498, 1, 4),
      "https://embed.filmu.in/anime/16498/1/4"
    );
  });
});

