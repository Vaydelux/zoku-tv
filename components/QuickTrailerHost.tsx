"use client";

import dynamic from "next/dynamic";
import { Loader2, Film, X } from "lucide-react";
import { useQuickTrailerStore } from "@/stores";

const TrailerTheaterModal = dynamic(
  () =>
    import("@/components/TrailerTheaterModal").then(
      (mod) => mod.TrailerTheaterModal
    ),
  { ssr: false }
);

export function QuickTrailerHost() {
  const { open, loading, title, videos, error, close } = useQuickTrailerStore();

  if (!open) return null;

  if (!loading && videos.length > 0) {
    return (
      <TrailerTheaterModal
        open={open}
        onClose={close}
        title={title}
        clips={videos}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer preview for ${title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-custom bg-surface p-6 text-center space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Film className="h-4 w-4 text-primary" aria-hidden="true" />
            Quick Trailer
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close trailer dialog"
            data-tv-focusable="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-background hover:text-on-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-on-surface">
              Finding official trailer for {title}…
            </p>
          </div>
        ) : (
          <div className="py-3 space-y-3">
            <p className="text-sm font-semibold text-on-surface">{title}</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {error || "No official trailer is available for this title."}
            </p>
            <button
              type="button"
              onClick={close}
              data-tv-focusable="true"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-contrast hover:opacity-90"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
