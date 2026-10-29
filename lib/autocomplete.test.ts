import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { interleaveAutocompleteSuggestions } from "./autocomplete";
import type { TMDBTitle } from "./tmdb";
import type { AniListMedia } from "./anilist";

describe("Autocomplete real-time suggestion logic", () => {
  it("interleaves TMDB movies/TV and Anime titles cleanly into suggestions", () => {
    const tmdbTitles: TMDBTitle[] = [
      {
        id: 693134,
        title: "Dune: Part Two",
        media_type: "movie",
        overview: "Paul Atreides unites with Chani...",
        poster_path: "/dune.jpg",
        backdrop_path: "/dune_bg.jpg",
        release_date: "2024-02-27",
        vote_average: 8.3,
      },
      {
        id: 1399,
        name: "Game of Thrones",
        media_type: "tv",
        overview: "Seven noble families fight...",
        poster_path: "/got.jpg",
        backdrop_path: "/got_bg.jpg",
        first_air_date: "2011-04-17",
        vote_average: 8.4,
      },
    ];

    const animeTitles: AniListMedia[] = [
      {
        id: 1535,
        title: {
          english: "Death Note",
          romaji: "Death Note",
        },
        coverImage: {
          large: "https://anilist.co/death_note.jpg",
        },
        averageScore: 84,
        seasonYear: 2006,
        description: "An intelligent high school student...",
      },
      {
        id: 16498,
        title: {
          english: "Attack on Titan",
          romaji: "Shingeki no Kyojin",
        },
        coverImage: {
          large: "https://anilist.co/aot.jpg",
        },
        averageScore: 85,
        seasonYear: 2013,
        description: "Centuries ago, mankind was nearly exterminated...",
      },
    ];

    const suggestions = interleaveAutocompleteSuggestions(tmdbTitles, animeTitles, 6);

    assert.equal(suggestions.length, 4);

    // First item is TMDB Movie
    assert.equal(suggestions[0].numericId, 693134);
    assert.equal(suggestions[0].title, "Dune: Part Two");
    assert.equal(suggestions[0].mediaType, "movie");
    assert.equal(suggestions[0].year, "2024");
    assert.equal(suggestions[0].href, "/title/movie/693134");

    // Second item is Anime
    assert.equal(suggestions[1].numericId, 1535);
    assert.equal(suggestions[1].title, "Death Note");
    assert.equal(suggestions[1].mediaType, "anime");
    assert.equal(suggestions[1].year, "2006");
    assert.equal(suggestions[1].href, "/anime/1535");

    // Third item is TMDB TV
    assert.equal(suggestions[2].numericId, 1399);
    assert.equal(suggestions[2].title, "Game of Thrones");
    assert.equal(suggestions[2].mediaType, "tv");
    assert.equal(suggestions[2].year, "2011");
    assert.equal(suggestions[2].href, "/title/tv/1399");

    // Fourth item is Anime
    assert.equal(suggestions[3].numericId, 16498);
    assert.equal(suggestions[3].title, "Attack on Titan");
    assert.equal(suggestions[3].mediaType, "anime");
  });

  it("handles empty TMDB or empty Anime lists safely", () => {
    const suggestionsOnlyAnime = interleaveAutocompleteSuggestions(
      [],
      [
        {
          id: 1,
          title: { english: "Cowboy Bebop" },
          averageScore: 89,
          seasonYear: 1998,
        },
      ],
      5
    );

    assert.equal(suggestionsOnlyAnime.length, 1);
    assert.equal(suggestionsOnlyAnime[0].mediaType, "anime");
    assert.equal(suggestionsOnlyAnime[0].title, "Cowboy Bebop");
    assert.equal(suggestionsOnlyAnime[0].href, "/anime/1");

    const suggestionsEmpty = interleaveAutocompleteSuggestions([], [], 5);
    assert.equal(suggestionsEmpty.length, 0);
  });
});
