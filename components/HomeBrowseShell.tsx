"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, Film, SlidersHorizontal, Sparkles } from "lucide-react";

/**
 * Preserve the full production catalog selector, rail filters, theme shortcut,
 * history counters and sorting without putting a dashboard between the
 * cinematic hero and first media rail. Details uses native keyboard behavior.
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
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!cinematic) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      detailsRef.current.open = false;
      detailsRef.current.querySelector("summary")?.focus();
    };
    const onOutsidePointer = (event: PointerEvent) => {
      const element = detailsRef.current;
      if (element?.open && event.target instanceof Node && !element.contains(event.target)) {
        element.open = false;
      }
    };
    document.addEventListener("keydown", onEscape);
    document.addEventListener("pointerdown", onOutsidePointer);
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("pointerdown", onOutsidePointer);
    };
  }, [cinematic]);

  if (!cinematic) return <>{children}</>;

  return (
    <div className="zoku-home-browse relative z-30 h-0" data-testid="cinematic-home-browse">
      <details ref={detailsRef} className="zoku-home-filters group absolute right-[var(--cinematic-gutter)] bottom-12">
        <summary
          className="zoku-feed-trigger inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-border-custom/60 bg-background/80 px-3 py-2 text-xs font-medium text-on-surface backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
          aria-label="Customize home catalog and feed filters"
          aria-controls="zoku-feed-panel"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Customize feed</span>
          <ChevronDown className="hidden h-4 w-4 transition-transform group-open:rotate-180 sm:inline" aria-hidden="true" />
        </summary>
        <div id="zoku-feed-panel" className="zoku-home-filters-panel absolute right-0 top-[calc(100%+12px)] z-40 w-[min(880px,calc(100vw-32px))] max-h-[min(68dvh,700px)] overflow-y-auto overscroll-contain rounded-2xl border border-border-custom bg-surface p-4 shadow-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border-custom pb-3">
            <p className="text-sm font-semibold text-on-surface">Customize home</p>
            <div role="group" aria-label="Choose your catalog" className="inline-flex gap-1 rounded-full border border-border-custom bg-background p-1">
              <button type="button" data-tv-focusable="true"
                aria-pressed={catalogMode === "tmdb"}
                onClick={() => { onCatalogChange("tmdb"); if (detailsRef.current) detailsRef.current.open = false; }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${catalogMode === "tmdb" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"}`}
              >
                <Film className="h-4 w-4" aria-hidden="true" /> Movies &amp; TV
              </button>
              <button type="button" data-tv-focusable="true"
                aria-pressed={catalogMode === "anime"}
                onClick={() => { onCatalogChange("anime"); if (detailsRef.current) detailsRef.current.open = false; }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${catalogMode === "anime" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"}`}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Anime
              </button>
            </div>
          </div>
          {children}
        </div>
      </details>
    </div>
  );
}
