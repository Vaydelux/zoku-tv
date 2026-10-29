"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Film,
  ArrowRight,
  Trash2,
  Check,
  ArrowDownAZ,
  ChevronDown,
  Clock,
  Calendar,
} from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { getWatchlistItemId } from "@/lib/media-types";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { AnimeCard } from "@/components/anime/AnimeCard";
import type { AniListMedia } from "@/lib/anilist";
import {
  sortWatchlistItems,
  WATCHLIST_SORT_OPTIONS,
  type WatchlistSortOption,
} from "@/lib/watchlist";

export default function WatchlistPage() {
  const router = useRouter();
  const { currentProfile } = useSessionStore();
  const { items, initWatchlist, clearWatchlist } = useWatchlistStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<WatchlistSortOption>("recently_added");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const catalogMode = currentProfile?.catalogMode ?? "tmdb";

  useEffect(() => {
    if (currentProfile) {
      const unsubscribe = initWatchlist();
      return () => unsubscribe();
    }
  }, [currentProfile, initWatchlist]);

  // Close sorting dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentProfile) {
    return null;
  }

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        catalogMode === "anime"
          ? item.media_type === "anime"
          : item.media_type !== "anime"
      ),
    [items, catalogMode]
  );

  const sortedItems = useMemo(
    () => sortWatchlistItems(filteredItems, sortBy),
    [filteredItems, sortBy]
  );

  const handleClearAllWatchlist = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setClearing(true);
    try {
      await clearWatchlist(catalogMode);
      setConfirmClear(false);
      setFeedbackNotice("Watchlist emptied successfully");
      window.setTimeout(() => setFeedbackNotice(null), 3000);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="border-b border-border-custom pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface uppercase tracking-wide">
                My Watchlist
              </h1>
              {feedbackNotice && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="h-3 w-3" />
                  <span>{feedbackNotice}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">
              {catalogMode === "anime" ? "Anime" : "Movies & TV"} saved by{" "}
              <span className="text-primary font-bold">{currentProfile.name}</span>.
              <span className="ml-2 font-mono text-[11px] text-on-surface-variant/80">
                ({filteredItems.length} {filteredItems.length === 1 ? "title" : "titles"})
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Sorting Dropdown */}
            {filteredItems.length > 0 && (
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isSortOpen}
                  data-testid="watchlist-sort-dropdown-trigger"
                  className="theme-panel inline-flex items-center gap-2 rounded-xl border border-border-custom px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:border-primary/60 hover:text-primary transition-all duration-300"
                >
                  <ArrowDownAZ className="h-4 w-4 text-primary" />
                  <span className="text-on-surface-variant hidden xs:inline">Sort:</span>
                  <span className="font-bold text-on-surface">
                    {WATCHLIST_SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-primary transition-transform duration-200 ${
                      isSortOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSortOpen && (
                  <div
                    role="listbox"
                    aria-label="Sort watchlist titles"
                    className="glass-panel absolute right-0 mt-2 w-52 rounded-2xl p-1.5 shadow-2xl z-30 animate-scale-up border border-border-custom bg-surface/95 backdrop-blur-md"
                  >
                    <div className="px-3 py-1.5 border-b border-border-custom/60 mb-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                        Organize Titles
                      </p>
                    </div>
                    {WATCHLIST_SORT_OPTIONS.map((option) => {
                      const active = sortBy === option.id;
                      return (
                        <button
                          key={option.id}
                          role="option"
                          aria-selected={active}
                          data-testid={`watchlist-sort-${option.id}`}
                          onClick={() => {
                            setSortBy(option.id);
                            setIsSortOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                            active
                              ? "bg-primary text-primary-contrast shadow-sm"
                              : "text-on-surface hover:bg-surface-hover hover:text-primary"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {option.id === "recently_added" && <Clock className="h-3.5 w-3.5" />}
                            {option.id === "alphabetical" && <ArrowDownAZ className="h-3.5 w-3.5" />}
                            {option.id === "release_date" && <Calendar className="h-3.5 w-3.5" />}
                            <span>{option.label}</span>
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-primary-contrast" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {filteredItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                {confirmClear ? (
                  <div className="inline-flex items-center gap-1 rounded-xl border border-red-500/50 bg-red-500/10 p-1 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => void handleClearAllWatchlist()}
                      disabled={clearing}
                      data-testid="clear-all-watchlist-btn"
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 active:scale-95 transition-all shadow-sm"
                    >
                      {clearing ? "Clearing..." : "Confirm Clear All?"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    data-testid="clear-all-watchlist-btn"
                    className="theme-panel inline-flex items-center gap-1.5 rounded-xl border border-border-custom hover:border-red-500/60 hover:text-red-400 px-3.5 py-2.5 text-xs font-semibold text-on-surface-variant transition-all duration-300"
                    title="Clear all titles from your watchlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All Watchlist</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => router.push("/discover")}
              className="theme-panel flex items-center gap-1.5 rounded-xl hover:bg-surface-hover px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary transition-all duration-300"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sortedItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4 animate-fade-in">
            {sortedItems.map((item) => (
              <div key={`${item.media_type}_${getWatchlistItemId(item)}`} className="flex justify-center">
                {item.media_type === "anime" ? (
                  <AnimeCard
                    anime={{
                      id: item.anilistId!,
                      title: { english: item.title, romaji: item.title },
                      coverImage: { large: item.poster_path },
                      bannerImage: item.backdrop_path,
                      averageScore: item.vote_average ? item.vote_average * 10 : null,
                      media_type: "anime",
                    } as AniListMedia}
                  />
                ) : (
                  <TitleCard
                    title={{
                      id: item.tmdbId!,
                      title: item.title || "",
                      name: item.title || "",
                      poster_path: item.poster_path || null,
                      backdrop_path: item.backdrop_path || null,
                      vote_average: item.vote_average || 0,
                      media_type: item.media_type as "movie" | "tv",
                      overview: "",
                    }}
                    mediaType={item.media_type as "movie" | "tv"}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border-custom rounded-2xl p-8 gap-4 max-w-lg mx-auto">
            <Film className="h-12 w-12 text-primary animate-pulse" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Your watchlist is vacant.</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Start discovering {catalogMode === "anime" ? "anime" : "movies and TV"} and add titles to your watchlist.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="mt-2 rounded-xl bg-primary hover:bg-opacity-95 text-primary-contrast py-2.5 px-6 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Browse Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
