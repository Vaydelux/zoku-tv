"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { RailNavButton } from "@/components/RailNavButton";
import { RailSortDropdown } from "@/components/RailSortDropdown";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import type { AniListMedia } from "@/lib/anilist";
import { sortAnimeRailItems, type RailSortOption } from "@/lib/rail-sorting";
import {
  useContinueWatchingStore,
  useRailFilterStore,
  useWatchHistoryStore,
  useWatchlistStore,
} from "@/stores";

interface AnimeRailProps {
  title: string;
  items: AniListMedia[];
  showSortDropdown?: boolean;
}

export function AnimeRail({
  title,
  items,
  showSortDropdown = true,
}: AnimeRailProps) {
  const globalRailSort = useRailFilterStore((state) => state.railSort);
  const watchlistItems = useWatchlistStore((state) => state.items);
  const watchHistoryItems = useWatchHistoryStore((state) => state.items);
  const continueWatchingItems = useContinueWatchingStore((state) => state.items);

  const [sortBy, setSortBy] = useState<RailSortOption>(globalRailSort);

  useEffect(() => {
    setSortBy(globalRailSort);
  }, [globalRailSort]);

  const sortContext = useMemo(() => {
    const userRatings: Record<string, number> = {};
    const userSavedKeys = new Set<string>();
    const userWatchCounts: Record<string, number> = {};

    for (const w of watchlistItems) {
      if (w.media_type === "anime" && w.anilistId) {
        const key = `anime_${w.anilistId}`;
        userSavedKeys.add(key);
        if (typeof w.vote_average === "number" && w.vote_average > 0) {
          userRatings[key] = w.vote_average;
        }
      }
    }

    for (const cw of continueWatchingItems) {
      if (cw.media_type === "anime" && cw.anilistId) {
        const key = `anime_${cw.anilistId}`;
        const progressScore = Math.max(0.3, (cw.progress_percent ?? 20) / 100);
        userWatchCounts[key] = (userWatchCounts[key] ?? 0) + progressScore;
      }
    }

    for (const h of watchHistoryItems) {
      if (h.media_type === "anime" && h.anilistId) {
        const key = `anime_${h.anilistId}`;
        userSavedKeys.add(key);
        if (typeof h.vote_average === "number" && h.vote_average > 0) {
          userRatings[key] = h.vote_average;
        }
        const countScore =
          (h.watch_count ?? 1) +
          (h.completed ? 0.5 : (h.progress_percent ?? 0) / 200);
        userWatchCounts[key] = (userWatchCounts[key] ?? 0) + countScore;
      }
    }

    return { userRatings, userSavedKeys, userWatchCounts };
  }, [watchlistItems, watchHistoryItems, continueWatchingItems]);

  const sortedItems = useMemo(
    () => sortAnimeRailItems(items, sortBy, sortContext),
    [items, sortBy, sortContext]
  );

  const {
    rowRef,
    showLeftArrow,
    showRightArrow,
    isScrolling,
    scrollDirection,
    handleScroll,
  } = useSmoothRailScroll(sortedItems.length);

  const handleSortChange = (nextSort: RailSortOption) => {
    setSortBy(nextSort);
    if (rowRef.current) {
      rowRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  const seenKeys = new Set<string>();

  return (
    <section
      aria-label={title}
      className="rail-section group/rail relative"
    >
      <div className="rail-section-header mx-auto flex w-full items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-on-surface sm:text-lg truncate">
          {title}
        </h2>

        {showSortDropdown && items.length > 1 && (
          <RailSortDropdown
            value={sortBy}
            onChange={handleSortChange}
            ariaLabel={`Sort ${title}`}
            testId="rail-sort-dropdown"
          />
        )}
      </div>

      <div className="relative mx-auto w-full">
        <RailNavButton
          direction="left"
          visible={showLeftArrow}
          onClick={() => handleScroll("left")}
        />

        <div
          ref={rowRef}
          data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
          className="rail-scroll-track no-scrollbar flex overflow-x-auto overflow-y-visible select-none"
        >
          {sortedItems.map((item, idx) => {
            const baseKey = item.id ? `anime_${item.id}` : `anime_item_${idx}`;
            const stableKey = seenKeys.has(baseKey)
              ? `${baseKey}_dup_${idx}`
              : baseKey;
            seenKeys.add(baseKey);

            return (
              <div
                key={stableKey}
                className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20 focus-within:z-20"
              >
                <AnimeCard anime={item} />
              </div>
            );
          })}
        </div>

        <RailNavButton
          direction="right"
          visible={showRightArrow}
          onClick={() => handleScroll("right")}
        />
      </div>
    </section>
  );
}
