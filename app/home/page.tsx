"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, AlertTriangle } from "lucide-react";
import { useSessionStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TitleRail } from "@/components/TitleRail";
import { LoadingBanner } from "@/components/LoadingBanner";
import { TMDBTitle, TMDBGenre } from "@/lib/tmdb";
import { loadHomeGenreRails, loadHomeTrending } from "@/lib/load-home-content";

export default function HomePage() {
  const router = useRouter();
  const { user, currentProfile } = useSessionStore();

  const [heroSlides, setHeroSlides] = useState<TMDBTitle[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBTitle[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBTitle[]>([]);
  const [genreRails, setGenreRails] = useState<{ genre: TMDBGenre; titles: TMDBTitle[] }[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingGenreRails, setLoadingGenreRails] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading your home feed...");

  const [isOffline, setIsOffline] = useState(false);
  const [lastViewed, setLastViewed] = useState<any | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      
      // Load last viewed title
      const stored = localStorage.getItem("zoku_last_viewed");
      if (stored) {
        try {
          setLastViewed(JSON.parse(stored));
        } catch (e) {
          console.warn("Failed to parse last viewed from localStorage", e);
        }
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Load home content in two parallel phases for faster first paint
  useEffect(() => {
    if (!user || !currentProfile) return;

    let cancelled = false;

    async function loadTrendingContent() {
      setLoadingTrending(true);
      setLoadingGenreRails(true);
      setLoadingMessage("Loading trending titles...");

      try {
        if (typeof window !== "undefined" && !navigator.onLine) {
          throw new Error("Offline status detected");
        }

        const trending = await loadHomeTrending();
        if (cancelled) return;

        setHeroSlides(trending.heroSlides);
        setTrendingMovies(trending.trendingMovies);
        setTrendingTV(trending.trendingTV);
      } catch (err) {
        console.error("Failed to load trending TMDB data:", err);
      } finally {
        if (!cancelled) {
          setLoadingTrending(false);
        }
      }

      setLoadingMessage("Loading genre rails...");
      try {
        const prefGenreIds = currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18];
        const rails = await loadHomeGenreRails(prefGenreIds);
        if (!cancelled) {
          setGenreRails(rails);
        }
      } catch (err) {
        console.error("Failed to load genre rails:", err);
      } finally {
        if (!cancelled) {
          setLoadingGenreRails(false);
          setLoadingMessage("");
        }
      }
    }

    loadTrendingContent();

    return () => {
      cancelled = true;
    };
  }, [user, currentProfile]);

  const loadingMedia = loadingTrending || loadingGenreRails;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      {loadingMedia && loadingMessage && <LoadingBanner message={loadingMessage} />}
      <Navbar />

      <HeroCarousel slides={heroSlides} loading={loadingTrending} />

      {/* 2. Media Horizontal Rails */}
      <section className="relative z-10 bg-background pt-1 sm:pt-2 space-y-1 md:space-y-2 pb-16">
        
        {/* Offline & Last Viewed Banner */}
        {isOffline && lastViewed && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-primary/20 bg-surface/95 backdrop-blur-md p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">OFFLINE TUNNEL ACTIVE</h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl leading-relaxed">
                You are currently disconnected from TMDB servers. Rest assured, you can still stream your last-watched offline media channel:
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/50 border border-border-custom p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  {lastViewed.poster_path && (
                    <img 
                      src={`https://image.tmdb.org/t/p/w200${lastViewed.poster_path}`} 
                      alt={lastViewed.title} 
                      className="h-16 aspect-[2/3] object-cover rounded-lg border border-border-custom shadow shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-xs font-bold text-on-surface">{lastViewed.title}</h3>
                    <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">{lastViewed.overview}</p>
                    <p className="text-[9px] font-mono text-primary uppercase mt-1">
                      {lastViewed.media_type} {lastViewed.season ? `• S${lastViewed.season}E${lastViewed.episode}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const url = lastViewed.media_type === "tv" && lastViewed.season
                      ? `/watch/tv/${lastViewed.id}/${lastViewed.season}/${lastViewed.episode}`
                      : `/watch/${lastViewed.media_type}/${lastViewed.id}`;
                    router.push(url);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-opacity-95 text-white py-2 px-4 text-xs font-bold transition-all shrink-0 shadow active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Resume Playback Offline</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingTrending ? (
          /* Loading Skeletons */
          <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {[1, 2].map((railIdx) => (
              <div key={railIdx} className="space-y-4">
                <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                <div className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-visible py-2">
                  {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                    <div 
                      key={cardIdx} 
                      className="w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse shrink-0" 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Live Horizontal Rails */
          <div className="space-y-2">
            <TitleRail title="Trending Movies" items={trendingMovies} mediaType="movie" />
            <TitleRail title="Trending TV Shows" items={trendingTV} mediaType="tv" />
            
            {loadingGenreRails ? (
              <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {[1, 2].map((railIdx) => (
                  <div key={railIdx} className="space-y-4">
                    <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                    <div className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-visible py-2">
                      {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                        <div
                          key={cardIdx}
                          className="w-[128px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              genreRails.map(({ genre, titles }) => (
                <TitleRail 
                  key={genre.id} 
                  title={`${genre.name} Masterpieces`} 
                  items={titles} 
                  genreId={genre.id}
                />
              ))
            )}
          </div>
        )}

      </section>
    </div>
  );
}
