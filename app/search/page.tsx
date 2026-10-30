"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Trash2,
  History,
  ArrowRight,
  Film,
  Tv,
  Sparkles,
  Layers,
  Shield,
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

type SearchFilterTab = "all" | "movies_tv" | "anime";

type CombinedSearchResult =
  | { kind: "movie" | "tv"; data: TMDBTitle }
  | { kind: "anime"; data: AniListMedia };

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();
  const { history, loadHistory, addQuery, clearHistory } = useSearchHistoryStore();
  const isKidMode = Boolean(currentProfile?.kidMode);

  const queryParam = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(queryParam);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [results, setResults] = useState<TMDBTitle[]>([]);
  const [animeResults, setAnimeResults] = useState<AniListMedia[]>([]);
  const [activeFilter, setActiveFilter] = useState<SearchFilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (currentProfile) {
      loadHistory();
    }
  }, [currentProfile, loadHistory]);

  useEffect(() => {
    if (queryParam !== inputValue) {
      setInputValue(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== queryParam) {
        if (trimmed) {
          router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        } else {
          router.push("/search");
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, queryParam, router]);

  useEffect(() => {
    setPage(1);
  }, [queryParam]);

  useEffect(() => {
    if (!queryParam.trim()) {
      setResults([]);
      setAnimeResults([]);
      return;
    }

    let cancelled = false;

    async function performSearch() {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const [tmdbPromise, animePromise] = await Promise.allSettled([
          searchMulti(queryParam, page),
          searchAnime(queryParam, page, 18),
        ]);

        if (cancelled) return;

        if (tmdbPromise.status === "fulfilled") {
          const filtered = filterTmdbForKidsMode(tmdbPromise.value, isKidMode);

          if (page === 1) {
            setResults(filtered);
          } else {
            setResults((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = filtered.filter((f) => !existingIds.has(f.id));
              return [...prev, ...newItems];
            });
          }
        }

        if (animePromise.status === "fulfilled") {
          const filteredAnime = filterAnimeForKidsMode(
            animePromise.value.media || [],
            isKidMode
          );
          if (page === 1) {
            setAnimeResults(filteredAnime);
          } else {
            setAnimeResults((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = filteredAnime.filter((f) => !existingIds.has(f.id));
              return [...prev, ...newItems];
            });
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
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
  }, [queryParam, page, currentProfile, isKidMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAutocomplete(false);
    const trimmed = inputValue.trim();
    if (trimmed) {
      void addQuery(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  const handleQueryClick = (q: string) => {
    setShowAutocomplete(false);
    setInputValue(q);
    void addQuery(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handlePosterResultClick = () => {
    const trimmed = queryParam.trim() || inputValue.trim();
    if (trimmed) {
      void addQuery(trimmed);
    }
  };

  const combinedItems: CombinedSearchResult[] = useMemo(() => {
    const list: CombinedSearchResult[] = [];
    const maxLen = Math.max(results.length, animeResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < results.length) {
        const item = results[i];
        list.push({ kind: (item.media_type as "movie" | "tv") || "movie", data: item });
      }
      if (i < animeResults.length) {
        list.push({ kind: "anime", data: animeResults[i] });
      }
    }
    return list;
  }, [results, animeResults]);

  const totalResultsCount = results.length + animeResults.length;

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col items-center max-w-2xl mx-auto text-center gap-4 py-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-on-surface">
              Infinite Search Channel
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
            Scan across millions of movies, television series, and anime franchises in real-time.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative w-full mt-2">
            <input
              type="text"
              placeholder="Search movies, TV shows, anime series, franchises..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowAutocomplete(true);
              }}
              onFocus={() => {
                if (inputValue.trim().length >= 2) {
                  setShowAutocomplete(true);
                }
              }}
              className="glass-panel w-full rounded-2xl py-3.5 pl-5 pr-24 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300 shadow-xl"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <VoiceSearchButton
                onTranscript={(text) => {
                  const trimmed = text.trim();
                  setInputValue(trimmed);
                  setShowAutocomplete(false);
                  if (trimmed) {
                    void addQuery(trimmed);
                    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
                  }
                }}
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-primary text-primary-contrast hover:bg-opacity-95 transition-all"
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
                setInputValue(suggestion.title);
                void addQuery(suggestion.title);
                router.push(suggestion.href);
              }}
              onViewAll={(q) => {
                setShowAutocomplete(false);
                setInputValue(q);
                if (q.trim()) {
                  void addQuery(q.trim());
                }
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
            />
          </form>
        </div>

        {!queryParam ? (
          <div className="glass-panel max-w-xl mx-auto rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>Search Portal History</span>
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear Portal</span>
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
                <p className="font-semibold">Your query scanner is vacant.</p>
                <p className="text-[10px]">Start searching to see history logs here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                Search Results for{" "}
                <span className="text-primary font-bold lowercase font-sans">
                  “{queryParam}”
                </span>
              </p>
              <p className="text-xs font-mono text-on-surface-variant">
                Total Found: {totalResultsCount} results ({results.length} Movies/TV ·{" "}
                {animeResults.length} Anime)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border-custom pb-4">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface border border-transparent"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All Results</span>
                <span className="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] bg-black/20">
                  {totalResultsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("movies_tv")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  activeFilter === "movies_tv"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                    : "border-border-custom text-on-surface-variant hover:text-on-surface hover:bg-surface"
                }`}
              >
                <Film className="h-3.5 w-3.5 text-amber-400" />
                <span>Movies & TV Shows</span>
                <span className="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] bg-black/20">
                  {results.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("anime")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  activeFilter === "anime"
                    ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-fuchsia-300 border-fuchsia-400/60 shadow-sm"
                    : "border-border-custom text-on-surface-variant hover:text-on-surface hover:bg-surface"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                <span>Anime Series</span>
                <span className="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] bg-black/20">
                  {animeResults.length}
                </span>
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <div
                    key={idx}
                    className="aspect-video rounded-xl bg-surface border border-border-custom animate-pulse"
                  />
                ))}
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <Film className="h-12 w-12 text-on-surface-variant" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No scanner results found.</p>
                  <p className="text-xs text-on-surface-variant max-w-xs">
                    {isKidMode
                      ? "No Kids Mode family-safe titles matched your query."
                      : "Please check spelling or search for wider words, genre titles, or franchise creators."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeFilter === "all" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {combinedItems.map((item, idx) => (
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

                {activeFilter === "movies_tv" &&
                  (results.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {results.map((title) => (
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
                        No Movies or TV series found for this query.
                      </p>
                    </div>
                  ))}

                {activeFilter === "anime" &&
                  (animeResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {animeResults.map((anime) => (
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

                <div className="flex justify-center pt-4">
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
