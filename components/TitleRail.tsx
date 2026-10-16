"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TitleCard } from "./TitleCard";
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
      damping: 14 
    } 
  },
};

export function TitleRail({ title, items, mediaType, genreId }: TitleRailProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const IconComponent = genreId ? getGenreIcon(genreId) : null;

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const row = rowRef.current;
    if (row) {
      row.addEventListener("scroll", checkScroll);
      // Run once on load to verify sizing
      checkScroll();
    }
    return () => row?.removeEventListener("scroll", checkScroll);
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth, scrollLeft } = rowRef.current;
      const scrollOffset = direction === "left" 
        ? scrollLeft - clientWidth * 0.75 
        : scrollLeft + clientWidth * 0.75;

      rowRef.current.scrollTo({
        left: scrollOffset,
        behavior: "smooth",
      });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="relative space-y-2 sm:space-y-3 group/rail py-2 sm:py-3">
      {/* Rail Title */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <h2 className="text-xs sm:text-sm font-display font-semibold tracking-wide text-on-surface uppercase border-l-2 border-primary pl-2 flex items-center gap-2">
          {IconComponent && <IconComponent className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary shrink-0" />}
          <span className="truncate">{title}</span>
        </h2>
      </div>

      {/* Rail Slider */}
      <div className="relative max-w-7xl mx-auto w-full">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 sm:w-12 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border-r border-border-custom hover:text-primary transition-all opacity-0 group-hover/rail:opacity-100 duration-300"
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>
        )}

        {/* Scroll Row */}
        <motion.div
          ref={rowRef}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-visible px-4 sm:px-6 lg:px-8 py-3 sm:py-4 no-scrollbar scroll-smooth"
        >
          {items.map((item) => (
            <motion.div key={item.id} variants={itemVariants} className="relative z-0 flex-shrink-0 hover:z-20">
              <TitleCard title={item} mediaType={mediaType} />
            </motion.div>
          ))}
        </motion.div>

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-0 bottom-0 z-10 w-10 sm:w-12 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border-l border-border-custom hover:text-primary transition-all opacity-0 group-hover/rail:opacity-100 duration-300"
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>
        )}
      </div>
    </div>
  );
}
