"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film, Eye, Sparkles, ArrowRight, Play, Check } from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";

export default function WatchlistPage() {
  const router = useRouter();
  const { user, currentProfile, initializing } = useSessionStore();
  const { items, initWatchlist } = useWatchlistStore();

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

  // Load Watchlist
  useEffect(() => {
    if (user && currentProfile) {
      const unsubscribe = initWatchlist();
      return () => unsubscribe();
    }
  }, [user, currentProfile, initWatchlist]);

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
        
        {/* Page Header */}
        <div className="border-b border-border-custom pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface uppercase tracking-wide">
              My Watchlist
            </h1>
            <p className="text-xs text-on-surface-variant">
              Your customized personal archives. Curated by <span className="text-primary font-bold">{currentProfile.name}</span>.
            </p>
          </div>

          <button
            onClick={() => router.push("/discover")}
            className="flex items-center gap-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary transition-all duration-300"
          >
            <span>Explore Library Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Watchlist Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4 animate-fade-in">
            {items.map((item) => (
              <div key={`${item.tmdbId}_${item.media_type}`} className="flex justify-center">
                {/* Convert WatchlistItem format into compatible TMDBTitle for TitleCard */}
                <TitleCard 
                  title={{
                    id: item.tmdbId,
                    title: item.title || "",
                    name: item.title || "",
                    poster_path: item.poster_path || null,
                    backdrop_path: item.backdrop_path || null,
                    vote_average: item.vote_average || 0,
                    media_type: item.media_type,
                    overview: ""
                  }} 
                  mediaType={item.media_type}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-28 text-center border-2 border-dashed border-border-custom rounded-2xl bg-surface/10 p-8 gap-4 max-w-lg mx-auto">
            <Film className="h-12 w-12 text-on-surface-variant animate-pulse" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Your watchlist is vacant.</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Start discovering cinematic content from our catalogs and tapping the plus icons to construct your personal watchlist feeds.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="mt-2 rounded-xl bg-primary hover:bg-opacity-95 text-white py-2.5 px-6 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Browse Home Spotlight
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
