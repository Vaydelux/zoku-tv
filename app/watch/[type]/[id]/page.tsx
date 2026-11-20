"use client";

import { useCallback, useEffect, useRef, useState, useMemo, use } from "react";
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
  Keyboard,
} from "lucide-react";
import { getTitleDetails, TMDBTitle } from "@/lib/tmdb";
import {
  groupEmbedServers,
  getEmbedUrl,
} from "@/lib/embed";
import { resolveActiveTmdbServers } from "@/lib/dynamic-servers";
import {
  useSessionStore,
  useEmbedStore,
  useWatchHistoryStore,
  useDynamicServerStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { ResumePrompt } from "@/components/watch/ResumePrompt";
import { ServerSelect } from "@/components/watch/ServerSelect";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { WatchShortcutsPopover } from "@/components/watch/AutoNextOverlay";
import { isTmdbAllowedInKidsMode } from "@/lib/kids-mode";
import {
  resolveWatchShortcutAction,
  shouldIgnoreShortcutTarget,
} from "@/lib/watch-shortcuts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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
  const [detailError, setDetailError] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const toolsTriggerRef = useRef<HTMLButtonElement>(null);

  const serverConfig = useDynamicServerStore((s) => s.config);
  const activeServers = useMemo(
    () => resolveActiveTmdbServers(serverConfig),
    [serverConfig]
  );

  const { newServers, defaultServers } = useMemo(
    () => groupEmbedServers(activeServers),
    [activeServers]
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
      .catch(() => { if (!cancelled) setDetailError(true); })
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
  useDocumentTitle(
    details ? `Watch · ${details.title || details.name || "Movie"}` : "Watch"
  );
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
    ready: Boolean(details && details.id === numericId) && type === "movie" && !kidsRestricted,
  });

  const currentServerObj =
    activeServers.find((s) => s.id === selectedServerId) ||
    activeServers[0];

  const handleServerChange = useCallback(
    (newServerId: string) => {
      setServerId(newServerId);
      setIframeReady(false);
    },
    [setServerId]
  );

  const handleNextServer = useCallback(() => {
    if (!currentServerObj) return;
    markServerFailing(currentServerObj.id);
    const idx = activeServers.findIndex((s) => s.id === currentServerObj.id);
    const next = activeServers[(idx + 1) % activeServers.length];
    if (next) {
      handleServerChange(next.id);
    }
  }, [activeServers, currentServerObj, markServerFailing, handleServerChange]);

  const handleRetryFrame = useCallback(() => {
    setIframeReady(false);
    setLoadAttempts((prev) => prev + 1);
  }, []);

  const handleToggleCompleted = useCallback(async () => {
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
  }, [details, toggleCompletedInHistory, numericId, displayTitle]);

  useEffect(() => {
    if (type === "tv" || !details || details.id !== numericId || kidsRestricted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcutTarget(e.target)) return;
      const action = resolveWatchShortcutAction(e);
      if (!action) return;
      if (action === "next_server") {
        e.preventDefault();
        handleNextServer();
      } else if (action === "retry_frame") {
        e.preventDefault();
        handleRetryFrame();
      } else if (action === "toggle_watched") {
        e.preventDefault();
        void handleToggleCompleted();
      } else if (action === "toggle_shortcuts_help") {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    type,
    details,
    numericId,
    kidsRestricted,
    handleNextServer,
    handleRetryFrame,
    handleToggleCompleted,
  ]);

  if (type === "tv") return null;

  if (!details || details.id !== numericId) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center gap-4 p-6 text-center" data-testid="watch-title-eligibility-gate">
        <Navbar />
        <ShieldAlert className="h-10 w-10 text-primary" />
        <p className="text-sm text-on-surface-variant">{detailError ? "This title is unavailable or restricted by the content filter." : "Checking title availability…"}</p>
        <Link href="/home" className="rounded-xl bg-primary px-5 py-2.5 text-primary-contrast text-sm font-semibold">Back to Home</Link>
      </div>
    );
  }



  if (kidsRestricted && details) {
    return (
      <div
        className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 text-center"
        data-testid="kids-mode-restricted-gate"
      >
        <Navbar />
        <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">
            Restricted in Kids Mode
          </h1>
          <p className="text-sm text-on-surface-variant mb-6">
            This movie is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-contrast hover:brightness-110 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Safe Home
          </Link>
        </div>
      </div>
    );
  }

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

  const isMovieCompleted = isCompletedInHistory("movie", numericId);

  const containerStatusLabel = hasConfirmedPlayback
    ? "Playback Synced"
    : iframeReady
    ? "Container Ready"
    : "Loading Frame...";

  return (
    <div className="zoku-cinematic-player min-h-screen bg-background text-on-surface pt-28 md:pt-20 pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <header className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-4 py-3 sm:py-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.push(`/title/movie/${id}`)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-border-custom bg-surface/80 text-on-surface-variant hover:bg-surface-hover hover:text-on-surface transition-colors"
              aria-label="Back to movie details"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-sm sm:text-lg font-display font-bold tracking-tight text-on-surface whitespace-nowrap">
                  Now Watching
                </h1>
                <span
                  data-testid="player-container-status"
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium whitespace-nowrap border ${
                    hasConfirmedPlayback
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500"
                      : iframeReady
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-amber-500/35 bg-amber-500/10 text-amber-500"
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
                        ? "bg-emerald-500"
                        : iframeReady
                        ? "bg-primary"
                        : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  {containerStatusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-on-surface-variant truncate">
                {displayTitle}
                {releaseYear ? ` · ${releaseYear}` : " · Feature Film"}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowShortcutsHelp((prev) => !prev)}
              aria-expanded={showShortcutsHelp}
              aria-label="Player keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              data-testid="watch-shortcuts-toggle-btn"
              data-tv-focusable="true"
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-colors ${
                showShortcutsHelp
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border-custom bg-surface/80 text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <Keyboard className="h-4 w-4" />
            </button>

            <button
              ref={toolsTriggerRef}
              type="button"
              onClick={() => setShowToolsPanel((prev) => !prev)}
              aria-expanded={showToolsPanel}
              aria-label="Player container settings and troubleshooting"
              data-tv-focusable="true"
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-colors ${
                showToolsPanel || useSandbox
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border-custom bg-surface/80 text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <FloatingMenu
              open={showToolsPanel}
              anchorRef={toolsTriggerRef}
              onClose={() => setShowToolsPanel(false)}
              role="dialog"
              ariaLabel="Container controls"
              align="right"
              minWidth={280}
              maxWidth={320}
              preferredMaxHeight={320}
              className="p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-on-surface">
                  Container Controls
                </span>
                <span className="text-[11px] text-on-surface-variant truncate">
                  {currentServerObj.name}
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
                className={`zoku-menu-item w-full min-h-[40px] flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-colors ${
                  useSandbox
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/35"
                    : "bg-background/60 text-on-surface border-border-custom hover:bg-surface-hover"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {useSandbox ? (
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldOff className="w-4 h-4 text-on-surface-variant shrink-0" />
                  )}
                  Iframe Mode: {iframeMode}
                </span>
                <span className="font-mono text-[11px] font-semibold">
                  {useSandbox ? "SANDBOX" : "COMPAT"}
                </span>
              </button>
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                Streams are hosted by external third-party providers. If a server displays a blank screen or blocked frame, use{" "}
                <strong className="text-on-surface">Retry</strong> or switch servers.
              </p>
            </FloatingMenu>
          </div>
        </header>

        {/* 16:9 External Player Frame Container */}
        <div
          className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border-custom bg-surface shadow-2xl"
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
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/95 p-6 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-base font-semibold text-on-surface">
                  External video player
                </p>
                <p className="text-xs text-on-surface-variant">
                  Unmodified third-party iframe ({currentServerObj.name}) · Waiting for provider frame
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryFrame}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/70 px-3.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
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
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ServerSelect
              value={currentServerObj.id}
              onChange={handleServerChange}
              newServers={newServers}
              defaultServers={defaultServers}
              serverHealth={serverHealth}
              className="flex-1 xs:flex-initial sm:flex-initial"
            />

            <button
              type="button"
              onClick={handleRetryFrame}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 sm:px-4 text-xs font-semibold text-on-surface hover:border-primary/40 hover:bg-surface-hover transition-colors"
              aria-label="Retry loading current server"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Retry</span>
            </button>

            <button
              type="button"
              onClick={handleNextServer}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 sm:px-4 text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:bg-surface-hover hover:text-on-surface transition-colors"
              aria-label="Switch to next server"
            >
              <SkipForward className="h-3.5 w-3.5 shrink-0" />
              <span>Next Server</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCompleted}
              className={`flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                isMovieCompleted
                  ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                  : "border-border-custom bg-surface text-on-surface hover:border-primary/40 hover:bg-surface-hover"
              }`}
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>{isMovieCompleted ? "Watched" : "Mark Watched"}</span>
            </button>

            <Link
              href={`/title/movie/${id}`}
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border-custom bg-surface px-3.5 sm:px-4 text-xs font-semibold text-on-surface hover:border-primary/40 hover:bg-surface-hover transition-colors"
            >
              Movie Details
            </Link>
          </div>
        </div>

        {/* Movie Overview Footer Card */}
        {details && (
          <div className="mt-6 border-t border-border-custom pt-6">
            <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border-custom bg-surface/65 p-4">
              {details.backdrop_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${details.backdrop_path}`}
                  alt={displayTitle}
                  className="h-28 w-full sm:w-48 rounded-xl object-cover shrink-0 bg-surface-hover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
                  <Play className="h-3.5 w-3.5 text-primary" />
                  <span>Feature Film</span>
                  {releaseYear && <span>· {releaseYear}</span>}
                  {details.runtime ? <span>· {details.runtime}m</span> : null}
                </div>
                <h2 className="text-base font-bold text-on-surface mb-1">{displayTitle}</h2>
                <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                  {details.overview || "No synopsis available."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <WatchShortcutsPopover
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}
