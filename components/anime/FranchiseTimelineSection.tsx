"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Film, Layers, Play } from "lucide-react";
import type {
  FranchiseTimeline,
  FranchiseTimelineNode,
  FranchiseTrack,
} from "@/lib/anilist-seasons";

interface FranchiseTimelineSectionProps {
  timeline: FranchiseTimeline;
  onSelectEntry?: (node: FranchiseTimelineNode) => void;
}

export function FranchiseTimelineSection({
  timeline,
  onSelectEntry,
}: FranchiseTimelineSectionProps) {
  const router = useRouter();
  const hasMain = timeline.mainStoryline.length > 0;
  const hasSide = timeline.sideStoriesAndMovies.length > 0;

  const [activeTrack, setActiveTrack] = useState<FranchiseTrack>(() => {
    const currentInSide = timeline.sideStoriesAndMovies.some((n) => n.isCurrent);
    if (currentInSide && hasSide) return "side";
    return hasMain ? "main" : "side";
  });

  if (timeline.totalEntries <= 1) return null;

  const activeItems =
    activeTrack === "side" && hasSide
      ? timeline.sideStoriesAndMovies
      : timeline.mainStoryline;

  const handleCardClick = (node: FranchiseTimelineNode) => {
    if (onSelectEntry) {
      onSelectEntry(node);
      return;
    }
    if (!node.isCurrent) {
      router.push(`/anime/${node.anilistId}`);
    }
  };

  return (
    <section
      aria-label="Franchise Watch Order"
      data-testid="anime-franchise-timeline-section"
      className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-custom pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-on-surface">
              Franchise Watch Order
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant font-mono tabular-nums">
            <span>{timeline.totalEntries} Installments</span>
            <span aria-hidden="true"> · </span>
            <span>
              {timeline.completedEntries} of {timeline.totalEntries} Completed
            </span>
            <span aria-hidden="true"> · </span>
            <span>Chronological Release Order</span>
          </p>
        </div>

        {hasMain && hasSide && (
          <div
            role="tablist"
            aria-label="Franchise tracks"
            className="inline-flex items-center gap-1 rounded-xl border border-border-custom bg-background/70 p-1 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTrack === "main"}
              data-tv-focusable="true"
              data-testid="franchise-tab-main"
              onClick={() => setActiveTrack("main")}
              className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTrack === "main"
                  ? "bg-primary text-primary-contrast shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Main Storyline ({timeline.mainStoryline.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTrack === "side"}
              data-tv-focusable="true"
              data-testid="franchise-tab-side"
              onClick={() => setActiveTrack("side")}
              className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTrack === "side"
                  ? "bg-primary text-primary-contrast shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Movies &amp; Side Stories ({timeline.sideStoriesAndMovies.length})
            </button>
          </div>
        )}
      </div>

      <div className="custom-scrollbar flex gap-3.5 sm:gap-4 overflow-x-auto pb-2">
        {activeItems.map((node) => {
          const stepLabel = String(node.orderIndex).padStart(2, "0");

          return (
            <button
              key={node.anilistId}
              type="button"
              data-tv-focusable="true"
              data-testid={`franchise-timeline-node-${node.anilistId}`}
              onClick={() => handleCardClick(node)}
              className={`group relative flex w-64 sm:w-72 shrink-0 items-start gap-3.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                node.isCurrent
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border-custom bg-background/50 hover:border-primary hover:bg-surface/70"
              }`}
            >
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-border-custom bg-surface">
                {node.poster ? (
                  <img
                    src={node.poster}
                    alt={node.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                    <Film className="h-5 w-5 opacity-50" aria-hidden="true" />
                  </div>
                )}
                <span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums">
                  {stepLabel}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-on-surface-variant tabular-nums">
                    <span className="font-semibold text-primary">{node.relationLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{node.format}</span>
                    {node.year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{node.year}</span>
                      </>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {node.title}
                  </h3>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                  <span className="text-on-surface-variant">
                    {node.episodes ? `${node.episodes} eps` : "Entry"}
                  </span>

                  {node.watchStatus === "completed" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Completed</span>
                    </span>
                  ) : node.watchStatus === "in_progress" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>
                        {node.lastWatchedEpisode
                          ? `Ep ${node.lastWatchedEpisode} · ${node.progressPercent}%`
                          : `${node.progressPercent}%`}
                      </span>
                    </span>
                  ) : node.isCurrent ? (
                    <span className="font-semibold text-primary">Viewing</span>
                  ) : (
                    <span className="text-on-surface-variant">Not started</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
