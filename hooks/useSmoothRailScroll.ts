"use client";

import { useRef, useState, useEffect, useCallback } from "react";

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function useSmoothRailScroll(dependencyCount: number) {
  const rowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"left" | "right" | null>(null);

  const checkScroll = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const { scrollLeft, scrollWidth, clientWidth } = row;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setShowLeftArrow(scrollLeft > 6);
    setShowRightArrow(maxScroll > 6 && scrollLeft < maxScroll - 6);
    setScrollProgress(maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0);
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
  }, [dependencyCount, checkScroll]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (fadeTimeoutRef.current !== null) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const row = rowRef.current;
      if (!row) return;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fadeTimeoutRef.current !== null) {
        clearTimeout(fadeTimeoutRef.current);
      }

      const { clientWidth, scrollLeft, scrollWidth } = row;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      const step = Math.max(260, clientWidth * 0.78);
      const targetLeft =
        direction === "left"
          ? Math.max(0, scrollLeft - step)
          : Math.min(maxScroll, scrollLeft + step);

      const delta = targetLeft - scrollLeft;
      if (Math.abs(delta) < 2) return;

      setIsScrolling(true);
      setScrollDirection(direction);

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        row.scrollLeft = targetLeft;
        checkScroll();
        setIsScrolling(false);
        setScrollDirection(null);
        return;
      }

      const startLeft = scrollLeft;
      const durationMs = 520;
      const startTime = performance.now();

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeOutQuart(progress);
        row.scrollLeft = startLeft + delta * eased;
        checkScroll();

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animateStep);
        } else {
          rafRef.current = null;
          fadeTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
            setScrollDirection(null);
          }, 90);
        }
      };

      rafRef.current = requestAnimationFrame(animateStep);
    },
    [checkScroll]
  );

  return {
    rowRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
    isScrolling,
    scrollDirection,
    handleScroll,
  };
}
