"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { TitleCard } from "./TitleCard";
import { RailNavButton } from "@/components/RailNavButton";
import { TMDBTitle } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";
import { motion } from "motion/react";

interface TitleRailProps {
  title: string;
  items: TMDBTitle[];
  mediaType?: "movie" | "tv";
  genreId?: number;
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

export function TitleRail({ title, items, mediaType, genreId }: TitleRailProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const IconComponent = genreId ? getGenreIcon(genreId) : null;

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
        <h2 className="flex items-center gap-2 border-l-2 border-primary pl-2 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
          {IconComponent && (
            <IconComponent className="h-4 w-4 shrink-0 text-primary sm:h-4.5 sm:w-4.5" />
          )}
          <span className="truncate">{title}</span>
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
              key={item.id}
              variants={itemVariants}
              className="relative z-0 flex-shrink-0 hover:z-20"
            >
              <TitleCard title={item} mediaType={mediaType} />
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
