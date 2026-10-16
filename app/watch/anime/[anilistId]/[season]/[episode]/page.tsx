"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useSessionStore, useContinueWatchingStore } from "@/stores";
import { getAnimeDetails, getAnimeDisplayTitle, getAnimePoster } from "@/lib/anilist";
import { buildAnimeSeasons, getNextEpisode, getPreviousEpisode } from "@/lib/anilist-seasons";
import {
  ANIME_EMBED_SERVER_CATALOG,
  DEFAULT_ANIME_SERVER_ID,
  getAnimeEmbedUrl,
  getAnimeServerById,
  groupAnimeEmbedServers,
} from "@/lib/anime-embed";
import { RECORD_DEBOUNCE_MS } from "@/lib/continue-watching";
import { ServerSelect } from "@/components/watch/ServerSelect";

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
  const { recordWatching } = useContinueWatchingStore();

  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [voteAverage, setVoteAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState(DEFAULT_ANIME_SERVER_ID);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const { newServers, defaultServers } = groupAnimeEmbedServers();
  const selectedServer = getAnimeServerById(selectedServerId);
  const embedUrl = getAnimeEmbedUrl(selectedServer, anilistId, seasonNum, episodeNum);

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
        }
      } catch (err) {
        console.error("Failed to load anime watch metadata", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentProfile, anilistId]);

  useEffect(() => {
    setIframeLoaded(false);
  }, [selectedServerId, anilistId, seasonNum, episodeNum, loadAttempts]);

  const recordSession = useCallback(() => {
    if (!title) return;
    recordWatching({
      media_type: "anime",
      anilistId,
      season: seasonNum,
      episode: episodeNum,
      title,
      overview,
      vote_average: voteAverage,
      poster_path: poster,
    });
  }, [title, overview, voteAverage, poster, anilistId, seasonNum, episodeNum, recordWatching]);

  useEffect(() => {
    if (!title) return;
    const timer = setTimeout(recordSession, RECORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, recordSession]);

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
    const data = await getAnimeDetails(anilistId);
    if (!data) return;
    const seasons = buildAnimeSeasons(data);
    const target =
      direction === "next"
        ? getNextEpisode(seasons, seasonNum, episodeNum)
        : getPreviousEpisode(seasons, seasonNum, episodeNum);
    if (target) {
      router.push(`/watch/anime/${target.anilistId}/${target.season}/${target.episode}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col">
      <div className="relative z-30 w-full bg-gradient-to-b from-black/95 to-black/40 px-4 py-3 sm:px-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push(`/anime/${anilistId}`)} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{title || "Anime"}</h1>
            <p className="text-[10px] text-white/60 font-mono uppercase">
              S{seasonNum} · E{episodeNum} · {selectedServer.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ServerSelect
            value={selectedServerId}
            onChange={handleServerChange}
            newServers={newServers}
            defaultServers={defaultServers}
          />
          <button
            onClick={triggerNextServer}
            className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Switch to next anime server"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigateRelative("prev")}
            className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-white/5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            onClick={() => navigateRelative("next")}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[10px] font-bold text-white"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-0 bg-black overflow-hidden isolate">
        <div className="absolute inset-0 bg-neutral-950">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-mono text-white/60">Loading {selectedServer.name} player...</p>
              <button
                onClick={triggerNextServer}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] text-white transition-all font-semibold"
              >
                Cycle Server Fallback
              </button>
            </div>
          )}

          <iframe
            key={`${selectedServerId}_${anilistId}_${seasonNum}_${episodeNum}_${loadAttempts}`}
            src={embedUrl}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 absolute inset-0 z-0 bg-black"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            title={`${selectedServer.name} anime player`}
          />
        </div>
      </div>

      <div className="bg-black text-[9.5px] font-mono text-center py-2 text-white/40 border-t border-white/5 shrink-0">
        Streamed via {selectedServer.name} embed. Zoku TV does not host video files.
      </div>
    </div>
  );
}
