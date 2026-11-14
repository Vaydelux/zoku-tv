"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Trash2,
  History,
  ArrowRight,
  Film,
  Sparkles,
  Shield,
  X,
} from "lucide-react";
import { useSessionStore, useSearchHistoryStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { searchMulti, TMDBTitle } from "@/lib/tmdb";
import { searchAnime, type AniListMedia } from "@/lib/anilist";
import {
  filterTmdbForKidsMode,
  filterAnimeForKidsMode,
} from "@/lib/kids-mode";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { SearchAutocompleteDropdown } from "@/components/SearchAutocompleteDropdown";
import { shouldOfferMoreSearchResults, getSearchPageResultStatus, matchesSearchMediaTab, type SearchMediaTab } from "@/lib/search-result-status";
import { SEARCH_MEDIA_GENRES, matchesSearchGenre, type SearchGenreLabel } from "@/lib/search-media-genre";
import { LEGACY_SEARCH_SESSION_KEY, searchQueryStorageKey, searchViewScopeKey, sanitizeSavedSearchQuery, type SavedSearchQuery } from "@/lib/search-session-scope";
import { sortSearchEntries, type SearchSortMode } from "@/lib/search-result-sort";

type SearchFilterTab = SearchMediaTab;

type CombinedSearchResult =
  | { kind: "movie" | "tv"; data: TMDBTitle }
  | { kind: "anime"; data: AniListMedia };

let memorySearchSession: SavedSearchQuery | null = null;

function readSavedSearchSession(profileId: string): SavedSearchQuery | null {
  if (!profileId) return null;
  if (memorySearchSession?.profileId === profileId) return memorySearchSession;
  if (typeof window === "undefined") return null;
  try {
    // Delete the previous unscoped cache containing complete movie/anime data.
    sessionStorage.removeItem(LEGACY_SEARCH_SESSION_KEY);
    const key = searchQueryStorageKey(profileId);
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const saved = sanitizeSavedSearchQuery(JSON.parse(raw), profileId);
    if (saved) memorySearchSession = saved;
    return saved;
  } catch {
    return null;
  }
}

function writeSavedSearchSession(session: SavedSearchQuery | null, profileId: string) {
  const key = searchQueryStorageKey(profileId);
  if (!key) return;
  const saved = sanitizeSavedSearchQuery(session, profileId);
  if (memorySearchSession?.profileId === profileId) memorySearchSession = null;
  if (saved) memorySearchSession = saved;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LEGACY_SEARCH_SESSION_KEY);
    if (saved) sessionStorage.setItem(key, JSON.stringify(saved));
    else sessionStorage.removeItem(key);
  } catch {
    // Query persistence is optional; server policy remains authoritative.
  }
}

export default function SearchPage() {
  const profileId = useSessionStore((state) => state.currentProfile?.id);
  const isKidMode = useSessionStore((state) => Boolean(state.currentProfile?.kidMode));
  const viewScopeKey = searchViewScopeKey(profileId, isKidMode);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SearchPageContent key={viewScopeKey} />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();
  const { history, loadHistory, addQuery, clearHistory } = useSearchHistoryStore();
  const isKidMode = Boolean(currentProfile?.kidMode);
  const profileId = currentProfile?.id ?? "";

  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoredOnMountRef = useRef(false);

  const savedInitial = useMemo(() => readSavedSearchSession(profileId), [profileId]);
  const urlQueryParam = searchParams.get("q") || "";

  // Remounting on profile/Kids Mode changes clears all previous catalog data.
  // Match the server render first; profile-scoped query restoration happens
  // after hydration in an effect, avoiding input-value hydration mismatch.
  const [inputValue, setInputValue] = useState(urlQueryParam);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [results, setResults] = useState<TMDBTitle[]>([]);
  const [animeResults, setAnimeResults] = useState<AniListMedia[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<SearchGenreLabel>("All genres");
  const [sortMode, setSortMode] = useState<SearchSortMode>("relevance");
  const [activeFilter, setActiveFilter] = useState<SearchFilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"ok" | "partial" | "unavailable">("ok");
  const [page, setPage] = useState(1);

  const activeQuery = urlQueryParam || inputValue.trim();

  useEffect(() => {
    setSelectedGenre("All genres");
  }, [urlQueryParam, currentProfile?.id]);

  // Do not summon the soft keyboard on phones when opening Search.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) return;
    const inputEl = searchInputRef.current;
    if (inputEl) {
      inputEl.focus({ preventScroll: true });
      const len = inputEl.value.length;
      try {
        inputEl.setSelectionRange(len, len);
      } catch {
        // ignore selection range errors on non-text inputs
      }
    }
  }, []);

  // Restore URL query parameter if returning to /search with a saved session
  useEffect(() => {
    if (restoredOnMountRef.current) return;
    restoredOnMountRef.current = true;

    if (!urlQueryParam && savedInitial?.query?.trim()) {
      const restoredQ = savedInitial.query.trim();
      setInputValue(restoredQ);
      router.replace(`/search?q=${encodeURIComponent(restoredQ)}`, { scroll: false });
    }
  }, [urlQueryParam, savedInitial, isKidMode, router]);

  useEffect(() => {
    if (currentProfile) {
      loadHistory();
    }
  }, [currentProfile, loadHistory]);

  useEffect(() => {
    if (urlQueryParam && urlQueryParam !== inputValue) {
      setInputValue(urlQueryParam);
    }
  }, [urlQueryParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== urlQueryParam) {
        if (trimmed) {
          router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
        } else {
          writeSavedSearchSession(null, profileId);
          router.replace("/search", { scroll: false });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, urlQueryParam, router]);

  // Persist query text only, per profile; never cache filtered media results.
  useEffect(() => {
    const query = urlQueryParam.trim();
    if (query && profileId) {
      writeSavedSearchSession({ profileId, query }, profileId);
    }
  }, [urlQueryParam, profileId]);

  useEffect(() => {
    const trimmed = urlQueryParam.trim();
    if (!trimmed) {
      if (!inputValue.trim()) {
        setResults([]);
        setAnimeResults([]);
        setHasMore(false);
        setSearchStatus("ok");
      }
      return;
    }

    // Refetch the query to apply the current content policy on every navigation.
    // Previously saved pages could contain items unlocked in an earlier session.
    let cancelled = false;

    async function performSearch() {
      if (page === 1) {
        setLoading(true);
        setResults([]);
        setAnimeResults([]);
        setHasMore(false);
        setSearchStatus("ok");
      } else {
        setLoadingMore(true);
      }
      try {
        const [tmdbPromise, animePromise] = await Promise.allSettled([
          searchMulti(trimmed, page),
          searchAnime(trimmed, page, 18),
        ]);

        if (cancelled) return;

        setSearchStatus(getSearchPageResultStatus({
          tmdbFailed: tmdbPromise.status === "rejected",
          animeFailed: animePromise.status === "rejected",
        }));
        setHasMore(shouldOfferMoreSearchResults({
          page,
          tmdbResultCount: tmdbPromise.status === "fulfilled" ? tmdbPromise.value.length : 0,
          animeHasNextPage: animePromise.status === "fulfilled" && Boolean(animePromise.value.pageInfo?.hasNextPage),
        }));

        let nextTmdbResults: TMDBTitle[] = [];
        let nextAnimeResults: AniListMedia[] = [];

        if (tmdbPromise.status === "fulfilled") {
          const filtered = filterTmdbForKidsMode(tmdbPromise.value, isKidMode);

          if (page === 1) {
            nextTmdbResults = filtered;
            setResults(filtered);
          } else {
            setResults((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = filtered.filter((f) => !existingIds.has(f.id));
              nextTmdbResults = [...prev, ...newItems];
              return nextTmdbResults;
            });
          }
        }

        if (animePromise.status === "fulfilled") {
          const filteredAnime = filterAnimeForKidsMode(
            animePromise.value.media || [],
            isKidMode
          );
          if (page === 1) {
            nextAnimeResults = filteredAnime;
            setAnimeResults(filteredAnime);
          } else {
            setAnimeResults((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = filteredAnime.filter((f) => !existingIds.has(f.id));
              nextAnimeResults = [...prev, ...newItems];
              return nextAnimeResults;
            });
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) {
          setSearchStatus("unavailable");
          setHasMore(false);
          if (page === 1) {
            setResults([]);
            setAnimeResults([]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [urlQueryParam, page, currentProfile, isKidMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAutocomplete(false);
    const trimmed = inputValue.trim();
    if (trimmed) {
      void addQuery(trimmed);
      setPage(1);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    } else {
      writeSavedSearchSession(null, profileId);
      setResults([]);
      setAnimeResults([]);
      router.replace("/search", { scroll: false });
    }
  };

  const handleClearSearch = () => {
    setInputValue("");
    setShowAutocomplete(false);
    setResults([]);
    setAnimeResults([]);
    setPage(1);
    writeSavedSearchSession(null, profileId);
    router.replace("/search", { scroll: false });
    searchInputRef.current?.focus();
  };

  const handleQueryClick = (q: string) => {
    setShowAutocomplete(false);
    setInputValue(q);
    setPage(1);
    void addQuery(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
  };

  const handlePosterResultClick = () => {
    const trimmed = activeQuery.trim();
    if (trimmed) {
      void addQuery(trimmed);
      writeSavedSearchSession({ profileId, query: trimmed }, profileId);
    }
  };

  const genreFilteredTmdb = useMemo(() => results.filter((title) => matchesSearchGenre({ kind: title.media_type === "tv" ? "tv" : "movie", data: title }, selectedGenre)), [results, selectedGenre]);
  const genreFilteredAnime = useMemo(() => animeResults.filter((anime) => matchesSearchGenre({ kind: "anime", data: anime }, selectedGenre)), [animeResults, selectedGenre]);
  const availableGenres = useMemo(() => SEARCH_MEDIA_GENRES.filter(({ label }) =>
    ((activeFilter === "all" || activeFilter === "movie" || activeFilter === "tv") &&
      results.some((title) => {
        const kind = title.media_type === "tv" ? "tv" : "movie";
        return matchesSearchMediaTab(kind, activeFilter) &&
          matchesSearchGenre({ kind, data: title }, label);
      })) ||
    ((activeFilter === "all" || activeFilter === "anime") &&
      animeResults.some((anime) => matchesSearchGenre({ kind: "anime", data: anime }, label)))
  ), [results, animeResults, activeFilter]);
  const filteredTmdbByType = useMemo(() =>
    genreFilteredTmdb.filter((title) => matchesSearchMediaTab(title.media_type === "tv" ? "tv" : "movie", activeFilter)),
    [genreFilteredTmdb, activeFilter]
  );
  const visibleResultCount = (activeFilter === "anime" ? 0 : filteredTmdbByType.length) +
    (activeFilter === "all" || activeFilter === "anime" ? genreFilteredAnime.length : 0);

  const combinedItems: CombinedSearchResult[] = useMemo(() => {
    const list: CombinedSearchResult[] = [];
    const maxLen = Math.max(genreFilteredTmdb.length, genreFilteredAnime.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < genreFilteredTmdb.length) {
        const item = genreFilteredTmdb[i];
        list.push({ kind: (item.media_type as "movie" | "tv") || "movie", data: item });
      }
      if (i < genreFilteredAnime.length) {
        list.push({ kind: "anime", data: genreFilteredAnime[i] });
      }
    }
    return list;
  }, [genreFilteredTmdb, genreFilteredAnime]);

  const sortedCombinedItems = useMemo(() => sortSearchEntries(combinedItems, sortMode), [combinedItems, sortMode]);
  const sortedTmdbByType = useMemo(() => sortSearchEntries(filteredTmdbByType.map((data) => ({ kind: data.media_type === "tv" ? "tv" as const : "movie" as const, data })), sortMode).map((entry) => entry.data), [filteredTmdbByType, sortMode]);
  const sortedAnime = useMemo(() => sortSearchEntries(genreFilteredAnime.map((data) => ({ kind: "anime" as const, data })), sortMode).map((entry) => entry.data), [genreFilteredAnime, sortMode]);

  const totalResultsCount = results.length + animeResults.length;
  const queryParam = activeQuery;

  return (
    <div className="zoku-cinematic-search app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div className="zoku-search-header flex flex-col items-center max-w-2xl mx-auto text-center gap-4 py-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-on-surface">
              Search
            </h1>
            {isKidMode && (
              <span
                data-testid="search-kids-mode-badge"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                <Shield className="h-3 w-3" />
                <span>Kids Safe</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant max-w-md">
            Discover movies, TV shows, and anime in one search.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative w-full mt-2">
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search movies, TV shows and anime"
              data-testid="search-page-input"
              placeholder="Search movies, TV shows, anime series, franchises..."
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                setPage(1);
                setShowAutocomplete(val.trim().length >= 2);
              }}
              onClick={() => {
                if (inputValue.trim().length >= 2 && totalResultsCount === 0) {
                  setShowAutocomplete(true);
                }
              }}
              className="glass-panel w-full rounded-xl py-3.5 pl-4 pr-[10.5rem] text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300 shadow-xl"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  data-testid="search-clear-btn"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <VoiceSearchButton
                onTranscript={(text) => {
                  const trimmed = text.trim();
                  setInputValue(trimmed);
                  setShowAutocomplete(false);
                  if (trimmed) {
                    setPage(1);
                    void addQuery(trimmed);
                    router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
                  }
                }}
              />
              <button
                type="submit"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-contrast hover:bg-opacity-95 transition-all"
                 aria-label="Search titles"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <SearchAutocompleteDropdown
              query={inputValue}
              isOpen={showAutocomplete}
              onClose={() => setShowAutocomplete(false)}
              onSelectSuggestion={(suggestion) => {
                setShowAutocomplete(false);
                const savedQuery = inputValue.trim() || suggestion.title;
                void addQuery(savedQuery);
                writeSavedSearchSession({ profileId, query: savedQuery }, profileId);
                router.push(suggestion.href);
              }}
              onViewAll={(q) => {
                setShowAutocomplete(false);
                setInputValue(q);
                setPage(1);
                if (q.trim()) {
                  void addQuery(q.trim());
                }
                router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
              }}
            />
          </form>
        </div>

        {!queryParam ? (
          <div className="glass-panel max-w-xl mx-auto rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>Recent searches</span>
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear history</span>
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="flex flex-col gap-1">
                {history.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQueryClick(q)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface text-left text-xs font-medium text-on-surface hover:text-primary transition-colors"
                  >
                    <span>{q}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-on-surface-variant space-y-1">
                <p className="font-semibold">No recent searches.</p>
                <p className="text-[10px]">Your recent searches will appear here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <p className="text-xs tracking-wide text-on-surface-variant">
                Results for{" "}
                <span className="text-primary font-bold lowercase font-sans">
                  “{queryParam}”
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-on-surface-variant">
                  Showing {visibleResultCount} results
                </p>
                <label htmlFor="zoku-search-sort" className="sr-only">Sort search results</label>
                <select
                  id="zoku-search-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SearchSortMode)}
                  className="min-h-11 rounded-lg border border-border-custom bg-surface px-3 py-2 text-xs font-medium text-on-surface outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating">Top rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            <div role="group" aria-label="Filter search results" className="zoku-media-tabs flex flex-wrap items-center gap-2 pb-2">
              {([
                { id: "all", name: "All" },
                { id: "movie", name: "Movies" },
                { id: "tv", name: "Series" },
                { id: "anime", name: "Anime" },
              ] as const).map((tab) => (
                <button key={tab.id} type="button"
                  aria-pressed={activeFilter === tab.id}
                  data-tv-focusable="true"
                  onClick={() => { setActiveFilter(tab.id); setSelectedGenre("All genres"); }}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activeFilter === tab.id
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border-custom bg-surface/60 text-on-surface-variant hover:border-primary/50 hover:text-on-surface"}`}
                >{tab.name}</button>
              ))}
            </div>

            {availableGenres.length > 0 && !loading && (
              <div
                role="group"
                aria-label="Filter search results by genre"
                className="zoku-search-genres custom-scrollbar flex items-center gap-2 overflow-x-auto pb-2"
              >
                {(["All genres", ...availableGenres.map((entry) => entry.label)] as SearchGenreLabel[]).map((label) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selectedGenre === label}
                    onClick={() => setSelectedGenre(label)}
                    className={`min-h-10 shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${selectedGenre === label ? "border-primary bg-primary text-primary-contrast" : "border-border-custom bg-surface/70 text-on-surface-variant hover:border-primary/50 hover:text-on-surface"}`}
                  >{label}</button>
                ))}
              </div>
            )}

            {searchStatus !== "ok" && !loading && (
              <p role="status" className="rounded-xl border border-border-custom bg-surface px-4 py-3 text-sm text-on-surface-variant">
                {searchStatus === "unavailable"
                  ? "Search is temporarily unavailable. Please retry your search."
                  : "Some results may be missing because one catalog is temporarily unavailable."}
              </p>
            )}

            {loading ? (
              <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <div
                    key={idx}
                    className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse"
                  />
                ))}
              </div>
            ) : visibleResultCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <Film className="h-12 w-12 text-on-surface-variant" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{searchStatus === "unavailable" ? "Search is temporarily unavailable." : "No matching titles found."}</p>
                  <p className="text-xs text-on-surface-variant max-w-xs">
                    {searchStatus === "unavailable"
                       ? "Please retry once the catalogs are available."
                       : isKidMode
                         ? "No Kids Mode family-safe titles matched your query."
                         : "Try a different title, genre, or keyword."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeFilter === "all" && (
                  <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {sortedCombinedItems.map((item, idx) => (
                      <div
                        key={
                          item.kind === "anime"
                            ? `anime_${item.data.id}`
                            : `tmdb_${item.data.id}_${idx}`
                        }
                        onClickCapture={handlePosterResultClick}
                        className="w-full"
                      >
                        {item.kind === "anime" ? (
                          <AnimeCard anime={item.data} fullWidth />
                        ) : (
                          <TitleCard title={item.data} mediaType={item.kind} fullWidth />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(activeFilter === "movie" || activeFilter === "tv") &&
                  (filteredTmdbByType.length > 0 ? (
                    <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {sortedTmdbByType.map((title) => (
                        <div
                          key={title.id}
                          onClickCapture={handlePosterResultClick}
                          className="w-full"
                        >
                          <TitleCard title={title} mediaType={title.media_type} fullWidth />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <Film className="h-10 w-10 text-on-surface-variant" />
                      <p className="text-xs text-on-surface-variant">
                        No matching {activeFilter === "movie" ? "movies" : "series"} found for this query.
                      </p>
                    </div>
                  ))}

                {activeFilter === "anime" &&
                  (genreFilteredAnime.length > 0 ? (
                    <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {sortedAnime.map((anime) => (
                        <div
                          key={anime.id}
                          onClickCapture={handlePosterResultClick}
                          className="w-full"
                        >
                          <AnimeCard anime={anime} fullWidth />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <Sparkles className="h-10 w-10 text-on-surface-variant" />
                      <p className="text-xs text-on-surface-variant">
                        No Anime series found for this query.
                      </p>
                    </div>
                  ))}

                {hasMore && <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom py-3 px-8 text-xs font-semibold text-on-surface hover:text-primary active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow"
                  >
                    {loadingMore ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading More Results...</span>
                      </>
                    ) : (
                      <span>Load More Results</span>
                    )}
                  </button>
                </div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
