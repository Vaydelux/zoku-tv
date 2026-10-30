"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  History,
  RotateCcw,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";
import { WatchHistoryCard } from "@/components/WatchHistoryCard";
import { RailNavButton } from "@/components/RailNavButton";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import {
  filterWatchHistoryByStatus,
  filterWatchHistoryByType,
  getWatchHistoryItemId,
  type WatchHistoryFilter,
  type WatchHistoryItem,
  type WatchHistoryTypeFilter,
} from "@/lib/watch-history";
import { useWatchHistoryStore } from "@/stores";

interface WatchHistoryRailProps {
  items: WatchHistoryItem[];
  catalogMode: "tmdb" | "anime";
  onQuickRemoveItem?: (item: WatchHistoryItem) => Promise<void> | void;
  onClearCache?: () => Promise<void> | void;
}

export function WatchHistoryRail({
  items,
  catalogMode,
  onQuickRemoveItem,
  onClearCache,
}: WatchHistoryRailProps) {
  const [typeFilter, setTypeFilter] = useState<WatchHistoryTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<WatchHistoryFilter>("all");
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const {
    clearHistory,
    removeItem,
    refreshLocalHistoryCache,
  } = useWatchHistoryStore();

  const movieCount = useMemo(
    () => filterWatchHistoryByType(items, "movie").length,
    [items]
  );
  const tvCount = useMemo(
    () => filterWatchHistoryByType(items, "tv").length,
    [items]
  );

  const filteredByType = useMemo(
    () => filterWatchHistoryByType(items, typeFilter),
    [items, typeFilter]
  );

  const completedCount = useMemo(
    () => filteredByType.filter((item) => item.completed).length,
    [filteredByType]
  );
  const partialCount = useMemo(
    () => filteredByType.filter((item) => !item.completed).length,
    [filteredByType]
  );

  const visibleItems = useMemo(
    () => filterWatchHistoryByStatus(filteredByType, statusFilter),
    [filteredByType, statusFilter]
  );

  const {
    rowRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
    isScrolling,
    scrollDirection,
    handleScroll,
  } = useSmoothRailScroll(visibleItems.length);

  const showTemporaryNotice = (message: string) => {
    setStatusNotice(message);
    window.setTimeout(() => {
      setStatusNotice((current) => (current === message ? null : current));
    }, 2600);
  };

  const handleQuickRemove = async (item: WatchHistoryItem) => {
    const itemId = getWatchHistoryItemId(item);
    if (!itemId) return;
    if (onQuickRemoveItem) {
      await onQuickRemoveItem(item);
    } else {
      await removeItem(item.media_type, itemId);
    }
    showTemporaryNotice(`Removed "${item.title}"`);
  };

  const handleClearCache = async () => {
    if (refreshingCache) return;
    setRefreshingCache(true);
    try {
      const { clearedKeys } = await refreshLocalHistoryCache();
      if (onClearCache) {
        await onClearCache();
      }
      setCacheRefreshed(true);
      showTemporaryNotice(
        clearedKeys > 0
          ? `Refreshed ${clearedKeys} cached entries`
          : "Local history cache refreshed"
      );
      window.setTimeout(() => {
        setCacheRefreshed(false);
      }, 2400);
    } finally {
      setRefreshingCache(false);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirmClearHistory) {
      setConfirmClearHistory(true);
      return;
    }
    setClearingHistory(true);
    try {
      // Calling clearHistory() without arguments clears the entire watch history for the current profile
      await clearHistory();
      setConfirmClearHistory(false);
      showTemporaryNotice("Watch history cleared for profile");
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <section
      aria-label="Watch History"
      className="group/rail relative space-y-2.5 py-2.5 sm:space-y-3 sm:py-3"
    >
      <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="flex items-center gap-2 border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
            <History className="h-4 w-4 shrink-0 text-primary" />
            <span>Watch History</span>
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            · {visibleItems.length} Archived
          </span>
          {statusNotice && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-medium text-primary"
            >
              <Check className="h-3 w-3 shrink-0" />
              <span>{statusNotice}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Media Type Filter: All / Movies Only / TV Series Only */}
          <div
            role="tablist"
            aria-label="Filter watch history by media type"
            className="inline-flex items-center rounded-xl border border-border-custom bg-surface p-0.5"
            data-testid="watch-history-type-filter"
          >
            {(
              [
                { id: "all", label: "All", count: items.length },
                { id: "movie", label: "Movies Only", count: movieCount },
                { id: "tv", label: "TV Series Only", count: tvCount },
              ] as const
            ).map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`watch-history-filter-${tab.id}`}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1 py-0.2 font-mono text-[10px] tabular-nums ${
                      active
                        ? "bg-black/25 text-primary-contrast"
                        : "bg-background/60 text-on-surface-variant"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter watch history"
            className="inline-flex items-center rounded-xl border border-border-custom bg-surface p-0.5"
          >
            {(
              [
                { id: "all", label: "All Status", count: filteredByType.length },
                { id: "completed", label: "Completed", count: completedCount },
                { id: "partial", label: "Partial", count: partialCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1 py-0.2 font-mono text-[10px] tabular-nums ${
                      active
                        ? "bg-black/25 text-primary-contrast"
                        : "bg-background/60 text-on-surface-variant"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Direct Clear Cache button to refresh local cache for recently watched items without leaving Home */}
          <button
            type="button"
            onClick={() => void handleClearCache()}
            disabled={refreshingCache}
            data-testid="watch-history-clear-cache-btn"
            aria-label="Clear Cache"
            title="Refresh local cache for recently watched items"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
              cacheRefreshed
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                : "border-border-custom bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
            } disabled:opacity-60`}
          >
            {cacheRefreshed ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshingCache ? "animate-spin text-primary" : ""}`}
              />
            )}
            <span>{cacheRefreshed ? "Cache Refreshed" : "Clear Cache"}</span>
          </button>

          {items.length > 0 && (
            confirmClearHistory ? (
              <div className="inline-flex items-center gap-1 rounded-xl border border-red-500/50 bg-red-500/10 p-0.5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => void handleClearAllHistory()}
                  disabled={clearingHistory}
                  data-testid="clear-all-watch-history-btn"
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-500 active:scale-95 transition-all shadow-sm"
                >
                  {clearingHistory ? "Clearing..." : "Confirm Clear All?"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(false)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearHistory(true)}
                data-testid="clear-all-watch-history-btn"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-2.5 py-1.5 text-[11px] font-medium text-on-surface-variant transition-colors hover:border-red-500/60 hover:text-red-400"
                title="Clear entire watch history for current profile"
                aria-label="Clear All Watch History"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear History</span>
              </button>
            )
          )}

          {(showLeftArrow || showRightArrow) && (
            <div
              className="hidden h-1 w-14 overflow-hidden rounded-full bg-surface sm:block"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(18, Math.round(scrollProgress * 100))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full">
        {visibleItems.length === 0 ? (
          <div className="mx-4 sm:mx-6 lg:mx-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border-custom bg-surface/80 p-5 backdrop-blur-md">
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-on-surface">
                {items.length === 0
                  ? "Your Watch History archive is currently empty"
                  : typeFilter !== "all"
                    ? `No ${typeFilter === "movie" ? "movies" : "TV series"} match your current filter`
                    : statusFilter === "completed"
                      ? "No completed titles in your Watch History yet"
                      : "No partially watched titles in your Watch History"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {items.length === 0
                  ? "Titles you watch or mark as watched appear here so you can easily re-watch favorites anytime."
                  : "Switch filters above or mark titles as watched from any rail."}
              </p>
            </div>

            {(typeFilter !== "all" || statusFilter !== "all") && items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border-custom bg-background px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Show All ({items.length})</span>
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={`rail-edge-fade-left ${
                showLeftArrow ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            />

            <RailNavButton
              direction="left"
              visible={showLeftArrow}
              onClick={() => handleScroll("left")}
            />

            <div
              ref={rowRef}
              data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
              className="rail-scroll-track custom-scrollbar flex gap-3.5 overflow-x-auto overflow-y-visible px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
            >
              {visibleItems.map((item, idx) => (
                <motion.div
                  key={`${item.media_type}_${getWatchHistoryItemId(item)}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.28,
                    delay: Math.min(idx * 0.03, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20"
                >
                  <WatchHistoryCard
                    item={item}
                    onQuickRemove={(target) => void handleQuickRemove(target)}
                  />
                </motion.div>
              ))}
            </div>

            <div
              className={`rail-edge-fade-right ${
                showRightArrow ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            />

            <RailNavButton
              direction="right"
              visible={showRightArrow}
              onClick={() => handleScroll("right")}
            />
          </>
        )}
      </div>
    </section>
  );
}

