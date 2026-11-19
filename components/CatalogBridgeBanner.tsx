"use client";

import Link from "next/link";
import { ArrowRightLeft, Film, Play, Sparkles, Star } from "lucide-react";
import type { CatalogBridgeMatch } from "@/lib/catalog-bridge";

interface CatalogBridgeBannerProps {
  match: CatalogBridgeMatch | null;
  loading?: boolean;
}

export function CatalogBridgeBanner({ match, loading = false }: CatalogBridgeBannerProps) {
  if (loading) {
    return (
      <div
        data-testid="catalog-bridge-skeleton"
        className="h-16 w-full max-w-3xl animate-pulse rounded-2xl border border-border-custom bg-surface/50"
      />
    );
  }

  if (!match) return null;

  const isTargetAnime = match.targetCatalog === "anime";

  return (
    <div
      data-testid={`catalog-bridge-banner-${match.targetCatalog}`}
      className="w-full max-w-3xl rounded-2xl border border-border-custom bg-surface/75 p-3.5 sm:p-4 backdrop-blur-md transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            {isTargetAnime ? (
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Film className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-on-surface-variant tabular-nums">
              <span className="font-semibold text-primary inline-flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>
                  {isTargetAnime
                    ? "AniList Anime Edition Available"
                    : "TMDB Cinema & TV Edition Available"}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{match.formatLabel}</span>
              {match.releaseYear && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{match.releaseYear}</span>
                </>
              )}
              {match.episodesCount ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{match.episodesCount} eps</span>
                </>
              ) : null}
              {match.scoreLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 text-on-surface">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" aria-hidden="true" />
                    <span>{match.scoreLabel}</span>
                  </span>
                </>
              )}
            </div>

            <p className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-on-surface">
              {match.matchedTitle}
              {match.secondaryTitle ? (
                <span className="ml-1.5 font-normal text-on-surface-variant">
                  ({match.secondaryTitle})
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">
              {isTargetAnime
                ? "Unlock dedicated Anime embed servers, sub/dub streams, and franchise timeline."
                : "Unlock 10+ TMDB Cinema & TV multi-servers, cast pages, and official trailer clips."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <Link
            href={match.href}
            data-tv-focusable="true"
            data-testid="catalog-bridge-switch-link"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast transition-all hover:brightness-110 whitespace-nowrap shrink-0"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{isTargetAnime ? "Switch to Anime Edition" : "Switch to TMDB Edition"}</span>
          </Link>

          <Link
            href={match.watchHref}
            data-tv-focusable="true"
            data-testid="catalog-bridge-watch-link"
            className="theme-panel inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
            <span>{isTargetAnime ? "Anime Servers" : "TMDB Servers"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
