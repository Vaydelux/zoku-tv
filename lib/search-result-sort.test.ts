import assert from "node:assert/strict";
import test from "node:test";
import { sortSearchEntries, type SearchSortableEntry } from "./search-result-sort";
import type { TMDBTitle } from "./tmdb";
import type { AniListMedia } from "./anilist";

function tmdb(id: number, rating: number, date: string): SearchSortableEntry {
  return { kind: "movie", data: { id, title: `Movie ${id}`, vote_average: rating, release_date: date } as TMDBTitle };
}

function anime(id: number, score: number, year: number): SearchSortableEntry {
  return { kind: "anime", data: { id, title: { romaji: `Anime ${id}` }, averageScore: score, seasonYear: year } as AniListMedia };
}

test("relevance preserves the original interleaved provider order", () => {
  const entries = [tmdb(1, 2, "2020-01-01"), anime(2, 90, 2025), tmdb(3, 8, "2023-01-01")];
  assert.deepEqual(sortSearchEntries(entries, "relevance"), entries);
  assert.notEqual(sortSearchEntries(entries, "relevance"), entries);
});

test("rating uses TMDB /10 and AniList /100 on a comparable scale", () => {
  const entries = [tmdb(1, 6, "2024-01-01"), anime(2, 96, 2020), tmdb(3, 8.7, "2026-01-01")];
  assert.deepEqual(sortSearchEntries(entries, "rating").map(e => e.data.id), [2, 3, 1]);
});

test("newest uses supplied release metadata and keeps missing dates last", () => {
  const entries = [tmdb(1, 9, "2024-03-05"), anime(2, 80, 2025), tmdb(3, 6, ""), tmdb(4, 6, "2026-02-03")];
  assert.deepEqual(sortSearchEntries(entries, "newest").map(e => e.data.id), [4, 2, 1, 3]);
});

test("sort is stable for identical metadata and never mutates source arrays", () => {
  const entries = [tmdb(1, 7, "2025-01-01"), tmdb(2, 7, "2025-01-01")];
  assert.deepEqual(sortSearchEntries(entries, "rating").map(e => e.data.id), [1, 2]);
  assert.deepEqual(entries.map(e => e.data.id), [1, 2]);
});
