"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film, ArrowRight } from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { getWatchlistItemId } from "@/lib/media-types";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { AnimeCard } from "@/components/anime/AnimeCard";
import type { AniListMedia } from "@/lib/anilist";

export default function WatchlistPage() {
  const router = useRouter();
  const { currentProfile } = useSessionStore();
  const { items, initWatchlist } = useWatchlistStore();
  const catalogMode = currentProfile?.catalogMode ?? "tmdb";

  useEffect(() => {
    if (currentProfile) {
      const unsubscribe = initWatchlist();
      return () => unsubscribe();
    }
  }, [currentProfile, initWatchlist]);

  if (!currentProfile) {
    return null;
  }

  const filteredItems = items.filter((item) =>
    catalogMode === "anime" ? item.media_type === "anime" : item.media_type !== "anime"
  );

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="border-b border-border-custom pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface uppercase tracking-wide">
              My Watchlist
            </h1>
            <p className="text-xs text-on-surface-variant">
              {catalogMode === "anime" ? "Anime" : "Movies & TV"} saved by{" "}
              <span className="text-primary font-bold">{currentProfile.name}</span>.
            </p>
          </div>

          <button
            onClick={() => router.push("/discover")}
            className="flex items-center gap-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary transition-all duration-300"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4 animate-fade-in">
            {filteredItems.map((item) => (
              <div key={`${item.media_type}_${getWatchlistItemId(item)}`} className="flex justify-center">
                {item.media_type === "anime" ? (
                  <AnimeCard
                    anime={{
                      id: item.anilistId!,
                      title: { english: item.title, romaji: item.title },
                      coverImage: { large: item.poster_path },
                      bannerImage: item.backdrop_path,
                      averageScore: item.vote_average ? item.vote_average * 10 : null,
                      media_type: "anime",
                    } as AniListMedia}
                  />
                ) : (
                  <TitleCard
                    title={{
                      id: item.tmdbId!,
                      title: item.title || "",
                      name: item.title || "",
                      poster_path: item.poster_path || null,
                      backdrop_path: item.backdrop_path || null,
                      vote_average: item.vote_average || 0,
                      media_type: item.media_type as "movie" | "tv",
                      overview: "",
                    }}
                    mediaType={item.media_type as "movie" | "tv"}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-28 text-center border-2 border-dashed border-border-custom rounded-2xl bg-surface/10 p-8 gap-4 max-w-lg mx-auto">
            <Film className="h-12 w-12 text-on-surface-variant animate-pulse" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Your watchlist is vacant.</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Start discovering {catalogMode === "anime" ? "anime" : "movies and TV"} and add titles to your watchlist.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="mt-2 rounded-xl bg-primary hover:bg-opacity-95 text-white py-2.5 px-6 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Browse Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
