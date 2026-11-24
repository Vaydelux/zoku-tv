"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface RailNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  visible: boolean;
}

/**
 * Full-height desktop edge paddles with directional obsidian fade.
 * Hidden on touch viewports (mobile uses native touch-swipe momentum) and
 * revealed smoothly on rail hover or keyboard focus on desktop.
 */
export function RailNavButton({ direction, onClick, visible }: RailNavButtonProps) {
  if (!visible) return null;

  const isLeft = direction === "left";
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`rail-nav-${direction}`}
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      className={`rail-nav-btn group/navbtn absolute inset-y-0 z-30 hidden w-12 items-center justify-center md:flex lg:w-14 ${
        isLeft
          ? "left-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent"
          : "right-0 bg-gradient-to-l from-background/95 via-background/70 to-transparent"
      } text-on-surface/85 opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 hover:text-on-surface focus-visible:opacity-100`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 border border-white/10 transition-transform duration-150 group-hover/navbtn:scale-105 group-hover/navbtn:border-white/25">
        <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
      </span>
    </button>
  );
}
