"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Trash2, History, Star, ArrowRight, Film } from "lucide-react";
import { useSessionStore, useSearchHistoryStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { searchMulti, TMDBTitle } from "@/lib/tmdb";

import { Suspense } from "react";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();
  const { history, loadHistory, addQuery, clearHistory } = useSearchHistoryStore();

  const queryParam = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(queryParam);
  const [results, setResults] = useState<TMDBTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  // Load search history when profile is active
  useEffect(() => {
    if (currentProfile) {
      loadHistory();
    }
  }, [currentProfile, loadHistory]);

  // Sync input value when URL parameter changes externally (e.g. click history item)
  useEffect(() => {
    if (queryParam !== inputValue) {
      setInputValue(queryParam);
    }
  }, [queryParam]);

  // 300ms Debounce of inputValue to the URL query parameter
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

  // Reset page to 1 whenever URL queryParam changes
  useEffect(() => {
    setPage(1);
  }, [queryParam]);

  // Handle URL query and pagination changes
  useEffect(() => {
    if (!queryParam.trim()) {
      setResults([]);
      return;
    }

    async function performSearch() {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const searchResults = await searchMulti(queryParam, page);
        
        // Apply kidMode filtering if active
        const filtered = currentProfile?.kidMode 
          ? searchResults.filter(title => (title.vote_average || 0) < 7.5) // basic pg filter
          : searchResults;

        if (page === 1) {
          setResults(filtered);
          addQuery(queryParam.trim());
        } else {
          setResults(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = filtered.filter(f => !existingIds.has(f.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }
    performSearch();
  }, [queryParam, page, currentProfile, addQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  const handleQueryClick = (q: string) => {
    setInputValue(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        
        {/* Search Search Box */}
        <div className="flex flex-col items-center max-w-2xl mx-auto text-center gap-4 py-6">
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-on-surface">
            Infinite Search Channel
          </h1>
          <p className="text-xs text-on-surface-variant max-w-md">
            Scan across millions of movies, television series, cast, crew, and catalogs in real-time.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative w-full mt-2">
            <input
              type="text"
              placeholder="Search movies, tv shows, franchises..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-2xl border border-border-custom bg-surface py-3.5 pl-5 pr-12 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300 shadow-xl"
            />
            <button 
              type="submit" 
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-primary text-white hover:bg-opacity-95 transition-all"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Search Content */}
        {!queryParam ? (
          /* Search history & recommendations */
          <div className="max-w-xl mx-auto rounded-2xl border border-border-custom bg-surface/40 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <History className="h-4 w-4" />
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
          /* Search results */
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                Search Results for <span className="text-primary font-bold lowercase font-sans">“{queryParam}”</span>
              </p>
              <p className="text-xs font-mono text-on-surface-variant">
                Found {results.length} results
              </p>
            </div>

            {loading ? (
              /* Loading Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div 
                    key={idx} 
                    className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse" 
                  />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.map((title) => (
                    <div key={title.id} className="flex justify-center">
                      <TitleCard title={title} />
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
                        <span>Loading More Results...</span>
                      </>
                    ) : (
                      <span>Load More Results</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <Film className="h-12 w-12 text-on-surface-variant" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No scanner results found.</p>
                  <p className="text-xs text-on-surface-variant max-w-xs">
                    Please check spelling or search for wider words, genre titles, or franchise creators.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
