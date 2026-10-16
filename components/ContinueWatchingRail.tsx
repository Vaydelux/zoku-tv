"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ContinueWatchingCard } from "@/components/ContinueWatchingCard";
import { RailNavButton } from "@/components/RailNavButton";
import type { ContinueWatchingItem } from "@/lib/continue-watching";

interface ContinueWatchingRailProps {
  items: ContinueWatchingItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 14,
    },
  },
};

export function ContinueWatchingRail({ items }: ContinueWatchingRailProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const { scrollLeft, scrollWidth, clientWidth } = row;
    const maxScroll = scrollWidth - clientWidth;
    setShowLeftArrow(scrollLeft > 5);
    setShowRightArrow(maxScroll > 5 && scrollLeft < maxScroll - 5);
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    checkScroll();
    row.addEventListener("scroll", checkScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(checkScroll) : null;
    ro?.observe(row);

    return () => {
      row.removeEventListener("scroll", checkScroll);
      ro?.disconnect();
    };
  }, [items, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    const row = rowRef.current;
    if (!row) return;
    const { clientWidth, scrollLeft } = row;
    const scrollOffset =
      direction === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
    row.scrollTo({ left: scrollOffset, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="group/rail relative space-y-2 py-2 sm:space-y-3 sm:py-3">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="border-l-2 border-primary pl-2 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
          Continue Watching
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        <RailNavButton
          direction="left"
          visible={showLeftArrow}
          onClick={() => handleScroll("left")}
        />

        <motion.div
          ref={rowRef}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="no-scrollbar flex gap-3 overflow-x-auto overflow-y-visible scroll-smooth px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
        >
          {items.map((item) => (
            <motion.div
              key={`${item.media_type}_${item.tmdbId ?? item.anilistId}`}
              variants={itemVariants}
              className="relative z-0 flex-shrink-0 hover:z-20"
            >
              <ContinueWatchingCard item={item} />
            </motion.div>
          ))}
        </motion.div>

        <RailNavButton
          direction="right"
          visible={showRightArrow}
          onClick={() => handleScroll("right")}
        />
      </div>
    </div>
  );
}
