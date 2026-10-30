"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, ArrowLeft, MonitorPlay, Shield } from "lucide-react";
import { useSessionStore, useWatchlistStore, useEpisodeProgressStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { CustomSelect } from "@/components/CustomSelect";
import { AnimeRail } from "@/components/anime/AnimeRail";
import { EpisodeThumbnailWithProgress } from "@/components/EpisodeThumbnailWithProgress";
import {
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
} from "@/lib/anilist";
import {
  classifyAnimeMedia,
  filterAnimeForKidsMode,
} from "@/lib/kids-mode";
import { buildAnimeSeasons, type AnimeSeason } from "@/lib/anilist-seasons";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const anilistId = Number(id);
  const { currentProfile } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { getProgress } = useEpisodeProgressStore();
  const isKidMode = Boolean(currentProfile?.kidMode);

  const [details, setDetails] = useState<Awaited<ReturnType<typeof getAnimeDetails>>>(null);
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AniListMedia[]>([]);

  useEffect(() => {
    if (!currentProfile || !anilistId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getAnimeDetails(anilistId);
        if (cancelled) return;
        setDetails(data);
        if (data) {
          const built = buildAnimeSeasons(data);
          setSeasons(built);
          setSelectedSeason(built[0]?.seasonNumber ?? 1);
          const rawRecs = (data.recommendations?.nodes ?? [])
            .map((n) => n.mediaRecommendation)
            .filter((m): m is AniListMedia => Boolean(m));
          setRecommendations(filterAnimeForKidsMode(rawRecs, isKidMode));
        }
      } catch (err) {
        console.error("Failed to load anime details", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, anilistId, isKidMode]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <p>Anime details could not be loaded.</p>
        <button
          onClick={() => router.push("/home")}
          className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold text-white"
        >
          Return Home
        </button>
      </div>
    );
  }

  const title = getAnimeDisplayTitle(details);
  const classification = classifyAnimeMedia(details);

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
                “{title}” is hidden while Kids Mode is active on this profile ({classification.reason}).
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
                Explore Youth Anime
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const poster = getAnimePoster(details);
  const banner = details.bannerImage || poster;
  const score = details.averageScore ? (details.averageScore / 10).toFixed(1) : "N/A";
  const inWatchlist = hasItem("anime", anilistId);
  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeason) || seasons[0];

  const handleWatchlist = () => {
    if (inWatchlist) {
      removeItem("anime", anilistId);
    } else {
      const relDate = details.startDate?.year
        ? `${details.startDate.year}-${String(details.startDate.month || 1).padStart(2, "0")}-${String(details.startDate.day || 1).padStart(2, "0")}`
        : details.seasonYear
        ? `${details.seasonYear}-01-01`
        : null;
      const creatorName = (details as any).studios?.nodes?.[0]?.name || null;
      addItem({
        media_type: "anime",
        anilistId,
        title,
        creator: creatorName,
        genres: details.genres || null,
        poster_path: poster,
        backdrop_path: details.bannerImage ?? null,
        vote_average: details.averageScore ? details.averageScore / 10 : undefined,
        release_date: relDate,
      });
    }
  };

  return (
    <div className="app-page-shell text-on-surface pb-16">
      <Navbar />

      <div
        className="relative h-[40vh] min-h-[280px] bg-cover bg-center"
        style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/40" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8 gap-6">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute top-6 left-4 sm:left-8 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {poster && (
            <img
              src={poster}
              alt={title}
              className="hidden sm:block w-36 aspect-[2/3] rounded-xl border border-border-custom shadow-xl object-cover"
            />
          )}

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-primary">
              <Star className="h-4 w-4 fill-primary" />
              <span>{score}</span>
              <span className="text-on-surface-variant">•</span>
              <span className="uppercase">{details.status || "ANIME"}</span>
              <span className="text-on-surface-variant">•</span>
              <span
                data-testid="anime-maturity-badge"
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  classification.kidsSafe
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {classification.code}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold">{title}</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-3 max-w-3xl">
              {details.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {(details.genres ?? []).map((genre) => (
                <span
                  key={genre}
                  className="theme-panel text-[10px] font-mono uppercase px-2 py-1 rounded-lg"
                >
                  {genre}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() =>
                  router.push(
                    `/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/1`
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-contrast shadow-md"
              >
                <Play className="h-4 w-4 fill-current" />
                Play S{activeSeason.seasonNumber} E1
              </button>
              <button
                onClick={handleWatchlist}
                className="theme-panel inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold hover:border-primary"
              >
                {inWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {seasons.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {seasons.map((season) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeason(season.seasonNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedSeason === season.seasonNumber
                      ? "bg-primary text-primary-contrast border-primary"
                      : "theme-panel hover:border-primary"
                  }`}
                >
                  Season {season.seasonNumber}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-56">
              <CustomSelect
                ariaLabel="Select anime season"
                value={selectedSeason}
                onChange={(val) => setSelectedSeason(Number(val))}
                align="right"
                options={seasons.map((s) => ({
                  value: s.seasonNumber,
                  label: `Season ${s.seasonNumber}`,
                  badge: `${s.episodes.length} EP`,
                }))}
                testId="anime-season-select"
              />
            </div>
          </div>
        )}

        {activeSeason && (
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-on-surface-variant">
              <MonitorPlay className="h-4 w-4 text-primary" />
              <span>{activeSeason.title} — Episodes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {activeSeason.episodes.map((ep) => {
                const epProgress = getProgress(
                  "anime",
                  activeSeason.anilistId,
                  activeSeason.filmuSeason,
                  ep.episodeNumber
                );
                const progressPct = epProgress?.progress_percent ?? 0;
                const isCompleted = Boolean(epProgress?.completed);

                return (
                  <button
                    key={ep.episodeNumber}
                    onClick={() =>
                      router.push(
                        `/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/${ep.episodeNumber}`
                      )
                    }
                    data-testid={`anime-episode-item-${ep.episodeNumber}`}
                    className="group theme-panel flex flex-col items-start p-2.5 rounded-xl hover:border-primary hover:bg-primary/5 text-left transition-all relative overflow-hidden"
                  >
                    <EpisodeThumbnailWithProgress
                      thumbnail={ep.thumbnail}
                      title={ep.title}
                      episodeNumber={ep.episodeNumber}
                      progressPercent={progressPct}
                      completed={isCompleted}
                      aspectRatio="video"
                      className="mb-2 w-full"
                    />
                    <div className="flex items-center justify-between w-full text-[10px] font-mono text-on-surface-variant">
                      <span>Episode {ep.episodeNumber}</span>
                      {isCompleted ? (
                        <span className="text-emerald-400 font-semibold text-[9px]">Watched</span>
                      ) : progressPct > 0 ? (
                        <span className="text-primary font-semibold text-[9px]">
                          {Math.round(progressPct)}%
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold line-clamp-2 mt-0.5">{ep.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <AnimeRail title="You Might Also Like" items={recommendations} />
        )}
      </div>
    </div>
  );
}
