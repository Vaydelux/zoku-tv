"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  AlertTriangle,
  Play,
  Crosshair
} from "lucide-react";
import { useSessionStore, useEmbedStore } from "@/stores";
import { EMBED_SERVER_CATALOG, getEmbedUrl, groupEmbedServers } from "@/lib/embed";
import { getTitleDetails, TMDBTitle } from "@/lib/tmdb";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { ResumePrompt } from "@/components/watch/ResumePrompt";
import { ServerSelect } from "@/components/watch/ServerSelect";

interface WatchPageProps {
  params: Promise<{ type: string; id: string }>;
}

export default function WatchMoviePage({ params }: WatchPageProps) {
  const router = useRouter();
  const { type, id } = use(params);
  const mediaType = type as "movie" | "tv";
  const titleId = Number(id);

  const { currentProfile } = useSessionStore();
  const { 
    selectedServerId, 
    iframeMode, 
    setServerId, 
    setIframeMode, 
    markServerFailing, 
    serverHealth 
  } = useEmbedStore();

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const healthTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch title details
  useEffect(() => {
    if (!currentProfile || !titleId) return;

    async function loadTitle() {
      setLoading(true);
      try {
        const data = await getTitleDetails(mediaType, titleId);
        setDetails(data);
      } catch (err) {
        console.error("Failed to load watcher details", err);
      } finally {
        setLoading(false);
      }
    }

    loadTitle();
  }, [currentProfile, mediaType, titleId]);

  // Auto-fading top overlay navigation bar
  const resetOverlayTimer = () => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 4000); // fade out after 4 seconds of stillness
  };

  useEffect(() => {
    window.addEventListener("mousemove", resetOverlayTimer);
    resetOverlayTimer();
    return () => {
      window.removeEventListener("mousemove", resetOverlayTimer);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  // Server health automatic fallback check + unblock timer
  useEffect(() => {
    setIframeLoaded(false);
    if (healthTimerRef.current) clearTimeout(healthTimerRef.current);

    // Auto-unblock after 2.2s so player is immediately clickable even if cross-origin onload is deferred
    const unblockTimer = setTimeout(() => {
      setIframeLoaded(true);
    }, 2200);

    // If iframe doesn't call onload or load within 12 seconds, we offer fallback
    healthTimerRef.current = setTimeout(() => {
      if (!iframeLoaded && details) {
        console.warn(`Zoku TV: Server ${selectedServerId} timeout. Triggering fallback advisor...`);
      }
    }, 12000);

    return () => {
      clearTimeout(unblockTimer);
      if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
    };
  }, [selectedServerId, loadAttempts]);

  const selectedServer = EMBED_SERVER_CATALOG.find((s) => s.id === selectedServerId) || EMBED_SERVER_CATALOG[0];
  const { newServers, defaultServers } = groupEmbedServers();
  const name = details?.title || details?.name || "Untitled";

  const {
    showResumePrompt,
    savedProgress,
    startAtSec,
    handleResume,
    handleStartOver,
  } = useWatchProgress({
    tmdbId: titleId,
    mediaType,
    title: name,
    overview: details?.overview,
    vote_average: details?.vote_average,
    poster_path: details?.poster_path,
    backdrop_path: details?.backdrop_path,
    selectedServerId,
    ready: !!details && !loading,
  });

  const embedUrl = details
    ? getEmbedUrl(selectedServer, mediaType, titleId, 1, 1, { startAtSec })
    : "";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white gap-4">
        <p>Title details could not be loaded.</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold">
          Return
        </button>
      </div>
    );
  }

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

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col justify-between">
      
      {/* 1. Control Header (Server Selection & Sandboxing Modes) */}
      <div className="relative z-30 w-full bg-gradient-to-b from-black/95 to-black/40 px-4 py-3 sm:px-6 lg:px-8 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{name}</h1>
            <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider">{mediaType}</p>
          </div>
        </div>

        {/* Server Selection Controls */}
        <div className="flex items-center gap-3">
          <ServerSelect
            value={selectedServerId}
            onChange={handleServerChange}
            newServers={newServers}
            defaultServers={defaultServers}
            serverHealth={serverHealth}
          />

          {/* IFrame containment controller */}
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

          {/* Target / Focus Player Button */}
          <button
            onClick={() => {
              setIframeLoaded(true);
              iframeRef.current?.focus();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-primary/60 bg-white/5 hover:bg-white/10 text-white text-[10px] font-semibold transition-all"
            title="Focus and target player directly for clicks and controls"
          >
            <Crosshair className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Target Player</span>
          </button>

          {/* Fallback button */}
          <button
            onClick={triggerNextServer}
            className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Switch to next backup server"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

        </div>
      </div>

      {/* 2. Dedicated player shell — iframe fills this box only */}
      <div className="relative flex-1 w-full min-h-0 bg-black overflow-hidden isolate">
        <div className="absolute inset-0 bg-neutral-950">
          {/* Connection status overlay — clickable to dismiss and immediately target player */}
          {!iframeLoaded && !showResumePrompt && (
            <div
              onClick={() => {
                setIframeLoaded(true);
                iframeRef.current?.focus();
              }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950/90 p-6 text-center gap-3 cursor-pointer"
              title="Click anywhere to dismiss and interact directly with player"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-mono text-white/60">Tuning cinematic feed to {selectedServer.name}...</p>
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
                  <span>Cycle Server Fallback</span>
                </button>
              </div>
            </div>
          )}

          {/* The Sandboxed IFrame element */}
          {!showResumePrompt && (
            <iframe
              ref={iframeRef}
              key={`${selectedServerId}_${mediaType}_${loadAttempts}_${startAtSec ?? 0}`}
              src={embedUrl}
              onLoad={() => setIframeLoaded(true)}
              tabIndex={0}
              className="w-full h-full border-0 absolute inset-0 z-0 bg-black focus:outline-none"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope; screen-wake-lock; clipboard-write; web-share"
              sandbox={iframeMode === "Strict" ? selectedServer.sandboxPolicy : undefined}
              referrerPolicy="no-referrer"
              title={`${selectedServer.name} player`}
            />
          )}

          {showResumePrompt && savedProgress && (
            <ResumePrompt
              progressPercent={savedProgress.progress_percent ?? 0}
              currentTimeSec={savedProgress.current_time_sec ?? 0}
              onResume={handleResume}
              onStartOver={handleStartOver}
            />
          )}

          {/* Auto-fading HUD title bar overlay */}
          {showOverlay && iframeLoaded && (
            <div className="absolute top-4 left-4 sm:left-6 z-20 pointer-events-none transition-opacity duration-500 bg-black/70 backdrop-blur-md border border-white/5 px-4 py-2 rounded-xl text-white">
              <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-widest">{selectedServer.name}</span>
              <h3 className="text-xs font-semibold leading-tight mt-0.5">{name}</h3>
            </div>
          )}
        </div>
      </div>

      {/* 3. Movie Layout Spacer */}
      <div className="bg-black text-[9.5px] font-mono text-center py-2 text-white/40 border-t border-white/5">
        Streamed via direct server-to-browser tunnel. Zoku TV does not host, cache, or duplicate video files.
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
