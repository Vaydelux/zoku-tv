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
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  AniListMediaDetail,
} from "@/lib/anilist";
import {
  ANIME_EMBED_SERVER_CATALOG,
  DEFAULT_ANIME_SERVER_ID,
  groupAnimeEmbedServers,
  getAnimeServerById,
  getAnimeEmbedUrl,
} from "@/lib/anime-embed";
import {
  useSessionStore,
  useEpisodeProgressStore,
} from "@/stores";
import { Navbar } from "@/components/Navbar";
import { useAnimeWatchProgress } from "@/hooks/useAnimeWatchProgress";
import { ServerSelect } from "@/components/watch/ServerSelect";
import { isAnimeAllowedInKidsMode } from "@/lib/kids-mode";

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
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const { newServers, defaultServers } = useMemo(
    () => groupAnimeEmbedServers(ANIME_EMBED_SERVER_CATALOG),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(ANIME_SERVER_STORAGE_KEY);
      if (saved && ANIME_EMBED_SERVER_CATALOG.some((s) => s.id === saved)) {
        setSelectedServerId(saved);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const handleServerChange = (serverId: string) => {
    setSelectedServerId(serverId);
    setIframeReady(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ANIME_SERVER_STORAGE_KEY, serverId);
      } catch {
        /* ignore */
      }
    }
  };

  const handleNextServer = () => {
    const idx = ANIME_EMBED_SERVER_CATALOG.findIndex(
      (s) => s.id === selectedServerId
    );
    const next =
      ANIME_EMBED_SERVER_CATALOG[(idx + 1) % ANIME_EMBED_SERVER_CATALOG.length];
    if (next) {
      handleServerChange(next.id);
    }
  };

  const handleRetryFrame = () => {
    setIframeReady(false);
    setLoadAttempts((prev) => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  const currentServerObj = getAnimeServerById(selectedServerId);
  const embedUrl = getAnimeEmbedUrl(
    currentServerObj,
    numericId,
    seasonNum,
    episodeNum
  );

  const displayTitle = anime ? getAnimeDisplayTitle(anime) : "Loading Anime...";
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
    ready: Boolean(anime) && !loading && !kidsRestricted,
  });

  if (kidsRestricted && anime) {
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
            This anime is hidden because the active profile ({currentProfile?.name}) has Kids Mode enabled.
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

  const containerStatusLabel = hasConfirmedPlayback
    ? "Playback Synced"
    : iframeReady
    ? "Container Ready"
    : "Loading Frame...";

  const handleMarkWatchedAndAdvance = () => {
    markCompleted();
    if (hasNext) {
      router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum + 1}`);
    }
  };

  const handleRewatch = () => {
    resetProgress();
  };

  const episodeNumbers = Array.from(
    { length: Math.min(totalEpisodes, 100) },
    (_, i) => i + 1
  );

  return (
    <div className="min-h-screen bg-[#070a10] text-white pt-28 md:pt-20 pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <header className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-4 py-3 sm:py-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.push(`/anime/${anilistId}`)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Back to anime details"
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
                showToolsPanel || sandbox
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
                    setSandbox(!sandbox);
                    setIframeReady(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium border transition-colors ${
                    sandbox
                      ? "bg-green-500/15 text-green-300 border-green-500/30"
                      : "bg-white/[0.04] text-white/80 border-white/10 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {sandbox ? (
                      <Shield className="w-4 h-4 text-green-400" />
                    ) : (
                      <ShieldOff className="w-4 h-4 text-white/50" />
                    )}
                    Iframe Sandbox (Ad-Block)
                  </span>
                  <span className="font-mono text-[11px]">
                    {sandbox ? "ON" : "OFF"}
                  </span>
                </button>
                <p className="mt-2.5 text-[11px] leading-relaxed text-white/50">
                  Anime streams are served by third-party providers. If an episode fails to load on the current server, click{" "}
                  <strong className="text-white/80">Retry</strong> or switch to another provider.
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
          {(loading || !iframeReady) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0d111a]/95 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-base font-semibold text-white">
                  {loading ? "Loading anime metadata..." : "External video player"}
                </p>
                <p className="text-xs text-white/55">
                  Unmodified third-party iframe ({currentServerObj.name}) · Waiting for provider frame
                </p>
              </div>
              {!loading && (
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
              )}
            </div>
          )}

          {!loading && (
            <iframe
              key={`${currentServerObj.id}-${sandbox ? "sb" : "nosb"}-${loadAttempts}`}
              src={embedUrl}
              title={`${displayTitle} Episode ${episodeNum} external video player`}
              className="h-full w-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
              onLoad={() => setIframeReady(true)}
              {...(sandbox
                ? {
                    sandbox:
                      "allow-scripts allow-same-origin allow-forms allow-presentation",
                  }
                : {})}
            />
          )}
        </div>

        {/* Control Bar Below Player */}
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: ServerSelect + Retry + Next Server */}
          <div className="flex flex-wrap items-center gap-2">
            <ServerSelect
              value={currentServerObj.id}
              onChange={handleServerChange}
              newServers={newServers}
              defaultServers={defaultServers}
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

          {/* Right: Watched + Previous + Next > */}
          <div className="flex flex-wrap items-center gap-2">
            {isCompleted ? (
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
                <span>{hasNext ? "Watched · Next" : "Mark Watched"}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!hasPrev}
              onClick={() =>
                hasPrev &&
                router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum - 1}`)
              }
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-[#141923] px-3.5 sm:px-4 text-xs font-semibold text-white/90 hover:border-white/20 hover:bg-[#1b2230] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!hasNext}
              onClick={() =>
                hasNext &&
                router.push(`/watch/anime/${anilistId}/${seasonNum}/${episodeNum + 1}`)
              }
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-[#1b263b] px-3.5 sm:px-4 text-xs font-semibold text-white hover:bg-[#23314d] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Episodes Section Below Divider */}
        <section className="mt-6 border-t border-white/10 pt-6" aria-label="Anime episodes">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-display font-bold text-white">
              Episodes
            </h2>
            <span className="rounded-xl border border-white/10 bg-[#141923] px-3.5 py-1.5 text-xs font-semibold text-white/80">
              Season {seasonNum}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodeNumbers.map((epNum) => {
              const streamEp = anime?.streamingEpisodes?.[epNum - 1];
              const isCurrent = epNum === episodeNum;
              const isEpWatched = isEpisodeCompleted(
                "anime",
                numericId,
                seasonNum,
                epNum
              );
              const thumbUrl =
                streamEp?.thumbnail ||
                anime?.bannerImage ||
                anime?.coverImage?.extraLarge ||
                null;

              return (
                <button
                  key={epNum}
                  type="button"
                  onClick={() =>
                    router.push(`/watch/anime/${anilistId}/${seasonNum}/${epNum}`)
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
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={streamEp?.title || `Episode ${epNum}`}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
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
                        isCurrent
                          ? "text-primary"
                          : "text-white/85 group-hover:text-white"
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
      </div>
    </div>
  );
}
