"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import {
  computeRailScrollMetrics,
  shouldSuppressRailClickAfterDrag,
  computeDragVelocity,
  computeFrictionStep,
  type PointerDragSample,
} from "@/lib/tv-navigation";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useSmoothRailScroll(dependencyCount: number) {
  const rowRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const motionControlsRef = useRef<AnimationPlaybackControls | null>(null);
  const scrollCheckRafRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canScrollLeftRef = useRef(false);
  const canScrollRightRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"left" | "right" | null>(null);

  const syncScrollMetrics = useCallback((commitProgressState = false) => {
    const row = rowRef.current;
    if (!row) return;

    const { canScrollLeft, canScrollRight, progress } = computeRailScrollMetrics({
      scrollLeft: row.scrollLeft,
      scrollWidth: row.scrollWidth,
      clientWidth: row.clientWidth,
    });

    // Only trigger React state updates when boundary booleans flip
    if (canScrollLeft !== canScrollLeftRef.current) {
      canScrollLeftRef.current = canScrollLeft;
      setShowLeftArrow(canScrollLeft);
    }
    if (canScrollRight !== canScrollRightRef.current) {
      canScrollRightRef.current = canScrollRight;
      setShowRightArrow(canScrollRight);
    }

    // Update GPU-composited progress bar directly without React re-render
    if (progressBarRef.current) {
      const scale = Math.max(0.16, Math.min(1, progress));
      progressBarRef.current.style.transform = `scaleX(${scale.toFixed(4)})`;
    }

    if (commitProgressState) {
      setScrollProgress(progress);
    }
  }, []);

  const checkScroll = useCallback(() => {
    if (scrollCheckRafRef.current !== null) return;
    scrollCheckRafRef.current = requestAnimationFrame(() => {
      scrollCheckRafRef.current = null;
      syncScrollMetrics(false);
    });
  }, [syncScrollMetrics]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    syncScrollMetrics(true);
    row.addEventListener("scroll", checkScroll, { passive: true });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncScrollMetrics(true))
        : null;
    ro?.observe(row);

    // Virtual mouse (Downloader by AFTVnews) & desktop click-and-drag scrolling with velocity-based friction
    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let maxDragDistance = 0;
    const dragSamples: PointerDragSample[] = [];

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Do not initiate drag if clicking a nested action button inside a card
      const target = e.target as HTMLElement | null;
      if (target?.closest("button")) return;

      if (motionControlsRef.current) {
        motionControlsRef.current.stop();
        motionControlsRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fadeTimeoutRef.current !== null) {
        clearTimeout(fadeTimeoutRef.current);
      }

      isPointerDown = true;
      startX = e.clientX;
      startScrollLeft = row.scrollLeft;
      maxDragDistance = 0;
      suppressNextClickRef.current = false;
      dragSamples.length = 0;
      dragSamples.push({ x: e.clientX, time: performance.now() });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerDown) return;
      const now = performance.now();
      dragSamples.push({ x: e.clientX, time: now });
      while (dragSamples.length > 2 && now - dragSamples[0].time > 140) {
        dragSamples.shift();
      }

      const dx = e.clientX - startX;
      const absDx = Math.abs(dx);
      if (absDx > maxDragDistance) {
        maxDragDistance = absDx;
      }

      if (shouldSuppressRailClickAfterDrag(maxDragDistance, 8)) {
        if (row.dataset.dragging !== "true") {
          row.dataset.dragging = "true";
        }
        suppressNextClickRef.current = true;
        row.scrollLeft = startScrollLeft - dx * 1.05;
        syncScrollMetrics(false);
      }
    };

    const finishDrag = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      if (row.dataset.dragging) {
        delete row.dataset.dragging;
      }

      const now = performance.now();
      const initialVelocity = computeDragVelocity(dragSamples, now);
      const wasDragging = shouldSuppressRailClickAfterDrag(maxDragDistance, 8);

      const isInertiaEnabled =
        typeof document === "undefined" ||
        document.documentElement.dataset.gpuRailInertia !== "false";

      if (wasDragging && isInertiaEnabled && Math.abs(initialVelocity) >= 0.8) {
        setIsScrolling(true);
        setScrollDirection(initialVelocity > 0 ? "right" : "left");

        if (motionControlsRef.current) {
          motionControlsRef.current.stop();
          motionControlsRef.current = null;
        }

        const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
        // Velocity in px per second for framer-motion inertia physics
        const velocityPxPerSec = initialVelocity * 60;

        try {
          motionControlsRef.current = animate(row.scrollLeft, 0, {
            type: "inertia",
            velocity: velocityPxPerSec,
            min: 0,
            max: maxScroll,
            power: 0.35,
            timeConstant: 240,
            bounceStiffness: 450,
            bounceDamping: 40,
            onUpdate: (latest) => {
              row.scrollLeft = latest;
              syncScrollMetrics(false);
            },
            onComplete: () => {
              motionControlsRef.current = null;
              syncScrollMetrics(true);
              fadeTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                setScrollDirection(null);
              }, 60);
            },
          });
        } catch {
          let currentVel = initialVelocity;
          const friction = 0.935; // smooth deceleration curve for 60fps butter feel

          const momentumStep = () => {
            const step = computeFrictionStep(currentVel, friction, 0.22);
            currentVel = step.nextVelocity;

            if (step.isStopped) {
              rafRef.current = null;
              syncScrollMetrics(true);
              fadeTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                setScrollDirection(null);
              }, 60);
              return;
            }

            const prevLeft = row.scrollLeft;
            row.scrollLeft += step.delta;
            syncScrollMetrics(false);

            if (
              row.scrollLeft === prevLeft ||
              row.scrollLeft <= 0 ||
              row.scrollLeft >= maxScroll
            ) {
              rafRef.current = null;
              syncScrollMetrics(true);
              fadeTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                setScrollDirection(null);
              }, 60);
              return;
            }

            rafRef.current = requestAnimationFrame(momentumStep);
          };

          rafRef.current = requestAnimationFrame(momentumStep);
        }
      } else {
        syncScrollMetrics(true);
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    row.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", finishDrag, { passive: true });
    row.addEventListener("mouseleave", finishDrag, { passive: true });
    row.addEventListener("click", handleClickCapture, true);

    return () => {
      row.removeEventListener("scroll", checkScroll);
      ro?.disconnect();
      row.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", finishDrag);
      row.removeEventListener("mouseleave", finishDrag);
      row.removeEventListener("click", handleClickCapture, true);
    };
  }, [dependencyCount, checkScroll, syncScrollMetrics]);

  useEffect(() => {
    return () => {
      if (motionControlsRef.current) motionControlsRef.current.stop();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (scrollCheckRafRef.current !== null) cancelAnimationFrame(scrollCheckRafRef.current);
      if (fadeTimeoutRef.current !== null) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const row = rowRef.current;
      if (!row) return;

      if (motionControlsRef.current) {
        motionControlsRef.current.stop();
        motionControlsRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fadeTimeoutRef.current !== null) {
        clearTimeout(fadeTimeoutRef.current);
      }

      const { clientWidth, scrollLeft, scrollWidth } = row;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      const step = Math.max(280, Math.round(clientWidth * 0.76));
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
        syncScrollMetrics(true);
        setIsScrolling(false);
        setScrollDirection(null);
        return;
      }

      try {
        motionControlsRef.current = animate(scrollLeft, targetLeft, {
          duration: 0.38,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (latest) => {
            row.scrollLeft = latest;
            syncScrollMetrics(false);
          },
          onComplete: () => {
            motionControlsRef.current = null;
            syncScrollMetrics(true);
            fadeTimeoutRef.current = setTimeout(() => {
              setIsScrolling(false);
              setScrollDirection(null);
            }, 60);
          },
        });
      } catch {
        const startLeft = scrollLeft;
        const durationMs = 360;
        const startTime = performance.now();

        const animateStep = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = easeOutCubic(progress);
          row.scrollLeft = startLeft + delta * eased;
          syncScrollMetrics(false);

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(animateStep);
          } else {
            rafRef.current = null;
            syncScrollMetrics(true);
            fadeTimeoutRef.current = setTimeout(() => {
              setIsScrolling(false);
              setScrollDirection(null);
            }, 60);
          }
        };

        rafRef.current = requestAnimationFrame(animateStep);
      }
    },
    [syncScrollMetrics]
  );

  return {
    rowRef,
    progressBarRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
    isScrolling,
    scrollDirection,
    handleScroll,
  };
}
