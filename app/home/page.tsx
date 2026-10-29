"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Film,
  Sparkles,
  Palette,
  Sun,
  Moon,
  Layers,
  History,
  Bookmark,
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
import { getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { filterContinueWatchingByCatalog } from "@/lib/continue-watching";
import {
  filterWatchHistoryByCatalog,
  getWatchHistoryItemId,
  type WatchHistoryItem,
  type WatchHistoryUpsertInput,
} from "@/lib/watch-history";
import {
  THEME_OPTIONS,
  getThemeOption,
  normalizeAppearance,
} from "@/lib/themes";

export default function HomePage() {
  const { user, currentProfile, updateProfile } = useSessionStore();
  const continueWatchingItems = useContinueWatchingStore((state) => state.items);
  const watchHistoryItems = useWatchHistoryStore((state) => state.items);
  const removeWatchHistoryItem = useWatchHistoryStore((state) => state.removeItem);
  const seedInitialHistoryIfNeeded = useWatchHistoryStore(
    (state) => state.seedInitialHistoryIfNeeded
  );
  const watchlistItems = useWatchlistStore((state) => state.items);

  const catalogMode = currentProfile?.catalogMode ?? "tmdb";
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

  const [showThemeDrawer, setShowThemeDrawer] = useState(false);
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

  // Reset rail filter when switching catalog mode
  useEffect(() => {
    setSelectedRailFilter("all");
  }, [catalogMode]);

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
        setHeroSlides(trending.heroSlides);
        setTrendingMovies(trending.trendingMovies);
        setTrendingTV(trending.trendingTV);
      } catch (err) {
        console.error("Failed to load TMDB home:", err);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }

      setLoadingMessage("Loading genre rails...");
      try {
        const prefGenreIds = currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18];
        const rails = await loadHomeGenreRails(prefGenreIds);
        if (!cancelled) setGenreRails(rails);
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
        setAnimeHero(content.heroSlides);
        setAnimeTrending(content.trending);
        setAnimePopular(content.popular);
        setAnimeGenreRails(content.genreRails);
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
  }, [user, currentProfile?.id, catalogMode, cacheRefreshVersion]);

  const handleQuickRemoveHistoryItem = async (item: WatchHistoryItem) => {
    const itemId = getWatchHistoryItemId(item);
    if (!itemId) return;
    await removeWatchHistoryItem(item.media_type, itemId);
  };

  const handleRefreshWatchHistoryCache = async () => {
    setCacheRefreshVersion((prev) => prev + 1);
  };

  // Build seed candidates from loaded catalog so Watch History is populated on first visit
  const historySeedCandidates = useMemo<WatchHistoryUpsertInput[]>(() => {
    if (catalogMode === "anime") {
      return animeTrending.slice(0, 6).map((anime, idx) => ({
        media_type: "anime" as const,
        anilistId: anime.id,
        season: 1,
        episode: idx % 2 === 0 ? 12 : 4,
        title: getAnimeDisplayTitle(anime),
        overview: anime.description ?? null,
        vote_average: anime.averageScore ? anime.averageScore / 10 : null,
        poster_path: getAnimePoster(anime),
        backdrop_path: anime.bannerImage ?? getAnimePoster(anime),
        progress_percent: idx % 2 === 0 ? 100 : 64,
        completed: idx % 2 === 0,
      }));
    }

    const combined: WatchHistoryUpsertInput[] = [];
    trendingMovies.slice(0, 4).forEach((movie, idx) => {
      combined.push({
        media_type: "movie",
        tmdbId: movie.id,
        title: movie.title || movie.name || "Untitled",
        overview: movie.overview ?? null,
        vote_average: movie.vote_average ?? null,
        poster_path: movie.poster_path ?? null,
        backdrop_path: movie.backdrop_path ?? null,
        progress_percent: idx < 3 ? 100 : 58,
        completed: idx < 3,
      });
    });
    trendingTV.slice(0, 3).forEach((show, idx) => {
      combined.push({
        media_type: "tv",
        tmdbId: show.id,
        season: 1,
        episode: idx === 0 ? 8 : 3,
        title: show.name || show.title || "Untitled",
        overview: show.overview ?? null,
        vote_average: show.vote_average ?? null,
        poster_path: show.poster_path ?? null,
        backdrop_path: show.backdrop_path ?? null,
        progress_percent: idx === 0 ? 100 : 72,
        completed: idx === 0,
      });
    });
    return combined;
  }, [catalogMode, trendingMovies, trendingTV, animeTrending]);

  useEffect(() => {
    if (!user || !currentProfile || historySeedCandidates.length === 0) return;
    void seedInitialHistoryIfNeeded(catalogMode, historySeedCandidates);
    const partialCandidates = historySeedCandidates
      .filter((c) => !c.completed)
      .map((c, idx) => ({
        media_type: c.media_type,
        tmdbId: c.tmdbId ?? undefined,
        anilistId: c.anilistId ?? undefined,
        season: c.season ?? undefined,
        episode: c.episode ?? undefined,
        title: c.title,
        overview: c.overview,
        vote_average: c.vote_average,
        poster_path: c.poster_path,
        backdrop_path: c.backdrop_path,
        progress_percent: idx === 0 ? 68 : 42,
        current_time_sec: idx === 0 ? 2840 : 1420,
        duration_sec: 4400,
      }));
    void useContinueWatchingStore
      .getState()
      .seedInitialContinueWatchingIfNeeded(catalogMode, partialCandidates);
  }, [user, currentProfile, catalogMode, historySeedCandidates, seedInitialHistoryIfNeeded]);

  const loadingMedia = loadingTrending || loadingGenreRails;

  const handleCatalogToggle = (nextMode: "tmdb" | "anime") => {
    if (!currentProfile || nextMode === catalogMode) return;
    void updateProfile(currentProfile.id, { catalogMode: nextMode });
  };

  const handleThemeSelect = (themeId: string) => {
    if (!currentProfile) return;
    void updateProfile(currentProfile.id, { themePreference: themeId });
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
    ];
  }, [catalogMode, animeGenreRails, genreRails]);

  useEffect(() => {
    setFilterOptions(filterChips);
  }, [filterChips, setFilterOptions]);

  return (
    <div className="app-page-shell pb-16 transition-colors duration-300">
      {loadingMedia && loadingMessage && <LoadingBanner message={loadingMessage} />}
      <Navbar />

      {catalogMode === "anime" ? (
        <AnimeHeroBanner slides={animeHero} loading={loadingTrending} />
      ) : (
        <HeroCarousel slides={heroSlides} loading={loadingTrending} />
      )}

      {/* Zoku Profile & Catalog Studio Command Deck (100% bound to real Zoku TV state) */}
      <div className="relative z-20 mx-auto -mt-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-2xl p-3 sm:p-4 shadow-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Dual Catalog Switcher + Live Profile Telemetry */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <div
                role="group"
                aria-label="Catalog mode switcher"
                className="inline-flex items-center rounded-xl border border-border-custom bg-background/70 p-1 backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => handleCatalogToggle("tmdb")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    catalogMode === "tmdb"
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  <span>Cinema & TV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCatalogToggle("anime")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    catalogMode === "anime"
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AniList Anime</span>
                </button>
              </div>

              {/* Real Profile Archive Counters */}
              <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-on-surface-variant tabular-nums">
                <span className="inline-flex items-center gap-1 rounded-lg border border-border-custom bg-background/60 px-2.5 py-1">
                  <History className="h-3 w-3 text-primary" />
                  <strong className="text-on-surface">{filteredHistory.length}</strong> History
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-border-custom bg-background/60 px-2.5 py-1">
                  <Bookmark className="h-3 w-3 text-primary" />
                  <strong className="text-on-surface">{watchlistItems.length}</strong> Watchlist
                </span>
              </div>
            </div>

            {/* Category Rail Filter Track: Compact touch-friendly scrollable strip on small screens + crisp pills on desktop */}
            <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
              <div
                data-testid="command-deck-rail-filters"
                className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto touch-pan-x py-1 px-0.5 scroll-smooth"
              >
                {filterChips.map((chip) => {
                  const active = selectedRailFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedRailFilter(chip.id)}
                      data-testid={`deck-rail-filter-${chip.id}`}
                      className={`shrink-0 rounded-full md:rounded-lg border px-3 md:px-2.5 py-1 text-xs font-semibold md:font-medium transition-all whitespace-nowrap active:scale-95 ${
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

              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setShowThemeDrawer((prev) => !prev)}
                  className="theme-panel inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
                  title="Switch Profile Theme Palette"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/25 shrink-0"
                    style={{ backgroundImage: currentTheme.preview }}
                  />
                  <Palette className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">{currentTheme.name}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAppearanceToggle}
                  aria-label={`Switch to ${currentAppearance === "dark" ? "light" : "dark"} mode`}
                  title={`Appearance: ${currentAppearance}`}
                  className="theme-panel inline-flex items-center justify-center rounded-xl p-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary"
                >
                  {currentAppearance === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Expandable 18-Theme Palette Strip */}
          {showThemeDrawer && (
            <div className="mt-3 border-t border-border-custom pt-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Zoku 18-Theme Atmosphere Engine</span>
                </span>
                <span>Active: {currentTheme.name}</span>
              </div>
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {THEME_OPTIONS.map((theme) => {
                  const selected = theme.id === currentTheme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeSelect(theme.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        selected
                          ? "border-primary bg-primary text-primary-contrast font-semibold shadow-sm"
                          : "border-border-custom bg-background/60 text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/25 shadow-sm"
                        style={{ backgroundImage: theme.preview }}
                      />
                      <span>{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="relative z-10 bg-transparent pt-2 sm:pt-4 space-y-2 md:space-y-3 pb-16">
        {isOffline && filteredCw.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-panel rounded-2xl border border-primary/25 p-5 space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Offline Mode</h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl leading-relaxed">
                Catalog discovery is unavailable offline. You can still resume from Continue Watching or re-watch from Watch History below.
              </p>
            </div>
          </div>
        )}

        {/* 1. Continue Watching Rail (unfinished in-progress items) */}
        {filteredCw.length > 0 && <ContinueWatchingRail items={filteredCw} />}

        {/* 2. Watch History Rail (distinct rail for recently completed or partially watched content to re-watch favorites) */}
        <WatchHistoryRail
          items={filteredHistory}
          catalogMode={catalogMode}
          seedCandidates={historySeedCandidates}
          onQuickRemoveItem={handleQuickRemoveHistoryItem}
          onClearCache={handleRefreshWatchHistoryCache}
        />

        {/* 3. Catalog Rails with Smooth Horizontal Scroll & Edge Fade Effects */}
        {loadingTrending ? (
          <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {[1, 2].map((railIdx) => (
              <div key={railIdx} className="space-y-4">
                <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                <div className="flex gap-3 sm:gap-4 overflow-x-auto py-2">
                  {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                    <div
                      key={cardIdx}
                      className="w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse shrink-0"
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
      </section>
    </div>
  );
}

