"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Film, ArrowLeft } from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { discoverMedia, getGenres, TMDBTitle, TMDBGenre } from "@/lib/tmdb";

interface GenrePageProps {
  params: Promise<{ id: string }>;
}

export default function GenrePage({ params }: GenrePageProps) {
  const router = useRouter();
  const { id: genreId } = use(params);
  const { user, currentProfile, initializing } = useSessionStore();

  const [genreName, setGenreName] = useState("");
  const [items, setItems] = useState<TMDBTitle[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirection guard
  useEffect(() => {
    if (!initializing) {
      if (!user) {
        router.replace("/login");
      } else if (!currentProfile) {
        router.replace("/profiles");
      }
    }
  }, [user, currentProfile, initializing, router]);

  // Fetch genre content
  useEffect(() => {
    if (!user || !currentProfile || !genreId) return;

    async function loadGenreContent() {
      setLoading(true);
      try {
        // Find Genre Name
        const movieGenres = await getGenres("movie");
        const tvGenres = await getGenres("tv");
        const all = [...movieGenres, ...tvGenres];
        const matched = all.find(g => String(g.id) === genreId);
        setGenreName(matched ? matched.name : "Dynamic Genre");

        // Fetch mixed movies & tv for that genre
        const moviesInGenre = await discoverMedia("movie", {
          with_genres: genreId,
          sort_by: "popularity.desc"
        });

        const tvInGenre = await discoverMedia("tv", {
          with_genres: genreId,
          sort_by: "popularity.desc"
        });

        // Mix and sort by popularity
        const combined = [...moviesInGenre, ...tvInGenre].sort(
          (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
        );

        // Filter kidMode
        const filtered = currentProfile?.kidMode
          ? combined.filter(t => (t.vote_average || 0) < 7.5)
          : combined;

        setItems(filtered);
      } catch (err) {
        console.error("Failed to load genre catalog:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGenreContent();
  }, [user, currentProfile, genreId]);

  if (initializing || !user || !currentProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Back navigation and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom text-on-surface hover:text-primary transition-all active:scale-95"
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

        {loading ? (
          /* Loading Grid */
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
              <div key={title.id} className="flex justify-center">
                <TitleCard title={title} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Film className="h-10 w-10 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">
              This channel is currently empty.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
