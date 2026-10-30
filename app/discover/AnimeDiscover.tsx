"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  RotateCcw,
  Shield,
  Sparkles,
  Building2,
  BookOpen,
  Tv,
  Calendar,
  X,
} from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { CustomSelect } from "@/components/CustomSelect";
import { AnimeCard } from "@/components/anime/AnimeCard";
import {
  ANILIST_GENRES,
  ANILIST_SEASONS,
  ANILIST_FORMATS,
  ANILIST_SOURCES,
  ANILIST_STUDIOS,
  browseAnime,
  type AniListMedia,
} from "@/lib/anilist";
import {
  filterAnimeForKidsMode,
  isAnimeGenreAllowedInKidsMode,
} from "@/lib/kids-mode";

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
  const isKidMode = Boolean(currentProfile?.kidMode);

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
  const format = searchParams.get("format") || "";
  const source = searchParams.get("source") || "";
  const studio = searchParams.get("studio") || "";

  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    genreParam ? genreParam.split(",").filter(Boolean) : []
  );
  const [localSeason, setLocalSeason] = useState(season);
  const [localYear, setLocalYear] = useState(seasonYear);
  const [localSort, setLocalSort] = useState(sortBy);
  const [localFormat, setLocalFormat] = useState(format);
  const [localSource, setLocalSource] = useState(source);
  const [localStudio, setLocalStudio] = useState(studio);

  useEffect(() => {
    setSelectedGenres(genreParam ? genreParam.split(",").filter(Boolean) : []);
    setLocalSeason(season);
    setLocalYear(seasonYear);
    setLocalSort(sortBy);
    setLocalFormat(format);
    setLocalSource(source);
    setLocalStudio(studio);
  }, [genreParam, season, seasonYear, sortBy, format, source, studio]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, genreParam, season, seasonYear, format, source, studio]);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const requestedGenres = genreParam
          ? genreParam
              .split(",")
              .filter(Boolean)
              .filter((g) => !isKidMode || isAnimeGenreAllowedInKidsMode(g))
          : undefined;

        const data = await browseAnime({
          page,
          perPage: 20,
          genres: requestedGenres?.length ? requestedGenres : undefined,
          season: season || undefined,
          seasonYear: seasonYear ? Number(seasonYear) : undefined,
          format: format || undefined,
          source: source || undefined,
          studio: studio || undefined,
          sort: [sortBy],
        });

        if (cancelled) return;

        const filteredMedia = filterAnimeForKidsMode(data.media, isKidMode);
        setResults((prev) => {
          if (page === 1) return filteredMedia;
          const existingIds = new Set(prev.map((item) => item.id));
          const nextItems = filteredMedia.filter((item) => !existingIds.has(item.id));
          return [...prev, ...nextItems];
        });
        setHasNextPage(Boolean(data.pageInfo?.hasNextPage));
      } catch (err) {
        console.error("Anime discover failed:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [page, sortBy, genreParam, season, seasonYear, format, source, studio, isKidMode]);

  const updateUrlFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", "anime");
    Object.entries(updates).forEach(([key, val]) => {
      if (!val) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setPage(1);
    router.push(`/discover?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("type", "anime");
    if (localSort && localSort !== "POPULARITY_DESC") params.set("sort", localSort);
    if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
    if (localSeason) params.set("season", localSeason);
    if (localYear) params.set("year", localYear);
    if (localFormat) params.set("format", localFormat);
    if (localSource) params.set("source", localSource);
    if (localStudio) params.set("studio", localStudio);
    setPage(1);
    router.push(`/discover?${params.toString()}`);
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setLocalSeason("");
    setLocalYear("");
    setLocalSort("POPULARITY_DESC");
    setLocalFormat("");
    setLocalSource("");
    setLocalStudio("");
    setPage(1);
    router.push("/discover?type=anime");
  };

  const handleGenreToggle = (genre: string) => {
    const nextGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter((g) => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(nextGenres);
    updateUrlFilters({ genres: nextGenres.join(",") });
  };

  const switchMediaType = (nextType: "movie" | "tv" | "anime") => {
    router.push(`/discover?type=${nextType}`);
  };

  const sortOptions = [
    { value: "POPULARITY_DESC", label: "Popularity High" },
    { value: "TRENDING_DESC", label: "Trending Now" },
    { value: "SCORE_DESC", label: "Top Rated" },
    { value: "START_DATE_DESC", label: "Newest Releases" },
  ];

  const formatOptions = [
    { value: "", label: "All Formats (TV / Movie / OVA)" },
    ...ANILIST_FORMATS.map((f) => ({ value: f.value, label: f.label })),
  ];

  const sourceOptions = [
    { value: "", label: "All Sources (Manga / Light Novel)" },
    ...ANILIST_SOURCES.map((s) => ({ value: s.value, label: s.label })),
  ];

  const studioOptions = [
    { value: "", label: "All Animation Studios" },
    ...ANILIST_STUDIOS.map((s) => ({ value: s, label: s })),
  ];

  const seasonOptions = [
    { value: "", label: "Any Season" },
    ...ANILIST_SEASONS.map((s) => ({ value: s, label: s })),
  ];

  const visibleGenres = ANILIST_GENRES.filter(
    (g) => !isKidMode || isAnimeGenreAllowedInKidsMode(g)
  );

  const hasActiveFilters = Boolean(
    format || source || studio || season || seasonYear || selectedGenres.length > 0
  );

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-6 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold tracking-tight text-on-surface flex items-center gap-2">
              <span>Explore Discover Hub</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                AniList
              </span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              Filter anime by Studio, Source Material (Manga / Light Novel), Format (TV / Movie / OVA), and Genres.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isKidMode && (
              <span
                data-testid="discover-kids-mode-badge"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Kids Mode Active</span>
              </span>
            )}

            <div className="theme-panel flex rounded-xl p-1" role="tablist" aria-label="Discover Media Type">
              <button
                type="button"
                role="tab"
                aria-selected={false}
                data-testid="discover-tab-movie"
                onClick={() => switchMediaType("movie")}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all text-on-surface-variant hover:text-on-surface"
              >
                Movies
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                data-testid="discover-tab-tv"
                onClick={() => switchMediaType("tv")}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all text-on-surface-variant hover:text-on-surface"
              >
                TV Series
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={true}
                data-testid="discover-tab-anime"
                onClick={() => switchMediaType("anime")}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all bg-primary text-primary-contrast flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Anime</span>
              </button>
            </div>

            <button
              type="button"
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

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {isFilterPanelOpen && (
            <div className="glass-panel w-full lg:w-80 rounded-2xl p-6 space-y-5 shrink-0 lg:sticky lg:top-20">
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                  Anime Filter Criteria
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  data-testid="anime-discover-reset-btn"
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset All</span>
                </button>
              </div>

              <CustomSelect
                label="Sort By"
                value={localSort}
                onChange={(val) => {
                  setLocalSort(val);
                  updateUrlFilters({ sort: val });
                }}
                options={sortOptions}
                testId="anime-discover-sort-select"
              />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Animation Studio</span>
                </div>
                <CustomSelect
                  value={localStudio}
                  onChange={(val) => {
                    setLocalStudio(val);
                    updateUrlFilters({ studio: val });
                  }}
                  options={studioOptions}
                  testId="anime-discover-studio-select"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Source Material</span>
                </div>
                <CustomSelect
                  value={localSource}
                  onChange={(val) => {
                    setLocalSource(val);
                    updateUrlFilters({ source: val });
                  }}
                  options={sourceOptions}
                  testId="anime-discover-source-select"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  <Tv className="h-3.5 w-3.5 text-primary" />
                  <span>Format</span>
                </div>
                <CustomSelect
                  value={localFormat}
                  onChange={(val) => {
                    setLocalFormat(val);
                    updateUrlFilters({ format: val });
                  }}
                  options={formatOptions}
                  testId="anime-discover-format-select"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <CustomSelect
                  label="Season"
                  value={localSeason}
                  onChange={(val) => {
                    setLocalSeason(val);
                    updateUrlFilters({ season: val });
                  }}
                  options={seasonOptions}
                  testId="anime-discover-season-select"
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span>Year</span>
                  </label>
                  <input
                    type="number"
                    min={1960}
                    max={2030}
                    value={localYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalYear(val);
                      if (val.length === 4 || val === "") {
                        updateUrlFilters({ year: val });
                      }
                    }}
                    placeholder="e.g. 2025"
                    data-testid="anime-discover-year-input"
                    className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  Anime Genres
                </label>
                <div className="custom-scrollbar flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1 border border-border-custom rounded-xl p-2 bg-background/50">
                  {visibleGenres.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return (
                      <button
                        type="button"
                        key={genre}
                        onClick={() => handleGenreToggle(genre)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                          active
                            ? "bg-primary/15 border-primary text-primary"
                            : "border-border-custom hover:border-primary text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={applyFilters}
                data-testid="anime-discover-apply-btn"
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-contrast shadow-md hover:opacity-95 transition-opacity"
              >
                Apply Filters
              </button>
            </div>
          )}

          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-mono text-on-surface-variant">
              <span>AniList Catalog Feed</span>
              <span>Loaded {results.length} matched anime</span>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 px-2">
                {studio && (
                  <button
                    type="button"
                    onClick={() => updateUrlFilters({ studio: "" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                  >
                    <span>Studio: {studio}</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {source && (
                  <button
                    type="button"
                    onClick={() => updateUrlFilters({ source: "" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                  >
                    <span>
                      Source:{" "}
                      {ANILIST_SOURCES.find((s) => s.value === source)?.label || source}
                    </span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {format && (
                  <button
                    type="button"
                    onClick={() => updateUrlFilters({ format: "" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                  >
                    <span>
                      Format:{" "}
                      {ANILIST_FORMATS.find((f) => f.value === format)?.label || format}
                    </span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {season && (
                  <button
                    type="button"
                    onClick={() => updateUrlFilters({ season: "" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                  >
                    <span>Season: {season}</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {seasonYear && (
                  <button
                    type="button"
                    onClick={() => updateUrlFilters({ year: "" })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                  >
                    <span>Year: {seasonYear}</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-xl bg-surface border border-border-custom animate-pulse"
                  />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {results.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} fullWidth />
                  ))}
                </div>

                {hasNextPage && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loadingMore}
                      className="flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom py-3 px-8 text-xs font-semibold text-on-surface hover:text-primary active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow"
                    >
                      {loadingMore ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span>Loading More Anime...</span>
                        </>
                      ) : (
                        <span>Load More Anime</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-border-custom border-dashed rounded-2xl bg-surface/10 p-8 gap-4">
                <SlidersHorizontal className="h-10 w-10 text-on-surface-variant animate-pulse" />
                <div>
                  <p className="font-semibold text-sm">No matched anime found.</p>
                  <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                    Try clearing one of your Studio, Source Material, or Format filters to broaden results.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl bg-primary/15 border border-primary/40 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/25 transition-colors"
                >
                  Reset Anime Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

