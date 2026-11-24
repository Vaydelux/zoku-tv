"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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
    showLeftArrow,
    showRightArrow,
    isScrolling,
    scrollDirection,
    handleScroll,
  } = useSmoothRailScroll(items.length);

  if (items.length === 0) return null;
  const cinematic = process.env.NEXT_PUBLIC_ZOKU_LAYOUT !== "classic";

  return (
    <section
      aria-label="Continue Watching"
      className="rail-section zoku-continue-rail group/rail relative"
    >
      <div className="rail-section-header mx-auto flex w-full items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-on-surface sm:text-lg">
          Continue Watching
        </h2>

        <div className="zoku-continue-manage shrink-0">
          <button
            ref={manageTriggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={manageOpen}
            data-tv-focusable="true"
            onClick={() => setManageOpen((prev) => !prev)}
            className={`zoku-dropdown-trigger inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
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
              className="zoku-menu-item inline-flex min-h-[38px] w-full items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Clear this catalog</span>
            </button>
          </FloatingMenu>
        </div>
      </div>

      <div className="relative mx-auto w-full">
        <RailNavButton
          direction="left"
          visible={showLeftArrow}
          onClick={() => handleScroll("left")}
        />

        <div
          ref={rowRef}
          data-scrolling={isScrolling ? (scrollDirection ?? "right") : undefined}
          className="rail-scroll-track no-scrollbar flex overflow-x-auto overflow-y-visible select-none"
        >
          {items.map((item, idx) => {
            const baseKey = `${item.media_type}_${item.tmdbId ?? item.anilistId ?? idx}`;
            return (
              <div
                key={baseKey}
                className="rail-card-slot relative z-0 flex-shrink-0 hover:z-20 focus-within:z-20"
              >
                {cinematic ? (
                  <CinematicContinueWatchingCard item={item} />
                ) : (
                  <ContinueWatchingCard item={item} />
                )}
              </div>
            );
          })}
        </div>

        <RailNavButton
          direction="right"
          visible={showRightArrow}
          onClick={() => handleScroll("right")}
        />
      </div>
    </section>
  );
}
