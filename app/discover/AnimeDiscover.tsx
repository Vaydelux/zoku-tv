"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, RotateCcw, ChevronDown } from "lucide-react";
import { Suspense } from "react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/anime/AnimeCard";
import {
  ANILIST_GENRES,
  ANILIST_SEASONS,
  browseAnime,
  type AniListMedia,
} from "@/lib/anilist";

export default function AnimeDiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AnimeDiscoverContent />
    </Suspense>
  );
}

export function AnimeDiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();

  const [results, setResults] = useState<AniListMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  const sortBy = searchParams.get("sort") || "POPULARITY_DESC";
  const genreParam = searchParams.get("genres") || "";
  const season = searchParams.get("season") || "";
  const seasonYear = searchParams.get("year") || "";

  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    genreParam ? genreParam.split(",") : []
  );
  const [localSeason, setLocalSeason] = useState(season);
  const [localYear, setLocalYear] = useState(seasonYear);
  const [localSort, setLocalSort] = useState(sortBy);

  useEffect(() => {
    if (!currentProfile) return;
    setPage(1);
  }, [sortBy, genreParam, season, seasonYear, currentProfile]);

  useEffect(() => {
    if (!currentProfile) return;

    async function loadResults() {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await browseAnime({
          page,
          perPage: 20,
          genres: genreParam ? genreParam.split(",") : undefined,
          season: season || undefined,
          seasonYear: seasonYear ? Number(seasonYear) : undefined,
          sort: [sortBy],
        });

        setResults((prev) => (page === 1 ? data.media : [...prev, ...data.media]));
        setHasNextPage(data.pageInfo.hasNextPage);
      } catch (err) {
        console.error("Anime discover failed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    loadResults();
  }, [currentProfile, page, sortBy, genreParam, season, seasonYear]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (localSort) params.set("sort", localSort);
    if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
    if (localSeason) params.set("season", localSeason);
    if (localYear) params.set("year", localYear);
    router.push(`/discover?${params.toString()}`);
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setLocalSeason("");
    setLocalYear("");
    setLocalSort("POPULARITY_DESC");
    router.push("/discover");
  };

  if (!currentProfile) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-border-custom pb-6">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide">Discover Anime</h1>
            <p className="text-xs text-on-surface-variant mt-1">Browse the AniList catalog</p>
          </div>
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className="flex items-center gap-2 rounded-xl border border-border-custom px-4 py-2 text-xs font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {isFilterPanelOpen && (
          <div className="rounded-2xl border border-border-custom bg-surface p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase">Sort By</label>
              <select
                value={localSort}
                onChange={(e) => setLocalSort(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2 text-sm"
              >
                <option value="POPULARITY_DESC">Popularity</option>
                <option value="TRENDING_DESC">Trending</option>
                <option value="SCORE_DESC">Top Rated</option>
                <option value="START_DATE_DESC">Newest</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Season</label>
                <select
                  value={localSeason}
                  onChange={(e) => setLocalSeason(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {ANILIST_SEASONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Year</label>
                <input
                  type="number"
                  value={localYear}
                  onChange={(e) => setLocalYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase">Genres</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {ANILIST_GENRES.map((genre) => {
                  const active = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() =>
                        setSelectedGenres((prev) =>
                          active ? prev.filter((g) => g !== genre) : [...prev, genre]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                        active ? "bg-primary text-white border-primary" : "border-border-custom"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={applyFilters} className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white">
                Apply Filters
              </button>
              <button onClick={resetFilters} className="inline-flex items-center gap-1 rounded-xl border border-border-custom px-4 py-2.5 text-xs font-semibold">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loadingMore}
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
