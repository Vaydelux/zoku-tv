import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCatalogTitle,
  computeTitleSimilarity,
  isTmdbAnimeCandidate,
  findBestAnimeMatchForTmdb,
  findBestTmdbMatchForAnime,
} from "./catalog-bridge";
import { buildFranchiseTimeline } from "./anilist-seasons";
import {
  selectBecauseYouWatchedAnchor,
  filterBecauseYouWatchedRecommendations,
  deriveLatestAiredAnimeEpisode,
  evaluateNewEpisodeRadar,
} from "./discovery-intelligence";
import type { AniListMedia, AniListMediaDetail } from "./anilist";
import type { TMDBTitle } from "./tmdb";

describe("Cross-Catalog Bridge (TMDB <-> AniList)", () => {
  test("normalizes titles by stripping season suffixes, punctuation, and years", () => {
    assert.equal(
      normalizeCatalogTitle("Attack on Titan: Season 2 (2017)"),
      "attack on titan"
    );
    assert.equal(
      normalizeCatalogTitle("Demon Slayer -Kimetsu no Yaiba- Part 1"),
      "demon slayer kimetsu no yaiba"
    );
  });

  test("computes high similarity for matching English/Romaji titles", () => {
    assert.equal(computeTitleSimilarity("Jujutsu Kaisen", "Jujutsu Kaisen"), 1);
    assert.ok(
      computeTitleSimilarity("Frieren: Beyond Journey's End", "Frieren Beyond Journeys End") >=
        0.95
    );
    assert.ok(computeTitleSimilarity("One Piece", "Breaking Bad") < 0.2);
  });

  test("detects Japanese Animation candidates on TMDB accurately", () => {
    assert.equal(
      isTmdbAnimeCandidate({
        title: "Spirited Away",
        genres: [{ id: 16, name: "Animation" }],
        original_language: "ja",
      }),
      true
    );
    assert.equal(
      isTmdbAnimeCandidate({
        name: "Frieren",
        genre_ids: [16, 10759],
        origin_country: ["JP"],
      }),
      true
    );
    // Non-Japanese animation or live-action drama should not trigger anime bridge
    assert.equal(
      isTmdbAnimeCandidate({
        title: "Toy Story",
        genres: [{ id: 16, name: "Animation" }],
        original_language: "en",
        origin_country: ["US"],
      }),
      false
    );
    assert.equal(
      isTmdbAnimeCandidate({
        title: "Shogun",
        genres: [{ id: 18, name: "Drama" }],
        original_language: "ja",
      }),
      false
    );
  });

  test("resolves best AniList match for a TMDB anime series", () => {
    const candidates: AniListMedia[] = [
      {
        id: 154587,
        title: {
          english: "Frieren: Beyond Journey's End",
          romaji: "Sousou no Frieren",
          native: "葬送のフリーレン",
        },
        format: "TV",
        seasonYear: 2023,
        averageScore: 91,
        episodes: 28,
        coverImage: { large: "https://s4.anilist.co/frieren.jpg" },
      },
      {
        id: 99999,
        title: {
          english: "Unrelated Fantasy OVA",
          romaji: "Unrelated",
        },
        format: "OVA",
        seasonYear: 2015,
        averageScore: 65,
      },
    ];

    const match = findBestAnimeMatchForTmdb(
      {
        title: "Frieren: Beyond Journey's End",
        originalTitle: "葬送のフリーレン",
        releaseYear: 2023,
        mediaType: "tv",
      },
      candidates
    );

    assert.ok(match);
    assert.equal(match.targetCatalog, "anime");
    assert.equal(match.targetId, 154587);
    assert.equal(match.href, "/anime/154587");
    assert.equal(match.scoreLabel, "9.1");
    assert.ok(match.confidence >= 0.9);
  });

  test("resolves best TMDB match for an AniList anime entry", () => {
    const candidates: TMDBTitle[] = [
      {
        id: 209867,
        name: "Frieren: Beyond Journey's End",
        overview: "After the party of heroes defeated the Demon King...",
        poster_path: "/frieren.jpg",
        backdrop_path: "/frieren-bg.jpg",
        media_type: "tv",
        first_air_date: "2023-09-29",
        vote_average: 8.9,
        genre_ids: [16, 18],
      },
      {
        id: 1001,
        title: "Live Action Movie",
        overview: "",
        poster_path: null,
        backdrop_path: null,
        media_type: "movie",
        release_date: "2010-01-01",
        vote_average: 6.0,
        genre_ids: [28],
      },
    ];

    const match = findBestTmdbMatchForAnime(
      {
        englishTitle: "Frieren: Beyond Journey's End",
        romajiTitle: "Sousou no Frieren",
        releaseYear: 2023,
        format: "TV",
      },
      candidates
    );

    assert.ok(match);
    assert.equal(match.targetCatalog, "tmdb");
    assert.equal(match.targetId, 209867);
    assert.equal(match.targetMediaType, "tv");
    assert.equal(match.href, "/title/tv/209867");
    assert.ok(match.confidence >= 0.85);
  });
});

describe("Anime Franchise Watch-Order Timeline", () => {
  test("separates Main Storyline from Movies/OVAs/Side Stories chronologically and tracks completion", () => {
    const detail: AniListMediaDetail = {
      id: 200,
      title: { english: "Hero Academia Season 2", romaji: "Boku no Hero Academia 2" },
      format: "TV",
      episodes: 25,
      startDate: { year: 2017, month: 4, day: 1 },
      relations: {
        edges: [
          {
            relationType: "PREQUEL",
            node: {
              id: 100,
              type: "ANIME",
              title: { english: "Hero Academia Season 1" },
              format: "TV",
              episodes: 13,
              startDate: { year: 2016, month: 4, day: 3 },
            },
          },
          {
            relationType: "SEQUEL",
            node: {
              id: 300,
              type: "ANIME",
              title: { english: "Hero Academia Season 3" },
              format: "TV",
              episodes: 25,
              startDate: { year: 2018, month: 4, day: 7 },
            },
          },
          {
            relationType: "SIDE_STORY",
            node: {
              id: 250,
              type: "ANIME",
              title: { english: "Hero Academia: Two Heroes" },
              format: "MOVIE",
              episodes: 1,
              startDate: { year: 2018, month: 8, day: 3 },
            },
          },
          {
            relationType: "SIDE_STORY",
            node: {
              id: 150,
              type: "ANIME",
              title: { english: "Hero Academia Training OVA" },
              format: "OVA",
              episodes: 2,
              startDate: { year: 2017, month: 6, day: 2 },
            },
          },
        ],
      },
    };

    const timeline = buildFranchiseTimeline(detail, (id) => {
      if (id === 100) return { status: "completed", lastEpisode: 13, progressPercent: 100 };
      if (id === 200) return { status: "in_progress", lastEpisode: 8, progressPercent: 45 };
      return { status: "unwatched" };
    });

    assert.equal(timeline.mainStoryline.length, 3);
    assert.deepEqual(
      timeline.mainStoryline.map((n) => n.anilistId),
      [100, 200, 300]
    );
    assert.deepEqual(
      timeline.mainStoryline.map((n) => n.orderIndex),
      [1, 2, 3]
    );
    assert.equal(timeline.mainStoryline[0].watchStatus, "completed");
    assert.equal(timeline.mainStoryline[1].watchStatus, "in_progress");
    assert.equal(timeline.mainStoryline[1].isCurrent, true);
    assert.equal(timeline.mainStoryline[2].watchStatus, "unwatched");

    assert.equal(timeline.sideStoriesAndMovies.length, 2);
    assert.deepEqual(
      timeline.sideStoriesAndMovies.map((n) => n.anilistId),
      [150, 250]
    );
    assert.equal(timeline.completedEntries, 1);
    assert.equal(timeline.totalEntries, 5);
  });
});

describe("Discovery Intelligence: Because You Watched & New Episode Radar", () => {
  test("selects highest-signal anchor title from watch history for active catalog", () => {
    const anchor = selectBecauseYouWatchedAnchor(
      [
        {
          media_type: "movie",
          tmdbId: 550,
          title: "Fight Club",
          poster_path: null,
          progress_percent: 20,
          completed: false,
          watch_count: 1,
          last_watched_at: "2026-11-18T10:00:00Z",
        },
        {
          media_type: "tv",
          tmdbId: 1399,
          title: "Game of Thrones",
          poster_path: null,
          progress_percent: 100,
          completed: true,
          watch_count: 2,
          last_watched_at: "2026-11-19T08:00:00Z",
        },
      ],
      [],
      "tmdb"
    );

    assert.ok(anchor);
    assert.equal(anchor.id, 1399);
    assert.equal(anchor.title, "Game of Thrones");
    assert.equal(anchor.mediaType, "tv");
  });

  test("filters out already-watched titles and the anchor itself from recommendations", () => {
    const recs = [
      { id: 1399, name: "Anchor Show" },
      { id: 101, name: "Already Watched Show" },
      { id: 202, name: "Fresh Recommendation 1" },
      { id: 303, name: "Fresh Recommendation 2" },
    ];
    const filtered = filterBecauseYouWatchedRecommendations(
      recs,
      1399,
      new Set([101])
    );
    assert.deepEqual(
      filtered.map((r) => r.id),
      [202, 303]
    );
  });

  test("computes latest aired anime episode and New Episode Radar status accurately", () => {
    const latestReleasing = deriveLatestAiredAnimeEpisode({
      status: "RELEASING",
      episodes: 24,
      nextAiringEpisode: {
        episode: 11,
        airingAt: 1900000000,
        timeUntilAiring: 86400,
      },
    });
    assert.equal(latestReleasing, 10);

    const radarSingle = evaluateNewEpisodeRadar({
      highestWatchedEpisode: 9,
      latestAiredEpisode: latestReleasing,
    });
    assert.equal(radarSingle.hasNewEpisode, true);
    assert.equal(radarSingle.nextUnreadEpisode, 10);
    assert.equal(radarSingle.newEpisodeCount, 1);
    assert.equal(radarSingle.badgeText, "New Ep 10");

    const radarMulti = evaluateNewEpisodeRadar({
      highestWatchedEpisode: 7,
      latestAiredEpisode: latestReleasing,
    });
    assert.equal(radarMulti.hasNewEpisode, true);
    assert.equal(radarMulti.newEpisodeCount, 3);
    assert.equal(radarMulti.badgeText, "New Ep 8 (+3)");

    const radarCaughtUp = evaluateNewEpisodeRadar({
      highestWatchedEpisode: 10,
      latestAiredEpisode: latestReleasing,
    });
    assert.equal(radarCaughtUp.hasNewEpisode, false);
    assert.equal(radarCaughtUp.badgeText, null);
  });
});
