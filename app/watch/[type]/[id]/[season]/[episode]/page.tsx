"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  Check,
  RotateCcw,
  Loader2,
  SlidersHorizontal,
  ShieldAlert,
  SkipForward,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import {
  getTitleDetails,
  getSeasonDetails,
  TMDBTitle,
  TMDBEpisode,
} from "@/lib/tmdb";
import {
  EMBED_SERVER_CATALOG,
  groupEmbedServers,
  getEmbedUrl,
} from "@/lib/embed";
import {
  useSessionStore,
  useEmbedStore,
  useEpisodeProgressStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { ResumePrompt } from "@/components/watch/ResumePrompt";
import { ServerSelect } from "@/components/watch/ServerSelect";
import { isTmdbAllowedInKidsMode } from "@/lib/kids-mode";

export default function WatchTvPage({
  params,
}: {
  params: Promise<{ type: string; id: string; season: string; episode: string }>;
}) {
  const { type, id, season, episode } = use(params);
  const router = useRouter();
  const numericId = Number(id);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  const { currentProfile } = useSessionStore();
  const {
    selectedServerId,
    iframeMode,
    serverHealth,
    setServerId,
    setIframeMode,
    markServerFailing,
  } = useEmbedStore();

  const isEpisodeCompleted = useEpisodeProgressStore((s) => s.isEpisodeCompleted);
  const recordEpisodeProgress = useEpisodeProgressStore(
    (s) => s.recordEpisodeProgress
  );
  const resetEpisodeProgress = useEpisodeProgressStore(
    (s) => s.resetEpisodeProgress
  );

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const { newServers, defaultServers } = useMemo(
    () => groupEmbedServers(EMBED_SERVER_CATALOG),
    []
  );

  useEffect(() => {
    if (type !== "tv") return;
    let cancelled = false;
    setEpisodesLoading(true);
    Promise.all([
      getTitleDetails("tv", numericId),
      getSeasonDetails(numericId, seasonNum),
    ])
      .then(([det, seas]) => {
        if (cancelled) return;
        setDetails(det);
        setEpisodes(seas.episodes || []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, numericId, seasonNum]);

  useEffect(() => {
    setIframeReady(false);
  }, [selectedServerId, numericId, seasonNum, episodeNum, iframeMode]);

  const currentEp = episodes.find((e) => e.episode_number === episodeNum);
  const nextEp = episodes.find((e) => e.episode_number === episodeNum + 1);
  const prevEp = episodes.find((e) => e.episode_number === episodeNum - 1);

  const kidsRestricted = Boolean(
    currentProfile?.kidMode && details && !isTmdbAllowedInKidsMode(details)
  );

  const displayTitle = details?.name || details?.title || "Loading Series...";
  const validSeasons = (details?.seasons || []).filter(
    (s) => s.season_number > 0
  );

  const {
    savedProgress,
    showResumePrompt,
    startAtSec,
    hasConfirmedPlayback,
    handleResume,
    handleStartOver,
    handleProgress,
  } = useWatchProgress({
    tmdbId: numericId,
    mediaType: "tv",
    season: seasonNum,
    episode: episodeNum,
    title: details?.name || details?.title || "",
    overview: details?.overview ?? null,
    poster_path: details?.poster_path ?? null,
    backdrop_path: details?.backdrop_path ?? null,
    vote_average: details?.vote_average ?? 0,
    selectedServerId,
    ready: Boolean(details) && !kidsRestricted,
  });

  if (kidsRestricted && details) {
    return (
      <div
        className="min-h-screen bg-[#070a10] text-white flex flex-col items-center justify-center p-6 text-center"
        data-testid="kids-mode-restricted-gate"
      >
        <Navbar />
        <div className="max-w-md rounded-2xl border border-amber-400/25 bg-amber-500/10 p-8 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-300 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">
            Restricted in Kids Mode
          </h1>
          <p className="text-sm text-white/70 mb-6">
            This series is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Safe Home
          </Link>
        </div>
      </div>
    );
  }

  const currentServerObj =
    EMBED_SERVER_CATALOG.find((s) => s.id === selectedServerId) ||
    EMBED_SERVER_CATALOG[0];

  const embedUrl = getEmbedUrl(
    currentServerObj,
    "tv",
    numericId,
    seasonNum,
    episodeNum,
    { startAtSec }
  );

  const useSandbox =
    iframeMode === "Strict" && currentServerObj.supportsSandbox;

  const isCurrentWatched = isEpisodeCompleted(
    "tv",
    numericId,
    seasonNum,
    episodeNum
  );

  const containerStatusLabel = hasConfirmedPlayback
    ? "Playback Synced"
    : iframeReady
    ? "Container Ready"
    : "Loading Frame...";

  const handleServerChange = (newServerId: string) => {
    setServerId(newServerId);
    setIframeReady(false);
  };

  const handleNextServer = () => {
    markServerFailing(currentServerObj.id);
    const idx = EMBED_SERVER_CATALOG.findIndex((s) => s.id === currentServerObj.id);
    const next = EMBED_SERVER_CATALOG[(idx + 1) % EMBED_SERVER_CATALOG.length];
    if (next) {
      handleServerChange(next.id);
    }
  };

  const handleRetryFrame = () => {
    setIframeReady(false);
    setLoadAttempts((prev) => prev + 1);
  };

  const handleMarkWatchedAndAdvance = async () => {
    handleProgress(100, 0);
    await recordEpisodeProgress({
      media_type: "tv",
      tmdbId: numericId,
      season: seasonNum,
      episode: episodeNum,
      progress_percent: 100,
      current_time_sec: 0,
      completed: true,
    });
    if (nextEp) {
      router.push(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`);
    }
  };

  const handleRewatch = async () => {
    await resetEpisodeProgress("tv", numericId, seasonNum, episodeNum);
    handleStartOver();
  };

  const handleSeasonSwitch = (nextSeason: number) => {
    router.push(`/watch/tv/${id}/${nextSeason}/1`);
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-white pt-28 md:pt-20 pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <header className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-4 py-3 sm:py-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.push(`/title/tv/${id}`)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Back to series details"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-sm sm:text-lg font-display font-bold tracking-tight text-white whitespace-nowrap">
                  Now Watching
                </h1>
                <span
                  data-testid="player-container-status"
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium whitespace-nowrap border ${
                    hasConfirmedPlayback
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : iframeReady
                      ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                      : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                  }`}
                  title={
                    hasConfirmedPlayback
                      ? "Confirmed runtime progress messages received from the embedded player"
                      : iframeReady
                      ? "External iframe document loaded; playback inside third-party frame is unverified until progress events arrive"
                      : "Waiting for external provider frame to respond"
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      hasConfirmedPlayback
                        ? "bg-emerald-400"
                        : iframeReady
                        ? "bg-sky-400"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  {containerStatusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-white/60 truncate">
                {displayTitle} · Season {seasonNum} · Episode {episodeNum}
                {currentEp?.name ? ` — ${currentEp.name}` : ""}
              </p>
            </div>
          </div>

          <div className={`relative flex items-center gap-2 shrink-0 ${showToolsPanel ? "z-50" : "z-20"}`}>
            <button
              type="button"
              onClick={() => setShowToolsPanel((prev) => !prev)}
              aria-expanded={showToolsPanel}
              aria-label="Player container settings and troubleshooting"
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-colors ${
                showToolsPanel || useSandbox
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {showToolsPanel && (
              <div className="glass-panel absolute right-0 top-11 sm:top-12 z-50 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border border-border-custom bg-surface/95 p-4 shadow-2xl backdrop-blur-2xl animate-scale-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Container Controls
                  </span>
                  <span className="text-[11px] text-white/45">
                    Provider: {currentServerObj.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIframeMode(
                      iframeMode === "Strict" ? "Compatibility" : "Strict"
                    );
                    setIframeReady(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium border transition-colors ${
                    useSandbox
                      ? "bg-green-500/15 text-green-300 border-green-500/30"
                      : "bg-white/[0.04] text-white/80 border-white/10 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {useSandbox ? (
                      <Shield className="w-4 h-4 text-green-400" />
                    ) : (
                      <ShieldOff className="w-4 h-4 text-white/50" />
                    )}
                    Iframe Mode: {iframeMode}
                  </span>
                  <span className="font-mono text-[11px]">
                    {useSandbox ? "SANDBOX" : "COMPAT"}
                  </span>
                </button>
                <p className="mt-2.5 text-[11px] leading-relaxed text-white/50">
                  Streams are hosted by external third-party providers. If a server displays a blank screen or fails to load, use{" "}
                  <strong className="text-white/80">Retry</strong> or switch to another server.
                </p>
              </div>
            )}
          </div>
        </header>

        {/* 16:9 External Player Frame Container */}
        <div
          className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0d111a] shadow-2xl"
          data-testid="external-player-frame-wrapper"
        >
          {showResumePrompt && savedProgress && (
            <ResumePrompt
              progressPercent={savedProgress.progress_percent ?? 0}
              currentTimeSec={savedProgress.current_time_sec ?? 0}
              onResume={handleResume}
              onStartOver={handleStartOver}
            />
          )}

          {!iframeReady && !showResumePrompt && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0d111a]/95 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-base font-semibold text-white">
                  External video player
                </p>
                <p className="text-xs text-white/55">
                  Unmodified third-party iframe ({currentServerObj.name}) · Waiting for provider frame
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryFrame}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </button>
                <button
                  type="button"
                  onClick={handleNextServer}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/15 px-3.5 py-2 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Next Server
                </button>
              </div>
            </div>
          )}

          {!showResumePrompt && (
            <iframe
              key={`${currentServerObj.id}-${useSandbox ? "sb" : "nosb"}-${loadAttempts}`}
              src={embedUrl}
              title={`${displayTitle} S${seasonNum}E${episodeNum} external video player`}
              className="h-full w-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
              onLoad={() => setIframeReady(true)}
              {...(useSandbox
                ? {
                    sandbox: currentServerObj.sandboxPolicy,
                  }
                : {})}
            />
          )}
        </div>

        {/* Control Bar Below Player */}
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Server selector + Retry + Next Server */}
          <div className="flex flex-wrap items-center gap-2">
            <ServerSelect
              value={currentServerObj.id}
              onChange={handleServerChange}
              newServers={newServers}
              defaultServers={defaultServers}
              serverHealth={serverHealth}
              className="flex-1 sm:flex-initial"
            />

            <button
              type="button"
              onClick={handleRetryFrame}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#141923] px-3 sm:px-4 text-xs font-semibold text-white/90 hover:border-white/20 hover:bg-[#1b2230] transition-colors"
              aria-label="Retry loading current server"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Retry</span>
            </button>

            <button
              type="button"
              onClick={handleNextServer}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#141923] px-3 sm:px-3.5 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-[#1b2230] hover:text-white transition-colors"
              aria-label="Switch to next server"
            >
              <SkipForward className="h-3.5 w-3.5 shrink-0" />
              <span>Next Server</span>
            </button>
          </div>

          {/* Right: Mark Watched + Previous + Next > */}
          <div className="flex flex-wrap items-center gap-2">
            {isCurrentWatched ? (
              <button
                type="button"
                onClick={handleRewatch}
                className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/15 px-3 sm:px-3.5 text-xs font-semibold text-green-300 hover:bg-green-500/25 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Rewatch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMarkWatchedAndAdvance}
                className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#141923] px-3 sm:px-3.5 text-xs font-semibold text-white/85 hover:border-white/20 hover:bg-[#1b2230] transition-colors"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{nextEp ? "Watched · Next" : "Mark Watched"}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!prevEp}
              onClick={() =>
                prevEp &&
                router.push(`/watch/tv/${id}/${seasonNum}/${prevEp.episode_number}`)
              }
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-[#141923] px-3.5 sm:px-4 text-xs font-semibold text-white/90 hover:border-white/20 hover:bg-[#1b2230] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!nextEp}
              onClick={() =>
                nextEp &&
                router.push(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`)
              }
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-[#1b263b] px-3.5 sm:px-4 text-xs font-semibold text-white hover:bg-[#23314d] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Episodes Section Below Divider */}
        <section className="mt-6 border-t border-white/10 pt-6" aria-label="Season episodes">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-display font-bold text-white">
              Episodes
            </h2>

            {validSeasons.length > 0 ? (
              <label className="inline-flex items-center gap-2 text-xs text-white/75">
                <span className="sr-only">Select season</span>
                <select
                  value={seasonNum}
                  onChange={(e) => handleSeasonSwitch(Number(e.target.value))}
                  aria-label="Select season"
                  className="rounded-xl border border-white/10 bg-[#141923] px-3.5 py-2 text-xs font-semibold text-white focus:border-primary focus:outline-none"
                >
                  {validSeasons.map((s) => (
                    <option
                      key={s.id}
                      value={s.season_number}
                      className="bg-[#0e131d] text-white"
                    >
                      Season {s.season_number}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="text-xs font-semibold text-white/60">
                Season {seasonNum}
              </span>
            )}
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="aspect-video w-full rounded-2xl bg-[#161c28] animate-pulse border border-white/5" />
                  <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/60">
              No episode list available for Season {seasonNum}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((ep) => {
                const isCurrent = ep.episode_number === episodeNum;
                const isEpWatched = isEpisodeCompleted(
                  "tv",
                  numericId,
                  seasonNum,
                  ep.episode_number
                );
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() =>
                      router.push(`/watch/tv/${id}/${seasonNum}/${ep.episode_number}`)
                    }
                    className={`group text-left rounded-2xl transition-all focus-visible:outline-none ${
                      isCurrent
                        ? "ring-2 ring-primary"
                        : "hover:translate-y-[-2px]"
                    }`}
                  >
                    <div
                      className={`relative aspect-video w-full overflow-hidden rounded-2xl border transition-colors ${
                        isCurrent
                          ? "border-primary/60 bg-[#1a2333]"
                          : "border-white/10 bg-[#151c28] group-hover:border-white/25"
                      }`}
                    >
                      {ep.still_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                          alt={ep.name || `Episode ${ep.episode_number}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}

                      {isCurrent && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold text-primary border border-primary/40">
                            <Play className="h-3 w-3 fill-current" /> Now Playing
                          </span>
                        </div>
                      )}

                      {isEpWatched && !isCurrent && (
                        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-[10px] font-semibold text-green-300 backdrop-blur-sm">
                          <Check className="h-3 w-3" /> Watched
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? "text-primary" : "text-white/85 group-hover:text-white"
                        }`}
                      >
                        Episode {ep.episode_number}
                        {ep.name && ep.name !== `Episode ${ep.episode_number}`
                          ? ` · ${ep.name}`
                          : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
