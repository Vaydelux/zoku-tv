"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, Info } from "lucide-react";
import { TMDBTitle } from "@/lib/tmdb";
import { useWatchlistStore } from "@/stores";

const DEFAULT_INTERVAL = 7500;

interface HeroCarouselProps {
  slides: TMDBTitle[];
  loading?: boolean;
}

function getBackdropUrl(backdropPath: string | null | undefined): string | null {
  if (!backdropPath) return null;
  return backdropPath.startsWith("http")
    ? backdropPath
    : `https://image.tmdb.org/t/p/original${backdropPath}`;
}

export function HeroCarousel({ slides, loading = false }: HeroCarouselProps) {
  const router = useRouter();
  const { addItem, removeItem, hasItem } = useWatchlistStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
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
    const url = getBackdropUrl(next?.backdrop_path || next?.poster_path);
    if (url) {
      const img = new Image();
      img.src = url;
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
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 9000);
  };

  const handleDotClick = (index: number) => {
    goTo(index);
    pauseBriefly();
  };

  if (!loading && slideCount === 0) return null;

  const heroName = current?.title || current?.name || "";
  const heroMediaType = current?.media_type === "tv" ? "tv" : "movie";
  const heroRating =
    current?.vote_average && current.vote_average > 0
      ? current.vote_average.toFixed(1)
      : null;
  const heroYear = (current?.release_date || current?.first_air_date || "").slice(0, 4);
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
        genres: current.genres?.map((g) => g.name) || null,
        poster_path: current.poster_path,
        backdrop_path: current.backdrop_path,
        vote_average: current.vote_average,
      });
    }
  };

  return (
    <section
      className="zoku-hero relative isolate w-full overflow-hidden bg-background"
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
      {/* Full-bleed artwork canvas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0B0B0F]" aria-hidden="true">
        {slides.map((slide, idx) => {
          const url = getBackdropUrl(slide.backdrop_path || slide.poster_path);
          const isCurrent = idx === activeIndex;
          const canRenderImg = Boolean(url && !failedImages[slide.id]);

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isCurrent ? "opacity-100" : "opacity-0"
              }`}
            >
              {canRenderImg ? (
                <img
                  src={url!}
                  alt=""
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [slide.id]: true }))
                  }
                  className="h-full w-full object-cover object-[center_20%] sm:object-center"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#1A1A24_0%,#111118_48%,#0B0B0F_100%)]" />
              )}
            </div>
          );
        })}

        {/* Bottom + left directional cinema scrims */}
        <div className="hero-media-scrim" aria-hidden="true" />
      </div>

      {/* Editorial Billboard Foreground */}
      <div className="zoku-hero-content relative z-[1] mx-auto flex w-full flex-col justify-end">
        {loading && !current ? (
          <div className="flex w-full max-w-xl flex-col gap-4 animate-pulse">
            <div className="h-3.5 w-32 rounded bg-surface" />
            <div className="h-12 w-full max-w-md rounded-lg bg-surface" />
            <div className="h-14 w-full max-w-lg rounded-lg bg-surface" />
            <div className="flex gap-3 pt-1">
              <div className="h-11 w-28 rounded-lg bg-surface" />
              <div className="h-11 w-32 rounded-lg bg-surface" />
            </div>
          </div>
        ) : current ? (
          <div
            key={current.id}
            className="hero-copy flex w-full flex-col items-start gap-3 sm:gap-3.5 animate-[fade-in_0.35s_ease-out]"
          >
            {/* Quiet single-line metadata row — zero badge pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-on-surface-variant">
              {heroRating && (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-on-surface tabular-nums">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                    {heroRating}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {heroYear && (
                <>
                  <span className="tabular-nums">{heroYear}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{heroMediaType === "tv" ? "Series" : "Film"}</span>
            </div>

            <h1
              className="font-display font-bold tracking-tight text-on-surface line-clamp-2"
              aria-live="polite"
            >
              {heroName}
            </h1>

            {current.overview && (
              <p className="hero-overview max-w-xl text-sm leading-relaxed text-on-surface/80 line-clamp-2 sm:line-clamp-3">
                {current.overview}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                data-tv-focusable="true"
                onClick={() => router.push(`/watch/${heroMediaType}/${current.id}`)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                <span>Play</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                onClick={() => router.push(`/title/${heroMediaType}/${current.id}`)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-[#14141A]/90 px-5 py-2.5 text-sm font-semibold text-[#F5F5F7] transition-colors hover:bg-[#1C1C24] hover:border-white/25 active:scale-[0.98]"
              >
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>More Info</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                onClick={handleWatchlistToggle}
                aria-pressed={isInWatchlist}
                aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                title={isInWatchlist ? "In My List" : "Add to My List"}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors active:scale-[0.98] ${
                  isInWatchlist
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/15 bg-[#14141A]/90 text-[#F5F5F7] hover:bg-[#1C1C24] hover:border-white/25"
                }`}
              >
                {isInWatchlist ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Plus className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Minimalist slide progress bars */}
      {slideCount > 1 && (
        <div
          className="absolute bottom-3 left-[var(--cinematic-gutter)] z-[3] flex items-center gap-1"
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
            />
          ))}
        </div>
      )}
    </section>
  );
}
