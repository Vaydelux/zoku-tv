"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  ShieldAlert,
  Play,
  SkipForward,
  Check,
} from "lucide-react";
import { getTitleDetails, TMDBTitle } from "@/lib/tmdb";
import {
  EMBED_SERVER_CATALOG,
  groupEmbedServers,
  getEmbedUrl,
} from "@/lib/embed";
import {
  useSessionStore,
  useEmbedStore,
  useWatchHistoryStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { ResumePrompt } from "@/components/watch/ResumePrompt";
import { ServerSelect } from "@/components/watch/ServerSelect";
import { isTmdbAllowedInKidsMode } from "@/lib/kids-mode";

export default function WatchMoviePage({
  params,
}: {
  params: Promise<{ type: "movie" | "tv"; id: string }>;
}) {
  const { type, id } = use(params);
  const router = useRouter();
  const numericId = Number(id);

  const { currentProfile } = useSessionStore();
  const {
    selectedServerId,
    iframeMode,
    serverHealth,
    setServerId,
    setIframeMode,
    markServerFailing,
  } = useEmbedStore();
  const isCompletedInHistory = useWatchHistoryStore((s) => s.isCompleted);
  const toggleCompletedInHistory = useWatchHistoryStore((s) => s.toggleCompleted);

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const { newServers, defaultServers } = useMemo(
    () => groupEmbedServers(EMBED_SERVER_CATALOG),
    []
  );

  useEffect(() => {
    if (type === "tv") {
      router.replace(`/watch/tv/${id}/1/1`);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    getTitleDetails("movie", numericId)
      .then((res) => {
        if (!cancelled) setDetails(res);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, id, numericId, router]);

  useEffect(() => {
    setIframeReady(false);
  }, [selectedServerId, id, iframeMode]);

  const kidsRestricted = Boolean(
    currentProfile?.kidMode && details && !isTmdbAllowedInKidsMode(details)
  );

  const displayTitle = details?.title || details?.name || "Loading title...";
  const releaseYear = (details?.release_date || "").slice(0, 4);

  const {
    savedProgress,
    showResumePrompt,
    startAtSec,
    hasConfirmedPlayback,
    handleResume,
    handleStartOver,
  } = useWatchProgress({
    tmdbId: numericId,
    mediaType: "movie",
    title: details?.title || details?.name || "",
    overview: details?.overview ?? null,
    poster_path: details?.poster_path ?? null,
    backdrop_path: details?.backdrop_path ?? null,
    vote_average: details?.vote_average ?? 0,
    selectedServerId,
    ready: Boolean(details) && type === "movie" && !kidsRestricted,
  });

  if (type === "tv") return null;

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
            This movie is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
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
    "movie",
    numericId,
    undefined,
    undefined,
    { startAtSec }
  );

  const useSandbox =
    iframeMode === "Strict" && currentServerObj.supportsSandbox;

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

  const isMovieCompleted = isCompletedInHistory("movie", numericId);

  const handleToggleCompleted = async () => {
    if (!details) return;
    await toggleCompletedInHistory({
      media_type: "movie",
      tmdbId: numericId,
      title: displayTitle,
      overview: details.overview ?? null,
      vote_average: details.vote_average ?? null,
      poster_path: details.poster_path ?? null,
      backdrop_path: details.backdrop_path ?? null,
    });
  };

  const containerStatusLabel = hasConfirmedPlayback
    ? "Playback Synced"
    : iframeReady
    ? "Container Ready"
    : "Loading Frame...";

  return (
    <div className="min-h-screen bg-[#070a10] text-white pt-16 pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/title/movie/${id}`)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Back to movie details"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-display font-bold tracking-tight text-white truncate">
                  Now Watching
                </h1>
                <span
                  data-testid="player-container-status"
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
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
                    className={`h-1.5 w-1.5 rounded-full ${
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
              <p className="text-xs sm:text-sm text-white/60 truncate">
                {displayTitle}
                {releaseYear ? ` · ${releaseYear}` : " · Feature Film"}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowToolsPanel((prev) => !prev)}
              aria-expanded={showToolsPanel}
              aria-label="Player container settings and troubleshooting"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                showToolsPanel || useSandbox
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {showToolsPanel && (
              <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-white/15 bg-[#0e131d]/95 p-4 shadow-2xl backdrop-blur-xl">
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
                  Streams are hosted by external third-party providers. If a server displays a blank screen, buffer loop, or blocked frame, use{" "}
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

          {(!iframeReady || detailsLoading) && !showResumePrompt && (
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
              title={`${displayTitle} external video player`}
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <ServerSelect
              value={currentServerObj.id}
              onChange={handleServerChange}
              newServers={newServers}
              defaultServers={defaultServers}
              serverHealth={serverHealth}
            />

            <button
              type="button"
              onClick={handleRetryFrame}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#141923] px-4 text-xs font-semibold text-white/90 hover:border-white/20 hover:bg-[#1b2230] transition-colors"
              aria-label="Retry loading current server"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>

            <button
              type="button"
              onClick={handleNextServer}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#141923] px-4 text-xs font-semibold text-white/80 hover:border-white/20 hover:bg-[#1b2230] hover:text-white transition-colors"
              aria-label="Switch to next server"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>Next Server</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleCompleted}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                isMovieCompleted
                  ? "border-green-500/30 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                  : "border-white/10 bg-[#141923] text-white/85 hover:border-white/20 hover:bg-[#1b2230]"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isMovieCompleted ? "Watched" : "Mark Watched"}</span>
            </button>

            <Link
              href={`/title/movie/${id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#141923] px-4 text-xs font-semibold text-white/85 hover:border-white/20 hover:bg-[#1b2230] transition-colors"
            >
              Movie Details
            </Link>
          </div>
        </div>

        {/* Movie Overview Footer Card */}
        {details && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {details.backdrop_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${details.backdrop_path}`}
                  alt={displayTitle}
                  className="h-28 w-full sm:w-48 rounded-xl object-cover shrink-0 bg-white/5"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                  <Play className="h-3.5 w-3.5 text-primary" />
                  <span>Feature Film</span>
                  {releaseYear && <span>· {releaseYear}</span>}
                  {details.runtime ? <span>· {details.runtime}m</span> : null}
                </div>
                <h2 className="text-base font-bold text-white mb-1">{displayTitle}</h2>
                <p className="text-xs text-white/65 line-clamp-2 leading-relaxed">
                  {details.overview || "No synopsis available."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
