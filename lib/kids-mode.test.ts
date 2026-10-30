import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyTmdbTitle,
  classifyAnimeMedia,
  isTmdbAllowedInKidsMode,
  isAnimeAllowedInKidsMode,
  filterTmdbForKidsMode,
  filterAnimeForKidsMode,
  isGenreIdAllowedInKidsMode,
  isAnimeGenreAllowedInKidsMode,
} from "./kids-mode";

describe("Kids Mode Content Filtering & Classification (Phase 1)", () => {
  it("allows high-rated family & animation titles regardless of vote_average >= 7.5", () => {
    const spiderVerse = {
      id: 569094,
      title: "Spider-Man: Across the Spider-Verse",
      overview: "Miles Morales catapults across the Multiverse.",
      media_type: "movie" as const,
      vote_average: 8.4,
      genre_ids: [16, 28, 12, 878],
    };
    assert.equal(isTmdbAllowedInKidsMode(spiderVerse), true);
    const badge = classifyTmdbTitle(spiderVerse);
    assert.equal(badge.kidsSafe, true);
    assert.equal(badge.code, "PG");
  });

  it("blocks R-rated / TV-MA titles and restricted genres even if vote_average < 7.5", () => {
    const lowRatedHorror = {
      id: 999001,
      title: "Generic Slasher Night",
      overview: "A terrifying horror story.",
      media_type: "movie" as const,
      vote_average: 5.2,
      genre_ids: [27, 53], // Horror + Thriller
    };
    assert.equal(isTmdbAllowedInKidsMode(lowRatedHorror), false);

    const breakingBad = {
      id: 1396,
      name: "Breaking Bad",
      overview: "Chemistry teacher enters the underworld.",
      media_type: "tv" as const,
      vote_average: 8.9,
      genre_ids: [18, 80], // Drama + Crime
    };
    assert.equal(isTmdbAllowedInKidsMode(breakingBad), false);

    const oppenheimer = {
      id: 872585,
      title: "Oppenheimer",
      overview: "Development of the atomic bomb.",
      media_type: "movie" as const,
      vote_average: 8.1,
      genre_ids: [18, 36],
    };
    assert.equal(isTmdbAllowedInKidsMode(oppenheimer), false);
  });

  it("conservatively blocks titles with missing genre/classification metadata in Kids Mode", () => {
    const unknownTitle = {
      id: 777123,
      title: "Mystery Unclassified Film",
      overview: "No genres provided.",
      media_type: "movie" as const,
      vote_average: 6.0,
      genre_ids: [],
    };
    assert.equal(isTmdbAllowedInKidsMode(unknownTitle), false);
    assert.match(classifyTmdbTitle(unknownTitle).reason, /Missing genre/i);
  });

  it("filters TMDB lists only when kidMode is enabled", () => {
    const list = [
      {
        id: 569094,
        title: "Spider-Man: Across the Spider-Verse",
        overview: "Multiverse adventure",
        media_type: "movie" as const,
        vote_average: 8.4,
        genre_ids: [16, 12],
      },
      {
        id: 496243,
        title: "Parasite",
        overview: "Dark thriller",
        media_type: "movie" as const,
        vote_average: 8.5,
        genre_ids: [35, 53, 18],
      },
    ];

    assert.equal(filterTmdbForKidsMode(list, false).length, 2);
    const kidsFiltered = filterTmdbForKidsMode(list, true);
    assert.equal(kidsFiltered.length, 1);
    assert.equal(kidsFiltered[0].id, 569094);
  });

  it("filters AniList anime by restricted genres, adult flags, and missing metadata", () => {
    const safeAnime = {
      id: 21,
      title: { english: "One Piece", romaji: "One Piece" },
      genres: ["Action", "Adventure", "Comedy"],
      description: "Luffy sets sail to find the One Piece.",
    };
    const restrictedAnime = {
      id: 666,
      title: { english: "Dark Nightmare", romaji: "Dark Nightmare" },
      genres: ["Action", "Horror", "Psychological"],
      description: "Psychological horror story.",
    };
    const unknownAnime = {
      id: 777,
      title: { english: "Unclassified OVA" },
      genres: [],
    };

    assert.equal(isAnimeAllowedInKidsMode(safeAnime), true);
    assert.equal(isAnimeAllowedInKidsMode(restrictedAnime), false);
    assert.equal(isAnimeAllowedInKidsMode(unknownAnime), false);

    const filtered = filterAnimeForKidsMode([safeAnime, restrictedAnime, unknownAnime], true);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 21);
  });

  it("identifies restricted vs allowed genre IDs and anime genre names", () => {
    assert.equal(isGenreIdAllowedInKidsMode(16), true); // Animation
    assert.equal(isGenreIdAllowedInKidsMode(27), false); // Horror
    assert.equal(isGenreIdAllowedInKidsMode(80), false); // Crime
    assert.equal(isAnimeGenreAllowedInKidsMode("Adventure"), true);
    assert.equal(isAnimeGenreAllowedInKidsMode("Ecchi"), false);
    assert.equal(isAnimeGenreAllowedInKidsMode("Horror"), false);
  });
});

