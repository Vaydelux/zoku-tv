"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Play, Plus, Check, Star, Info } from "lucide-react";
import { TMDBTitle } from "@/lib/tmdb";
import { useWatchlistStore } from "@/stores";

const DEFAULT_INTERVAL = 6000;
const FALLBACK_BACKDROP =
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920";

interface HeroCarouselProps {
  slides: TMDBTitle[];
  loading?: boolean;
}

function getBackdropUrl(backdropPath: string | null | undefined) {
  return backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : FALLBACK_BACKDROP;
}

export function HeroCarousel({ slides, loading = false }: HeroCarouselProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideCount = slides.length;
  const current = slides[activeIndex] ?? null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsTabHidden(document.hidden);
    handler();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides]);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount === 0) return;
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused || reducedMotion || isTabHidden) return;

    const id = setInterval(goNext, DEFAULT_INTERVAL);
    return () => clearInterval(id);
  }, [slideCount, isPaused, reducedMotion, isTabHidden, activeIndex, goNext]);

  useEffect(() => {
    if (slideCount <= 1) return;
    const next = slides[(activeIndex + 1) % slideCount];
    if (next?.backdrop_path) {
      const img = new Image();
      img.src = getBackdropUrl(next.backdrop_path);
    }
  }, [activeIndex, slides, slideCount]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  const pauseBriefly = () => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 8000);
  };

  const handleDotClick = (index: number) => {
    goTo(index);
    pauseBriefly();
  };

  if (!loading && slideCount === 0) return null;

  const heroName = current?.title || current?.name || "Untitled Masterpiece";
  const heroMediaType = current?.media_type || "movie";
  const heroRating = current?.vote_average ? current.vote_average.toFixed(1) : "N/A";
  const heroYear = (current?.release_date || current?.first_air_date || "").split("-")[0];
  const isInWatchlist = current ? hasItem(heroMediaType, current.id) : false;

  const handleWatchlistToggle = () => {
    if (!current) return;
    if (isInWatchlist) {
      removeItem(heroMediaType, current.id);
    } else {
      addItem({
        media_type: heroMediaType,
        tmdbId: current.id,
        title: heroName,
        poster_path: current.poster_path,
        backdrop_path: current.backdrop_path,
        vote_average: current.vote_average,
      });
    }
  };

  const transitionDuration = reducedMotion ? 0 : 0.8;

  return (
    <section
      className="relative isolate w-full"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={pauseBriefly}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
        <AnimatePresence initial={false}>
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: transitionDuration, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${getBackdropUrl(current.backdrop_path)}')` }}
              aria-hidden
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-7xl min-h-[clamp(340px,52dvh,680px)] flex-col justify-end px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:px-8 lg:pb-14">
        {loading && !current ? (
          <div className="flex w-full max-w-3xl flex-col gap-4 animate-pulse">
            <div className="h-6 w-40 rounded-full bg-surface" />
            <div className="h-12 w-full max-w-xl rounded-xl bg-surface" />
            <div className="h-16 w-full max-w-2xl rounded-xl bg-surface" />
            <div className="flex gap-3">
              <div className="h-10 w-32 rounded-xl bg-surface" />
              <div className="h-10 w-32 rounded-xl bg-surface" />
            </div>
          </div>
        ) : current ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut" }}
              className="flex w-full max-w-3xl flex-col items-start gap-3 sm:gap-4"
            >
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

              <h1
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-on-surface drop-shadow-lg leading-[1.05] line-clamp-3 sm:line-clamp-none"
                aria-live="polite"
              >
                {heroName}
              </h1>

              <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl line-clamp-2 sm:line-clamp-3 md:line-clamp-4 leading-relaxed drop-shadow">
                {current.overview}
              </p>

              <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                <button
                  onClick={() => router.push(`/watch/${heroMediaType}/${current.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-90 py-2.5 px-5 sm:py-3 sm:px-6 text-xs md:text-sm font-semibold text-white shadow-lg active:scale-95 transition-all duration-300"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>{heroMediaType === "tv" ? "Play Show" : "Play Movie"}</span>
                </button>

                <button
                  onClick={() => router.push(`/title/${heroMediaType}/${current.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-surface/80 hover:bg-surface-hover border border-border-custom py-2.5 px-5 sm:py-3 sm:px-6 text-xs md:text-sm font-semibold text-on-surface hover:text-primary active:scale-95 transition-all duration-300"
                >
                  <Info className="h-4 w-4" />
                  <span>More Info</span>
                </button>

                <button
                  onClick={handleWatchlistToggle}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300 ${
                    isInWatchlist
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-surface/60 border-border-custom hover:border-primary text-on-surface"
                  }`}
                  title="Add/Remove Watchlist"
                  aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isInWatchlist ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {slideCount > 1 && (
        <div
          className="absolute bottom-4 right-4 z-[3] flex items-center gap-1.5 sm:bottom-8 sm:right-8 sm:gap-2"
          role="tablist"
          aria-label="Carousel slides"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Go to slide ${index + 1}: ${slide.title || slide.name}`}
              onClick={() => handleDotClick(index)}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "h-2 w-6 sm:w-8 bg-primary"
                  : "h-2 w-2 bg-on-surface/40 hover:bg-on-surface/70"
              }`}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-background to-transparent sm:h-24" />
    </section>
  );
}
