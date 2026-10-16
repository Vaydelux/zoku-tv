"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface RailNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  visible: boolean;
}

/** Circular rail chevrons — stay above cards; readable in light + dark */
export function RailNavButton({ direction, onClick, visible }: RailNavButtonProps) {
  if (!visible) return null;

  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  const side = direction === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`rail-nav-btn absolute top-1/2 z-30 ${side} flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-custom bg-surface text-on-surface shadow-[var(--shadow-card)] backdrop-blur-md transition-all duration-300 hover:border-primary hover:text-primary sm:h-11 sm:w-11 opacity-100 md:opacity-0 md:group-hover/rail:opacity-100`}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} />
    </button>
  );
}
