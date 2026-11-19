import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultServerConfig,
  DEFAULT_ACTIVE_TMDB_SERVER_IDS,
  DEFAULT_ACTIVE_ANIME_SERVER_IDS,
  validateCustomTmdbServer,
  validateCustomAnimeServer,
  sanitizeDynamicServerConfig,
  resolveActiveTmdbServers,
  resolveActiveAnimeServers,
  getAvailableBuiltInTmdbServers,
  getAvailableBuiltInAnimeServers,
  exportServerConfigJson,
  importServerConfigJson,
} from "./dynamic-servers";
import { EMBED_SERVER_CATALOG, getEmbedUrl } from "./embed";
import { ANIME_EMBED_SERVER_CATALOG, getAnimeEmbedUrl } from "./anime-embed";

describe("Dynamic Playback Servers & JSON Export/Import", () => {
  it("starts with curated Movie/TV defaults and all built-in Anime servers, keeping extra built-ins pickable", () => {
    const cfg = createDefaultServerConfig();
    assert.deepEqual(cfg.tmdbActiveIds, DEFAULT_ACTIVE_TMDB_SERVER_IDS);
    assert.deepEqual(cfg.animeActiveIds, DEFAULT_ACTIVE_ANIME_SERVER_IDS);
    assert.ok(cfg.tmdbActiveIds.length > 0);
    assert.ok(cfg.tmdbActiveIds.length < EMBED_SERVER_CATALOG.length);

    const availableTmdb = getAvailableBuiltInTmdbServers(cfg);
    assert.equal(
      availableTmdb.length + cfg.tmdbActiveIds.length,
      EMBED_SERVER_CATALOG.length
    );
    assert.equal(getAvailableBuiltInAnimeServers(cfg).length, 0);
  });

  it("validates custom Movie/TV HTTPS templates and rejects non-HTTPS or missing placeholders", () => {
    const badProto = validateCustomTmdbServer({
      name: "Insecure",
      movieTemplate: "http://example.com/movie/{tmdbId}",
      tvTemplate: "https://example.com/tv/{tmdbId}/{season}/{episode}",
    });
    assert.equal(badProto.ok, false);

    const jsProto = validateCustomTmdbServer({
      name: "XSS",
      movieTemplate: "javascript:alert(1)//{tmdbId}",
      tvTemplate: "https://example.com/tv/{tmdbId}/{season}/{episode}",
    });
    assert.equal(jsProto.ok, false);

    const missingPlaceholder = validateCustomTmdbServer({
      name: "Missing TV Ep",
      movieTemplate: "https://mirror.example.com/movie/{tmdbId}",
      tvTemplate: "https://mirror.example.com/tv/{tmdbId}/{season}",
    });
    assert.equal(missingPlaceholder.ok, false);

    const valid = validateCustomTmdbServer({
      name: "My Cinema Mirror",
      movieTemplate: "https://mirror.example.com/embed/movie/{tmdbId}",
      tvTemplate: "https://mirror.example.com/embed/tv/{tmdbId}/{season}/{episode}",
      supportsSandbox: true,
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.deepEqual(valid.server.domains, ["mirror.example.com"]);
      assert.equal(valid.server.supportsSandbox, true);
    }
  });

  it("validates custom Anime HTTPS templates and resolves runnable embed URLs", () => {
    const missingId = validateCustomAnimeServer({
      name: "Missing ID",
      template: "https://anime.example.com/watch/static",
    });
    assert.equal(missingId.ok, false);

    const insecure = validateCustomAnimeServer({
      name: "HTTP Only",
      template: "http://anime.example.com/e/{anilistId}/{episode}",
    });
    assert.equal(insecure.ok, false);

    const valid = validateCustomAnimeServer({
      name: "My Anime Node",
      template: "https://anime.example.com/e/{anilistId}/{season}/{episode}",
      supportsSandbox: false,
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      const cfg = sanitizeDynamicServerConfig({
        ...createDefaultServerConfig(),
        customAnimeServers: [valid.server],
        animeActiveIds: [valid.server.id, ...DEFAULT_ACTIVE_ANIME_SERVER_IDS],
      });
      const active = resolveActiveAnimeServers(cfg);
      assert.equal(active[0].id, valid.server.id);
      assert.equal(
        getAnimeEmbedUrl(active[0], 154587, 1, 5),
        "https://anime.example.com/e/154587/1/5"
      );
    }
  });

  it("resolves ordered TMDB servers including custom mirrors and falls back safely if active list is empty", () => {
    const custom = validateCustomTmdbServer({
      name: "Custom Mirror",
      movieTemplate: "https://stream.example.org/m/{tmdbId}",
      tvTemplate: "https://stream.example.org/t/{tmdbId}/{season}/{episode}",
    });
    assert.equal(custom.ok, true);
    if (!custom.ok) return;

    const cfg = sanitizeDynamicServerConfig({
      tmdbActiveIds: [custom.server.id, "vidfast", "vidsrc"],
      animeActiveIds: [],
      customTmdbServers: [custom.server],
      customAnimeServers: [],
    });

    const activeTmdb = resolveActiveTmdbServers(cfg);
    assert.deepEqual(
      activeTmdb.map((s) => s.id),
      [custom.server.id, "vidfast", "vidsrc"]
    );
    assert.equal(
      getEmbedUrl(activeTmdb[0], "movie", 693134),
      "https://stream.example.org/m/693134"
    );
    assert.equal(
      getEmbedUrl(activeTmdb[0], "tv", 95396, 2, 7),
      "https://stream.example.org/t/95396/2/7"
    );

    // Empty active anime IDs must fall back cleanly to built-in catalog
    const fallbackAnime = resolveActiveAnimeServers(cfg);
    assert.equal(fallbackAnime.length, ANIME_EMBED_SERVER_CATALOG.length);
  });

  it("exports and re-imports server configs cleanly in both merge and replace modes", () => {
    const base = createDefaultServerConfig();
    const customA = validateCustomTmdbServer({
      id: "custom-tmdb-alpha",
      name: "Alpha Mirror",
      movieTemplate: "https://alpha.example.net/movie/{tmdbId}",
      tvTemplate: "https://alpha.example.net/tv/{tmdbId}/{season}/{episode}",
    });
    const customB = validateCustomAnimeServer({
      id: "custom-anime-beta",
      name: "Beta Anime",
      template: "https://beta.example.net/anime/{anilistId}/{episode}",
    });
    assert.ok(customA.ok && customB.ok);
    if (!customA.ok || !customB.ok) return;

    const exportedCfg = sanitizeDynamicServerConfig({
      tmdbActiveIds: [customA.server.id, "vidsrc"],
      animeActiveIds: [customB.server.id],
      customTmdbServers: [customA.server],
      customAnimeServers: [customB.server],
    });
    const json = exportServerConfigJson(exportedCfg);

    const merged = importServerConfigJson(json, base, "merge");
    assert.equal(merged.ok, true);
    if (merged.ok) {
      assert.ok(merged.config.tmdbActiveIds.includes("vidfast"));
      assert.ok(merged.config.tmdbActiveIds.includes(customA.server.id));
      assert.ok(merged.config.animeActiveIds.includes(customB.server.id));
      assert.equal(merged.summary.customTmdbCount, 1);
      assert.equal(merged.summary.customAnimeCount, 1);
    }

    const replaced = importServerConfigJson(json, base, "replace");
    assert.equal(replaced.ok, true);
    if (replaced.ok) {
      assert.deepEqual(replaced.config.tmdbActiveIds, [customA.server.id, "vidsrc"]);
      assert.deepEqual(replaced.config.animeActiveIds, [customB.server.id]);
    }
  });

  it("rejects malformed or unrelated JSON on import", () => {
    const base = createDefaultServerConfig();
    assert.equal(importServerConfigJson("{bad json", base, "merge").ok, false);
    assert.equal(importServerConfigJson("[]", base, "merge").ok, false);
    assert.equal(importServerConfigJson('{"foo":"bar"}', base, "merge").ok, false);
  });
});
