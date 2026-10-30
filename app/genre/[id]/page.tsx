"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Film, ArrowLeft, Shield } from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { discoverMedia, getGenres, TMDBTitle } from "@/lib/tmdb";
import { filterTmdbForKidsMode } from "@/lib/kids-mode";

interface GenrePageProps {
  params: Promise<{ id: string }>;
}

export default function GenrePage({ params }: GenrePageProps) {
  const router = useRouter();
  const { id: genreId } = use(params);
  const { currentProfile } = useSessionStore();

  const [genreName, setGenreName] = useState("");
  const [items, setItems] = useState<TMDBTitle[]>([]);
  const [loading, setLoading] = useState(true);

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
        setGenreName(matched ? matched.name : "Dynamic Genre");

        const combined = [...moviesInGenre, ...tvInGenre].sort(
          (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
        );

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

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="theme-panel p-2 rounded-xl hover:bg-surface-hover text-on-surface hover:text-primary transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface uppercase tracking-wide">
                {genreName} <span className="text-primary font-mono text-xs lowercase">/ feed</span>
              </h1>
              <p className="text-xs text-on-surface-variant">
                Sifting through cinematic archives for the absolute highest quality.
              </p>
            </div>
          </div>

          {currentProfile?.kidMode && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Shield className="h-3 w-3" />
              <span>Kids Mode Filtered</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4 animate-fade-in">
            {items.map((title) => (
              <div key={`${title.media_type}_${title.id}`} className="flex justify-center">
                <TitleCard title={title} mediaType={title.media_type} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Film className="h-10 w-10 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">
              {currentProfile?.kidMode
                ? "No Kids Mode family-safe titles are available in this genre channel."
                : "This channel is currently empty."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
