"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { ANILIST_GENRES, getPopularAnime, type AniListMedia } from "@/lib/anilist";
import { isAdultFilterEnabled, syncAdultFilterState } from "@/lib/adult-content";
import { getGenreIcon } from "@/lib/genreIcons";
import { isGenreIdAllowedInKidsMode, filterAnimeForKidsMode, filterTmdbForKidsMode } from "@/lib/kids-mode";
import { visibleAnimeGenres } from "@/lib/anime-genre-visibility";
import { getGenres, getTrending, type TMDBGenre, type TMDBTitle } from "@/lib/tmdb";
import {
  buildDiscoverUrl,
  buildGenresUrl,
  normalizeCatalogType,
  type UnifiedCatalogType,
} from "@/lib/discover-url";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSessionStore } from "@/stores";

export default function GenresPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="min-h-[60svh] bg-background px-6 py-20 text-center text-on-surface-variant">
          Loading genres…
        </div>
      }
    >
      <GenresPageContent />
    </Suspense>
  );
}

function GenresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProfile } = useSessionStore();
  const isKidMode = Boolean(currentProfile?.kidMode);
  const defaultCatalog: UnifiedCatalogType =
    currentProfile?.catalogMode === "anime" ? "anime" : "movie";
  const urlTypeParam = searchParams.get("type");
  const resolvedType = normalizeCatalogType(urlTypeParam, defaultCatalog);

  const [type, setType] = useState<UnifiedCatalogType>(resolvedType);
  const [tmdbGenres, setTmdbGenres] = useState<TMDBGenre[]>([]);
  const [trending, setTrending] = useState<TMDBTitle[]>([]);
  const [anime, setAnime] = useState<AniListMedia[]>([]);
  const [policyReady, setPolicyReady] = useState(false);
  const [adultFiltering, setAdultFiltering] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useDocumentTitle("Genres");

  useEffect(() => {
    setType(normalizeCatalogType(urlTypeParam, defaultCatalog));
  }, [urlTypeParam, defaultCatalog, currentProfile?.id]);

  const handleSelectType = (nextType: UnifiedCatalogType) => {
    setType(nextType);
    router.replace(buildGenresUrl(nextType), { scroll: false });
  };

  useEffect(() => {
    let active = true;
    setPolicyReady(false);
    void syncAdultFilterState()
      .then(() => { if (active) setAdultFiltering(isAdultFilterEnabled()); })
      .catch(() => { if (active) setAdultFiltering(true); })
      .finally(() => { if (active) setPolicyReady(true); });
    return () => { active = false; };
  }, [currentProfile?.id]);

  useEffect(() => {
    if (!policyReady) return;
    let active = true;
    setLoading(true);
    setError(false);
    if (type === "anime") {
      void getPopularAnime(16)
        .then((result) => { if (active) setAnime(result.media); })
        .catch(() => { if (active) { setError(true); setAnime([]); } })
        .finally(() => { if (active) setLoading(false); });
    } else {
      void Promise.all([getGenres(type), getTrending(type, "week")])
        .then(([genres, titles]) => {
          if (!active) return;
          setTmdbGenres(genres);
          setTrending(titles);
        })
        .catch(() => { if (active) { setError(true); setTrending([]); setTmdbGenres([]); } })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [type, policyReady, adultFiltering, isKidMode, currentProfile?.id]);

  const genres = useMemo(() => {
    if (type === "anime") {
      return visibleAnimeGenres(ANILIST_GENRES, isKidMode, adultFiltering)
        .map((name) => ({ id: name, name, icon: Sparkles }));
    }
    return tmdbGenres
      .filter(({ id }) => !isKidMode || isGenreIdAllowedInKidsMode(id))
      .map(({ id, name }) => ({ id: String(id), name, icon: getGenreIcon(id) }));
  }, [type, tmdbGenres, isKidMode, adultFiltering]);

  const popularTitles = useMemo(() => filterTmdbForKidsMode(trending, isKidMode), [trending, isKidMode]);
  const popularAnime = useMemo(() => filterAnimeForKidsMode(anime, isKidMode), [anime, isKidMode]);
  const browseHref = buildDiscoverUrl({ type });
  const scheduleHref = buildDiscoverUrl({ type: "anime", view: "schedule" });

  return (
    <div className="zoku-cinematic-genres app-page-shell min-h-screen pb-12 text-on-surface">
      <Navbar />
      <main className="mx-auto w-full px-4 pt-8 pb-14 sm:px-6 lg:px-8" aria-labelledby="genres-page-title">
        <div className="zoku-genres-top mb-6 flex flex-wrap items-end justify-between gap-4">
          <header className="min-w-0">
            <h1 id="genres-page-title" className="font-display text-3xl font-bold tracking-tight">Genres</h1>
            <p className="mt-2 text-sm text-on-surface-variant">Find something worth watching. Every genre opens the unified Discover catalog with your content restrictions applied.</p>
          </header>

          <div className="zoku-genre-controls flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl border border-border-custom bg-surface p-1" role="group" aria-label="Catalog">
              {(["movie", "tv", "anime"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  data-tv-focusable="true"
                  aria-pressed={kind === type}
                  onClick={() => handleSelectType(kind)}
                  className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    kind === type
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-hover"
                  }`}
                >
                  {kind === "movie" ? "Movies" : kind === "tv" ? "TV Shows" : "Anime"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {type === "anime" && (
                <Link
                  href={scheduleHref}
                  data-tv-focusable="true"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <span>7-Day Airing Schedule</span>
                </Link>
              )}
              <Link
                href={browseHref}
                data-tv-focusable="true"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-custom px-3 py-2 text-sm font-semibold text-on-surface hover:border-primary hover:text-primary"
              >
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <section aria-label={`${type} genre categories`} className="mb-12">
          {!policyReady || loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Loading genres">
              {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />)}
            </div>
          ) : error ? (
            <div role="status" className="rounded-xl border border-border-custom bg-surface p-7 text-center text-on-surface-variant">Catalog temporarily unavailable. Try again shortly.</div>
          ) : genres.length ? (
            <div className="zoku-genre-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {genres.map((genre) => {
                const Icon = genre.icon;
                const url = buildDiscoverUrl({ type, genre: genre.id });
                return (
                  <Link
                    key={genre.id}
                    href={url}
                    data-tv-focusable="true"
                    className="zoku-genre-tile group relative flex min-h-[108px] flex-col justify-end overflow-hidden rounded-xl p-4 text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={`Browse ${genre.name} ${type === "anime" ? "anime" : type === "tv" ? "TV shows" : "movies"}`}
                  >
                    <Icon className="pointer-events-none absolute right-4 top-4 h-7 w-7 text-on-surface-variant opacity-35 transition-colors group-hover:text-primary group-hover:opacity-75" aria-hidden="true" />
                    <span className="relative z-10 text-base font-semibold tracking-tight">{genre.name}</span>
                    <span className="relative z-10 mt-1 text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                      {type === "anime" ? "Anime" : type === "tv" ? "TV Series" : "Movies"}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div role="status" className="rounded-xl border border-border-custom bg-surface p-7 text-center text-on-surface-variant">No available genres for this catalog.</div>
          )}
        </section>

        {!loading && !error && (
          <section aria-label="Trending titles" className="zoku-genres-showcase">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-on-surface">Trending titles</h2>
                <p className="mt-1 text-xs text-on-surface-variant">Explore recent popular releases under your content settings</p>
              </div>
              <Link href={browseHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary">
                Browse all <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {(type === "anime" ? popularAnime.length : popularTitles.length) > 0 ? (
              <div className="zoku-poster-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {type === "anime"
                  ? popularAnime.map((item) => <AnimeCard key={item.id} anime={item} fullWidth />)
                  : popularTitles.map((item) => <TitleCard key={item.id} title={item} mediaType={type} fullWidth />)}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No titles available under the current content restrictions.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
