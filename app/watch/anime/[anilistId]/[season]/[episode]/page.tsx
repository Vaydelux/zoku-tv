"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  MonitorPlay,
  Play,
  Crosshair,
} from "lucide-react";
import { useSessionStore, useEpisodeProgressStore } from "@/stores";
import { getAnimeDetails, getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { buildAnimeSeasons, getNextEpisode, getPreviousEpisode, type AnimeSeason } from "@/lib/anilist-seasons";
import {
  ANIME_EMBED_SERVER_CATALOG,
  DEFAULT_ANIME_SERVER_ID,
  getAnimeEmbedUrl,
  getAnimeServerById,
  groupAnimeEmbedServers,
} from "@/lib/anime-embed";
import { ServerSelect } from "@/components/watch/ServerSelect";
import { EpisodeThumbnailWithProgress } from "@/components/EpisodeThumbnailWithProgress";
import { useAnimeWatchProgress } from "@/hooks/useAnimeWatchProgress";

const ANIME_SERVER_STORAGE_KEY = "zoku_anime_server_id";

interface AnimeWatchPageProps {
  params: Promise<{ anilistId: string; season: string; episode: string }>;
}

function readStoredAnimeServerId(): string {
  if (typeof window === "undefined") return DEFAULT_ANIME_SERVER_ID;
  const stored = localStorage.getItem(ANIME_SERVER_STORAGE_KEY);
  if (stored && ANIME_EMBED_SERVER_CATALOG.some((s) => s.id === stored)) {
    return stored;
  }
  return DEFAULT_ANIME_SERVER_ID;
}

export default function AnimeWatchPage({ params }: AnimeWatchPageProps) {
  const router = useRouter();
  const { anilistId: anilistIdStr, season, episode } = use(params);
  const anilistId = Number(anilistIdStr);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  const { currentProfile } = useSessionStore();
  const { getProgress } = useEpisodeProgressStore();

  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [voteAverage, setVoteAverage] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [activeSeasonNum, setActiveSeasonNum] = useState(seasonNum);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState(DEFAULT_ANIME_SERVER_ID);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { newServers, defaultServers } = groupAnimeEmbedServers();
  const selectedServer = getAnimeServerById(selectedServerId);
  const embedUrl = getAnimeEmbedUrl(selectedServer, anilistId, seasonNum, episodeNum);

  // Hook up automated anime episode progress tracking & DB synchronization
  const {
    progressPercent,
    isCompleted,
    markCompleted,
    resetProgress,
  } = useAnimeWatchProgress({
    anilistId,
    season: seasonNum,
    episode: episodeNum,
    title,
    overview,
    poster,
    voteAverage,
    selectedServerId,
    serverDomains: selectedServer.domains,
    embedUrl,
    ready: !loading && Boolean(title),
  });

  useEffect(() => {
    setSelectedServerId(readStoredAnimeServerId());
  }, []);

  useEffect(() => {
    if (!currentProfile || !anilistId) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getAnimeDetails(anilistId);
        if (data) {
          setTitle(getAnimeDisplayTitle(data));
          setOverview(data.description ?? null);
          setPoster(getAnimePoster(data));
          setVoteAverage(data.averageScore ? data.averageScore / 10 : null);
          const built = buildAnimeSeasons(data);
          setSeasons(built);
          setActiveSeasonNum(seasonNum);
        }
      } catch (err) {
        console.error("Failed to load anime watch metadata", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentProfile, anilistId, seasonNum]);

  useEffect(() => {
    setIframeLoaded(false);
    const unblockTimer = setTimeout(() => {
      setIframeLoaded(true);
    }, 2200);
    return () => clearTimeout(unblockTimer);
  }, [selectedServerId, anilistId, seasonNum, episodeNum, loadAttempts]);

  const handleServerChange = (serverId: string) => {
    setSelectedServerId(serverId);
    setLoadAttempts((prev) => prev + 1);
    if (typeof window !== "undefined") {
      localStorage.setItem(ANIME_SERVER_STORAGE_KEY, serverId);
    }
  };

  const triggerNextServer = () => {
    const currentIndex = ANIME_EMBED_SERVER_CATALOG.findIndex((s) => s.id === selectedServerId);
    const nextIndex = (currentIndex + 1) % ANIME_EMBED_SERVER_CATALOG.length;
    handleServerChange(ANIME_EMBED_SERVER_CATALOG[nextIndex].id);
  };

  const navigateRelative = async (direction: "prev" | "next") => {
    if (seasons.length === 0) return;
    const target =
      direction === "next"
        ? getNextEpisode(seasons, seasonNum, episodeNum)
        : getPreviousEpisode(seasons, seasonNum, episodeNum);
    if (target) {
      router.push(`/watch/anime/${target.anilistId}/${target.season}/${target.episode}`);
    }
  };

  const activeSeasonData =
    seasons.find((s) => s.seasonNumber === activeSeasonNum) ||
    seasons.find((s) => s.seasonNumber === seasonNum) ||
    seasons[0];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-y-auto flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* 1. Header Toolbar */}
      <div className="sticky top-0 z-40 w-full bg-gradient-to-b from-black/95 via-black/80 to-transparent px-4 py-3 sm:px-6 border-b border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push(`/anime/${anilistId}`)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            title="Back to anime details"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{title || "Anime"}</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono uppercase">
              <span>S{seasonNum} · E{episodeNum}</span>
              <span>·</span>
              <span>{selectedServer.name}</span>
              {progressPercent > 0 && (
                <>
                  <span>·</span>
                  <span className={isCompleted ? "text-emerald-400 font-bold" : "text-primary font-bold"}>
                    {isCompleted ? "Watched" : `${progressPercent}%`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quick Mark Completed / Reset button */}
          {isCompleted ? (
            <button
              onClick={resetProgress}
              data-testid="anime-reset-progress-btn"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
              title="Reset episode progress to 0%"
            >
              <RotateCcw className="h-3 w-3 text-amber-400" />
              <span>Rewatch</span>
            </button>
          ) : (
            <button
              onClick={markCompleted}
              data-testid="anime-mark-completed-btn"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
              title="Mark episode as completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Mark Done</span>
            </button>
          )}

          <ServerSelect
            value={selectedServerId}
            onChange={handleServerChange}
            newServers={newServers}
            defaultServers={defaultServers}
          />

          {/* Target / Focus Player Button */}
          <button
            onClick={() => {
              setIframeLoaded(true);
              iframeRef.current?.focus();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-primary/60 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all"
            title="Focus and target anime player directly for clicks & controls"
          >
            <Crosshair className="h-3 w-3 text-primary" />
            <span className="hidden sm:inline">Target Player</span>
          </button>

          <button
            onClick={triggerNextServer}
            className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Switch to next anime server"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigateRelative("prev")}
            className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            onClick={() => navigateRelative("next")}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-primary/25"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Embedded Video Player */}
      <div className="relative w-full aspect-video max-h-[75vh] bg-black isolate mx-auto">
        {!iframeLoaded && (
          <div
            onClick={() => {
              setIframeLoaded(true);
              iframeRef.current?.focus();
            }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950/90 gap-3 cursor-pointer"
            title="Click anywhere to dismiss and interact directly with anime player"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-mono text-white/60">Loading {selectedServer.name} player...</p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeLoaded(true);
                  iframeRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-contrast text-[11px] font-bold shadow-md active:scale-95 transition-all"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Target & Play Stream</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerNextServer();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] text-white transition-all font-semibold"
              >
                Cycle Server Fallback
              </button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={`${selectedServerId}_${anilistId}_${seasonNum}_${episodeNum}_${loadAttempts}`}
          src={embedUrl}
          onLoad={() => setIframeLoaded(true)}
          tabIndex={0}
          className="w-full h-full border-0 absolute inset-0 z-0 bg-black focus:outline-none"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope; screen-wake-lock; clipboard-write; web-share"
          referrerPolicy="no-referrer"
          title={`${selectedServer.name} anime player`}
        />
      </div>

      {/* 3. Progress Bar directly underneath player */}
      <div
        data-testid="anime-active-progress-bar"
        className="w-full h-1 bg-white/10 relative overflow-hidden"
      >
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted ? "bg-emerald-400" : "bg-primary"
          }`}
          style={{ width: `${isCompleted ? 100 : Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>

      {/* 4. Episode Navigation Grid with persistent progress on thumbnails */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
              Season {activeSeasonNum} Episodes
            </h2>
            <span className="text-xs text-white/40 font-mono">
              ({activeSeasonData?.episodes.length ?? 0})
            </span>
          </div>

          {seasons.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {seasons.map((s) => (
                <button
                  key={s.seasonNumber}
                  onClick={() => setActiveSeasonNum(s.seasonNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeSeasonNum === s.seasonNumber
                      ? "bg-primary text-primary-contrast border-primary"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-white/80"
                  }`}
                >
                  Season {s.seasonNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeSeasonData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {activeSeasonData.episodes.map((ep) => {
              const isActive =
                activeSeasonData.seasonNumber === seasonNum &&
                ep.episodeNumber === episodeNum;
              const epProgress = getProgress(
                "anime",
                activeSeasonData.anilistId,
                activeSeasonData.filmuSeason,
                ep.episodeNumber
              );
              const pct = isActive
                ? progressPercent
                : epProgress?.progress_percent ?? 0;
              const done = isActive
                ? isCompleted
                : Boolean(epProgress?.completed);

              return (
                <button
                  key={ep.episodeNumber}
                  onClick={() =>
                    router.push(
                      `/watch/anime/${activeSeasonData.anilistId}/${activeSeasonData.filmuSeason}/${ep.episodeNumber}`
                    )
                  }
                  data-testid={`anime-episode-item-${ep.episodeNumber}`}
                  className={`group flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isActive
                      ? "bg-primary/20 border-primary shadow-sm shadow-primary/20"
                      : "theme-panel hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <EpisodeThumbnailWithProgress
                    thumbnail={ep.thumbnail}
                    title={ep.title}
                    episodeNumber={ep.episodeNumber}
                    progressPercent={pct}
                    completed={done}
                    aspectRatio="video"
                    className="mb-2 w-full"
                  />
                  <div className="flex items-center justify-between w-full text-[10px] font-mono text-on-surface-variant">
                    <span className={isActive ? "text-primary font-bold" : ""}>
                      EP {ep.episodeNumber}
                    </span>
                    {done ? (
                      <span className="text-emerald-400 font-semibold text-[9px]">Watched</span>
                    ) : pct > 0 ? (
                      <span className="text-primary font-semibold text-[9px]">
                        {Math.round(pct)}%
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold line-clamp-2 mt-0.5 text-white/90">
                    {ep.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Footer */}
      <div className="bg-black text-[9.5px] font-mono text-center py-2.5 text-white/40 border-t border-white/5 shrink-0">
        Streamed via {selectedServer.name} embed. Zoku TV does not host video files.
      </div>
    </div>
  );
}
