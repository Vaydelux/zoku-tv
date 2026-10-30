"use client";

import { TitleCard } from "./TitleCard";
import { RailNavButton } from "@/components/RailNavButton";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import { TMDBTitle } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";
import { motion } from "framer-motion";

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
  const IconComponent = genreId ? getGenreIcon(genreId) : null;
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
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
          {IconComponent && (
            <IconComponent className="h-4 w-4 shrink-0 text-primary sm:h-4.5 sm:w-4.5" />
          )}
          <span className="truncate">{title}</span>
        </h2>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            {items.length} Titles
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

        <div
          ref={rowRef}
          data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
          className="rail-scroll-track custom-scrollbar flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
        >
          {items.map((item, idx) => (
            <motion.div
              key={`${item.media_type ?? mediaType ?? "title"}_${item.id}_${idx}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.28,
                delay: Math.min(idx * 0.03, 0.24),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20"
            >
              <TitleCard title={item} mediaType={mediaType} />
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

