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
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  AniListMediaDetail,
} from "@/lib/anilist";
import {
  DEFAULT_ANIME_SERVER_ID,
  groupAnimeEmbedServers,
  getAnimeEmbedUrl,
} from "@/lib/anime-embed";
import { resolveActiveAnimeServers } from "@/lib/dynamic-servers";
import {
  useSessionStore,
  useEpisodeProgressStore,
  useDynamicServerStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useAnimeWatchProgress } from "@/hooks/useAnimeWatchProgress";
import { AutoNextOverlay, WatchShortcutsPopover } from "@/components/watch/AutoNextOverlay";
import { TheaterPlayerShell } from "@/components/watch/TheaterPlayerShell";
import { isAnimeAllowedInKidsMode } from "@/lib/kids-mode";
import {
  readAutoNextEnabled,
  writeAutoNextEnabled,
  resolveWatchShortcutAction,
  shouldIgnoreShortcutTarget,
} from "@/lib/watch-shortcuts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const ANIME_SERVER_STORAGE_KEY = "zoku_selected_anime_server_id";

export default function WatchAnimePage({
  params,
}: {
  params: Promise<{ anilistId: string; season: string; episode: string }>;
}) {
  const { anilistId, season, episode } = use(params);
  const router = useRouter();
  const numericId = Number(anilistId);
  const seasonNum = Math.max(1, Number(season) || 1);
  const episodeNum = Math.max(1, Number(episode) || 1);

  const { currentProfile } = useSessionStore();
  const isEpisodeCompleted = useEpisodeProgressStore((s) => s.isEpisodeCompleted);

  const [anime, setAnime] = useState<AniListMediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServerId, setSelectedServerId] = useState<string>(
    DEFAULT_ANIME_SERVER_ID
  );
  const [sandbox, setSandbox] = useState(false);
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
  const activeAnimeServers = useMemo(
    () => resolveActiveAnimeServers(serverConfig),
    [serverConfig]
  );

  const { newServers, defaultServers } = useMemo(
    () => groupAnimeEmbedServers(activeAnimeServers),
    [activeAnimeServers]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(ANIME_SERVER_STORAGE_KEY);
      if (saved && activeAnimeServers.some((s) => s.id === saved)) {
        setSelectedServerId(saved);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [activeAnimeServers]);

  const currentServerObj =
    activeAnimeServers.find((s) => s.id === selectedServerId) ||
    activeAnimeServers[0];

  const handleServerChange = useCallback((serverId: string) => {
    setSelectedServerId(serverId);
    setIframeReady(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ANIME_SERVER_STORAGE_KEY, serverId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleNextServer = useCallback(() => {
    if (!currentServerObj) return;
    const idx = activeAnimeServers.findIndex(
      (s) => s.id === currentServerObj.id
    );
    const next = activeAnimeServers[(idx + 1) % activeAnimeServers.length];
    if (next) {
      handleServerChange(next.id);
    }
  }, [activeAnimeServers, currentServerObj, handleServerChange]);

  const handleRetryFrame = useCallback(() => {
    setIframeReady(false);
    setLoadAttempts((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnime(null);
    getAnimeDetails(numericId)
      .then((res) => {
        if (!cancelled) setAnime(res);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  useEffect(() => {
    setIframeReady(false);
  }, [selectedServerId, numericId, seasonNum, episodeNum, sandbox]);

  const embedUrl = getAnimeEmbedUrl(
    currentServerObj,
    numericId,
    seasonNum,
    episodeNum
  );

  const displayTitle = anime ? getAnimeDisplayTitle(anime) : "Loading Anime...";
  useDocumentTitle(
    anime ? `Watch Ep ${episodeNum} · ${getAnimeDisplayTitle(anime)}` : "Watch Anime"
  );
  const totalEpisodes = Math.max(
    episodeNum,
    anime?.episodes || anime?.streamingEpisodes?.length || 12
  );
  const hasPrev = episodeNum > 1;
  const hasNext = episodeNum < totalEpisodes;

  const kidsRestricted = Boolean(
    currentProfile?.kidMode && anime && !isAnimeAllowedInKidsMode(anime)
  );

  const {
    isCompleted,
    hasConfirmedPlayback,
    markCompleted,
    resetProgress,
  } = useAnimeWatchProgress({
    anilistId: numericId,
    season: seasonNum,
    episode: episodeNum,
    title: anime ? getAnimeDisplayTitle(anime) : "",
    overview: anime?.description ?? null,
    poster: anime ? getAnimePoster(anime) : null,
    voteAverage: anime?.averageScore ? anime.averageScore / 10 : null,
    selectedServerId: currentServerObj.id,
    serverDomains: currentServerObj.domains,
    embedUrl,
    ready: Boolean(anime && anime.id === numericId) && !loading && !kidsRestricted,
  });

  const prevCompletedRef = useRef(isCompleted);
  useEffect(() => {
    if (!prevCompletedRef.current && isCompleted && autoNextEnabled && hasNext) {
      setShowAutoNext(true);
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted, autoNextEnabled, hasNext]);

  const handlePlayNextEpisode = useCallback(() => {
    setShowAutoNext(false);
    if (hasNext) {
      router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum + 1}`);
    }
  }, [hasNext, router, anilistId, seasonNum, episodeNum]);

  const handleMarkWatchedAndAdvance = useCallback(() => {
    markCompleted();
    if (hasNext) {
      if (autoNextEnabled) {
        setShowAutoNext(true);
      } else {
        router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum + 1}`);
      }
    }
  }, [markCompleted, hasNext, autoNextEnabled, router, anilistId, seasonNum, episodeNum]);

  const handleRewatch = useCallback(() => {
    setShowAutoNext(false);
    resetProgress();
  }, [resetProgress]);

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
    if (!anime || anime.id !== numericId || kidsRestricted) return;
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
      } else if (action === "next_episode" && hasNext) {
        e.preventDefault();
        handlePlayNextEpisode();
      } else if (action === "prev_episode" && hasPrev) {
        e.preventDefault();
        router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum - 1}`);
      } else if (action === "next_server") {
        e.preventDefault();
        handleNextServer();
      } else if (action === "retry_frame") {
        e.preventDefault();
        handleRetryFrame();
      } else if (action === "toggle_watched" && !controls?.isDirectMode) {
        e.preventDefault();
        if (isCompleted) {
          handleRewatch();
        } else {
          handleMarkWatchedAndAdvance();
        }
      } else if (action === "toggle_shortcuts_help") {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    anime,
    numericId,
    kidsRestricted,
    showShortcutsHelp,
    hasNext,
    hasPrev,
    router,
    anilistId,
    seasonNum,
    episodeNum,
    handlePlayNextEpisode,
    handleNextServer,
    handleRetryFrame,
    isCompleted,
    handleRewatch,
    handleMarkWatchedAndAdvance,
  ]);

  // No third-party player can mount until the trusted AniList endpoint confirms
  // that this exact ID is allowed under the active adult-content policy.
  if (!anime || anime.id !== numericId) {
    return (
      <div
        className="min-h-[100dvh] bg-background text-on-surface flex flex-col items-center justify-center gap-5 p-6 text-center"
        data-testid="anime-adult-content-gate"
      >
        <Navbar />
        <ShieldAlert className="h-10 w-10 text-primary" />
        <p className="text-on-surface-variant text-sm">
          {loading
            ? "Checking anime availability…"
            : "This anime is unavailable or restricted by the content filter."}
        </p>
        <Link
          href="/home"
          className="rounded-lg bg-primary text-primary-contrast px-5 py-3 font-semibold"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (kidsRestricted && anime) {
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
            This anime is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
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

  const episodeNumbers = Array.from(
    { length: Math.min(totalEpisodes, 100) },
    (_, i) => i + 1
  );

  const backdropUrl =
    anime.streamingEpisodes?.[episodeNum - 1]?.thumbnail ||
    anime.bannerImage ||
    getAnimePoster(anime);

  const quickEpisodes = episodeNumbers.map((epNum) => {
    const streamEp = anime.streamingEpisodes?.[epNum - 1];
    return {
      number: epNum,
      title: streamEp?.title || undefined,
      isCurrent: epNum === episodeNum,
      isWatched: isEpisodeCompleted("anime", numericId, seasonNum, epNum),
      onSelect: () => router.push(`/watch/anime/${anilistId}/${seasonNum}/${epNum}`),
    };
  });

  return (
    <TheaterPlayerShell
      title={displayTitle}
      subtitle={`Season ${seasonNum} · Episode ${episodeNum}`}
      backdropUrl={backdropUrl}
      onBack={() => router.push(`/anime/${anilistId}`)}
      backLabel="Back to anime details"
      embedUrl={embedUrl}
      iframeKey={`${currentServerObj.id}-${sandbox ? "sb" : "nosb"}-${loadAttempts}`}
      iframeTitle={`${displayTitle} Episode ${episodeNum} video player`}
      iframeReady={iframeReady}
      onIframeLoad={() => setIframeReady(true)}
      sandboxPolicy="allow-scripts allow-same-origin allow-forms allow-presentation"
      useSandbox={sandbox}
      sandboxLabel="Iframe Sandbox (Ad-Block)"
      onToggleSandbox={() => {
        setSandbox((prev) => !prev);
        setIframeReady(false);
      }}
      hasConfirmedPlayback={hasConfirmedPlayback}
      isLoadingMetadata={loading}
      currentServerId={currentServerObj.id}
      currentServerName={currentServerObj.name}
      newServers={newServers}
      defaultServers={defaultServers}
      onServerChange={handleServerChange}
      onNextServer={handleNextServer}
      onRetryFrame={handleRetryFrame}
      isWatched={isCompleted}
      watchedActionLabel={
        isCompleted ? "Rewatch" : hasNext ? "Watched · Next" : "Mark Watched"
      }
      onToggleWatched={() => {
        if (isCompleted) {
          handleRewatch();
        } else {
          handleMarkWatchedAndAdvance();
        }
      }}
      hasPrevEpisode={hasPrev}
      hasNextEpisode={hasNext}
      onPrevEpisode={() =>
        hasPrev && router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum - 1}`)
      }
      onNextEpisode={() =>
        hasNext && router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum + 1}`)
      }
      autoNextEnabled={autoNextEnabled}
      onToggleAutoNext={handleToggleAutoNext}
      quickEpisodes={quickEpisodes}
      onDirectEnded={() => {
        if (hasNext && autoNextEnabled) setShowAutoNext(true);
      }}
      showShortcutsHelp={showShortcutsHelp}
      onToggleShortcutsHelp={() => setShowShortcutsHelp((prev) => !prev)}
      onRegisterTheaterControls={registerTheaterControls}
      belowStageContent={
        <section className="mt-6" aria-label="Anime episodes">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-[#F5F5F7]">
              Episodes
            </h2>
            <span className="rounded-lg border border-white/10 bg-[#14141A] px-3 py-1.5 text-xs font-medium text-[#A1A1AA]">
              Season {seasonNum}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodeNumbers.map((epNum) => {
              const streamEp = anime.streamingEpisodes?.[epNum - 1];
              const isCurrent = epNum === episodeNum;
              const isEpWatched = isEpisodeCompleted(
                "anime",
                numericId,
                seasonNum,
                epNum
              );
              const thumbUrl =
                streamEp?.thumbnail ||
                anime.bannerImage ||
                anime.coverImage?.extraLarge ||
                null;

              return (
                <button
                  key={epNum}
                  type="button"
                  onClick={() =>
                    router.push(`/watch/anime/${anilistId}/${seasonNum}/${epNum}`)
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
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={streamEp?.title || `Episode ${epNum}`}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.03]"
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
                      Episode {epNum}
                      {streamEp?.title ? ` · ${streamEp.title}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      }
      floatingOverlays={
        <>
          {hasNext && (
            <AutoNextOverlay
              visible={showAutoNext}
              nextEpisodeLabel={`Season ${seasonNum} · Episode ${episodeNum + 1}`}
              nextEpisodeTitle={anime.streamingEpisodes?.[episodeNum]?.title || undefined}
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
