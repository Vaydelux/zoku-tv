"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  ArrowRight,
  Trash2,
  Check,
  ArrowDownAZ,
  ChevronDown,
  Clock,
  Calendar,
  Search,
  X,
  History,
  Bookmark,
  FolderHeart,
} from "lucide-react";
import {
  useSessionStore,
  useWatchlistStore,
  useWatchHistoryStore,
  useCustomCollectionsStore,
} from "@/stores";
import { getWatchlistItemId } from "@/lib/media-types";
import { canonicalMediaKey } from "@/lib/custom-collections";
import { filterSavedMediaItems, syncAdultFilterState } from "@/lib/adult-content";
import { getEligibleSavedAnimeIds } from "@/lib/anilist";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { WatchHistoryRail } from "@/components/WatchHistoryRail";
import type { AniListMedia } from "@/lib/anilist";
import {
  sortWatchlistItems,
  filterWatchlistItems,
  WATCHLIST_SORT_OPTIONS,
  type WatchlistSortOption,
} from "@/lib/watchlist";
import {
  filterWatchHistoryByCatalog,
  getWatchHistoryItemId,
  type WatchHistoryItem,
} from "@/lib/watch-history";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const WatchlistAnalyticsSection = dynamic(
  () =>
    import("@/components/watchlist/WatchlistAnalyticsSection").then(
      (m) => m.WatchlistAnalyticsSection
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-xl bg-background/60 border border-border-custom" />
    ),
  }
);

const LibraryCollectionsAndBackup = dynamic(
  () =>
    import("@/components/watchlist/LibraryCollectionsAndBackup").then(
      (m) => m.LibraryCollectionsAndBackup
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-2xl bg-surface/60 border border-border-custom" />
    ),
  }
);

export default function WatchlistPage() {
  return (
    <Suspense fallback={<div role="status" className="min-h-[55svh] bg-background px-6 py-20 text-center text-on-surface-variant">Loading your library…</div>}>
      <WatchlistPageContent />
    </Suspense>
  );
}

function WatchlistPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get("tab");
  const { currentProfile } = useSessionStore();
  const { items, clearWatchlist } = useWatchlistStore();
  const watchHistoryItems = useWatchHistoryStore((state) => state.items);
  const removeWatchHistoryItem = useWatchHistoryStore((state) => state.removeItem);
  const customCollections = useCustomCollectionsStore((state) => state.collections);

  const [activeTab, setActiveTab] = useState<"watchlist" | "collections" | "history">("watchlist");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [adultPolicyReady, setAdultPolicyReady] = useState(false);
  const [safeAnimeIds, setSafeAnimeIds] = useState<ReadonlySet<number>>(new Set());

  useDocumentTitle(
    activeTab === "history"
      ? "Watch History"
      : activeTab === "collections"
      ? "Collections & Backup"
      : "Watchlist"
  );

  useEffect(() => {
    let active = true;
    setAdultPolicyReady(false);
    const animeIds = [...items, ...watchHistoryItems]
      .filter((item) => item.media_type === "anime")
      .map((item) => item.anilistId || 0)
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    (async () => {
      try {
        await syncAdultFilterState();
        const eligible = await getEligibleSavedAnimeIds(animeIds);
        if (active) setSafeAnimeIds(eligible);
      } catch {
        if (active) setSafeAnimeIds(new Set());
      } finally {
        if (active) setAdultPolicyReady(true);
      }
    })();
    return () => { active = false; };
  }, [items, watchHistoryItems, currentProfile?.id]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<WatchlistSortOption>("recently_added");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [highlightedSortIdx, setHighlightedSortIdx] = useState(0);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const catalogMode = currentProfile?.catalogMode ?? "tmdb";

  useEffect(() => {
    if (!isSortOpen) return;
    const currentIdx = WATCHLIST_SORT_OPTIONS.findIndex((opt) => opt.id === sortBy);
    setHighlightedSortIdx(currentIdx >= 0 ? currentIdx : 0);
  }, [isSortOpen, sortBy]);

  useEffect(() => {
    if (!isSortOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedSortIdx((prev) => (prev + 1) % WATCHLIST_SORT_OPTIONS.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedSortIdx(
          (prev) => (prev - 1 + WATCHLIST_SORT_OPTIONS.length) % WATCHLIST_SORT_OPTIONS.length
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setHighlightedSortIdx(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setHighlightedSortIdx(WATCHLIST_SORT_OPTIONS.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const target = WATCHLIST_SORT_OPTIONS[highlightedSortIdx];
        if (target) {
          setSortBy(target.id);
          setIsSortOpen(false);
          sortTriggerRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSortOpen, highlightedSortIdx]);

  useEffect(() => {
    if (selectedTab === "history") {
      setActiveTab("history");
    } else if (selectedTab === "collections") {
      setActiveTab("collections");
    } else {
      setActiveTab("watchlist");
    }
  }, [selectedTab]);

  const selectTab = (tab: "watchlist" | "collections" | "history") => {
    setActiveTab(tab);
    const href =
      tab === "history"
        ? "/watchlist?tab=history"
        : tab === "collections"
        ? "/watchlist?tab=collections"
        : "/watchlist";
    router.replace(href, { scroll: false });
  };

  const notify = (message: string) => {
    setFeedbackNotice(message);
    window.setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const catalogFilteredItems = useMemo(
    () =>
      adultPolicyReady ? filterSavedMediaItems(items.filter((item) =>
        catalogMode === "anime"
          ? item.media_type === "anime"
          : item.media_type !== "anime"
      ), safeAnimeIds) : [],
    [items, catalogMode, adultPolicyReady, safeAnimeIds]
  );

  const catalogFilteredHistory = useMemo(
    () => adultPolicyReady ? filterSavedMediaItems(filterWatchHistoryByCatalog(watchHistoryItems, catalogMode), safeAnimeIds) : [],
    [watchHistoryItems, catalogMode, adultPolicyReady, safeAnimeIds]
  );

  const searchedItems = useMemo(
    () => filterWatchlistItems(catalogFilteredItems, searchQuery),
    [catalogFilteredItems, searchQuery]
  );

  const sortedItems = useMemo(
    () => sortWatchlistItems(searchedItems, sortBy),
    [searchedItems, sortBy]
  );

  const selectedCollection = useMemo(
    () => customCollections.find((col) => col.id === selectedCollectionId) ?? null,
    [customCollections, selectedCollectionId]
  );

  const selectedCollectionItems = useMemo(() => {
    if (!selectedCollection) return [];
    const safeAll = adultPolicyReady ? filterSavedMediaItems(items, safeAnimeIds) : [];
    const keySet = new Set(selectedCollection.itemKeys);
    return safeAll.filter((item) => {
      const id = getWatchlistItemId(item);
      if (!id) return false;
      return keySet.has(canonicalMediaKey(item.media_type, id));
    });
  }, [selectedCollection, items, adultPolicyReady, safeAnimeIds]);

  if (!currentProfile) {
    return null;
  }

  const handleQuickRemoveHistoryItem = async (item: WatchHistoryItem) => {
    const itemId = getWatchHistoryItemId(item);
    if (!itemId) return;
    await removeWatchHistoryItem(item.media_type, itemId);
  };

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
    <div className="zoku-cinematic-watchlist app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Kakei-Style Frosted Liquid Glass Header Card */}
        <div className="liquid-glass rounded-[28px] p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-on-surface tracking-tight">
                {activeTab === "watchlist"
                  ? "My Watchlist"
                  : activeTab === "collections"
                  ? "Collections & Backup"
                  : "Watch History"}
              </h1>
              {feedbackNotice && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/12 px-3 py-0.5 font-mono text-[11px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="h-3 w-3" />
                  <span>{feedbackNotice}</span>
                </span>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Library view tabs"
              className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto max-w-full items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "watchlist"}
                data-testid="tab-watchlist"
                onClick={() => selectTab("watchlist")}
                className={`inline-flex items-center justify-center gap-1 sm:gap-2 rounded-full px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "watchlist"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5 shrink-0 hidden xs:inline-block sm:inline-block" />
                <span>
                  <span className="hidden sm:inline">My </span>Watchlist
                </span>
                <span className="font-mono text-[10px] opacity-85 tabular-nums">
                  ({catalogFilteredItems.length})
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "collections"}
                data-testid="tab-collections"
                onClick={() => selectTab("collections")}
                className={`inline-flex items-center justify-center gap-1 sm:gap-2 rounded-full px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "collections"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <FolderHeart className="h-3.5 w-3.5 shrink-0 hidden xs:inline-block sm:inline-block" />
                <span>Collections</span>
                <span className="font-mono text-[10px] opacity-85 tabular-nums">
                  ({customCollections.length})
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                data-testid="tab-watch-history"
                onClick={() => selectTab("history")}
                className={`inline-flex items-center justify-center gap-1 sm:gap-2 rounded-full px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <History className="h-3.5 w-3.5 shrink-0 hidden xs:inline-block sm:inline-block" />
                <span>
                  <span className="hidden sm:inline">Watch </span>History
                </span>
                <span className="font-mono text-[10px] opacity-85 tabular-nums">
                  ({catalogFilteredHistory.length})
                </span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              {activeTab === "collections" ? (
                <>
                  Custom lists &amp; portable JSON backups for{" "}
                  <span className="text-primary font-bold">{currentProfile.name}</span>.
                </>
              ) : (
                <>
                  {catalogMode === "anime" ? "Anime" : "Movies & TV"}{" "}
                  {activeTab === "watchlist" ? "saved by" : "watched by"}{" "}
                  <span className="text-primary font-bold">{currentProfile.name}</span>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Sorting Dropdown (Watchlist tab) */}
            {activeTab === "watchlist" && catalogFilteredItems.length > 0 && (
              <div className="shrink-0">
                <button
                  ref={sortTriggerRef}
                  type="button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isSortOpen}
                  data-testid="watchlist-sort-dropdown-trigger"
                  data-tv-focusable="true"
                  className={`zoku-dropdown-trigger inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold text-on-surface transition-colors whitespace-nowrap ${
                    isSortOpen
                      ? "border-primary bg-surface ring-1 ring-primary/35"
                      : "border-border-custom bg-surface hover:border-primary/60 hover:bg-surface-hover"
                  }`}
                >
                  <ArrowDownAZ className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-on-surface-variant hidden sm:inline">Sort:</span>
                  <span className="font-semibold text-on-surface truncate">
                    {WATCHLIST_SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-on-surface-variant transition-transform duration-200 ${
                      isSortOpen ? "rotate-180 text-primary" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <FloatingMenu
                  open={isSortOpen}
                  anchorRef={sortTriggerRef}
                  onClose={() => setIsSortOpen(false)}
                  role="listbox"
                  ariaLabel="Sort watchlist titles"
                  align="right"
                  minWidth={216}
                  maxWidth={256}
                  preferredMaxHeight={260}
                  className="p-1.5 space-y-0.5"
                >
                  <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium text-on-surface-variant">
                    Organize titles
                  </p>
                  {WATCHLIST_SORT_OPTIONS.map((option, idx) => {
                    const active = sortBy === option.id;
                    const highlighted = idx === highlightedSortIdx;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-testid={`watchlist-sort-${option.id}`}
                        onMouseEnter={() => setHighlightedSortIdx(idx)}
                        onClick={() => {
                          setSortBy(option.id);
                          setIsSortOpen(false);
                          sortTriggerRef.current?.focus();
                        }}
                        className={`zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          active
                            ? "bg-primary/15 text-primary font-semibold"
                            : highlighted
                              ? "bg-surface-hover text-on-surface font-medium"
                              : "text-on-surface/90 hover:bg-surface-hover hover:text-on-surface font-medium"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {option.id === "recently_added" && (
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {option.id === "alphabetical" && (
                            <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {option.id === "release_date" && (
                            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          <span className="truncate">{option.label}</span>
                        </span>
                        {active && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </FloatingMenu>
              </div>
            )}

            {activeTab === "watchlist" && catalogFilteredItems.length > 0 && (
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

        {activeTab === "history" ? (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <WatchHistoryRail
              items={catalogFilteredHistory}
              catalogMode={catalogMode}
              onQuickRemoveItem={handleQuickRemoveHistoryItem}
            />
          </div>
        ) : activeTab === "collections" ? (
          <div className="space-y-8">
            <LibraryCollectionsAndBackup
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={setSelectedCollectionId}
              onNotify={notify}
            />

            {selectedCollection && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-display font-bold text-on-surface">
                      {selectedCollection.name}
                    </h2>
                    <p className="text-xs text-on-surface-variant tabular-nums">
                      {selectedCollectionItems.length} saved{" "}
                      {selectedCollectionItems.length === 1 ? "title" : "titles"} matched in your watchlist
                      {selectedCollection.description ? ` · ${selectedCollection.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionId(null)}
                    className="rounded-lg border border-border-custom bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                  >
                    Close Preview
                  </button>
                </div>

                {selectedCollectionItems.length > 0 ? (
                  <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-fade-in">
                    {selectedCollectionItems.map((item) => {
                      const parsedYear = item.release_date
                        ? Number.parseInt(item.release_date.split("-")[0] || "", 10)
                        : undefined;
                      return (
                        <div key={`${item.media_type}_${getWatchlistItemId(item)}`} className="w-full">
                          {item.media_type === "anime" ? (
                            <AnimeCard
                              fullWidth
                              anime={{
                                id: item.anilistId!,
                                title: { english: item.title, romaji: item.title },
                                coverImage: { large: item.poster_path },
                                bannerImage: item.backdrop_path,
                                averageScore: item.vote_average ? item.vote_average * 10 : null,
                                seasonYear: Number.isFinite(parsedYear) ? parsedYear : null,
                                media_type: "anime",
                              } as AniListMedia}
                            />
                          ) : (
                            <TitleCard
                              fullWidth
                              title={{
                                id: item.tmdbId!,
                                title: item.title || "",
                                name: item.title || "",
                                poster_path: item.poster_path || null,
                                backdrop_path: item.backdrop_path || null,
                                vote_average: item.vote_average || 0,
                                release_date: item.release_date ?? undefined,
                                first_air_date: item.release_date ?? undefined,
                                media_type: item.media_type as "movie" | "tv",
                                overview: "",
                              }}
                              mediaType={item.media_type as "movie" | "tv"}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border-custom bg-surface/50 p-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-on-surface">
                      No watchlisted titles in &quot;{selectedCollection.name}&quot; yet
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                      Open any movie, series, or anime page, add it to your watchlist, and select &quot;Add to List&quot; to pin it here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Live Search Input Bar at the top of the Watchlist */}
            {catalogFilteredItems.length > 0 && (
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1" role="search">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchQuery("");
                    }}
                    placeholder="Filter watchlist by title or creator name (e.g. Nolan, Arcane, MAPPA)..."
                    aria-label="Filter watchlist by title or creator name"
                    data-testid="watchlist-search-input"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border-custom bg-surface/70 text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      data-testid="watchlist-search-clear-btn"
                      aria-label="Clear search"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant shrink-0">
                    <span className="rounded-xl bg-surface px-3 py-2 border border-border-custom">
                      <span className="font-bold text-on-surface">{sortedItems.length}</span> of {catalogFilteredItems.length} matched
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="rounded-xl px-2.5 py-2 text-[11px] text-primary hover:bg-surface-hover font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Section with D3 Visualizations */}
            {items.length > 0 && (
              <details className="zoku-watchlist-insights rounded-xl border border-border-custom/60 bg-surface/50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Library insights</summary>
                <div className="p-4 pt-0"><WatchlistAnalyticsSection
                items={items}
                catalogFilteredItems={catalogFilteredItems}
                catalogMode={catalogMode}
              /></div>
              </details>
            )}

            {/* Titles Grid or Empty States */}
            {sortedItems.length > 0 ? (
              <div className="space-y-3">
                {searchQuery && (
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant pt-2">
                    <span>
                      Filtering by &quot;<span className="text-primary font-semibold">{searchQuery}</span>&quot;
                    </span>
                    <span>{sortedItems.length} {sortedItems.length === 1 ? "title" : "titles"} found</span>
                  </div>
                )}
                <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2 animate-fade-in">
                  {sortedItems.map((item) => {
                    const parsedYear = item.release_date
                      ? Number.parseInt(item.release_date.split("-")[0] || "", 10)
                      : undefined;
                    const parsedMonth = item.release_date
                      ? Number.parseInt(item.release_date.split("-")[1] || "", 10)
                      : undefined;
                    const parsedDay = item.release_date
                      ? Number.parseInt(item.release_date.split("-")[2] || "", 10)
                      : undefined;

                    return (
                      <div key={`${item.media_type}_${getWatchlistItemId(item)}`} className="w-full">
                        {item.media_type === "anime" ? (
                          <AnimeCard
                            fullWidth
                            anime={{
                              id: item.anilistId!,
                              title: { english: item.title, romaji: item.title },
                              coverImage: { large: item.poster_path },
                              bannerImage: item.backdrop_path,
                              averageScore: item.vote_average ? item.vote_average * 10 : null,
                              seasonYear: Number.isFinite(parsedYear) ? parsedYear : null,
                              startDate: Number.isFinite(parsedYear)
                                ? {
                                    year: parsedYear,
                                    month: Number.isFinite(parsedMonth) ? parsedMonth : 1,
                                    day: Number.isFinite(parsedDay) ? parsedDay : 1,
                                  }
                                : null,
                              media_type: "anime",
                            } as AniListMedia}
                          />
                        ) : (
                          <TitleCard
                            fullWidth
                            title={{
                              id: item.tmdbId!,
                              title: item.title || "",
                              name: item.title || "",
                              poster_path: item.poster_path || null,
                              backdrop_path: item.backdrop_path || null,
                              vote_average: item.vote_average || 0,
                              release_date: item.release_date ?? undefined,
                              first_air_date: item.release_date ?? undefined,
                              media_type: item.media_type as "movie" | "tv",
                              overview: "",
                            }}
                            mediaType={item.media_type as "movie" | "tv"}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : catalogFilteredItems.length > 0 ? (
              /* Filter returned no matches */
              <div
                data-testid="watchlist-search-no-results"
                className="glass-panel flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border-custom rounded-2xl p-8 gap-4 max-w-lg mx-auto animate-fade-in"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No matching saved titles</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    No items in your watchlist match &quot;<span className="text-primary font-bold">{searchQuery}</span>&quot; by title or creator name.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-1 rounded-xl bg-primary hover:bg-opacity-95 text-primary-contrast py-2.5 px-5 text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              /* Watchlist completely empty */
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
          </>
        )}
      </div>
    </div>
  );
}

