"use client";

import { useMemo, useRef, useState } from "react";
import { PlayCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ContinueWatchingCard } from "@/components/ContinueWatchingCard";
import { CinematicContinueWatchingCard } from "@/components/CinematicContinueWatchingCard";
import { RailNavButton } from "@/components/RailNavButton";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { useSmoothRailScroll } from "@/hooks/useSmoothRailScroll";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import { useContinueWatchingStore, useSessionStore } from "@/stores";

interface ContinueWatchingRailProps {
  items: ContinueWatchingItem[];
}

export function ContinueWatchingRail({ items }: ContinueWatchingRailProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardTransition = useMemo(
    () =>
      shouldReduceMotion
        ? { duration: 0 }
        : {
            layout: {
              type: "spring",
              stiffness: 380,
              damping: 32,
              mass: 0.75,
            },
            opacity: { duration: 0.22, ease: "easeOut" },
            scale: { duration: 0.22, ease: "easeOut" },
            y: { duration: 0.2, ease: "easeOut" },
          },
    [shouldReduceMotion]
  );

  const clearContinueWatching = useContinueWatchingStore(
    (state) => state.clearContinueWatching
  );
  const catalogMode = useSessionStore(
    (state) => state.currentProfile?.catalogMode ?? "tmdb"
  );
  const [manageOpen, setManageOpen] = useState(false);
  const manageTriggerRef = useRef<HTMLButtonElement>(null);

  const {
    rowRef,
    progressBarRef,
    showLeftArrow,
    showRightArrow,
    scrollProgress,
    isScrolling,
    scrollDirection,
    handleScroll,
  } = useSmoothRailScroll(items.length);

  if (items.length === 0) return null;
  const cinematic = process.env.NEXT_PUBLIC_ZOKU_LAYOUT !== "classic";

  return (
    <section
      aria-label="Continue Watching"
      className="rail-section zoku-continue-rail group/rail relative space-y-2.5 py-2.5 sm:space-y-3 sm:py-3"
    >
      <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <h2 className="flex items-center gap-2 border-l-2 border-primary pl-2.5 font-display text-xs font-semibold uppercase tracking-wide text-on-surface sm:text-sm">
            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>Continue Watching</span>
          </h2>
          {!cinematic && <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant tabular-nums">
            · {items.length} Queued
          </span>}
        </div>

        <div className="flex items-center gap-2.5">
          {cinematic ? (
            <div className="zoku-continue-manage shrink-0">
              <button
                ref={manageTriggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={manageOpen}
                data-tv-focusable="true"
                onClick={() => setManageOpen((prev) => !prev)}
                className={`zoku-dropdown-trigger inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                  manageOpen
                    ? "bg-surface text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Manage
              </button>
              <FloatingMenu
                open={manageOpen}
                anchorRef={manageTriggerRef}
                onClose={() => setManageOpen(false)}
                role="menu"
                ariaLabel="Manage continue watching"
                align="right"
                minWidth={192}
                maxWidth={224}
                preferredMaxHeight={160}
                className="p-1.5"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setManageOpen(false);
                    void clearContinueWatching(catalogMode);
                  }}
                  className="zoku-menu-item inline-flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-red-500 hover:bg-red-500/15 transition-colors"
                >
                  <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Clear this catalog</span>
                </button>
              </FloatingMenu>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void clearContinueWatching(catalogMode)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-2.5 py-1.5 text-[11px] font-medium text-on-surface-variant transition-colors hover:border-red-500/60 hover:text-red-400"
              title="Clear Continue Watching Queue"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Queue</span>
            </button>
          )}

          {(showLeftArrow || showRightArrow) && (
            <div
              className="hidden h-1 w-14 overflow-hidden rounded-full bg-surface sm:block"
              aria-hidden
            >
              <div
                ref={progressBarRef}
                className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-150 will-change-transform"
                style={{
                  transform: `scaleX(${Math.max(0.16, scrollProgress).toFixed(3)})`,
                }}
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

        <motion.div
          ref={rowRef}
          data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
          data-velocity-scroll="framer-motion"
          whileTap={{ cursor: "grabbing" }}
          className="rail-scroll-track custom-scrollbar flex gap-3.5 overflow-x-auto overflow-y-visible px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8 select-none"
        >
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const baseKey = `${item.media_type}_${item.tmdbId ?? item.anilistId ?? idx}`;
              return (
                <motion.div
                  key={baseKey}
                  layout="position"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, scale: 0.94, y: 3 }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : {
                          opacity: 0,
                          scale: 0.92,
                          transition: { duration: 0.16, ease: "easeIn" },
                        }
                  }
                  transition={cardTransition}
                  className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20 focus-within:z-20 will-change-transform"
                >
                  {cinematic ? <CinematicContinueWatchingCard item={item} /> : <ContinueWatchingCard item={item} />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

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
    </section>
  );
}
