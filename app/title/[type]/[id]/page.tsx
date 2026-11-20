"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Check,
  Star,
  ArrowLeft,
  Clock,
  Monitor,
  Users,
  Film,
  Layers,
  Shield,
} from "lucide-react";
import { useSessionStore, useWatchlistStore, useEpisodeProgressStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleRail } from "@/components/TitleRail";
import { CustomSelect } from "@/components/CustomSelect";
import { EpisodeThumbnailWithProgress } from "@/components/EpisodeThumbnailWithProgress";
import { CollectionPickerButton } from "@/components/watchlist/CollectionPickerButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const TrailerTheaterModal = dynamic(
  () => import("@/components/TrailerTheaterModal").then((m) => m.TrailerTheaterModal),
  { ssr: false }
);
import {
  getFullTitleDetails,
  getCollectionDetails,
  getSeasonDetails,
  type TMDBTitle,
  type TMDBCredit,
  type TMDBVideo,
  type TMDBSeasonDetail,
  type TMDBCollection,
} from "@/lib/tmdb";
import {
  classifyTmdbTitle,
  filterTmdbForKidsMode,
} from "@/lib/kids-mode";
import {
  resolveAnimeBridgeForTmdb,
  type CatalogBridgeMatch,
} from "@/lib/catalog-bridge";
import { CatalogBridgeBanner } from "@/components/CatalogBridgeBanner";

interface TitlePageProps {
  params: Promise<{ type: string; id: string }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TitleDetailPage({ params }: TitlePageProps) {
  const router = useRouter();
  const { type, id } = use(params);
  const mediaType = type as "movie" | "tv";
  const titleId = Number(id);

  const { currentProfile } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const getProgress = useEpisodeProgressStore((state) => state.getProgress);
  const isKidMode = Boolean(currentProfile?.kidMode);

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [cast, setCast] = useState<TMDBCredit[]>([]);
  const [trailers, setTrailers] = useState<TMDBVideo[]>([]);
  const [relatedTitles, setRelatedTitles] = useState<TMDBTitle[]>([]);
  const [collection, setCollection] = useState<TMDBCollection | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetail, setSeasonDetail] = useState<TMDBSeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligibilityError, setEligibilityError] = useState(false);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);
  const [trailerInitialIndex, setTrailerInitialIndex] = useState(0);
  const [bridgeMatch, setBridgeMatch] = useState<CatalogBridgeMatch | null>(null);

  useDocumentTitle(details ? details.title || details.name || "Title" : "Title Details");

  useEffect(() => {
    if (!currentProfile || !titleId) return;

    let cancelled = false;

    async function loadTitleData() {
      setLoading(true);
      setEligibilityError(false);
      setDetails(null);
      setCollection(null);
      setBridgeMatch(null);
      try {
        const bundle = await getFullTitleDetails(mediaType, titleId);
        if (cancelled) return;

        setDetails(bundle.details);
        setCast(bundle.cast.slice(0, 12));
        setTrailers(bundle.videos);

        resolveAnimeBridgeForTmdb(bundle.details as any, mediaType, isKidMode)
          .then((matched) => {
            if (!cancelled) setBridgeMatch(matched);
          })
          .catch(() => {
            // Optional cross-catalog enrichment
          });

        // Merge recommendations first, then similar, deduplicated
        const mergedMap = new Map<number, TMDBTitle>();
        for (const item of [...bundle.recommendations, ...bundle.similar]) {
          if (item.id !== titleId && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        }
        setRelatedTitles(filterTmdbForKidsMode([...mergedMap.values()], isKidMode));

        if (mediaType === "tv" && bundle.details.seasons && bundle.details.seasons.length > 0) {
          const regularSeason = bundle.details.seasons.find((s) => s.season_number > 0);
          const firstSeasonNum = regularSeason?.season_number ?? bundle.details.seasons[0].season_number;
          setSelectedSeason(firstSeasonNum);
        }

        if (mediaType === "movie" && bundle.details.belongs_to_collection?.id) {
          getCollectionDetails(bundle.details.belongs_to_collection.id)
            .then((col) => {
              if (!cancelled && col.parts.length > 1) {
                setCollection({
                  ...col,
                  parts: filterTmdbForKidsMode(col.parts, isKidMode),
                });
              }
            })
            .catch(() => {
              // Collection is an optional enrichment
            });
        }
      } catch (err) {
        console.error("Failed to load title details:", err);
        if (!cancelled) setEligibilityError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTitleData();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, mediaType, titleId, isKidMode]);

  useEffect(() => {
    if (mediaType !== "tv" || !titleId) return;

    let cancelled = false;

    async function loadSeasonData() {
      setLoadingSeason(true);
      try {
        const data = await getSeasonDetails(titleId, selectedSeason);
        if (!cancelled) setSeasonDetail(data);
      } catch (err) {
        console.error("Failed to load season details:", err);
      } finally {
        if (!cancelled) setLoadingSeason(false);
      }
    }

    loadSeasonData();

    return () => {
      cancelled = true;
    };
  }, [mediaType, titleId, selectedSeason]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-on-surface gap-4">
        <p className="font-semibold">
          {eligibilityError
            ? "This title is unavailable or restricted by the content filter."
            : "Title unavailable."}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold text-primary-contrast"
        >
          Return to Deck
        </button>
      </div>
    );
  }

  const classification = classifyTmdbTitle(details);

  // Enforce Kids Mode restriction gate on detail page
  if (isKidMode && !classification.kidsSafe) {
    return (
      <div className="app-page-shell text-on-surface pb-16">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-20">
          <div
            data-testid="kids-mode-restricted-gate"
            className="glass-panel rounded-3xl border border-amber-500/30 p-8 text-center space-y-5 shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <Shield className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {classification.label}
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-on-surface">
                Restricted in Kids Experience
              </h1>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                “{details.title || details.name}” is hidden while Kids Mode is active on this profile (
                {classification.reason}).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-contrast shadow-md hover:brightness-110 transition-all"
              >
                Back to Kids Home
              </button>
              <button
                type="button"
                onClick={() => router.push("/discover")}
                className="theme-panel rounded-xl px-5 py-2.5 text-xs font-semibold text-on-surface hover:border-primary transition-all"
              >
                Explore Family Titles
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = details.title || details.name || "Untitled Masterpiece";
  const backdropUrl = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : null;
  const posterUrl = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : null;

  const rating = details.vote_average ? details.vote_average.toFixed(1) : "N/A";
  const releaseYear = (details.release_date || details.first_air_date || "").split("-")[0];
  const isInWatchlist = hasItem(mediaType, details.id);

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeItem(mediaType, details.id);
    } else {
      const creatorName =
        (details as any).created_by?.[0]?.name ||
        (details as any).director ||
        null;
      const genresList = details.genres?.map((g) => g.name) || null;
      addItem({
        media_type: mediaType,
        tmdbId: details.id,
        title: name,
        creator: creatorName,
        genres: genresList,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        vote_average: details.vote_average,
        release_date: details.release_date || details.first_air_date || null,
      });
    }
  };

  const handlePlayClick = () => {
    if (mediaType === "movie") {
      router.push(`/watch/movie/${details.id}`);
    } else {
      const sNum = seasonDetail?.episodes[0]?.season_number || selectedSeason || 1;
      const eNum = seasonDetail?.episodes[0]?.episode_number || 1;
      router.push(`/watch/tv/${details.id}/${sNum}/${eNum}`);
    }
  };

  const openTrailerAt = (idx: number) => {
    setTrailerInitialIndex(idx);
    setTrailerModalOpen(true);
  };

  return (
    <div className="zoku-cinematic-detail app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      {/* 1. Immersive Spotlight Backdrop */}
      <div className="zoku-detail-backdrop relative w-full h-[46dvh] md:h-[60dvh] lg:h-[66dvh] overflow-hidden bg-background">
        {backdropUrl ? (
          <div
            aria-hidden="true"
            className="zoku-detail-backdrop-media pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${backdropUrl}')` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/25 to-transparent" />

        <button
          onClick={() => router.back()}
          aria-label="Go back"
          data-tv-focusable="true"
          className="absolute top-6 left-4 sm:left-6 lg:left-8 z-20 p-2.5 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-border-custom hover:text-primary transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Core Profile Grid */}
      <div className="zoku-detail-body relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 md:-mt-40 lg:-mt-48 space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-44 sm:w-60 aspect-[2/3] rounded-2xl overflow-hidden border border-border-custom bg-surface shadow-2xl shrink-0 mx-auto md:mx-0">
            {posterUrl ? (
              <img src={posterUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/20 via-surface to-background p-4 text-center">
                <Film className="h-10 w-10 text-primary/70" />
                <span className="font-display text-xs font-semibold text-on-surface-variant line-clamp-3">
                  {name}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-5 text-center md:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs font-mono text-on-surface-variant tabular-nums">
              <span className="text-primary font-bold uppercase tracking-wider">{mediaType}</span>
              <span>·</span>
              <span
                data-testid="title-maturity-badge"
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  classification.kidsSafe
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {classification.code}
              </span>
              {releaseYear && (
                <>
                  <span>·</span>
                  <span>{releaseYear}</span>
                </>
              )}
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-on-surface font-semibold">{rating}</span>
              </span>
              {details.runtime ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{details.runtime} min</span>
                  </span>
                </>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-tight">
                {name}
              </h1>
              {details.tagline && (
                <p className="text-xs sm:text-sm italic text-on-surface-variant">
                  “{details.tagline}”
                </p>
              )}
            </div>

            {details.genres && details.genres.length > 0 && (
              <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                {details.genres.map((g) => g.name).join(" · ")}
              </p>
            )}

            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-3xl">
              {details.overview}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={handlePlayClick}
                data-tv-focusable="true"
                className="flex items-center gap-2 rounded-xl bg-primary hover:brightness-110 py-3.5 px-7 text-xs sm:text-sm font-semibold text-primary-contrast shadow-lg active:scale-95 transition-all duration-200"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{mediaType === "movie" ? "Play Movie" : "Start Watching"}</span>
              </button>

              {trailers.length > 0 && (
                <button
                  type="button"
                  onClick={() => openTrailerAt(0)}
                  data-testid="watch-trailer-btn"
                  data-tv-focusable="true"
                  className="theme-panel flex items-center gap-2 rounded-xl py-3.5 px-6 text-xs sm:text-sm font-semibold text-on-surface hover:border-primary hover:text-primary transition-all duration-200"
                >
                  <Film className="h-4 w-4 text-primary" />
                  <span>Watch Trailer</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleWatchlistToggle}
                data-tv-focusable="true"
                className={`flex items-center gap-2 rounded-xl border py-3.5 px-6 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isInWatchlist
                    ? "bg-primary/15 border-primary text-primary"
                    : "theme-panel hover:bg-surface-hover text-on-surface hover:text-primary"
                }`}
              >
                {isInWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{isInWatchlist ? "In Watchlist" : "Add Watchlist"}</span>
              </button>

              <CollectionPickerButton mediaType={mediaType} id={details.id} />
            </div>

            {bridgeMatch && (
              <div className="pt-2">
                <CatalogBridgeBanner match={bridgeMatch} />
              </div>
            )}
          </div>
        </div>

        {/* 3. TV Season and Episode Selector Panel */}
        {mediaType === "tv" && details.seasons && details.seasons.length > 0 && (
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Episodes & Seasons</span>
              </span>

              <div className="w-full sm:w-64">
                <CustomSelect
                  ariaLabel="Select season"
                  value={selectedSeason}
                  onChange={(val) => setSelectedSeason(Number(val))}
                  align="right"
                  options={details.seasons.map((s) => ({
                    value: s.season_number,
                    label: s.name,
                    badge: `${s.episode_count} EP`,
                  }))}
                  testId="title-season-select"
                />
              </div>
            </div>

            {loadingSeason ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : seasonDetail && seasonDetail.episodes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seasonDetail.episodes.map((ep) => {
                  const epStill = ep.still_path
                    ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                    : null;
                  const epRecord = getProgress("tv", details.id, selectedSeason, ep.episode_number);
                  const epProgress = epRecord?.progress_percent ?? 0;
                  const epCompleted = Boolean(epRecord?.completed);

                  return (
                    <button
                      type="button"
                      key={ep.id}
                      data-tv-focusable="true"
                      onClick={() =>
                        router.push(`/watch/tv/${details.id}/${selectedSeason}/${ep.episode_number}`)
                      }
                      className="group flex w-full text-left gap-4 p-3 rounded-xl border border-border-custom hover:border-primary bg-background/40 hover:bg-surface/50 cursor-pointer transition-all duration-200"
                    >
                      <div className="w-28 sm:w-36 shrink-0">
                        <EpisodeThumbnailWithProgress
                          thumbnail={epStill}
                          title={ep.name}
                          episodeNumber={ep.episode_number}
                          progressPercent={epProgress}
                          completed={epCompleted}
                          aspectRatio="wide"
                        />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-on-surface-variant tabular-nums">
                          <span>Episode {ep.episode_number}</span>
                          {ep.vote_average > 0 && (
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Star className="h-2.5 w-2.5 fill-yellow-500" />
                              <span>{ep.vote_average.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-snug">
                          {ep.overview || "No episode summary available."}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-on-surface-variant py-8">
                No episodes found for this season.
              </p>
            )}
          </div>
        )}

        {/* 4. Franchise Collection Rail (Movies belonging to a collection) */}
        {collection && collection.parts.length > 1 && (
          <section className="space-y-4" data-testid="franchise-collection-section">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-on-surface flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Part of the {collection.name}</span>
                </h2>
                {collection.overview && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 max-w-3xl">
                    {collection.overview}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant tabular-nums shrink-0">
                {collection.parts.length} Films · Chronological
              </span>
            </div>

            <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-3">
              {collection.parts.map((part, idx) => {
                const isCurrent = part.id === details.id;
                const partYear = (part.release_date || "").split("-")[0];
                const partPoster = part.poster_path
                  ? `https://image.tmdb.org/t/p/w342${part.poster_path}`
                  : null;
                return (
                  <Link
                    key={part.id}
                    href={`/title/movie/${part.id}`}
                    data-tv-focusable="true"
                    className={`group shrink-0 w-36 sm:w-44 rounded-xl border overflow-hidden transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                        : "border-border-custom bg-surface/50 hover:border-primary"
                    }`}
                  >
                    <div className="relative aspect-[2/3] w-full bg-background overflow-hidden">
                      {partPoster ? (
                        <img
                          src={partPoster}
                          alt={part.title || part.name || "Collection entry"}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                          <Film className="h-7 w-7 opacity-50" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums">
                        #{idx + 1}
                      </span>
                      {isCurrent && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-contrast">
                          Viewing
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {part.title || part.name}
                      </p>
                      <p className="text-[10px] font-mono text-on-surface-variant tabular-nums">
                        {partYear || "TBA"}
                        {part.vote_average ? ` · ★ ${part.vote_average.toFixed(1)}` : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Clickable Cast List -> /person/[id] */}
        {cast.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Cast & Performers</span>
              </h2>
              <span className="text-[11px] font-mono text-on-surface-variant">
                Select a performer for filmography
              </span>
            </div>

            <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-3">
              {cast.map((actor) => {
                const profileUrl = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : null;
                return (
                  <Link
                    key={actor.id}
                    href={`/person/${actor.id}`}
                    data-tv-focusable="true"
                    className="group flex flex-col items-center gap-2 text-center shrink-0 w-24 sm:w-28 rounded-xl p-2 hover:bg-surface/60 transition-colors"
                  >
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border border-border-custom group-hover:border-primary bg-surface transition-colors flex items-center justify-center shrink-0">
                      {profileUrl ? (
                        <img
                          src={profileUrl}
                          alt={actor.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-sm font-bold text-primary">
                          {getInitials(actor.name)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0 w-full">
                      <p className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                        {actor.name}
                      </p>
                      <p className="text-[10px] text-on-surface-variant truncate">
                        {actor.character || "Cast"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Lazy Trailer & Clips Preview Strip (Opens TrailerTheaterModal on click) */}
        {trailers.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-on-surface flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              <span>Trailers & Official Clips</span>
            </h2>

            <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-2">
              {trailers.slice(0, 6).map((video, idx) => (
                <button
                  key={video.id || video.key}
                  type="button"
                  onClick={() => openTrailerAt(idx)}
                  data-tv-focusable="true"
                  className="group relative shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden border border-border-custom hover:border-primary bg-surface text-left transition-colors"
                >
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={`https://i.ytimg.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`}
                      alt={video.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </span>
                    </div>
                    <span className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                      {video.type}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                      {video.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 7. Recommendations / Similar section */}
        {relatedTitles.length > 0 && (
          <TitleRail title="Recommended Titles" items={relatedTitles} mediaType={mediaType} />
        )}
      </div>

      {/* Lazy Trailer Theater Modal */}
      <TrailerTheaterModal
        open={trailerModalOpen}
        onClose={() => setTrailerModalOpen(false)}
        title={name}
        clips={trailers.map((v) => ({ id: v.id, key: v.key, name: v.name, type: v.type }))}
        initialIndex={trailerInitialIndex}
      />
    </div>
  );
}
