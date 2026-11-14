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

/** Shared visual contract with the TMDB featured hero. Keeps AniList's real
 * IDs and Zoku's server-controlled content filtering completely unchanged.
 */
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
    }, 7000);
    return () => window.clearInterval(id);
  }, [slides.length, paused, reducedMotion]);

  if (loading && !current) {
    return <div className="zoku-anime-hero min-h-[70svh] animate-pulse bg-surface" aria-label="Loading featured anime" />;
  }
  if (!current) return null;

  const title = getAnimeDisplayTitle(current);
  const poster = getAnimePoster(current);
  const backdrop = current.bannerImage || poster;
  const rating = current.averageScore ? (current.averageScore / 10).toFixed(1) : "N/A";
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
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${index === active ? "opacity-100" : "opacity-0"}`}
            style={{
              backgroundImage: slide.bannerImage || getAnimePoster(slide)
                ? `url("${slide.bannerImage || getAnimePoster(slide)}")`
                : undefined,
            }}
          />
        ))}
        <div className="hero-media-scrim absolute inset-0" />
      </div>

      <div className="zoku-anime-hero-content zoku-hero-content relative z-[1] mx-auto flex w-full flex-col justify-end px-4 pb-12 pt-14 sm:px-6 lg:px-8">
        <div className="hero-copy flex w-full max-w-[590px] flex-col items-start gap-3">
          <div className="hero-meta-chip flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 font-semibold text-primary">Featured</span>
            <span className="rounded-full border border-border-custom bg-surface/60 px-2.5 py-0.5 font-semibold text-on-surface">Anime</span>
          </div>
          <h1 className="line-clamp-2 font-display text-3xl font-bold leading-[1.06] tracking-tight text-on-surface sm:text-5xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            {rating !== "N/A" && (
              <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                <Star className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
                {rating}
              </span>
            )}
            {year && <><span aria-hidden="true">·</span><span>{year}</span></>}
            {hasEpisodes && <><span aria-hidden="true">·</span><span>{current.episodes} episodes</span></>}
          </div>
          {synopsis && <p className="hero-overview line-clamp-3 max-w-xl text-sm leading-relaxed text-on-surface-variant">{synopsis}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(hasEpisodes ? `/watch/anime/${current.id}/1/1` : `/anime/${current.id}`)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              {hasEpisodes ? "Play" : "Explore"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/anime/${current.id}`)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-custom bg-surface px-5 py-2.5 text-sm font-semibold text-on-surface"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              More info
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-custom bg-surface text-on-surface"
            >
              {saved ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-7 left-4 z-[3] flex items-center gap-2 sm:left-8" aria-label="Carousel slides" role="tablist">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show featured anime ${index + 1}: ${getAnimeDisplayTitle(slide)}`}
              onClick={() => { setActive(index); setPaused(true); }}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${index === active ? "w-7 bg-primary" : "w-3.5 bg-on-surface/40 hover:bg-on-surface/70"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
