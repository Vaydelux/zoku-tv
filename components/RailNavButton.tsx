"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface RailNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  visible: boolean;
}

/** Circular rail chevrons — always visible when scrollable for virtual mouse (Downloader by AFTVnews) & TV remotes */
export function RailNavButton({ direction, onClick, visible }: RailNavButtonProps) {
  if (!visible) return null;

  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  const side = direction === "left" ? "left-1.5 sm:left-2.5" : "right-1.5 sm:right-2.5";

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`rail-nav-${direction}`}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`rail-nav-btn group/navbtn absolute top-1/2 z-30 ${side} flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border-custom bg-surface/95 text-on-surface shadow-[var(--shadow-card)] opacity-95 hover:opacity-100 focus-visible:opacity-100 active:scale-95`}
    >
      <Icon
        className="h-5 w-5 transition-transform duration-150 group-hover/navbtn:scale-110 sm:h-6 sm:w-6"
        strokeWidth={2.4}
      />
    </button>
  );
}
