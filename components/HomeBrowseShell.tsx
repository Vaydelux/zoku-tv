"use client";

import type { ReactNode } from "react";
import { Film, Shield, Sparkles } from "lucide-react";

export interface BrowseFilterChip {
  id: string;
  label: string;
}

interface HomeBrowseShellProps {
  children?: ReactNode;
  cinematic: boolean;
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
 * Clean, responsive Netflix-style inline browse strip directly beneath the hero.
 * Replaces the old fixed-880px glassmorphism command deck popover so every
 * filter and catalog switcher works smoothly on phone, tablet, desktop, and TV.
 */
export function HomeBrowseShell({
  children,
  cinematic,
  catalogMode,
  onCatalogChange,
  isKidMode = false,
  filterChips = [],
  selectedFilter = "all",
  onSelectFilter,
  sortSlot,
}: HomeBrowseShellProps) {
  if (!cinematic) return <>{children}</>;

  return (
    <div
      className="zoku-home-browse relative z-20 pt-5 pb-2"
      data-testid="cinematic-home-browse"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: Compact Catalog Toggle + Kids Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Catalog mode switcher"
            className="inline-flex items-center rounded-lg border border-border-custom bg-surface p-0.5"
          >
            <button
              type="button"
              data-tv-focusable="true"
              aria-pressed={catalogMode === "tmdb"}
              onClick={() => onCatalogChange("tmdb")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                catalogMode === "tmdb"
                  ? "bg-primary text-primary-contrast"
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
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                catalogMode === "anime"
                  ? "bg-primary text-primary-contrast"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300"
            >
              <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Kids</span>
            </span>
          )}
        </div>

        {/* Center/Right: Scrollable Category Strip + Sort Trigger */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:justify-end">
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
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "border-on-surface bg-on-surface text-background font-semibold"
                        : "border-border-custom bg-surface text-on-surface-variant hover:border-white/20 hover:text-on-surface"
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
