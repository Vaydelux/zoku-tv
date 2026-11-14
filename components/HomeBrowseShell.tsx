"use client";

import type { ReactNode } from "react";
import { ChevronDown, Film, SlidersHorizontal, Sparkles } from "lucide-react";

/** Keep the entire existing filter/sort/profile-command deck operational, but
 * move it behind progressive disclosure in cinematic mode. The reference
 * places rails immediately after the hero, rather than dedicating an entire
 * large surface to command controls. No data/store logic lives here.
 */
export function HomeBrowseShell({
  children,
  cinematic,
  catalogMode,
  onCatalogChange,
}: {
  children: ReactNode;
  cinematic: boolean;
  catalogMode: "tmdb" | "anime";
  onCatalogChange: (mode: "tmdb" | "anime") => void;
}) {
  if (!cinematic) return <>{children}</>;

  return (
    <div className="zoku-home-browse px-[var(--cinematic-gutter)] pt-7 pb-3">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Choose your catalog" className="inline-flex gap-1 rounded-full border border-border-custom bg-surface/70 p-1">
          <button
            type="button"
            onClick={() => onCatalogChange("tmdb")}
            aria-pressed={catalogMode === "tmdb"}
            data-tv-focusable="true"
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${catalogMode === "tmdb" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-hover"}`}
          >
            <Film className="h-4 w-4" aria-hidden="true" /> Movies &amp; TV
          </button>
          <button
            type="button"
            onClick={() => onCatalogChange("anime")}
            aria-pressed={catalogMode === "anime"}
            data-tv-focusable="true"
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${catalogMode === "anime" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-hover"}`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Anime
          </button>
        </div>

        <details className="zoku-home-filters group relative min-w-0">
          <summary
            className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-hover hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Customize feed
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="zoku-home-filters-panel absolute right-0 top-full z-30 mt-2 w-[min(960px,calc(100vw-32px))] max-h-[65dvh] overflow-y-auto rounded-2xl border border-border-custom bg-background p-3 shadow-xl sm:p-4">
            {children}
          </div>
        </details>
      </div>
    </div>
  );
}
