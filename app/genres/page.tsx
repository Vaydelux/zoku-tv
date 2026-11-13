"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TitleRail } from "@/components/TitleRail";
import { AnimeRail } from "@/components/anime/AnimeRail";
import { ANILIST_GENRES, getPopularAnime, type AniListMedia } from "@/lib/anilist";
import { isAdultFilterEnabled, syncAdultFilterState } from "@/lib/adult-content";
import { getGenreIcon } from "@/lib/genreIcons";
import { isAnimeGenreAllowedInKidsMode, isGenreIdAllowedInKidsMode, filterAnimeForKidsMode, filterTmdbForKidsMode } from "@/lib/kids-mode";
import { getGenres, getTrending, type TMDBGenre, type TMDBTitle } from "@/lib/tmdb";
import { useSessionStore } from "@/stores";

type CatalogType = "movie" | "tv" | "anime";

export default function GenresPage() {
  const { currentProfile } = useSessionStore();
  const isKidMode = Boolean(currentProfile?.kidMode);
  const defaultCatalog: CatalogType = currentProfile?.catalogMode === "anime" ? "anime" : "movie";
  const [type, setType] = useState<CatalogType>(defaultCatalog);
  const [tmdbGenres, setTmdbGenres] = useState<TMDBGenre[]>([]);
  const [trending, setTrending] = useState<TMDBTitle[]>([]);
  const [anime, setAnime] = useState<AniListMedia[]>([]);
  const [policyReady, setPolicyReady] = useState(false);
  const [adultFiltering, setAdultFiltering] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setType(defaultCatalog);
  }, [defaultCatalog, currentProfile?.id]);

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
      return ANILIST_GENRES.filter((name) =>
        (!isKidMode || isAnimeGenreAllowedInKidsMode(name)) &&
        (!adultFiltering || !["hentai", "ecchi"].includes(name.toLowerCase()))
      ).map((name) => ({ id: name, name, icon: Sparkles }));
    }
    return tmdbGenres
      .filter(({ id }) => !isKidMode || isGenreIdAllowedInKidsMode(id))
      .map(({ id, name }) => ({ id: String(id), name, icon: getGenreIcon(id) }));
  }, [type, tmdbGenres, isKidMode, adultFiltering]);

  const popularTitles = useMemo(() => filterTmdbForKidsMode(trending, isKidMode), [trending, isKidMode]);
  const popularAnime = useMemo(() => filterAnimeForKidsMode(anime, isKidMode), [anime, isKidMode]);
  const browseHref = type === "anime" ? "/discover?type=anime" : `/discover?type=${type}`;

  return (
    <div className="zoku-cinematic-genres app-page-shell min-h-screen pb-12 text-on-surface">
      <Navbar />
      <main className="mx-auto w-full px-4 pt-8 pb-14 sm:px-6 lg:px-8" aria-labelledby="genres-page-title">
        <header className="mb-6">
          <h1 id="genres-page-title" className="font-display text-3xl font-bold tracking-tight">Genres</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Find something worth watching. Every genre opens the real catalog with your content restrictions applied.</p>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border-custom bg-surface p-1" role="group" aria-label="Catalog">
            {(["movie", "tv", "anime"] as const).map((kind) => (
              <button key={kind} type="button" data-tv-focusable="true" aria-pressed={kind === type}
                onClick={() => setType(kind)}
                className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${kind === type ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-hover"}`}>
                {kind === "movie" ? "Movies" : kind === "tv" ? "TV Shows" : "Anime"}
              </button>
            ))}
          </div>
          <Link href={browseHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-custom px-3 py-2 text-sm font-semibold text-on-surface hover:border-primary hover:text-primary">
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
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
              {genres.map((genre, index) => {
                const Icon = genre.icon;
                const url = type === "anime"
                  ? `/discover?type=anime&genres=${encodeURIComponent(genre.id)}`
                  : `/discover?type=${type}&with_genres=${encodeURIComponent(genre.id)}`;
                return (
                  <Link key={genre.id} href={url} data-tv-focusable="true"
                    className="zoku-genre-tile group relative flex min-h-[116px] flex-col justify-end overflow-hidden rounded-xl border border-border-custom p-4 text-on-surface transition-transform focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
                    style={{ ["--genre-index" as string]: index % 6 } as React.CSSProperties}
                    aria-label={`Browse ${genre.name} ${type === "anime" ? "anime" : type === "tv" ? "TV shows" : "movies"}`}>
                    <Icon className="pointer-events-none absolute right-4 top-4 h-8 w-8 opacity-25 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span className="relative z-10 text-base font-bold">{genre.name}</span>
                    <span className="relative z-10 mt-1 inline-flex items-center gap-1 text-xs font-medium opacity-70">Explore <ArrowRight className="h-3 w-3" /></span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div role="status" className="rounded-xl border border-border-custom bg-surface p-7 text-center text-on-surface-variant">No available genres for this catalog.</div>
          )}
        </section>

        {!loading && !error && (
          <section aria-label="Popular titles">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Compass className="h-5 w-5 text-primary" /> Popular now</h2>
              <Link href={browseHref} className="inline-flex items-center gap-2 text-sm font-medium text-primary">See all titles <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {type === "anime"
              ? popularAnime.length > 0 && <AnimeRail title="Popular Anime" items={popularAnime} showSortDropdown={false} />
              : popularTitles.length > 0 && <TitleRail title={type === "tv" ? "Popular TV Shows" : "Popular Movies"} items={popularTitles} mediaType={type} showSortDropdown={false} />}
            {(type === "anime" ? popularAnime.length : popularTitles.length) === 0 && (
              <p className="text-sm text-on-surface-variant">No titles available under the current content restrictions.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
