"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { ContinueWatchingCard } from "@/components/ContinueWatchingCard";
import { RailNavButton } from "@/components/RailNavButton";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { useContinueWatchingStore, useSessionStore } from "@/stores";

interface ContinueWatchingRailProps {
  items: ContinueWatchingItem[];
}

export function ContinueWatchingRail({ items }: ContinueWatchingRailProps) {
  const clearContinueWatching = useContinueWatchingStore(
    (state) => state.clearContinueWatching
  );
  const catalogMode = useSessionStore(
    (state) => state.currentProfile?.catalogMode ?? "tmdb"
  );

  const {
    rowRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
    isScrolling,
    scrollDirection,
    handleScroll,
  } = useSmoothRailScroll(items.length);

  if (items.length === 0) return null;

  return (
    <div className="group/rail relative space-y-2 py-2 sm:space-y-3 sm:py-3">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <h2 className="border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
            Continue Watching
          </h2>
          <span className="hidden rounded-md border border-border-custom bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant sm:inline-block">
            Resume Queue
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void clearContinueWatching(catalogMode)}
            className="inline-flex items-center gap-1 rounded-xl border border-border-custom bg-surface px-2.5 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:border-red-500/60 hover:text-red-400"
            title="Clear Continue Watching Queue"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Queue</span>
          </button>

          {(showLeftArrow || showRightArrow) && (
            <div
              className="hidden h-1 w-14 overflow-hidden rounded-full bg-surface sm:block"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(16, Math.round(scrollProgress * 100))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
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
          className="rail-scroll-track no-scrollbar flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
        >
          {items.map((item, idx) => (
            <motion.div
              key={`${item.media_type}_${item.tmdbId ?? item.anilistId}_${idx}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.28,
                delay: Math.min(idx * 0.03, 0.24),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20"
            >
              <ContinueWatchingCard item={item} />
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
      </div>
    </div>
  );
}

