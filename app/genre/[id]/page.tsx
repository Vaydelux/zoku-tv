"use client";

import { Suspense, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Film, ArrowLeft, Shield, SlidersHorizontal } from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { discoverMedia, getGenres, TMDBTitle } from "@/lib/tmdb";
import { filterTmdbForKidsMode } from "@/lib/kids-mode";
import { buildDiscoverUrl } from "@/lib/discover-url";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface GenrePageProps {
  params: Promise<{ id: string }>;
}

type GenreMediaFilter = "all" | "movie" | "tv";
type GenreSortMode = "rating" | "popularity" | "newest";

export default function GenrePage({ params }: GenrePageProps) {
  const { id: genreId } = use(params);
  return (
    <Suspense
      fallback={
        <div role="status" className="min-h-[60svh] bg-background px-6 py-20 text-center text-on-surface-variant">
          Loading genre…
        </div>
      }
    >
      <GenrePageContent genreId={genreId} />
    </Suspense>
  );
}

function GenrePageContent({ genreId }: { genreId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();

  const mediaParam = searchParams.get("media");
  const sortParam = searchParams.get("sort");
  const mediaFilter: GenreMediaFilter =
    mediaParam === "movie" || mediaParam === "tv" ? mediaParam : "all";
  const sortMode: GenreSortMode =
    sortParam === "popularity" || sortParam === "newest" ? sortParam : "rating";

  const [genreName, setGenreName] = useState("");
  const [items, setItems] = useState<TMDBTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(genreName ? `${genreName} Genre` : "Genre");

  const updateQuery = (nextMedia: GenreMediaFilter, nextSort: GenreSortMode) => {
    const params = new URLSearchParams();
    if (nextMedia !== "all") params.set("media", nextMedia);
    if (nextSort !== "rating") params.set("sort", nextSort);
    const qs = params.toString();
    router.replace(qs ? `/genre/${encodeURIComponent(genreId)}?${qs}` : `/genre/${encodeURIComponent(genreId)}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!currentProfile || !genreId) return;

    let cancelled = false;

    async function loadGenreContent() {
      setLoading(true);
      try {
        const [movieGenres, tvGenres, moviesInGenre, tvInGenre] = await Promise.all([
          getGenres("movie"),
          getGenres("tv"),
          discoverMedia("movie", {
            with_genres: genreId,
            sort_by: "popularity.desc",
          }),
          discoverMedia("tv", {
            with_genres: genreId,
            sort_by: "popularity.desc",
          }),
        ]);

        if (cancelled) return;

        const all = [...movieGenres, ...tvGenres];
        const matched = all.find((g) => String(g.id) === genreId);
        setGenreName(matched ? matched.name : "Genre Catalog");

        const combined = [...moviesInGenre, ...tvInGenre];
        const filtered = filterTmdbForKidsMode(combined, currentProfile?.kidMode);
        setItems(filtered);
      } catch (err) {
        console.error("Failed to load genre catalog:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGenreContent();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, genreId]);

  const visibleItems = useMemo(() => {
    const byType =
      mediaFilter === "all"
        ? items
        : items.filter((item) => item.media_type === mediaFilter);
    return [...byType].sort((a, b) => {
      if (sortMode === "popularity") {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      if (sortMode === "newest") {
        const da = a.release_date || a.first_air_date || "";
        const db = b.release_date || b.first_air_date || "";
        return db.localeCompare(da);
      }
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
  }, [items, mediaFilter, sortMode]);

  const discoverHref = buildDiscoverUrl({
    type: mediaFilter === "tv" ? "tv" : "movie",
    genre: genreId,
    sortBy:
      sortMode === "newest"
        ? "release_date.desc"
        : sortMode === "rating"
        ? "vote_average.desc"
        : "popularity.desc",
  });

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-custom pb-5">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              data-tv-focusable="true"
              className="theme-panel p-2.5 rounded-xl hover:bg-surface-hover text-on-surface hover:text-primary transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface tracking-tight truncate">
                {genreName || "Genre Catalog"}
              </h1>
              <p className="text-xs text-on-surface-variant tabular-nums">
                {visibleItems.length} {visibleItems.length === 1 ? "title" : "titles"} matched in this genre
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentProfile?.kidMode && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <Shield className="h-3 w-3" />
                <span>Kids Mode Filtered</span>
              </span>
            )}

            <div className="inline-flex rounded-xl border border-border-custom bg-surface p-1" role="group" aria-label="Filter by format">
              {(["all", "movie", "tv"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateQuery(m, sortMode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mediaFilter === m
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {m === "all" ? "All" : m === "movie" ? "Movies" : "TV"}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-border-custom bg-surface p-1" role="group" aria-label="Sort genre titles">
              {(
                [
                  { id: "rating", label: "Top Rated" },
                  { id: "popularity", label: "Popular" },
                  { id: "newest", label: "Newest" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateQuery(mediaFilter, s.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    sortMode === s.id
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Link
              href={discoverHref}
              data-tv-focusable="true"
              className="theme-panel inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Open Advanced Discover</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <div
                key={idx}
                className="aspect-video rounded-xl bg-surface border border-border-custom animate-pulse"
              />
            ))}
          </div>
        ) : visibleItems.length > 0 ? (
          <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2 animate-fade-in">
            {visibleItems.map((title) => (
              <TitleCard
                key={`${title.media_type}_${title.id}`}
                title={title}
                mediaType={title.media_type}
                fullWidth
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Film className="h-10 w-10 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">
              {currentProfile?.kidMode
                ? "No Kids Mode family-safe titles are available in this genre channel."
                : "No titles matched the current filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
