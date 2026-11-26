"use client";

import type { ReactNode } from "react";
import { Film, Shield, Sparkles } from "lucide-react";

export interface BrowseFilterChip {
  id: string;
  label: string;
}

interface HomeBrowseShellProps {
  children?: ReactNode;
  cinematic?: boolean;
  catalogMode: "tmdb" | "anime";
  onCatalogChange: (mode: "tmdb" | "anime") => void;
  hasHero?: boolean;
  isKidMode?: boolean;
  filterChips?: BrowseFilterChip[];
  selectedFilter?: string;
  onSelectFilter?: (filterId: string) => void;
  sortSlot?: ReactNode;
}

/**
 * Floating iOS 27/28 Liquid Glass browse control capsule strip directly beneath the hero.
 * Features a tactile pill segmented catalog switcher, Kids shield badge,
 * horizontally scrollable frosted category chips, and sort trigger.
 */
export function HomeBrowseShell({
  catalogMode,
  onCatalogChange,
  isKidMode = false,
  filterChips = [],
  selectedFilter = "all",
  onSelectFilter,
  sortSlot,
}: HomeBrowseShellProps) {
  return (
    <div
      className="zoku-home-browse relative z-20 pt-4 pb-3"
      data-testid="cinematic-home-browse"
    >
      <div className="liquid-glass rounded-[24px] p-2.5 sm:p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: iOS Segmented Catalog Switcher + Kids Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Catalog mode switcher"
            className="inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1"
          >
            <button
              type="button"
              data-tv-focusable="true"
              aria-pressed={catalogMode === "tmdb"}
              onClick={() => onCatalogChange("tmdb")}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                catalogMode === "tmdb"
                  ? "bg-primary text-primary-contrast shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Film className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Movies &amp; TV</span>
            </button>
            <button
              type="button"
              data-tv-focusable="true"
              aria-pressed={catalogMode === "anime"}
              onClick={() => onCatalogChange("anime")}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                catalogMode === "anime"
                  ? "bg-primary text-primary-contrast shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Anime</span>
            </button>
          </div>

          {isKidMode && (
            <span
              data-testid="home-kids-mode-badge"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1.5 text-[11px] font-semibold text-amber-400"
            >
              <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Kids Safe</span>
            </span>
          )}
        </div>

        {/* Center/Right: Scrollable Category Pill Track + Sort Trigger */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 md:justify-end">
          {filterChips.length > 0 && onSelectFilter && (
            <div
              data-testid="command-deck-rail-filters"
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto touch-pan-x md:flex-initial"
            >
              {filterChips.map((chip) => {
                const active = selectedFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    data-tv-focusable="true"
                    data-testid={`deck-rail-filter-${chip.id}`}
                    aria-pressed={active}
                    onClick={() => onSelectFilter(chip.id)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                      active
                        ? "border-transparent bg-on-surface text-background shadow-sm"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-on-surface-variant hover:border-[var(--glass-border-strong)] hover:text-on-surface"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {sortSlot && <div className="shrink-0">{sortSlot}</div>}
        </div>
      </div>
    </div>
  );
}
