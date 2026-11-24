"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Play, Plus, Star } from "lucide-react";
import type { AniListMedia } from "@/lib/anilist";
import { getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { useWatchlistStore } from "@/stores";

function plainDescription(html?: string | null): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function CinematicAnimeHero({
  slides,
  loading,
}: {
  slides: AniListMedia[];
  loading?: boolean;
}) {
  const router = useRouter();
  const { hasItem, addItem, removeItem } = useWatchlistStore();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const current = slides[Math.min(active, Math.max(slides.length - 1, 0))];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, 7500);
    return () => window.clearInterval(id);
  }, [slides.length, paused, reducedMotion]);

  if (loading && !current) {
    return (
      <div
        className="zoku-anime-hero animate-pulse bg-surface"
        aria-label="Loading featured anime"
      />
    );
  }
  if (!current) return null;

  const title = getAnimeDisplayTitle(current);
  const poster = getAnimePoster(current);
  const rating = current.averageScore ? (current.averageScore / 10).toFixed(1) : null;
  const year = current.seasonYear || current.startDate?.year;
  const saved = hasItem("anime", current.id);
  const synopsis = plainDescription(current.description);
  const hasEpisodes = typeof current.episodes === "number" && current.episodes > 0;

  const toggleSaved = () => {
    if (saved) {
      removeItem("anime", current.id);
      return;
    }
    addItem({
      media_type: "anime",
      anilistId: current.id,
      title,
      genres: current.genres || null,
      poster_path: poster,
      backdrop_path: current.bannerImage || null,
      vote_average: current.averageScore ? current.averageScore / 10 : undefined,
    });
  };

  return (
    <section
      className="zoku-anime-hero zoku-hero relative isolate w-full overflow-hidden bg-background"
      aria-label="Featured anime"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0B0B0F]" aria-hidden="true">
        {slides.map((slide, index) => {
          const url = slide.bannerImage || getAnimePoster(slide);
          const canRenderImg = Boolean(url && !failedImages[slide.id]);
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            >
              {canRenderImg ? (
                <img
                  src={url!}
                  alt=""
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [slide.id]: true }))
                  }
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#1A1A24_0%,#111118_48%,#0B0B0F_100%)]" />
              )}
            </div>
          );
        })}
        <div className="hero-media-scrim" aria-hidden="true" />
      </div>

      <div className="zoku-anime-hero-content zoku-hero-content relative z-[1] mx-auto flex w-full flex-col items-start justify-end">
        <div
          key={current.id}
          className="hero-copy flex w-full flex-col items-start gap-3 sm:gap-3.5 animate-[fade-in_0.35s_ease-out]"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-on-surface-variant">
            {rating && (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-on-surface tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                  {rating}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            {year && (
              <>
                <span className="tabular-nums">{year}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>Anime</span>
            {hasEpisodes && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{current.episodes} Episodes</span>
              </>
            )}
          </div>

          <h1 className="font-display font-bold tracking-tight text-on-surface line-clamp-2">
            {title}
          </h1>

          {synopsis && (
            <p className="hero-overview max-w-xl text-sm leading-relaxed text-on-surface/80 line-clamp-2 sm:line-clamp-3">
              {synopsis}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              data-tv-focusable="true"
              onClick={() =>
                router.push(
                  hasEpisodes ? `/watch/anime/${current.id}/1/1` : `/anime/${current.id}`
                )
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
              <span>{hasEpisodes ? "Play" : "Explore"}</span>
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => router.push(`/anime/${current.id}`)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-[#14141A]/90 px-5 py-2.5 text-sm font-semibold text-[#F5F5F7] transition-colors hover:bg-[#1C1C24] hover:border-white/25 active:scale-[0.98]"
            >
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>More Info</span>
            </button>

            <button
              type="button"
              data-tv-focusable="true"
              onClick={toggleSaved}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
              title={saved ? "In My List" : "Add to My List"}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors active:scale-[0.98] ${
                saved
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-white/15 bg-[#14141A]/90 text-[#F5F5F7] hover:bg-[#1C1C24] hover:border-white/25"
              }`}
            >
              {saved ? (
                <Check className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Plus className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div
          className="absolute bottom-3 left-[var(--cinematic-gutter)] z-[3] flex items-center gap-1"
          aria-label="Carousel slides"
          role="tablist"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show featured anime ${index + 1}: ${getAnimeDisplayTitle(slide)}`}
              onClick={() => {
                setActive(index);
                setPaused(true);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
