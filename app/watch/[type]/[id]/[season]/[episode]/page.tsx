"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  AlertTriangle,
  MonitorPlay,
  LayoutGrid
} from "lucide-react";
import { useSessionStore, useEmbedStore } from "@/stores";
import { EMBED_SERVER_CATALOG, getEmbedUrl } from "@/lib/embed";
import { getTitleDetails, getSeasonDetails, TMDBTitle, TMDBSeasonDetail } from "@/lib/tmdb";

interface TVWatchPageProps {
  params: Promise<{ type: string; id: string; season: string; episode: string }>;
}

export default function TVWatchPage({ params }: TVWatchPageProps) {
  const router = useRouter();
  const { type, id, season, episode } = use(params);
  
  const mediaType = type as "movie" | "tv";
  const titleId = Number(id);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  const { user, currentProfile, initializing } = useSessionStore();
  const { 
    selectedServerId, 
    iframeMode, 
    setServerId, 
    setIframeMode, 
    markServerFailing, 
    serverHealth 
  } = useEmbedStore();

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [seasonDetail, setSeasonDetail] = useState<TMDBSeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const healthTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirection guard
  useEffect(() => {
    if (!initializing) {
      if (!user) {
        router.replace("/login");
      } else if (!currentProfile) {
        router.replace("/profiles");
      }
    }
  }, [user, currentProfile, initializing, router]);

  // Fetch TV Details and active season details
  useEffect(() => {
    if (!user || !currentProfile || !titleId) return;

    async function loadTVDetails() {
      setLoading(true);
      try {
        const info = await getTitleDetails("tv", titleId);
        setDetails(info);
        if (typeof window !== "undefined") {
          localStorage.setItem("zoku_last_viewed", JSON.stringify({
            id: info.id,
            title: info.name || info.title,
            overview: info.overview,
            poster_path: info.poster_path,
            backdrop_path: info.backdrop_path,
            media_type: "tv",
            vote_average: info.vote_average,
            season: seasonNum,
            episode: episodeNum,
            viewedAt: new Date().toISOString()
          }));
        }

        const seasonInfo = await getSeasonDetails(titleId, seasonNum);
        setSeasonDetail(seasonInfo);
      } catch (err) {
        console.error("Failed to load TV details/season details", err);
      } finally {
        setLoading(false);
      }
    }

    loadTVDetails();
  }, [user, currentProfile, titleId, seasonNum]);

  // Overlay mousemove fade control
  const resetOverlayTimer = () => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 4000);
  };

  useEffect(() => {
    window.addEventListener("mousemove", resetOverlayTimer);
    resetOverlayTimer();
    return () => {
      window.removeEventListener("mousemove", resetOverlayTimer);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  // Server health timer
  useEffect(() => {
    setIframeLoaded(false);
    if (healthTimerRef.current) clearTimeout(healthTimerRef.current);

    healthTimerRef.current = setTimeout(() => {
      if (!iframeLoaded && details) {
        console.warn(`Zoku TV: Server ${selectedServerId} timeout on TV episode. Fallback recommended.`);
      }
    }, 12000);

    return () => {
      if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
    };
  }, [selectedServerId, seasonNum, episodeNum, loadAttempts]);

  if (initializing || !user || !currentProfile || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details || !seasonDetail) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white gap-4">
        <p>TV details or season information could not be found.</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold">
          Return
        </button>
      </div>
    );
  }

  const selectedServer = EMBED_SERVER_CATALOG.find(s => s.id === selectedServerId) || EMBED_SERVER_CATALOG[0];
  const embedUrl = getEmbedUrl(selectedServer, "tv", titleId, seasonNum, episodeNum);

  const handleServerChange = (serverId: string) => {
    setServerId(serverId);
    setLoadAttempts(prev => prev + 1);
  };

  const handleIframeModeToggle = () => {
    if (iframeMode === "Strict") {
      setShowCompatibilityWarning(true);
    } else {
      setIframeMode("Strict");
    }
  };

  const acceptCompatibilityMode = () => {
    setIframeMode("Compatibility");
    setShowCompatibilityWarning(false);
    setLoadAttempts(prev => prev + 1);
  };

  const triggerNextServer = () => {
    markServerFailing(selectedServerId);
    const currentIndex = EMBED_SERVER_CATALOG.findIndex(s => s.id === selectedServerId);
    const nextIndex = (currentIndex + 1) % EMBED_SERVER_CATALOG.length;
    setServerId(EMBED_SERVER_CATALOG[nextIndex].id);
    setLoadAttempts(prev => prev + 1);
  };

  // Navigating between episodes logically
  const totalEpisodes = seasonDetail.episodes?.length || 0;
  const hasPreviousEpisode = episodeNum > 1;
  const hasNextEpisode = episodeNum < totalEpisodes;

  const navigateToPrevious = () => {
    if (hasPreviousEpisode) {
      router.push(`/watch/tv/${titleId}/${seasonNum}/${episodeNum - 1}`);
    }
  };

  const navigateToNext = () => {
    if (hasNextEpisode) {
      router.push(`/watch/tv/${titleId}/${seasonNum}/${episodeNum + 1}`);
    } else {
      // Look for next season
      const currentSeasonIndex = details.seasons?.findIndex(s => s.season_number === seasonNum) ?? -1;
      const nextSeason = details.seasons?.[currentSeasonIndex + 1];
      if (nextSeason && nextSeason.season_number > 0) {
        router.push(`/watch/tv/${titleId}/${nextSeason.season_number}/1`);
      }
    }
  };

  const activeEpisode = seasonDetail.episodes?.find(e => e.episode_number === episodeNum);
  const name = details.name || details.title || "TV Series";

  return (
    <div className="relative w-screen h-screen bg-black overflow-y-auto flex flex-col justify-between">
      
      {/* 1. Control Header (Server Selector & Sandbox Containment Modes) */}
      <div className="relative z-30 w-full bg-gradient-to-b from-black/95 to-black/40 px-4 py-3 sm:px-6 lg:px-8 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/title/tv/${titleId}`)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-xs">{name}</h1>
            <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider">
              S{seasonNum} : E{episodeNum} {activeEpisode?.name ? `- ${activeEpisode.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {/* Server Selector */}
          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-2 py-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/60 hidden sm:inline px-1">Server:</span>
            <select
              value={selectedServerId}
              onChange={(e) => handleServerChange(e.target.value)}
              className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {EMBED_SERVER_CATALOG.map((server) => (
                <option key={server.id} value={server.id} className="bg-neutral-900 text-white text-xs">
                  {server.name} {serverHealth[server.id]?.status === "failing" ? "⚠️" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* IFrame mode controller */}
          <button
            onClick={handleIframeModeToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
              iframeMode === "Strict" 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            {iframeMode === "Strict" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Containment: {iframeMode}</span>
          </button>

          {/* Force reload fallback */}
          <button
            onClick={triggerNextServer}
            className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Next server backup fallback"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

        </div>
      </div>

      {/* 2. Primary Embedded Player (Strictly formatted height) */}
      <div className="relative w-full aspect-[16/9] md:h-[65dvh] lg:h-[70dvh] bg-neutral-950 shrink-0">
        
        {/* Loader status */}
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-mono text-white/60">Launching broadcast tunnel to server {selectedServer.name}...</p>
            <button 
              onClick={triggerNextServer}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] text-white transition-all font-semibold"
            >
              <span>Switch Server Fallback</span>
            </button>
          </div>
        )}

        {/* Sandboxed player element */}
        <iframe
          key={`${selectedServerId}_tv_${seasonNum}_${episodeNum}_${loadAttempts}`}
          src={embedUrl}
          onLoad={() => setIframeLoaded(true)}
          className="w-full h-full border-0 absolute inset-0 z-0 bg-black"
          allowFullScreen
          sandbox={iframeMode === "Strict" ? selectedServer.sandboxPolicy : undefined}
          referrerPolicy="no-referrer"
        />

        {/* Auto-fading HUD overlay */}
        {showOverlay && iframeLoaded && (
          <div className="absolute top-4 left-4 sm:left-6 z-20 pointer-events-none transition-opacity duration-500 bg-black/70 backdrop-blur-md border border-white/5 px-4 py-2 rounded-xl text-white">
            <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-widest">{selectedServer.name}</span>
            <h3 className="text-xs font-semibold leading-tight mt-0.5">S{seasonNum} : E{episodeNum} {activeEpisode?.name ? `- ${activeEpisode.name}` : ""}</h3>
          </div>
        )}

      </div>

      {/* 3. Season & Episode Navigation Control Panel (Positioned cleanly below player) */}
      <div className="flex-1 w-full bg-neutral-950 text-white border-t border-white/5 p-4 sm:p-6 space-y-6">
        
        {/* Prev / Next Episode CTAs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold">Currently streaming</span>
            <h2 className="text-sm font-semibold">{activeEpisode?.name || `Episode ${episodeNum}`}</h2>
            <p className="text-xs text-white/60 max-w-xl leading-relaxed">{activeEpisode?.overview || "No episode synopsis available."}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={navigateToPrevious}
              disabled={!hasPreviousEpisode}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 hover:border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Ep</span>
            </button>

            <button
              onClick={navigateToNext}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-opacity-95 px-4 py-2.5 text-xs font-bold text-white transition-all shadow"
            >
              <span>Next Episode</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Click-to-Play Episode List Panel */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/55 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span>Quick-Switch Season Episodes</span>
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {seasonDetail.episodes?.map((ep) => {
              const isActive = ep.episode_number === episodeNum;
              return (
                <button
                  key={ep.id}
                  onClick={() => router.push(`/watch/tv/${titleId}/${seasonNum}/${ep.episode_number}`)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isActive 
                      ? "bg-primary/20 border-primary text-primary" 
                      : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10 text-white/80 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] font-mono text-white/50">Episode {ep.episode_number}</span>
                  <span className="text-xs font-semibold truncate w-full mt-0.5">{ep.name || `Episode ${ep.episode_number}`}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Compatibility Warning Modal Overlay */}
      {showCompatibilityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/20 bg-neutral-950 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Disable Containment Sandbox?</h3>
            </div>
            
            <p className="text-xs text-white/70 leading-relaxed">
              Compatibility mode removes the sandboxed frame wall. Third-party ad scripts, popup links, and redirects will be allowed to execute natively in your browser. 
            </p>
            <p className="text-[10px] text-amber-400 font-semibold leading-snug">
              Ensure you have an active ad blocker running before continuing.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCompatibilityWarning(false)}
                className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold transition-colors text-white"
              >
                Keep Protected
              </button>
              <button
                onClick={acceptCompatibilityMode}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-colors"
              >
                Disable Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
