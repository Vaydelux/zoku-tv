"use client";

import { useCallback, useEffect, useRef, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Play,
  ShieldAlert,
} from "lucide-react";
import {
  getTitleDetails,
  getSeasonDetails,
  TMDBTitle,
  TMDBEpisode,
} from "@/lib/tmdb";
import { groupEmbedServers, getEmbedUrl } from "@/lib/embed";
import { resolveActiveTmdbServers } from "@/lib/dynamic-servers";
import {
  useSessionStore,
  useEmbedStore,
  useEpisodeProgressStore,
  useDynamicServerStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { ResumePrompt } from "@/components/watch/ResumePrompt";
import { CustomSelect } from "@/components/CustomSelect";
import { AutoNextOverlay, WatchShortcutsPopover } from "@/components/watch/AutoNextOverlay";
import { TheaterPlayerShell } from "@/components/watch/TheaterPlayerShell";
import { isTmdbAllowedInKidsMode } from "@/lib/kids-mode";
import {
  readAutoNextEnabled,
  writeAutoNextEnabled,
  resolveWatchShortcutAction,
  shouldIgnoreShortcutTarget,
} from "@/lib/watch-shortcuts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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
  const [detailError, setDetailError] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const theaterControlsRef = useRef<{
    toggleFullscreen: () => void;
    toggleTheater: () => void;
    toggleDrawer: () => void;
    handleEscape: () => void;
    isDirectMode: boolean;
  } | null>(null);

  useEffect(() => {
    setAutoNextEnabled(readAutoNextEnabled());
  }, []);

  useEffect(() => {
    setShowAutoNext(false);
  }, [numericId, seasonNum, episodeNum]);

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
    if (type !== "tv") return;
    let cancelled = false;
    setEpisodesLoading(true);
    setDetailError(false);
    setDetails(null);
    setEpisodes([]);
    Promise.all([
      getTitleDetails("tv", numericId),
      getSeasonDetails(numericId, seasonNum),
    ])
      .then(([det, seas]) => {
        if (cancelled) return;
        setDetails(det);
        setEpisodes(seas.episodes || []);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
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
  useDocumentTitle(
    details
      ? `Watch S${seasonNum}E${episodeNum} · ${details.name || details.title || "Series"}`
      : "Watch"
  );
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
    ready: Boolean(details && details.id === numericId) && !kidsRestricted,
  });

  const currentServerObj =
    activeServers.find((s) => s.id === selectedServerId) || activeServers[0];

  const isCurrentWatched = isEpisodeCompleted(
    "tv",
    numericId,
    seasonNum,
    episodeNum
  );

  const prevWatchedRef = useRef(isCurrentWatched);
  useEffect(() => {
    if (!prevWatchedRef.current && isCurrentWatched && autoNextEnabled && nextEp) {
      setShowAutoNext(true);
    }
    prevWatchedRef.current = isCurrentWatched;
  }, [isCurrentWatched, autoNextEnabled, nextEp]);

  const handlePlayNextEpisode = useCallback(() => {
    setShowAutoNext(false);
    if (nextEp) {
      router.push(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`);
    }
  }, [nextEp, router, id, seasonNum]);

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

  const handleMarkWatchedAndAdvance = useCallback(async () => {
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
      if (autoNextEnabled) {
        setShowAutoNext(true);
      } else {
        router.push(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`);
      }
    }
  }, [
    handleProgress,
    recordEpisodeProgress,
    numericId,
    seasonNum,
    episodeNum,
    nextEp,
    autoNextEnabled,
    router,
    id,
  ]);

  const handleRewatch = useCallback(async () => {
    setShowAutoNext(false);
    await resetEpisodeProgress("tv", numericId, seasonNum, episodeNum);
    handleStartOver();
  }, [resetEpisodeProgress, numericId, seasonNum, episodeNum, handleStartOver]);

  const handleToggleAutoNext = () => {
    const next = !autoNextEnabled;
    setAutoNextEnabled(next);
    writeAutoNextEnabled(next);
    if (!next) setShowAutoNext(false);
  };

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
    if (!details || details.id !== numericId || kidsRestricted) return;
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
      } else if (action === "next_episode" && nextEp) {
        e.preventDefault();
        handlePlayNextEpisode();
      } else if (action === "prev_episode" && prevEp) {
        e.preventDefault();
        router.push(`/watch/tv/${id}/${seasonNum}/${prevEp.episode_number}`);
      } else if (action === "next_server") {
        e.preventDefault();
        handleNextServer();
      } else if (action === "retry_frame") {
        e.preventDefault();
        handleRetryFrame();
      } else if (action === "toggle_watched" && !controls?.isDirectMode) {
        e.preventDefault();
        if (isCurrentWatched) {
          void handleRewatch();
        } else {
          void handleMarkWatchedAndAdvance();
        }
      } else if (action === "toggle_shortcuts_help") {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    details,
    numericId,
    kidsRestricted,
    showShortcutsHelp,
    nextEp,
    prevEp,
    router,
    id,
    seasonNum,
    handlePlayNextEpisode,
    handleNextServer,
    handleRetryFrame,
    isCurrentWatched,
    handleRewatch,
    handleMarkWatchedAndAdvance,
  ]);

  // Fail-closed server eligibility gate
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
            This series is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
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
    "tv",
    numericId,
    seasonNum,
    episodeNum,
    { startAtSec }
  );

  const useSandbox = iframeMode === "Strict" && currentServerObj.supportsSandbox;
  const backdropUrl = currentEp?.still_path
    ? `https://image.tmdb.org/t/p/w1280${currentEp.still_path}`
    : details.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
      : null;

  const handleSeasonSwitch = (nextSeason: number) => {
    router.push(`/watch/tv/${id}/${nextSeason}/1`);
  };

  const quickEpisodes = episodes.map((ep) => ({
    number: ep.episode_number,
    title: ep.name && ep.name !== `Episode ${ep.episode_number}` ? ep.name : undefined,
    isCurrent: ep.episode_number === episodeNum,
    isWatched: isEpisodeCompleted("tv", numericId, seasonNum, ep.episode_number),
    onSelect: () => router.push(`/watch/tv/${id}/${seasonNum}/${ep.episode_number}`),
  }));

  return (
    <TheaterPlayerShell
      title={displayTitle}
      subtitle={`Season ${seasonNum} · Episode ${episodeNum}${currentEp?.name ? ` — ${currentEp.name}` : ""}`}
      backdropUrl={backdropUrl}
      onBack={() => router.push(`/title/tv/${id}`)}
      backLabel="Back to series details"
      embedUrl={embedUrl}
      iframeKey={`${currentServerObj.id}-${useSandbox ? "sb" : "nosb"}-${loadAttempts}`}
      iframeTitle={`${displayTitle} S${seasonNum}E${episodeNum} video player`}
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
      currentServerId={currentServerObj.id}
      currentServerName={currentServerObj.name}
      newServers={newServers}
      defaultServers={defaultServers}
      serverHealth={serverHealth}
      onServerChange={handleServerChange}
      onNextServer={handleNextServer}
      onRetryFrame={handleRetryFrame}
      isWatched={isCurrentWatched}
      watchedActionLabel={
        isCurrentWatched ? "Rewatch" : nextEp ? "Watched · Next" : "Mark Watched"
      }
      onToggleWatched={() => {
        if (isCurrentWatched) {
          void handleRewatch();
        } else {
          void handleMarkWatchedAndAdvance();
        }
      }}
      hasPrevEpisode={Boolean(prevEp)}
      hasNextEpisode={Boolean(nextEp)}
      onPrevEpisode={() =>
        prevEp && router.push(`/watch/tv/${id}/${seasonNum}/${prevEp.episode_number}`)
      }
      onNextEpisode={() =>
        nextEp && router.push(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`)
      }
      autoNextEnabled={autoNextEnabled}
      onToggleAutoNext={handleToggleAutoNext}
      quickEpisodes={quickEpisodes}
      startAtSec={startAtSec}
      onDirectProgress={handleProgress}
      onDirectEnded={() => {
        if (nextEp && autoNextEnabled) setShowAutoNext(true);
      }}
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
        <section className="mt-6" aria-label="Season episodes">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-[#F5F5F7]">
              Episodes
            </h2>

            {validSeasons.length > 0 ? (
              <CustomSelect
                value={seasonNum}
                onChange={(val) => handleSeasonSwitch(Number(val))}
                ariaLabel="Select season"
                align="right"
                className="w-36"
                options={validSeasons.map((s) => ({
                  value: s.season_number,
                  label: `Season ${s.season_number}`,
                }))}
              />
            ) : (
              <span className="text-xs font-medium text-[#A1A1AA]">
                Season {seasonNum}
              </span>
            )}
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="aspect-video w-full rounded-lg bg-[#14141A] animate-pulse border border-white/8" />
                  <div className="h-4 w-32 rounded bg-[#14141A] animate-pulse" />
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-[#14141A] p-8 text-center text-sm text-[#A1A1AA]">
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
                    className="group text-left focus-visible:outline-none"
                  >
                    <div
                      className={`relative aspect-video w-full overflow-hidden rounded-lg border transition-colors ${
                        isCurrent
                          ? "border-primary bg-[#1C1C24]"
                          : "border-white/8 bg-[#14141A] group-hover:border-white/25"
                      }`}
                    >
                      {ep.still_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                          alt={ep.name || `Episode ${ep.episode_number}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#A1A1AA]/40">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}

                      {isCurrent && (
                        <div className="absolute inset-0 bg-[#0B0B0F]/55 flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-contrast">
                            <Play className="h-3 w-3 fill-current" /> Now Playing
                          </span>
                        </div>
                      )}

                      {isEpWatched && !isCurrent && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-[#0B0B0F]/85 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Check className="h-3 w-3" /> Watched
                        </span>
                      )}
                    </div>

                    <div className="mt-2 px-0.5">
                      <p
                        className={`text-xs font-medium truncate ${
                          isCurrent
                            ? "text-primary font-semibold"
                            : "text-[#F5F5F7] group-hover:text-white"
                        }`}
                      >
                        {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                      </p>
                      {ep.overview && (
                        <p className="mt-0.5 text-[11px] text-[#A1A1AA] line-clamp-2 leading-snug">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      }
      floatingOverlays={
        <>
          {nextEp && (
            <AutoNextOverlay
              visible={showAutoNext}
              nextEpisodeLabel={`Season ${seasonNum} · Episode ${nextEp.episode_number}`}
              nextEpisodeTitle={nextEp.name || undefined}
              onPlayNext={handlePlayNextEpisode}
              onCancel={() => setShowAutoNext(false)}
            />
          )}
          <WatchShortcutsPopover
            open={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
          />
        </>
      }
    />
  );
}
