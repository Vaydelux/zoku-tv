"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Star, Clock, Calendar, RotateCcw } from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { CustomSelect } from "@/components/CustomSelect";
import { discoverMedia, getGenres, TMDBTitle, TMDBGenre } from "@/lib/tmdb";
import { AnimeDiscoverContent } from "./AnimeDiscover";

import { Suspense } from "react";

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}

function DiscoverPageContent() {
  const { currentProfile } = useSessionStore();

  if ((currentProfile?.catalogMode ?? "tmdb") === "anime") {
    return <AnimeDiscoverContent />;
  }

  return <TmdbDiscoverContent />;
}

function TmdbDiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();

  // Load genres list
  const [availableGenres, setAvailableGenres] = useState<TMDBGenre[]>([]);
  const [results, setResults] = useState<TMDBTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Parse filters from URL
  const mediaType = (searchParams.get("type") as "movie" | "tv") || "movie";
  const sortBy = searchParams.get("sort_by") || "popularity.desc";
  const withGenres = searchParams.get("with_genres") || "";
  const yearFrom = searchParams.get("year_from") || "";
  const yearTo = searchParams.get("year_to") || "";
  const minRating = searchParams.get("min_rating") || "0";
  const minRuntime = searchParams.get("min_runtime") || "0";
  const maxRuntime = searchParams.get("max_runtime") || "360";
  const region = searchParams.get("region") || "";
  const language = searchParams.get("language") || "";

  // Local state for interactive controls before applying to URL
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    withGenres ? withGenres.split(",") : []
  );
  const [localYearFrom, setLocalYearFrom] = useState(yearFrom);
  const [localYearTo, setLocalYearTo] = useState(yearTo);
  const [localMinRating, setLocalMinRating] = useState(minRating);
  const [localMinRuntime, setLocalMinRuntime] = useState(minRuntime);
  const [localMaxRuntime, setLocalMaxRuntime] = useState(maxRuntime);

  // Fetch available genres based on active media type
  useEffect(() => {
    async function loadGenres() {
      try {
        const list = await getGenres(mediaType);
        setAvailableGenres(list);
      } catch (e) {
        console.error("Failed to load genres:", e);
      }
    }
    loadGenres();
  }, [mediaType]);

  // Sync state with URL search params when URL changes
  useEffect(() => {
    setSelectedGenres(withGenres ? withGenres.split(",") : []);
    setLocalYearFrom(yearFrom);
    setLocalYearTo(yearTo);
    setLocalMinRating(minRating);
    setLocalMinRuntime(minRuntime);
    setLocalMaxRuntime(maxRuntime);
  }, [withGenres, yearFrom, yearTo, minRating, minRuntime, maxRuntime]);

  // Reset page to 1 on URL query parameter changes
  useEffect(() => {
    setPage(1);
  }, [mediaType, sortBy, withGenres, yearFrom, yearTo, minRating, minRuntime, maxRuntime, region, language]);

  // Perform discovery fetch whenever URL changes or page changes
  useEffect(() => {
    if (!currentProfile) return;

    async function performDiscovery() {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        // Map criteria to discover params schema
        const discoverParams: any = {
          sort_by: sortBy,
          with_genres: withGenres,
          "vote_average.gte": Number(minRating) || undefined,
          "with_runtime.gte": Number(minRuntime) || undefined,
          "with_runtime.lte": Number(maxRuntime) || undefined,
          region: region || undefined,
          with_original_language: language || undefined,
          page: page,
        };

        if (mediaType === "movie") {
          if (yearFrom) discoverParams["release_date.gte"] = `${yearFrom}-01-01`;
          if (yearTo) discoverParams["release_date.lte"] = `${yearTo}-12-31`;
        } else {
          if (yearFrom) discoverParams["first_air_date.gte"] = `${yearFrom}-01-01`;
          if (yearTo) discoverParams["first_air_date.lte"] = `${yearTo}-12-31`;
        }

        const data = await discoverMedia(mediaType, discoverParams);
        
        // KidMode enforcement
        const filtered = currentProfile?.kidMode 
          ? data.filter(t => (t.vote_average || 0) < 7.5)
          : data;

        if (page === 1) {
          setResults(filtered);
        } else {
          setResults(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = filtered.filter(f => !existingIds.has(f.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error("Discovery request failed", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    performDiscovery();
  }, [mediaType, sortBy, withGenres, yearFrom, yearTo, minRating, minRuntime, maxRuntime, region, language, currentProfile, page]);

  // Apply filters by pushing to URL
  const applyFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setPage(1);
    router.push(`/discover?${params.toString()}`);
  };

  const handleGenreToggle = (genreId: string) => {
    let nextGenres = [...selectedGenres];
    if (nextGenres.includes(genreId)) {
      nextGenres = nextGenres.filter(g => g !== genreId);
    } else {
      nextGenres.push(genreId);
    }
    setSelectedGenres(nextGenres);
    applyFilters({ with_genres: nextGenres.join(",") });
  };

  const handleReset = () => {
    setSelectedGenres([]);
    setLocalYearFrom("");
    setLocalYearTo("");
    setLocalMinRating("0");
    setLocalMinRuntime("0");
    setLocalMaxRuntime("360");
    setPage(1);
    router.push("/discover?type=movie");
  };

  const sortingOptions = [
    { value: "popularity.desc", label: "Popularity High" },
    { value: "vote_average.desc", label: "Rating High" },
    { value: "release_date.desc", label: "Newest Catalog" },
  ];

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-6 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold tracking-tight text-on-surface">
              Explore Discover Hub
            </h1>
            <p className="text-xs text-on-surface-variant">
              Tweak algorithms, filter genres, and construct your streaming feeds custom.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Media Type Switcher */}
            <div className="theme-panel flex rounded-xl p-1">
              <button
                onClick={() => applyFilters({ type: "movie", with_genres: "" })}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mediaType === "movie" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => applyFilters({ type: "tv", with_genres: "" })}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mediaType === "tv" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                TV Series
              </button>
            </div>

            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`theme-panel p-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-surface-hover text-xs font-semibold ${
                isFilterPanelOpen ? "text-primary border-primary" : "text-on-surface"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Layout (Filters Panel + Results) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Filters Panel */}
          {isFilterPanelOpen && (
            <div className="glass-panel w-full lg:w-80 rounded-2xl p-6 space-y-6 shrink-0 lg:sticky lg:top-20">
              
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">Filter Criteria</span>
                <button 
                  onClick={handleReset}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset All</span>
                </button>
              </div>

              {/* Sort selector */}
              <CustomSelect
                label="Sorting"
                value={sortBy}
                onChange={(val) => applyFilters({ sort_by: val })}
                options={sortingOptions}
                testId="discover-sort-select"
              />

              {/* Release date Year ranges */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Year Range</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="From"
                    value={localYearFrom}
                    onChange={(e) => {
                      setLocalYearFrom(e.target.value);
                      if (e.target.value.length === 4 || e.target.value === "") {
                        applyFilters({ year_from: e.target.value });
                      }
                    }}
                    className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="To"
                    value={localYearTo}
                    onChange={(e) => {
                      setLocalYearTo(e.target.value);
                      if (e.target.value.length === 4 || e.target.value === "") {
                        applyFilters({ year_to: e.target.value });
                      }
                    }}
                    className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Ratings minimum */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span>Min Rating</span>
                  </span>
                  <span className="text-primary font-bold">{localMinRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="9"
                  step="0.5"
                  value={localMinRating}
                  onChange={(e) => {
                    setLocalMinRating(e.target.value);
                    applyFilters({ min_rating: e.target.value });
                  }}
                  className="w-full h-1 bg-border-custom rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Runtimes range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Max Duration</span>
                  </span>
                  <span className="text-primary font-bold">{localMaxRuntime} min</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="360"
                  step="15"
                  value={localMaxRuntime}
                  onChange={(e) => {
                    setLocalMaxRuntime(e.target.value);
                    applyFilters({ max_runtime: e.target.value });
                  }}
                  className="w-full h-1 bg-border-custom rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Genre Pills */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Catalog Genres</label>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar border border-border-custom rounded-xl p-2 bg-background/50">
                  {availableGenres.map((g) => {
                    const isSelected = selectedGenres.includes(String(g.id));
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleGenreToggle(String(g.id))}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "border-border-custom hover:border-primary text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Right Results Grid */}
          <div className="flex-1 w-full space-y-4">
            
            <div className="flex items-center justify-between px-2 text-xs font-mono text-on-surface-variant">
              <span>Catalog feed</span>
              <span>Loaded {results.length} matched titles</span>
            </div>

            {loading ? (
              /* Loading Grid Skeleton */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <div 
                    key={idx} 
                    className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse" 
                  />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {results.map((title) => (
                    <div key={title.id} className="flex justify-center">
                      <TitleCard title={title} mediaType={mediaType} />
                    </div>
                  ))}
                </div>

                {/* Manual 'Load more' Button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom py-3 px-8 text-xs font-semibold text-on-surface hover:text-primary active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow"
                  >
                    {loadingMore ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading More Titles...</span>
                      </>
                    ) : (
                      <span>Load More Titles</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-border-custom border-dashed rounded-2xl bg-surface/10 p-8 gap-4">
                <SlidersHorizontal className="h-10 w-10 text-on-surface-variant animate-pulse" />
                <div>
                  <p className="font-semibold text-sm">No matched criteria results.</p>
                  <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                    Try softening your filters, extending year scopes, or selecting fewer specific genres.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
