"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Film,
  Loader2,
  Play,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  useQuickInspectorStore,
  useQuickTrailerStore,
  useWatchlistStore,
  useWatchHistoryStore,
} from "@/stores";
import { getTitleDetails, type TMDBTitle } from "@/lib/tmdb";
import {
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
} from "@/lib/anilist";

interface ResolvedInspectorDetails {
  title: string;
  tagline?: string | null;
  overview: string;
  backdropUrl: string | null;
  posterUrl: string | null;
  year: string;
  rating: string | null;
  runtimeLabel: string | null;
  genres: string[];
  castOrStudios: string[];
  episodes?: number | null;
  rawReleaseDate?: string | null;
}

function stripHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function resolveTmdbImageUrl(
  raw: string | null | undefined,
  size: "w500" | "w780"
): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
  return `https://image.tmdb.org/t/p/${size}${raw}`;
}

export function QuickInspectorDrawer() {
  const router = useRouter();
  const open = useQuickInspectorStore((s) => s.open);
  const target = useQuickInspectorStore((s) => s.target);
  const closeInspector = useQuickInspectorStore((s) => s.closeInspector);

  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { isCompleted, toggleCompleted } = useWatchHistoryStore();
  const openTmdbTrailer = useQuickTrailerStore((s) => s.openTmdbTrailer);
  const openAnimeTrailer = useQuickTrailerStore((s) => s.openAnimeTrailer);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [details, setDetails] = useState<ResolvedInspectorDetails | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load detailed metadata whenever a new target is inspected
  useEffect(() => {
    if (!open || !target) return;

    let cancelled = false;
    setLoading(true);
    setArtworkFailed(false);
    setDetails({
      title: target.title,
      overview: target.overview || "",
      backdropUrl: target.backdropUrl || target.posterUrl || null,
      posterUrl: target.posterUrl || null,
      year: target.year || "",
      rating: target.rating && target.rating !== "N/A" ? target.rating : null,
      runtimeLabel: target.episodes ? `${target.episodes} episodes` : null,
      genres: [],
      castOrStudios: [],
      episodes: target.episodes ?? null,
    });

    async function hydrate() {
      if (!target) return;
      try {
        if (target.mediaType === "anime") {
          const anime: AniListMedia | null = await getAnimeDetails(target.id);
          if (cancelled || !anime) return;
          const poster = getAnimePoster(anime);
          setDetails({
            title: getAnimeDisplayTitle(anime),
            overview: stripHtml(anime.description) || target.overview || "Synopsis unavailable.",
            backdropUrl: anime.bannerImage || poster || target.backdropUrl || null,
            posterUrl: poster || target.posterUrl || null,
            year: String(anime.seasonYear || anime.startDate?.year || target.year || ""),
            rating: anime.averageScore ? (anime.averageScore / 10).toFixed(1) : target.rating || null,
            runtimeLabel: anime.episodes
              ? `${anime.episodes} EP${anime.format ? ` · ${anime.format}` : ""}`
              : anime.format || null,
            genres: (anime.genres || []).slice(0, 5),
            castOrStudios: (anime.studios?.nodes || []).map((s) => s.name).slice(0, 4),
            episodes: anime.episodes ?? null,
            rawReleaseDate: anime.seasonYear ? `${anime.seasonYear}-01-01` : null,
          });
        } else {
          const data: (TMDBTitle & {
            tagline?: string;
            runtime?: number;
            number_of_seasons?: number;
            episode_run_time?: number[];
            credits?: { cast?: Array<{ name: string }> };
          }) | null = await getTitleDetails(target.mediaType, target.id);
          if (cancelled || !data) return;

          const runtime =
            target.mediaType === "movie"
              ? data.runtime
                ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
                : null
              : data.number_of_seasons
              ? `${data.number_of_seasons} ${data.number_of_seasons === 1 ? "Season" : "Seasons"}`
              : null;

          const rawDate = data.release_date || data.first_air_date || null;
          setDetails({
            title: data.title || data.name || target.title,
            tagline: data.tagline || null,
            overview: data.overview || target.overview || "Synopsis unavailable.",
            backdropUrl:
              resolveTmdbImageUrl(data.backdrop_path, "w780") ||
              target.backdropUrl ||
              target.posterUrl ||
              null,
            posterUrl:
              resolveTmdbImageUrl(data.poster_path, "w500") ||
              target.posterUrl ||
              null,
            year: (rawDate || "").slice(0, 4) || target.year || "",
            rating: data.vote_average ? data.vote_average.toFixed(1) : target.rating || null,
            runtimeLabel: runtime,
            genres: (data.genres || []).map((g) => g.name).slice(0, 5),
            castOrStudios: (data.credits?.cast || []).map((c) => c.name).slice(0, 4),
            rawReleaseDate: rawDate,
          });
        }
      } catch (err) {
        console.error("QuickInspector hydrate failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  // Escape dismissal & focus handoff
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeBtnRef.current?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeInspector();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeInspector]);

  if (!mounted || !open || !target) return null;

  const isSaved = hasItem(target.mediaType, target.id);
  const isWatched = isCompleted(target.mediaType, target.id);
  const resolved = details ?? {
    title: target.title,
    overview: target.overview || "",
    backdropUrl: target.backdropUrl || target.posterUrl || null,
    posterUrl: target.posterUrl || null,
    year: target.year || "",
    rating: target.rating || null,
    runtimeLabel: null,
    genres: [],
    castOrStudios: [],
    episodes: target.episodes ?? null,
    rawReleaseDate: null,
  };

  const detailHref =
    target.mediaType === "anime"
      ? `/anime/${target.id}`
      : `/title/${target.mediaType}/${target.id}`;

  const watchHref =
    target.mediaType === "anime"
      ? `/watch/anime/${target.id}/1/1`
      : target.mediaType === "tv"
      ? `/watch/tv/${target.id}/1/1`
      : `/watch/movie/${target.id}`;

  const handleToggleWatchlist = () => {
    if (isSaved) {
      void removeItem(target.mediaType, target.id);
      return;
    }
    void addItem({
      media_type: target.mediaType,
      tmdbId: target.mediaType === "anime" ? undefined : target.id,
      anilistId: target.mediaType === "anime" ? target.id : undefined,
      title: resolved.title,
      genres: resolved.genres.length > 0 ? resolved.genres : null,
      poster_path: resolved.posterUrl,
      backdrop_path: resolved.backdropUrl,
      vote_average: resolved.rating ? Number(resolved.rating) : undefined,
      release_date: resolved.rawReleaseDate ?? null,
    });
  };

  const handleToggleWatched = () => {
    void toggleCompleted({
      media_type: target.mediaType,
      tmdbId: target.mediaType === "anime" ? null : target.id,
      anilistId: target.mediaType === "anime" ? target.id : null,
      season: target.mediaType === "movie" ? null : 1,
      episode: target.mediaType === "movie" ? null : 1,
      title: resolved.title,
      overview: resolved.overview || null,
      vote_average: resolved.rating ? Number(resolved.rating) : null,
      poster_path: resolved.posterUrl,
      backdrop_path: resolved.backdropUrl,
    });
  };

  const handleOpenTrailer = () => {
    if (target.mediaType === "anime") {
      void openAnimeTrailer(target.id, resolved.title);
    } else {
      void openTmdbTrailer(target.mediaType, target.id, resolved.title);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[82] flex items-end md:items-stretch justify-end bg-black/45 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick inspector for ${resolved.title}`}
      data-testid="quick-inspector-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeInspector();
      }}
    >
      <aside className="zoku-inspector-drawer liquid-glass-elevated relative flex max-h-[88dvh] md:max-h-none w-full md:w-[416px] flex-col overflow-hidden rounded-t-[30px] md:rounded-t-none md:rounded-l-[30px]">
        {/* Kakei-Style Inspector Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-5 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              {target.mediaType === "anime" ? (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Film className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Title Inspector
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeInspector}
              aria-label="Close inspector"
              data-tv-focusable="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Framed Artwork Hero Card */}
          <div className="relative overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-background/60 aspect-[16/10]">
            {resolved.backdropUrl && !artworkFailed ? (
              <img
                src={resolved.backdropUrl}
                alt={resolved.title}
                onError={() => setArtworkFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-surface text-on-surface-variant"
                style={{ backgroundImage: "var(--background-gradient)" }}
              >
                <Film className="h-8 w-8 opacity-40" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-3.5 bottom-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold tracking-tight text-white line-clamp-2">
                  {resolved.title}
                </h2>
                {resolved.tagline && (
                  <p className="mt-0.5 text-[11px] text-white/75 line-clamp-1">
                    {resolved.tagline}
                  </p>
                )}
              </div>
              {resolved.rating && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/65 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300 backdrop-blur-md">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {resolved.rating}
                </span>
              )}
            </div>
          </div>

          {/* Metadata Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-1 font-semibold uppercase tracking-wide text-[10px] text-primary">
              {target.mediaType === "tv"
                ? "TV Series"
                : target.mediaType === "anime"
                ? "Anime"
                : "Film"}
            </span>
            {resolved.year && (
              <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-1 font-mono text-[11px] text-on-surface-variant">
                {resolved.year}
              </span>
            )}
            {resolved.runtimeLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-1 text-[11px] text-on-surface-variant">
                <Clock className="h-3 w-3" />
                {resolved.runtimeLabel}
              </span>
            )}
          </div>

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => {
                closeInspector();
                router.push(watchHref);
              }}
              className="liquid-glass-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Watch Now
            </button>
            <button
              type="button"
              data-tv-focusable="true"
              onClick={handleOpenTrailer}
              className="liquid-glass-pill inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold text-on-surface"
            >
              <Film className="h-3.5 w-3.5 text-primary" />
              Trailer
            </button>
          </div>

          {/* Kakei-Style Glass Toggle Controls */}
          <div className="rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] divide-y divide-[var(--glass-border)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-primary" />
                  In Watchlist
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {isSaved ? "Saved to your active profile" : "Save for later viewing"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isSaved}
                aria-label="Toggle Watchlist"
                onClick={handleToggleWatchlist}
                className={`ios-switch ${isSaved ? "bg-primary" : "bg-on-surface/20"}`}
              >
                <span
                  className={`ios-switch-thumb ${isSaved ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Marked Watched
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {isWatched ? "Completed in Watch History" : "Track completion state"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isWatched}
                aria-label="Toggle Watched status"
                onClick={handleToggleWatched}
                className={`ios-switch ${isWatched ? "bg-emerald-500" : "bg-on-surface/20"}`}
              >
                <span
                  className={`ios-switch-thumb ${isWatched ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {/* Synopsis */}
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Synopsis
            </p>
            <p className="text-xs leading-relaxed text-on-surface/85">
              {resolved.overview || "Synopsis unavailable."}
            </p>
          </div>

          {/* Genres & Cast/Studios */}
          {resolved.genres.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Genres
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resolved.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 text-[11px] font-medium text-on-surface"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resolved.castOrStudios.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {target.mediaType === "anime" ? "Studios" : "Featured Cast"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resolved.castOrStudios.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 text-[11px] text-on-surface-variant"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sticky Full-Details Footer */}
        <div className="border-t border-[var(--glass-border)] p-4">
          <button
            type="button"
            data-tv-focusable="true"
            onClick={() => {
              closeInspector();
              router.push(detailHref);
            }}
            className="liquid-glass-pill flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-xs font-semibold text-on-surface hover:text-primary"
          >
            <span>Open Full Details &amp; Episodes</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
