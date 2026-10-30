"use client";

import { motion } from "framer-motion";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { RailNavButton } from "@/components/RailNavButton";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import type { AniListMedia } from "@/lib/anilist";

interface AnimeRailProps {
  title: string;
  items: AniListMedia[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 110, damping: 14 },
  },
};

export function AnimeRail({ title, items }: AnimeRailProps) {
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
        <h2 className="border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
          {title}
        </h2>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            {items.length} Series
          </span>
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
              key={`anime_${item.id}_${idx}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.28,
                delay: Math.min(idx * 0.03, 0.24),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20"
            >
              <AnimeCard anime={item} />
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

