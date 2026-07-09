"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useSessionStore, useContinueWatchingStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TitleRail } from "@/components/TitleRail";
import { AnimeRail } from "@/components/anime/AnimeRail";
import { AnimeHeroBanner } from "@/components/anime/AnimeHeroBanner";
import { ContinueWatchingRail } from "@/components/ContinueWatchingRail";
import { LoadingBanner } from "@/components/LoadingBanner";
import { TMDBTitle, TMDBGenre } from "@/lib/tmdb";
import { loadHomeGenreRails, loadHomeTrending } from "@/lib/load-home-content";
import { loadAnimeHomeContent } from "@/lib/load-anime-home-content";
import type { AniListMedia } from "@/lib/anilist";
import { filterContinueWatchingByCatalog } from "@/lib/continue-watching";

export default function HomePage() {
  const { user, currentProfile } = useSessionStore();
  const continueWatchingItems = useContinueWatchingStore((state) => state.items);
  const catalogMode = currentProfile?.catalogMode ?? "tmdb";

  const [heroSlides, setHeroSlides] = useState<TMDBTitle[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBTitle[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBTitle[]>([]);
  const [genreRails, setGenreRails] = useState<{ genre: TMDBGenre; titles: TMDBTitle[] }[]>([]);

  const [animeHero, setAnimeHero] = useState<AniListMedia[]>([]);
  const [animeTrending, setAnimeTrending] = useState<AniListMedia[]>([]);
  const [animePopular, setAnimePopular] = useState<AniListMedia[]>([]);
  const [animeGenreRails, setAnimeGenreRails] = useState<{ genre: string; items: AniListMedia[] }[]>([]);

  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingGenreRails, setLoadingGenreRails] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading your home feed...");
  const [isOffline, setIsOffline] = useState(false);

  const filteredCw = filterContinueWatchingByCatalog(continueWatchingItems, catalogMode);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (!user || !currentProfile) return;

    let cancelled = false;

    async function loadTmdbHome() {
      setLoadingTrending(true);
      setLoadingGenreRails(true);
      setLoadingMessage("Loading trending titles...");
      try {
        if (typeof window !== "undefined" && !navigator.onLine) throw new Error("Offline");
        const trending = await loadHomeTrending();
        if (cancelled) return;
        setHeroSlides(trending.heroSlides);
        setTrendingMovies(trending.trendingMovies);
        setTrendingTV(trending.trendingTV);
      } catch (err) {
        console.error("Failed to load TMDB home:", err);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }

      setLoadingMessage("Loading genre rails...");
      try {
        const prefGenreIds = currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18];
        const rails = await loadHomeGenreRails(prefGenreIds);
        if (!cancelled) setGenreRails(rails);
      } catch (err) {
        console.error("Failed to load genre rails:", err);
      } finally {
        if (!cancelled) {
          setLoadingGenreRails(false);
          setLoadingMessage("");
        }
      }
    }

    async function loadAnimeHome() {
      setLoadingTrending(true);
      setLoadingGenreRails(true);
      setLoadingMessage("Loading anime catalog...");
      try {
        if (typeof window !== "undefined" && !navigator.onLine) throw new Error("Offline");
        const content = await loadAnimeHomeContent();
        if (cancelled) return;
        setAnimeHero(content.heroSlides);
        setAnimeTrending(content.trending);
        setAnimePopular(content.popular);
        setAnimeGenreRails(content.genreRails);
      } catch (err) {
        console.error("Failed to load anime home:", err);
      } finally {
        if (!cancelled) {
          setLoadingTrending(false);
          setLoadingGenreRails(false);
          setLoadingMessage("");
        }
      }
    }

    if (catalogMode === "anime") {
      loadAnimeHome();
    } else {
      loadTmdbHome();
    }

    return () => {
      cancelled = true;
    };
  }, [user, currentProfile, catalogMode]);

  const loadingMedia = loadingTrending || loadingGenreRails;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      {loadingMedia && loadingMessage && <LoadingBanner message={loadingMessage} />}
      <Navbar />

      {catalogMode === "anime" ? (
        <AnimeHeroBanner slides={animeHero} loading={loadingTrending} />
      ) : (
        <HeroCarousel slides={heroSlides} loading={loadingTrending} />
      )}

      <section className="relative z-10 bg-background pt-1 sm:pt-2 space-y-1 md:space-y-2 pb-16">
        {isOffline && filteredCw.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-primary/20 bg-surface/95 backdrop-blur-md p-5 space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Offline Mode</h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl leading-relaxed">
                Catalog discovery is unavailable offline. You can still resume from Continue Watching below.
              </p>
            </div>
          </div>
        )}

        {filteredCw.length > 0 && <ContinueWatchingRail items={filteredCw} />}

        {loadingTrending ? (
          <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {[1, 2].map((railIdx) => (
              <div key={railIdx} className="space-y-4">
                <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                <div className="flex gap-3 sm:gap-4 overflow-x-auto py-2">
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
        ) : catalogMode === "anime" ? (
          <div className="space-y-2">
            <AnimeRail title="Trending Anime" items={animeTrending} />
            <AnimeRail title="Popular Anime" items={animePopular} />
            {animeGenreRails.map(({ genre, items }) => (
              <AnimeRail key={genre} title={`${genre} Anime`} items={items} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <TitleRail title="Trending Movies" items={trendingMovies} mediaType="movie" />
            <TitleRail title="Trending TV Shows" items={trendingTV} mediaType="tv" />
            {loadingGenreRails ? (
              <div className="h-32 bg-surface animate-pulse mx-4 rounded-xl" />
            ) : (
              genreRails.map(({ genre, titles }) => (
                <TitleRail key={genre.id} title={`${genre.name} Masterpieces`} items={titles} genreId={genre.id} />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
