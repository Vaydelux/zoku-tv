"use client";

import { useCallback, useEffect, useRef, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film, ShieldAlert } from "lucide-react";
import { getTitleDetails, TMDBTitle } from "@/lib/tmdb";
import { groupEmbedServers, getEmbedUrl } from "@/lib/embed";
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
import { WatchShortcutsPopover } from "@/components/watch/AutoNextOverlay";
import { TheaterPlayerShell } from "@/components/watch/TheaterPlayerShell";
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
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const theaterControlsRef = useRef<{
    toggleFullscreen: () => void;
    toggleTheater: () => void;
    toggleDrawer: () => void;
    handleEscape: () => void;
    isDirectMode: boolean;
  } | null>(null);

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
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
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

  const displayTitle = details?.title || details?.name || "Loading...";
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
    handleProgress,
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
    activeServers.find((s) => s.id === selectedServerId) || activeServers[0];

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

  const registerTheaterControls = useCallback(
    (controls: {
      toggleFullscreen: () => void;
      toggleTheater: () => void;
      toggleDrawer: () => void;
      handleEscape: () => void;
      isDirectMode: boolean;
    }) => {
      theaterControlsRef.current = controls;
    },
    []
  );

  useEffect(() => {
    if (type === "tv" || !details || details.id !== numericId || kidsRestricted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcutTarget(e.target)) return;
      const action = resolveWatchShortcutAction(e);
      if (!action) return;
      const controls = theaterControlsRef.current;

      if (action === "toggle_fullscreen") {
        e.preventDefault();
        controls?.toggleFullscreen();
      } else if (action === "toggle_theater") {
        e.preventDefault();
        controls?.toggleTheater();
      } else if (action === "toggle_drawer") {
        e.preventDefault();
        controls?.toggleDrawer();
      } else if (action === "escape") {
        if (showShortcutsHelp) {
          e.preventDefault();
          setShowShortcutsHelp(false);
        } else {
          controls?.handleEscape();
        }
      } else if (action === "next_server") {
        e.preventDefault();
        handleNextServer();
      } else if (action === "retry_frame") {
        e.preventDefault();
        handleRetryFrame();
      } else if (action === "toggle_watched" && !controls?.isDirectMode) {
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
    showShortcutsHelp,
    handleNextServer,
    handleRetryFrame,
    handleToggleCompleted,
  ]);

  if (type === "tv") return null;

  // Fail-closed server eligibility gate — never mounts iframe before detail confirms allowed
  if (!details || details.id !== numericId) {
    return (
      <div
        className="min-h-[100dvh] bg-background text-on-surface flex flex-col items-center justify-center gap-4 p-6 text-center"
        data-testid="watch-title-eligibility-gate"
      >
        <Navbar />
        <ShieldAlert className="h-10 w-10 text-primary" />
        <p className="text-sm text-on-surface-variant">
          {detailError
            ? "This title is unavailable or restricted by the content filter."
            : "Checking title availability…"}
        </p>
        <Link
          href="/home"
          className="rounded-lg bg-primary px-5 py-2.5 text-primary-contrast text-sm font-semibold"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (kidsRestricted && details) {
    return (
      <div
        className="min-h-[100dvh] bg-background text-on-surface flex flex-col items-center justify-center p-6 text-center"
        data-testid="kids-mode-restricted-gate"
      >
        <Navbar />
        <div className="max-w-md rounded-xl border border-amber-500/30 bg-surface p-8">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">
            Restricted in Kids Mode
          </h1>
          <p className="text-sm text-on-surface-variant mb-6">
            This movie is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-contrast hover:opacity-90 transition-opacity"
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

  const useSandbox = iframeMode === "Strict" && currentServerObj.supportsSandbox;
  const isMovieCompleted = isCompletedInHistory("movie", numericId);
  const backdropUrl = details.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
    : null;

  return (
    <TheaterPlayerShell
      title={displayTitle}
      subtitle={[releaseYear, details.runtime ? `${details.runtime}m` : "Feature Film"]
        .filter(Boolean)
        .join(" · ")}
      backdropUrl={backdropUrl}
      onBack={() => router.push(`/title/movie/${id}`)}
      backLabel="Back to movie details"
      embedUrl={embedUrl}
      iframeKey={`${currentServerObj.id}-${useSandbox ? "sb" : "nosb"}-${loadAttempts}`}
      iframeTitle={`${displayTitle} video player`}
      iframeReady={iframeReady}
      onIframeLoad={() => setIframeReady(true)}
      sandboxPolicy={currentServerObj.sandboxPolicy}
      useSandbox={useSandbox}
      sandboxLabel={`Iframe Mode: ${iframeMode}`}
      onToggleSandbox={() => {
        setIframeMode(iframeMode === "Strict" ? "Compatibility" : "Strict");
        setIframeReady(false);
      }}
      hasConfirmedPlayback={hasConfirmedPlayback}
      isLoadingMetadata={detailsLoading}
      currentServerId={currentServerObj.id}
      currentServerName={currentServerObj.name}
      newServers={newServers}
      defaultServers={defaultServers}
      serverHealth={serverHealth}
      onServerChange={handleServerChange}
      onNextServer={handleNextServer}
      onRetryFrame={handleRetryFrame}
      isWatched={isMovieCompleted}
      watchedActionLabel={isMovieCompleted ? "Watched" : "Mark Watched"}
      onToggleWatched={() => void handleToggleCompleted()}
      startAtSec={startAtSec}
      onDirectProgress={handleProgress}
      showShortcutsHelp={showShortcutsHelp}
      onToggleShortcutsHelp={() => setShowShortcutsHelp((prev) => !prev)}
      suppressFrame={showResumePrompt}
      onRegisterTheaterControls={registerTheaterControls}
      stageOverlay={
        showResumePrompt && savedProgress ? (
          <ResumePrompt
            progressPercent={savedProgress.progress_percent ?? 0}
            currentTimeSec={savedProgress.current_time_sec ?? 0}
            onResume={handleResume}
            onStartOver={handleStartOver}
          />
        ) : null
      }
      belowStageContent={
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start rounded-xl border border-white/8 bg-[#14141A] p-4 sm:p-5">
          {details.backdrop_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${details.backdrop_path}`}
              alt={displayTitle}
              className="aspect-video w-full sm:w-52 rounded-lg object-cover shrink-0 bg-[#1C1C24]"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                <Film className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Feature Film</span>
                {releaseYear && <span>· {releaseYear}</span>}
                {details.runtime ? <span>· {details.runtime}m</span> : null}
              </div>
              <Link
                href={`/title/movie/${id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Full Details →
              </Link>
            </div>
            <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
              {displayTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
              {details.overview || "No synopsis available."}
            </p>
          </div>
        </div>
      }
      floatingOverlays={
        <WatchShortcutsPopover
          open={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
        />
      }
    />
  );
}
