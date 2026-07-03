"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, Info, AlertTriangle } from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleRail } from "@/components/TitleRail";
import { LoadingBanner } from "@/components/LoadingBanner";
import { TMDBTitle, TMDBGenre } from "@/lib/tmdb";
import { loadHomeGenreRails, loadHomeTrending } from "@/lib/load-home-content";

export default function HomePage() {
  const router = useRouter();
  const { user, currentProfile, initializing } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();

  const [heroTitle, setHeroTitle] = useState<TMDBTitle | null>(null);
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

  // Auth & Profile redirect check
  useEffect(() => {
    if (!initializing) {
      if (!user) {
        router.replace("/login");
      } else if (!currentProfile) {
        router.replace("/profiles");
      }
    }
  }, [user, currentProfile, initializing, router]);

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

        setHeroTitle(trending.heroTitle);
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

  if (initializing || !user || !currentProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const heroName = heroTitle?.title || heroTitle?.name || "Untitled Masterpiece";
  const heroBackdrop = heroTitle?.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${heroTitle.backdrop_path}`
    : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920";
  const heroRating = heroTitle?.vote_average ? heroTitle.vote_average.toFixed(1) : "N/A";
  const heroYear = (heroTitle?.release_date || heroTitle?.first_air_date || "").split("-")[0];
  const heroMediaType = heroTitle?.media_type || "movie";
  const isHeroInWatchlist = heroTitle ? hasItem(heroTitle.id, heroMediaType) : false;

  const handleHeroWatchlistToggle = () => {
    if (!heroTitle) return;
    if (isHeroInWatchlist) {
      removeItem(heroTitle.id, heroMediaType);
    } else {
      addItem(
        heroTitle.id,
        heroMediaType,
        heroName,
        heroTitle.poster_path,
        heroTitle.backdrop_path,
        heroTitle.vote_average
      );
    }
  };

  const loadingMedia = loadingTrending || loadingGenreRails;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      {loadingMedia && loadingMessage && <LoadingBanner message={loadingMessage} />}
      <Navbar />

      {/* 1. Hero Spotlight Banner */}
      <section className="relative isolate w-full">
        {/* Backdrop layer — clipped separately so rails/cards below are never cut off */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${heroBackdrop}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" />
        </div>

        {/* Hero copy + actions */}
        {(heroTitle || loadingTrending) && (
          <div className="relative z-[1] mx-auto flex w-full max-w-7xl min-h-[clamp(340px,52dvh,680px)] flex-col justify-end px-4 pb-6 pt-20 sm:px-6 sm:pb-8 sm:pt-24 lg:px-8 lg:pb-10">
            {loadingTrending && !heroTitle ? (
              <div className="flex w-full max-w-3xl flex-col gap-4 animate-pulse">
                <div className="h-6 w-40 rounded-full bg-surface" />
                <div className="h-12 w-full max-w-xl rounded-xl bg-surface" />
                <div className="h-16 w-full max-w-2xl rounded-xl bg-surface" />
                <div className="flex gap-3">
                  <div className="h-10 w-32 rounded-xl bg-surface" />
                  <div className="h-10 w-32 rounded-xl bg-surface" />
                </div>
              </div>
            ) : heroTitle ? (
            <div className="flex w-full max-w-3xl flex-col items-start gap-3 sm:gap-4 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs md:text-sm font-mono text-on-surface-variant bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-border-custom">
                <span className="text-primary font-bold uppercase">{heroMediaType}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
                <span>{heroYear}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-on-surface font-semibold">{heroRating}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-on-surface drop-shadow-lg leading-[1.05] line-clamp-3 sm:line-clamp-none">
                {heroName}
              </h1>

              <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl line-clamp-2 sm:line-clamp-3 md:line-clamp-4 leading-relaxed drop-shadow">
                {heroTitle.overview}
              </p>

              <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                <button
                  onClick={() => router.push(`/watch/${heroMediaType}/${heroTitle.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-90 py-2.5 px-5 sm:py-3 sm:px-6 text-xs md:text-sm font-semibold text-white shadow-lg active:scale-95 transition-all duration-300"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>{heroMediaType === "tv" ? "Play Show" : "Play Movie"}</span>
                </button>

                <button
                  onClick={() => router.push(`/title/${heroMediaType}/${heroTitle.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-surface/80 hover:bg-surface-hover border border-border-custom py-2.5 px-5 sm:py-3 sm:px-6 text-xs md:text-sm font-semibold text-on-surface hover:text-primary active:scale-95 transition-all duration-300"
                >
                  <Info className="h-4 w-4" />
                  <span>More Info</span>
                </button>

                <button
                  onClick={handleHeroWatchlistToggle}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300 ${
                    isHeroInWatchlist
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-surface/60 border-border-custom hover:border-primary text-on-surface"
                  }`}
                  title="Add/Remove Watchlist"
                >
                  {isHeroInWatchlist ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </button>
              </div>
            </div>
            ) : null}
          </div>
        )}

        {/* Soft fade into the rails section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-background to-transparent sm:h-24" />
      </section>

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
