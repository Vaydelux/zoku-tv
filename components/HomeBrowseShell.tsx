"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, Film, SlidersHorizontal, Sparkles } from "lucide-react";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

/**
 * Preserve the full production catalog selector, rail filters, theme shortcut,
 * history counters and sorting without putting a dashboard between the
 * cinematic hero and first media rail. Uses viewport-aware FloatingMenu so
 * opening it or nested sort dropdowns never grows panel/page height or clips.
 */
export function HomeBrowseShell({
  children,
  cinematic,
  catalogMode,
  onCatalogChange,
  hasHero = true,
}: {
  children: ReactNode;
  cinematic: boolean;
  catalogMode: "tmdb" | "anime";
  onCatalogChange: (mode: "tmdb" | "anime") => void;
  hasHero?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!cinematic) return <>{children}</>;

  return (
    <div
      className={
        hasHero
          ? "zoku-home-browse relative z-30 h-0"
          : "zoku-home-browse relative z-30 flex justify-end px-[var(--cinematic-gutter)] pt-3"
      }
      data-testid="cinematic-home-browse"
    >
      <div
        data-has-hero={hasHero ? "true" : "false"}
        className={
          hasHero
            ? "zoku-home-filters absolute right-[var(--cinematic-gutter)] bottom-12"
            : "zoku-home-filters relative"
        }
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="zoku-feed-panel"
          aria-label="Customize home catalog and feed filters"
          data-tv-focusable="true"
          className={`zoku-feed-trigger zoku-dropdown-trigger inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            open
              ? "border-primary bg-surface text-on-surface ring-1 ring-primary/35"
              : "border-border-custom/60 bg-background/80 text-on-surface hover:bg-surface"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Customize feed</span>
          <ChevronDown
            className={`hidden h-4 w-4 shrink-0 transition-transform duration-200 sm:inline ${
              open ? "rotate-180 text-primary" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        <FloatingMenu
          open={open}
          anchorRef={triggerRef}
          onClose={() => setOpen(false)}
          id="zoku-feed-panel"
          role="dialog"
          ariaLabel="Customize home catalog and feed filters"
          align="right"
          minWidth={880}
          maxWidth={880}
          preferredMaxHeight={520}
          className="zoku-home-filters-panel rounded-2xl p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border-custom pb-3">
            <p className="text-sm font-semibold text-on-surface">Customize home</p>
            <div role="group" aria-label="Choose your catalog" className="inline-flex gap-1 rounded-full border border-border-custom bg-background p-1">
              <button
                type="button"
                data-tv-focusable="true"
                aria-pressed={catalogMode === "tmdb"}
                onClick={() => {
                  onCatalogChange("tmdb");
                  setOpen(false);
                }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  catalogMode === "tmdb"
                    ? "bg-primary text-primary-contrast"
                    : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                <Film className="h-4 w-4" aria-hidden="true" /> Movies &amp; TV
              </button>
              <button
                type="button"
                data-tv-focusable="true"
                aria-pressed={catalogMode === "anime"}
                onClick={() => {
                  onCatalogChange("anime");
                  setOpen(false);
                }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  catalogMode === "anime"
                    ? "bg-primary text-primary-contrast"
                    : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Anime
              </button>
            </div>
          </div>
          {children}
        </FloatingMenu>
      </div>
    </div>
  );
}
