"use client";

import { useEffect, useState, use } from "react";
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
  Sparkles,
  Shield,
} from "lucide-react";
import { useSessionStore, useWatchlistStore, useEpisodeProgressStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleRail } from "@/components/TitleRail";
import { CustomSelect } from "@/components/CustomSelect";
import { EpisodeThumbnailWithProgress } from "@/components/EpisodeThumbnailWithProgress";
import {
  getTitleDetails,
  getCredits,
  getVideos,
  getSimilar,
  getSeasonDetails,
  TMDBTitle,
  TMDBCredit,
  TMDBVideo,
  TMDBSeasonDetail,
} from "@/lib/tmdb";
import {
  classifyTmdbTitle,
  filterTmdbForKidsMode,
} from "@/lib/kids-mode";

interface TitlePageProps {
  params: Promise<{ type: string; id: string }>;
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
  const [similar, setSimilar] = useState<TMDBTitle[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetail, setSeasonDetail] = useState<TMDBSeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(false);

  useEffect(() => {
    if (!currentProfile || !titleId) return;

    let cancelled = false;

    async function loadTitleData() {
      setLoading(true);
      try {
        const [titleDetails, castList, videoList, similarList] = await Promise.all([
          getTitleDetails(mediaType, titleId),
          getCredits(mediaType, titleId),
          getVideos(mediaType, titleId),
          getSimilar(mediaType, titleId),
        ]);

        if (cancelled) return;

        setDetails(titleDetails);
        setCast(castList.slice(0, 10));
        setTrailers(videoList);
        setSimilar(filterTmdbForKidsMode(similarList, isKidMode));

        if (mediaType === "tv" && titleDetails.seasons && titleDetails.seasons.length > 0) {
          const firstSeasonNum = titleDetails.seasons[0].season_number;
          setSelectedSeason(firstSeasonNum);
        }
      } catch (err) {
        console.error("Failed to load title details:", err);
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
        <p className="font-semibold">Failed to find requested archive title.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold"
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
                “{details.title || details.name}” is hidden while Kids Mode is active on this profile ({classification.reason}).
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
    : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920";
  const posterUrl = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";

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
      const sNum = seasonDetail?.episodes[0]?.season_number || 1;
      const eNum = seasonDetail?.episodes[0]?.episode_number || 1;
      router.push(`/watch/tv/${details.id}/${sNum}/${eNum}`);
    }
  };

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      {/* 1. Immersive Spotlight Backdrop */}
      <div className="relative w-full h-[50dvh] md:h-[65dvh] lg:h-[70dvh] overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backdropUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />

        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute top-6 left-4 sm:left-6 lg:left-8 z-20 p-2.5 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-border-custom hover:text-primary transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Core Profile Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 md:-mt-40 lg:-mt-48 space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-48 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-border-custom shadow-2xl shrink-0 mx-auto md:mx-0">
            <img src={posterUrl} alt={name} className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono text-on-surface-variant">
              <span className="text-primary font-bold uppercase">{mediaType}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
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
                  <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
                  <span>{releaseYear}</span>
                </>
              )}
              <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-on-surface font-semibold">{rating}</span>
              </span>
              {details.runtime && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{details.runtime} min</span>
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-tight">
              {name}
            </h1>

            {details.genres && details.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="theme-panel rounded-lg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-3xl">
              {details.overview}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <button
                onClick={handlePlayClick}
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-90 py-3.5 px-8 text-xs sm:text-sm font-semibold text-primary-contrast shadow-lg active:scale-95 transition-all duration-300"
              >
                <Play className="h-4.5 w-4.5 fill-current" />
                <span>{mediaType === "movie" ? "Play Movie" : "Start Watching"}</span>
              </button>

              <button
                onClick={handleWatchlistToggle}
                className={`flex items-center gap-2 rounded-xl border py-3.5 px-6 text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  isInWatchlist
                    ? "bg-primary/15 border-primary text-primary"
                    : "theme-panel hover:bg-surface-hover text-on-surface hover:text-primary"
                }`}
              >
                {isInWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{isInWatchlist ? "In Watchlist" : "Add Watchlist"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. TV Season and Episode Selector Panel */}
        {mediaType === "tv" && details.seasons && details.seasons.length > 0 && (
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Episodes & Portal Seasons</span>
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
                    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300";
                  const epRecord = getProgress("tv", details.id, selectedSeason, ep.episode_number);
                  const epProgress = epRecord?.progress_percent ?? 0;
                  const epCompleted = Boolean(epRecord?.completed);

                  return (
                    <button
                      type="button"
                      key={ep.id}
                      onClick={() =>
                        router.push(`/watch/tv/${details.id}/${selectedSeason}/${ep.episode_number}`)
                      }
                      className="group flex w-full text-left gap-4 p-3 rounded-xl border border-border-custom hover:border-primary bg-background/40 hover:bg-surface/50 cursor-pointer transition-all duration-300"
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
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-on-surface-variant">
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

        {/* 4. Cast list */}
        {cast.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-display font-semibold tracking-wide text-on-surface uppercase border-l-2 border-primary pl-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Spotlight Cast Members</span>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {cast.map((actor) => {
                const profileUrl = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      actor.name
                    )}`;
                return (
                  <div
                    key={actor.id}
                    className="flex flex-col items-center gap-2 text-center shrink-0 w-20 sm:w-24"
                  >
                    <img
                      src={profileUrl}
                      alt={actor.name}
                      loading="lazy"
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border border-border-custom"
                    />
                    <div className="space-y-0.5 min-w-0 w-full">
                      <p className="font-semibold text-[10px] sm:text-xs text-on-surface truncate">
                        {actor.name}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-on-surface-variant truncate">
                        {actor.character}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Embedded YouTube Trailer */}
        {trailers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-display font-semibold tracking-wide text-on-surface uppercase border-l-2 border-primary pl-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>YouTube Trailers & Clips</span>
            </h2>

            <div className="aspect-[16/9] w-full max-w-3xl rounded-2xl overflow-hidden border border-border-custom bg-black mx-auto shadow-xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailers[0].key}`}
                title="Cinematic Trailer"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* 6. Recommendations / Similar section */}
        {similar.length > 0 && (
          <TitleRail title="Recommended Feed Titles" items={similar} mediaType={mediaType} />
        )}
      </div>
    </div>
  );
}
