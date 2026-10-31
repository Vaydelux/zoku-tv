"use client";

import { useEffect, useMemo, useState } from "react";
import { Film, Tv, Bookmark } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TitleCard } from "./TitleCard";
import { RailNavButton } from "@/components/RailNavButton";
import { RailSortDropdown } from "@/components/RailSortDropdown";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import { TMDBTitle } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";
import { sortTmdbRailItems, type RailSortOption } from "@/lib/rail-sorting";
import {
  useContinueWatchingStore,
  useRailFilterStore,
  useWatchHistoryStore,
  useWatchlistStore,
} from "@/stores";

interface TitleRailProps {
  title: string;
  items: TMDBTitle[];
  mediaType?: "movie" | "tv";
  genreId?: number;
  showSortDropdown?: boolean;
}

export function TitleRail({
  title,
  items,
  mediaType,
  genreId,
  showSortDropdown = true,
}: TitleRailProps) {
  const GenreIcon = genreId ? getGenreIcon(genreId) : null;
  const FallbackIcon = title.toLowerCase().includes("watchlist")
    ? Bookmark
    : mediaType === "tv"
    ? Tv
    : Film;
  const IconComponent = GenreIcon || FallbackIcon;
  const shouldReduceMotion = useReducedMotion();

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
      if (w.tmdbId) {
        const key = `${w.media_type}_${w.tmdbId}`;
        userSavedKeys.add(key);
        if (typeof w.vote_average === "number" && w.vote_average > 0) {
          userRatings[key] = w.vote_average;
        }
      }
    }

    for (const cw of continueWatchingItems) {
      if (cw.tmdbId) {
        const key = `${cw.media_type}_${cw.tmdbId}`;
        const progressScore = Math.max(0.3, (cw.progress_percent ?? 20) / 100);
        userWatchCounts[key] = (userWatchCounts[key] ?? 0) + progressScore;
      }
    }

    for (const h of watchHistoryItems) {
      if (h.tmdbId) {
        const key = `${h.media_type}_${h.tmdbId}`;
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
    () => sortTmdbRailItems(items, sortBy, mediaType, sortContext),
    [items, sortBy, mediaType, sortContext]
  );

  // Subtle 60fps spring layout transition for smooth reordering and filter transitions
  const cardTransition = useMemo(
    () =>
      shouldReduceMotion
        ? { duration: 0 }
        : {
            layout: {
              type: "spring",
              stiffness: 380,
              damping: 32,
              mass: 0.75,
            },
            opacity: { duration: 0.22, ease: "easeOut" },
            scale: { duration: 0.22, ease: "easeOut" },
            y: { duration: 0.2, ease: "easeOut" },
          },
    [shouldReduceMotion]
  );

  const {
    rowRef,
    progressBarRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
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
      className="rail-section group/rail relative space-y-2.5 py-2.5 sm:space-y-3 sm:py-3"
    >
      <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <h2 className="flex items-center gap-2 border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
            <IconComponent className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            · {sortedItems.length} {sortedItems.length === 1 ? "Title" : "Titles"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {showSortDropdown && items.length > 1 && (
            <RailSortDropdown
              value={sortBy}
              onChange={handleSortChange}
              ariaLabel={`Sort ${title}`}
              testId="rail-sort-dropdown"
            />
          )}

          {(showLeftArrow || showRightArrow) && (
            <div
              className="hidden h-1 w-14 overflow-hidden rounded-full bg-surface sm:block"
              aria-hidden
            >
              <div
                ref={progressBarRef}
                className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-150 will-change-transform"
                style={{
                  transform: `scaleX(${Math.max(0.16, scrollProgress).toFixed(3)})`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full">
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

        <motion.div
          ref={rowRef}
          data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
          data-velocity-scroll="framer-motion"
          whileTap={{ cursor: "grabbing" }}
          className="rail-scroll-track custom-scrollbar flex gap-3.5 overflow-x-auto overflow-y-visible px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8 select-none"
        >
          <AnimatePresence initial={false}>
            {sortedItems.map((item, idx) => {
              const baseKey = item.id
                ? `${item.media_type ?? mediaType ?? "title"}_${item.id}`
                : `item_${idx}`;
              const stableKey = seenKeys.has(baseKey)
                ? `${baseKey}_dup_${idx}`
                : baseKey;
              seenKeys.add(baseKey);

              return (
                <motion.div
                  key={stableKey}
                  layout="position"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, scale: 0.94, y: 3 }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : {
                          opacity: 0,
                          scale: 0.92,
                          transition: { duration: 0.16, ease: "easeIn" },
                        }
                  }
                  transition={cardTransition}
                  className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20 focus-within:z-20 will-change-transform"
                >
                  <TitleCard title={item} mediaType={mediaType} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

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
      </div>
    </section>
  );
}
