"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Film,
  Sparkles,
  Palette,
  Sun,
  Moon,
  History,
  Bookmark,
  Shield,
} from "lucide-react";
import {
  useSessionStore,
  useContinueWatchingStore,
  useWatchHistoryStore,
  useWatchlistStore,
  useRailFilterStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TitleRail } from "@/components/TitleRail";
import { AnimeRail } from "@/components/anime/AnimeRail";
import { AnimeHeroBanner } from "@/components/anime/AnimeHeroBanner";
import { ContinueWatchingRail } from "@/components/ContinueWatchingRail";
import { WatchHistoryRail } from "@/components/WatchHistoryRail";
import { LoadingBanner } from "@/components/LoadingBanner";
import { TMDBTitle, TMDBGenre } from "@/lib/tmdb";
import { loadHomeGenreRails, loadHomeTrending } from "@/lib/load-home-content";
import { loadAnimeHomeContent } from "@/lib/load-anime-home-content";
import type { AniListMedia } from "@/lib/anilist";
import { filterContinueWatchingByCatalog } from "@/lib/continue-watching";
import {
  filterWatchHistoryByCatalog,
  getWatchHistoryItemId,
  type WatchHistoryItem,
} from "@/lib/watch-history";
import { filterWatchlistByCatalog } from "@/lib/watchlist";
import {
  filterTmdbForKidsMode,
  filterAnimeForKidsMode,
  isGenreIdAllowedInKidsMode,
  isAnimeGenreAllowedInKidsMode,
} from "@/lib/kids-mode";
import {
  getThemeOption,
  normalizeAppearance,
} from "@/lib/themes";

export default function HomePage() {
  const { user, currentProfile, updateProfile } = useSessionStore();
  const continueWatchingItems = useContinueWatchingStore((state) => state.items);
  const watchHistoryItems = useWatchHistoryStore((state) => state.items);
  const removeWatchHistoryItem = useWatchHistoryStore((state) => state.removeItem);
  const watchlistItems = useWatchlistStore((state) => state.items);

  const catalogMode = currentProfile?.catalogMode ?? "tmdb";
  const isKidMode = Boolean(currentProfile?.kidMode);
  const currentTheme = getThemeOption(currentProfile?.themePreference);
  const currentAppearance = normalizeAppearance(currentProfile?.appearancePreference);

  const [heroSlides, setHeroSlides] = useState<TMDBTitle[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBTitle[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBTitle[]>([]);
  const [genreRails, setGenreRails] = useState<{ genre: TMDBGenre; titles: TMDBTitle[] }[]>([]);

  const [animeHero, setAnimeHero] = useState<AniListMedia[]>([]);
  const [animeTrending, setAnimeTrending] = useState<AniListMedia[]>([]);
  const [animePopular, setAnimePopular] = useState<AniListMedia[]>([]);
  const [animeGenreRails, setAnimeGenreRails] = useState<{ genre: string; items: AniListMedia[] }[]>([]);

  const { activeFilter, setActiveFilter, setFilterOptions } = useRailFilterStore();
  const selectedRailFilter = activeFilter;
  const setSelectedRailFilter = setActiveFilter;

  const [cacheRefreshVersion, setCacheRefreshVersion] = useState(0);

  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingGenreRails, setLoadingGenreRails] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading your home feed...");
  const [isOffline, setIsOffline] = useState(false);

  const filteredCw = useMemo(
    () => filterContinueWatchingByCatalog(continueWatchingItems, catalogMode),
    [continueWatchingItems, catalogMode]
  );

  const filteredHistory = useMemo(
    () => filterWatchHistoryByCatalog(watchHistoryItems, catalogMode),
    [watchHistoryItems, catalogMode]
  );

  const catalogWatchlist = useMemo(
    () => filterWatchlistByCatalog(watchlistItems, catalogMode),
    [watchlistItems, catalogMode]
  );

  const tmdbWatchlistPreview = useMemo<TMDBTitle[]>(() => {
    if (catalogMode !== "tmdb") return [];
    const mapped: TMDBTitle[] = catalogWatchlist
      .filter((w) => w.media_type === "movie" || w.media_type === "tv")
      .map((w) => ({
        id: Number(w.tmdbId ?? 0),
        title: w.media_type === "movie" ? w.title : undefined,
        name: w.media_type === "tv" ? w.title : undefined,
        overview: "",
        poster_path: w.poster_path ?? null,
        backdrop_path: w.backdrop_path ?? null,
        media_type: w.media_type === "tv" ? ("tv" as const) : ("movie" as const),
        release_date: w.release_date ?? undefined,
        first_air_date: w.release_date ?? undefined,
        vote_average: w.vote_average ?? 0,
        genre_ids: [12, 16],
      }))
      .filter((t) => t.id > 0);
    return filterTmdbForKidsMode(mapped, isKidMode).slice(0, 12);
  }, [catalogWatchlist, catalogMode, isKidMode]);

  // Reset rail filter when switching catalog mode or profile
  useEffect(() => {
    setSelectedRailFilter("all");
  }, [catalogMode, currentProfile?.id, setSelectedRailFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (!user || !currentProfile) return;

    let cancelled = false;

    async function loadTmdbHome() {
      setLoadingTrending(true);
      setLoadingGenreRails(true);
      setLoadingMessage("Loading trending titles...");
      try {
        if (typeof window !== "undefined" && !navigator.onLine) throw new Error("Offline");
        const trending = await loadHomeTrending();
        if (cancelled) return;
        setHeroSlides(filterTmdbForKidsMode(trending.heroSlides, isKidMode));
        setTrendingMovies(filterTmdbForKidsMode(trending.trendingMovies, isKidMode));
        setTrendingTV(filterTmdbForKidsMode(trending.trendingTV, isKidMode));
      } catch (err) {
        console.error("Failed to load TMDB home:", err);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }

      setLoadingMessage("Loading genre rails...");
      try {
        const rawGenreIds = currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18];
        const prefGenreIds = isKidMode
          ? rawGenreIds.filter((gid) => isGenreIdAllowedInKidsMode(gid))
          : rawGenreIds;
        const rails = await loadHomeGenreRails(prefGenreIds.length > 0 ? prefGenreIds : [16, 12, 35]);
        if (!cancelled) {
          setGenreRails(
            rails
              .map((r) => ({
                genre: r.genre,
                titles: filterTmdbForKidsMode(r.titles, isKidMode),
              }))
              .filter((r) => r.titles.length > 0)
          );
        }
      } catch (err) {
        console.error("Failed to load genre rails:", err);
      } finally {
        if (!cancelled) {
          setLoadingGenreRails(false);
          setLoadingMessage("");
        }
      }
    }

    async function loadAnimeHome() {
      setLoadingTrending(true);
      setLoadingGenreRails(true);
      setLoadingMessage("Loading anime catalog...");
      try {
        if (typeof window !== "undefined" && !navigator.onLine) throw new Error("Offline");
        const content = await loadAnimeHomeContent();
        if (cancelled) return;
        setAnimeHero(filterAnimeForKidsMode(content.heroSlides, isKidMode));
        setAnimeTrending(filterAnimeForKidsMode(content.trending, isKidMode));
        setAnimePopular(filterAnimeForKidsMode(content.popular, isKidMode));
        setAnimeGenreRails(
          content.genreRails
            .filter((r) => !isKidMode || isAnimeGenreAllowedInKidsMode(r.genre))
            .map((r) => ({
              genre: r.genre,
              items: filterAnimeForKidsMode(r.items, isKidMode),
            }))
            .filter((r) => r.items.length > 0)
        );
      } catch (err) {
        console.error("Failed to load anime home:", err);
      } finally {
        if (!cancelled) {
          setLoadingTrending(false);
          setLoadingGenreRails(false);
          setLoadingMessage("");
        }
      }
    }

    if (catalogMode === "anime") {
      loadAnimeHome();
    } else {
      loadTmdbHome();
    }

    return () => {
      cancelled = true;
    };
  }, [
    user,
    currentProfile?.id,
    currentProfile?.kidMode,
    currentProfile?.homeGenreRailPreferences,
    catalogMode,
    isKidMode,
    cacheRefreshVersion,
  ]);

  const handleQuickRemoveHistoryItem = async (item: WatchHistoryItem) => {
    const itemId = getWatchHistoryItemId(item);
    if (!itemId) return;
    await removeWatchHistoryItem(item.media_type, itemId);
  };

  const handleRefreshWatchHistoryCache = async () => {
    setCacheRefreshVersion((prev) => prev + 1);
  };

  const loadingMedia = loadingTrending || loadingGenreRails;

  const handleCatalogToggle = (nextMode: "tmdb" | "anime") => {
    if (!currentProfile || nextMode === catalogMode) return;
    void updateProfile(currentProfile.id, { catalogMode: nextMode });
  };

  const handleAppearanceToggle = () => {
    if (!currentProfile) return;
    const nextAppearance = currentAppearance === "dark" ? "light" : "dark";
    void updateProfile(currentProfile.id, { appearancePreference: nextAppearance });
  };

  const filterChips = useMemo(() => {
    if (catalogMode === "anime") {
      return [
        { id: "all", label: "All Anime" },
        { id: "trending", label: "Trending" },
        { id: "popular", label: "Popular" },
        ...animeGenreRails.map(({ genre }) => ({
          id: `genre_${genre}`,
          label: genre,
        })),
        { id: "history", label: `Watch History (${filteredHistory.length})` },
      ];
    }
    return [
      { id: "all", label: "All Rails" },
      { id: "movies", label: "Movies" },
      { id: "tv", label: "TV Series" },
      ...genreRails.map(({ genre }) => ({
        id: `genre_${genre.id}`,
        label: genre.name,
      })),
      { id: "history", label: `Watch History (${filteredHistory.length})` },
    ];
  }, [catalogMode, animeGenreRails, genreRails, filteredHistory.length]);

  useEffect(() => {
    setFilterOptions(filterChips);
  }, [filterChips, setFilterOptions]);

  return (
    <div className="app-page-shell pb-16 transition-colors duration-300 safe-area-bottom">
      {loadingMedia && loadingMessage && <LoadingBanner message={loadingMessage} />}
      <Navbar />

      {catalogMode === "anime" ? (
        <AnimeHeroBanner slides={animeHero} loading={loadingTrending} />
      ) : (
        <HeroCarousel slides={heroSlides} loading={loadingTrending} />
      )}

      {/* Focused Catalog & Filter Bar */}
      <div className="relative z-20 mx-auto -mt-3 sm:-mt-4 w-full px-3 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-2xl p-2.5 sm:p-4 shadow-xl">
          <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Dual Catalog Switcher + Settings Theme Shortcut + Live Profile Telemetry */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 shrink-0">
              <div
                role="group"
                aria-label="Catalog mode switcher"
                className="inline-flex flex-1 xs:flex-initial items-center rounded-xl border border-border-custom bg-background/70 p-1 backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => handleCatalogToggle("tmdb")}
                  className={`inline-flex flex-1 xs:flex-initial items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    catalogMode === "tmdb"
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Film className="h-3.5 w-3.5 shrink-0" />
                  <span>Cinema & TV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCatalogToggle("anime")}
                  className={`inline-flex flex-1 xs:flex-initial items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    catalogMode === "anime"
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>AniList Anime</span>
                </button>
              </div>

              {isKidMode && (
                <span
                  data-testid="home-kids-mode-badge"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300"
                >
                  <Shield className="h-3 w-3 shrink-0" />
                  <span>Kids Mode Active</span>
                </span>
              )}

              {/* Settings Theme & Appearance Shortcut */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/settings?section=theme"
                  className="theme-panel inline-flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary cursor-pointer"
                  title="Customize Theme in Settings"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/25 shrink-0"
                    style={{ backgroundImage: currentTheme.preview }}
                  />
                  <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="hidden sm:inline">{currentTheme.name}</span>
                </Link>

                <button
                  type="button"
                  onClick={handleAppearanceToggle}
                  aria-label={`Switch to ${currentAppearance === "dark" ? "light" : "dark"} mode`}
                  title={`Appearance: ${currentAppearance}`}
                  className="theme-panel inline-flex items-center justify-center rounded-xl p-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary cursor-pointer"
                >
                  {currentAppearance === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Real Profile Archive Counters (Responsive across mobile & desktop) */}
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px] text-on-surface-variant tabular-nums">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedRailFilter(selectedRailFilter === "history" ? "all" : "history")
                  }
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 sm:px-2.5 py-1 transition-colors cursor-pointer ${
                    selectedRailFilter === "history"
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border-custom bg-background/60 hover:border-primary/50"
                  }`}
                >
                  <History className={`h-3 w-3 shrink-0 ${selectedRailFilter === "history" ? "text-primary-contrast" : "text-primary"}`} />
                  <strong className={selectedRailFilter === "history" ? "text-primary-contrast" : "text-on-surface"}>
                    {filteredHistory.length}
                  </strong>{" "}
                  <span>History</span>
                </button>
                <Link
                  href="/watchlist"
                  className="inline-flex items-center gap-1 rounded-lg border border-border-custom bg-background/60 px-2 sm:px-2.5 py-1 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Bookmark className="h-3 w-3 shrink-0 text-primary" />
                  <strong className="text-on-surface">{catalogWatchlist.length}</strong>{" "}
                  <span>Watchlist</span>
                </Link>
              </div>
            </div>

            {/* Category Rail Filter Track */}
            <div className="flex flex-1 items-center min-w-0">
              <div
                data-testid="command-deck-rail-filters"
                className="custom-scrollbar flex w-full max-w-full items-center gap-1.5 overflow-x-auto touch-pan-x pt-0.5 pb-1.5 px-0.5 scroll-smooth"
              >
                {filterChips.map((chip) => {
                  const active = selectedRailFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedRailFilter(chip.id)}
                      data-testid={`deck-rail-filter-${chip.id}`}
                      className={`shrink-0 rounded-full md:rounded-lg border px-3 md:px-2.5 py-1 text-[11px] sm:text-xs font-semibold md:font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                        active
                          ? "border-primary bg-primary text-primary-contrast shadow-sm shadow-primary/20"
                          : "border-border-custom bg-background/55 text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative z-10 bg-transparent pt-2 sm:pt-4 space-y-2 md:space-y-3 pb-16">
        {isOffline && (
          <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="glass-panel rounded-2xl border border-amber-500/30 p-5 space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Offline Mode Active</h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
                Live streaming embeds and uncached remote queries require an internet connection. You can still browse locally cached rails, your Watchlist, Continue Watching, and Watch History below.
              </p>
            </div>
          </div>
        )}

        {selectedRailFilter === "history" ? (
          /* Dedicated Watch History Tab View */
          <WatchHistoryRail
            items={filteredHistory}
            catalogMode={catalogMode}
            onQuickRemoveItem={handleQuickRemoveHistoryItem}
            onClearCache={handleRefreshWatchHistoryCache}
          />
        ) : (
          <>
            {/* 1. Continue Watching Rail (unfinished in-progress items) */}
            {selectedRailFilter === "all" && filteredCw.length > 0 && (
              <ContinueWatchingRail items={filteredCw} />
            )}

            {/* 2. Watchlist Preview Rail */}
            {catalogMode === "tmdb" && tmdbWatchlistPreview.length > 0 && selectedRailFilter === "all" && (
              <TitleRail title="From Your Watchlist" items={tmdbWatchlistPreview} />
            )}

            {/* 3. Catalog Rails with Smooth Horizontal Scroll & Edge Fade Effects */}
            {loadingTrending ? (
              <div className="space-y-8 px-4 sm:px-6 lg:px-8 w-full mx-auto">
                {[1, 2].map((railIdx) => (
                  <div key={railIdx} className="space-y-4">
                    <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                    <div className="flex gap-3.5 sm:gap-4 overflow-x-auto py-2">
                      {[1, 2, 3, 4, 5].map((cardIdx) => (
                        <div
                          key={cardIdx}
                          className="w-[240px] sm:w-[276px] md:w-[308px] lg:w-[328px] aspect-video rounded-xl bg-surface border border-border-custom animate-pulse shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogMode === "anime" ? (
              <div className="space-y-2">
                {(selectedRailFilter === "all" || selectedRailFilter === "trending") && (
                  <AnimeRail title="Trending Anime" items={animeTrending} />
                )}
                {(selectedRailFilter === "all" || selectedRailFilter === "popular") && (
                  <AnimeRail title="Popular Anime" items={animePopular} />
                )}
                {animeGenreRails
                  .filter(
                    ({ genre }) =>
                      selectedRailFilter === "all" || selectedRailFilter === `genre_${genre}`
                  )
                  .map(({ genre, items }) => (
                    <AnimeRail key={genre} title={`${genre} Anime`} items={items} />
                  ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedRailFilter === "all" || selectedRailFilter === "movies") && (
                  <TitleRail title="Trending Movies" items={trendingMovies} mediaType="movie" />
                )}
                {(selectedRailFilter === "all" || selectedRailFilter === "tv") && (
                  <TitleRail title="Trending TV Shows" items={trendingTV} mediaType="tv" />
                )}
                {loadingGenreRails ? (
                  <div className="h-32 bg-surface animate-pulse mx-4 rounded-xl" />
                ) : (
                  genreRails
                    .filter(
                      ({ genre }) =>
                        selectedRailFilter === "all" ||
                        selectedRailFilter === `genre_${genre.id}`
                    )
                    .map(({ genre, titles }) => (
                      <TitleRail
                        key={genre.id}
                        title={`${genre.name} Masterpieces`}
                        items={titles}
                        genreId={genre.id}
                      />
                    ))
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
