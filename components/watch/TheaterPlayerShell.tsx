"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FastForward,
  Film,
  Keyboard,
  Link2,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  RectangleHorizontal,
  RotateCcw,
  Server,
  Shield,
  ShieldOff,
  SkipForward,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ServerSelect, type ServerSelectOption } from "@/components/watch/ServerSelect";
import { CinematicVideoPlayer } from "@/components/watch/CinematicVideoPlayer";
import { useTheaterFullscreen } from "@/hooks/useTheaterFullscreen";
import { isDirectMediaUrl } from "@/lib/player-hud-controls";
import { useDynamicIslandStore } from "@/stores";

export interface TheaterEpisodeQuickItem {
  number: number;
  title?: string;
  isCurrent: boolean;
  isWatched: boolean;
  onSelect: () => void;
}

export interface TheaterPlayerShellProps {
  title: string;
  subtitle?: string;
  backdropUrl?: string | null;
  onBack: () => void;
  backLabel: string;

  /** Embed iframe configuration */
  embedUrl: string;
  iframeKey: string;
  iframeTitle: string;
  iframeReady: boolean;
  onIframeLoad: () => void;
  sandboxPolicy?: string;
  useSandbox: boolean;
  sandboxLabel?: string;
  onToggleSandbox: () => void;
  hasConfirmedPlayback: boolean;
  isLoadingMetadata?: boolean;

  /** Server switching */
  currentServerId: string;
  currentServerName: string;
  newServers: ServerSelectOption[];
  defaultServers: ServerSelectOption[];
  serverHealth?: Record<string, { status: "good" | "failing"; lastTested: number }>;
  onServerChange: (serverId: string) => void;
  onNextServer: () => void;
  onRetryFrame: () => void;

  /** Watched & episode navigation */
  isWatched: boolean;
  watchedActionLabel?: string;
  onToggleWatched: () => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  autoNextEnabled?: boolean;
  onToggleAutoNext?: () => void;
  quickEpisodes?: TheaterEpisodeQuickItem[];

  /** Optional direct video progress sync & resume */
  startAtSec?: number;
  onDirectProgress?: (progressPercent: number, currentTimeSec: number, durationSec?: number) => void;
  onDirectEnded?: () => void;

  /** Shortcuts popover state */
  showShortcutsHelp: boolean;
  onToggleShortcutsHelp: () => void;

  /** Overlay slots inside player stage (e.g. ResumePrompt) */
  stageOverlay?: ReactNode;
  suppressFrame?: boolean;

  /** Companion editorial content rendered cleanly below the stage (episodes grid, overview) */
  belowStageContent?: ReactNode;

  /** External overlays (AutoNextOverlay, WatchShortcutsPopover) */
  floatingOverlays?: ReactNode;

  /** Register theater keyboard controls back to parent shortcut listener */
  onRegisterTheaterControls?: (controls: {
    toggleFullscreen: () => void;
    toggleTheater: () => void;
    toggleDrawer: () => void;
    handleEscape: () => void;
    isDirectMode: boolean;
  }) => void;
}

/**
 * Unified Obsidian Full-Screen Theater Stage for Movies, TV Series, and Anime.
 * - Native Fullscreen API (`requestFullscreen`) + iOS/mobile `100dvh` fallback.
 * - Auto-hiding top HUD & 3s idle-cursor hiding.
 * - Seamless key-art loading curtain (zero developer jargon spinner boxes).
 * - Slide-over Server, Direct-Stream, and Episode drawer usable inside Fullscreen.
 */
export function TheaterPlayerShell({
  title,
  subtitle,
  backdropUrl,
  onBack,
  backLabel,
  embedUrl,
  iframeKey,
  iframeTitle,
  iframeReady,
  onIframeLoad,
  sandboxPolicy,
  useSandbox,
  sandboxLabel = "Iframe Sandbox",
  onToggleSandbox,
  hasConfirmedPlayback,
  isLoadingMetadata = false,
  currentServerId,
  currentServerName,
  newServers,
  defaultServers,
  serverHealth,
  onServerChange,
  onNextServer,
  onRetryFrame,
  isWatched,
  watchedActionLabel,
  onToggleWatched,
  hasPrevEpisode,
  hasNextEpisode,
  onPrevEpisode,
  onNextEpisode,
  autoNextEnabled,
  onToggleAutoNext,
  quickEpisodes,
  startAtSec,
  onDirectProgress,
  onDirectEnded,
  showShortcutsHelp,
  onToggleShortcutsHelp,
  stageOverlay,
  suppressFrame = false,
  belowStageContent,
  floatingOverlays,
  onRegisterTheaterControls,
}: TheaterPlayerShellProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"controls" | "episodes">("controls");
  const [nativeMenuOpen, setNativeMenuOpen] = useState(false);
  const [directStreamInput, setDirectStreamInput] = useState("");
  const [activeDirectStreamUrl, setActiveDirectStreamUrl] = useState<string | null>(null);
  const [directStreamError, setDirectStreamError] = useState<string | null>(null);

  const isDirectMode = Boolean(activeDirectStreamUrl);

  const {
    isNativeFullscreen,
    isViewportTheater,
    isExpanded,
    hudVisible,
    cursorHidden,
    revealHud,
    toggleFullscreen,
    toggleTheater,
    exitFullscreenOrTheater,
  } = useTheaterFullscreen({
    stageRef,
    keepHudVisible:
      drawerOpen ||
      showShortcutsHelp ||
      nativeMenuOpen ||
      suppressFrame ||
      (!isDirectMode && (!iframeReady || isLoadingMetadata)),
  });

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
    revealHud();
  }, [revealHud]);

  const handleEscape = useCallback(() => {
    if (drawerOpen) {
      setDrawerOpen(false);
    } else if (isExpanded) {
      void exitFullscreenOrTheater();
    }
  }, [drawerOpen, isExpanded, exitFullscreenOrTheater]);

  useEffect(() => {
    onRegisterTheaterControls?.({
      toggleFullscreen: () => void toggleFullscreen(),
      toggleTheater: () => void toggleTheater(),
      toggleDrawer: handleToggleDrawer,
      handleEscape,
      isDirectMode,
    });
  }, [
    onRegisterTheaterControls,
    toggleFullscreen,
    toggleTheater,
    handleToggleDrawer,
    handleEscape,
    isDirectMode,
  ]);

  const containerStatusLabel = isDirectMode
    ? "Direct Stream"
    : hasConfirmedPlayback
      ? "Synced"
      : iframeReady
        ? "Ready"
        : "Connecting";

  // Publish live playback telemetry to the floating Dynamic Island
  useEffect(() => {
    const setTelemetry = useDynamicIslandStore.getState().setPlayerTelemetry;
    setTelemetry({
      title,
      subtitle,
      serverName: isDirectMode ? "Direct Stream" : currentServerName,
      synced: hasConfirmedPlayback || isDirectMode,
      onNextServer,
      onRetryFrame,
    });
    return () => {
      setTelemetry(null);
    };
  }, [
    title,
    subtitle,
    isDirectMode,
    currentServerName,
    hasConfirmedPlayback,
    onNextServer,
    onRetryFrame,
  ]);

  const handleApplyDirectStream = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = directStreamInput.trim();
    if (!cleaned) {
      setActiveDirectStreamUrl(null);
      setDirectStreamError(null);
      return;
    }
    if (!isDirectMediaUrl(cleaned)) {
      setDirectStreamError("Enter a direct HTTP(S) .mp4, .webm, or .m3u8 media URL.");
      return;
    }
    setDirectStreamError(null);
    setActiveDirectStreamUrl(cleaned);
    setDrawerOpen(false);
    revealHud();
  };

  return (
    <div className="zoku-cinematic-player min-h-[100dvh] bg-[#0B0B0F] text-[#F5F5F7]">
      {!isExpanded && <Navbar />}

      {/* Full-Bleed Obsidian Theater Stage */}
      <section className="w-full bg-[#060609]">
        <div
          ref={stageRef}
          data-testid="external-player-frame-wrapper"
          onPointerMove={revealHud}
          onTouchStart={revealHud}
          className={`zoku-theater-stage relative mx-auto flex w-full items-center justify-center overflow-hidden bg-black ${
            isViewportTheater
              ? "zoku-theater-viewport-lock"
              : "aspect-video max-h-[calc(100dvh-132px)] max-w-[1680px]"
          } ${cursorHidden ? "theater-cursor-hidden" : ""}`}
        >
          {/* Optional Resume Prompt or Gate Overlay */}
          {stageOverlay}

          {/* Seamless Key-Art Loading Curtain (embed mode only) */}
          {!isDirectMode && (!iframeReady || isLoadingMetadata) && !suppressFrame && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden bg-[#0B0B0F] p-6 text-center">
              {backdropUrl && (
                <img
                  src={backdropUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-25 blur-sm"
                />
              )}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(11,11,15,0.55) 0%, rgba(11,11,15,0.96) 78%)",
                }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex flex-col items-center gap-3.5 max-w-md">
                <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-display text-base font-semibold text-[#F5F5F7]">
                    {isLoadingMetadata ? "Preparing stream..." : title}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Connecting to {currentServerName}
                  </p>
                </div>
                {!isLoadingMetadata && (
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={onRetryFrame}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-[#14141A] px-3.5 py-1.5 text-xs font-medium text-[#F5F5F7] transition-colors hover:bg-[#1C1C24]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={onNextServer}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-contrast transition-opacity hover:opacity-90"
                    >
                      <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                      Next Server
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Video Surface: Native Custom HTML5 Player OR External Embed Iframe */}
          {!suppressFrame &&
            (isDirectMode && activeDirectStreamUrl ? (
              <CinematicVideoPlayer
                src={activeDirectStreamUrl}
                poster={backdropUrl}
                title={title}
                startAtSec={startAtSec}
                isFullscreen={isNativeFullscreen || isViewportTheater}
                isTheater={isViewportTheater}
                hudVisible={hudVisible}
                onUserActivity={revealHud}
                onToggleFullscreen={() => void toggleFullscreen()}
                onToggleTheater={() => void toggleTheater()}
                onProgress={onDirectProgress}
                onEnded={onDirectEnded}
                onMenuOpenChange={setNativeMenuOpen}
              />
            ) : (
              !isLoadingMetadata && (
                <iframe
                  key={iframeKey}
                  src={embedUrl}
                  title={iframeTitle}
                  className="h-full w-full border-0 bg-black"
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  referrerPolicy="origin"
                  onLoad={onIframeLoad}
                  {...(useSandbox && sandboxPolicy ? { sandbox: sandboxPolicy } : {})}
                />
              )
            ))}

          {/* Auto-Hiding Top iOS 27/28 Liquid Glass Cinema HUD */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 pb-10 sm:px-5 sm:pt-4 transition-opacity duration-200 ${
              hudVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(to bottom, rgba(6,9,19,0.88) 0%, rgba(6,9,19,0.38) 58%, transparent 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: Back + Title + Frosted Status Pill */}
              <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isExpanded) {
                      void exitFullscreenOrTheater();
                    } else {
                      onBack();
                    }
                  }}
                  aria-label={isExpanded ? "Exit fullscreen" : backLabel}
                  data-tv-focusable="true"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-xl transition-colors hover:border-white/30 hover:bg-black/75"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate font-display text-sm font-semibold text-white sm:text-base">
                      {title}
                    </h1>
                    <span
                      data-testid="player-container-status"
                      className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/55 border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-xl"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hasConfirmedPlayback || isDirectMode
                            ? "bg-emerald-400"
                            : iframeReady
                              ? "bg-sky-300"
                              : "bg-amber-400 animate-pulse"
                        }`}
                      />
                      {containerStatusLabel}
                    </span>
                  </div>
                  {subtitle && (
                    <p className="truncate text-[11px] text-white/65 sm:text-xs">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Quick Liquid Glass Theater Controls */}
              <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 p-1 backdrop-blur-xl">
                {quickEpisodes && quickEpisodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerTab("episodes");
                      setDrawerOpen((prev) => (drawerTab === "episodes" ? !prev : true));
                    }}
                    aria-label="Open episodes drawer"
                    title="Episodes (E)"
                    data-tv-focusable="true"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                  >
                    <ListVideo className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline">Episodes</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDrawerTab("controls");
                    setDrawerOpen((prev) => (drawerTab === "controls" ? !prev : true));
                  }}
                  aria-expanded={drawerOpen}
                  aria-label="Stream server and player controls"
                  title="Servers & Controls (E)"
                  data-tv-focusable="true"
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                    drawerOpen
                      ? "bg-primary text-primary-contrast"
                      : "text-white/90 hover:bg-white/15"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {isDirectMode ? "Direct Stream" : currentServerName}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onToggleShortcutsHelp}
                  aria-expanded={showShortcutsHelp}
                  aria-label="Player keyboard shortcuts"
                  title="Keyboard shortcuts (?)"
                  data-testid="watch-shortcuts-toggle-btn"
                  data-tv-focusable="true"
                  className={`hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    showShortcutsHelp
                      ? "bg-primary text-primary-contrast"
                      : "text-white/85 hover:bg-white/15"
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => void toggleTheater()}
                  aria-pressed={isViewportTheater}
                  aria-label={isViewportTheater ? "Exit theater viewport" : "Enter theater viewport"}
                  title="Theater mode (T)"
                  data-testid="theater-mode-toggle-btn"
                  data-tv-focusable="true"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isViewportTheater
                      ? "bg-primary text-primary-contrast"
                      : "text-white/85 hover:bg-white/15"
                  }`}
                >
                  <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-pressed={isExpanded}
                  aria-label={isExpanded ? "Exit fullscreen" : "Enter fullscreen"}
                  title="Fullscreen (F)"
                  data-testid="theater-fullscreen-toggle-btn"
                  data-tv-focusable="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                >
                  {isExpanded ? (
                    <Minimize className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Slide-Over Smoked Liquid Glass Theater Drawer */}
          {drawerOpen && (
            <aside
              role="dialog"
              aria-label="Stream controls and episodes"
              data-testid="theater-controls-drawer"
              className="absolute inset-y-0 right-0 z-30 flex w-[min(350px,90vw)] flex-col border-l border-white/15 bg-[#080c17]/90 text-[#F5F8FF] shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-1 rounded-lg bg-[#0B0B0F] p-0.5">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("controls")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      drawerTab === "controls"
                        ? "bg-primary text-primary-contrast"
                        : "text-[#A1A1AA] hover:text-[#F5F5F7]"
                    }`}
                  >
                    Stream
                  </button>
                  {quickEpisodes && quickEpisodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDrawerTab("episodes")}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        drawerTab === "episodes"
                          ? "bg-primary text-primary-contrast"
                          : "text-[#A1A1AA] hover:text-[#F5F5F7]"
                      }`}
                    >
                      Episodes
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close drawer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-white/10 hover:text-[#F5F5F7]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
                {drawerTab === "controls" ? (
                  <>
                    {/* Embed Servers */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA]">
                        <Server className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Embed Server
                      </label>
                      <ServerSelect
                        value={currentServerId}
                        onChange={(sid) => {
                          setActiveDirectStreamUrl(null);
                          onServerChange(sid);
                        }}
                        newServers={newServers}
                        defaultServers={defaultServers}
                        serverHealth={serverHealth}
                        className="w-full"
                      />
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDirectStreamUrl(null);
                            onRetryFrame();
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0B0F] text-xs font-medium text-[#F5F5F7] hover:bg-[#1C1C24]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDirectStreamUrl(null);
                            onNextServer();
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0B0F] text-xs font-medium text-[#F5F5F7] hover:bg-[#1C1C24]"
                        >
                          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                          Next Server
                        </button>
                      </div>
                    </div>

                    {/* Direct HTML5 Video Stream URL */}
                    <form
                      onSubmit={handleApplyDirectStream}
                      className="space-y-2 border-t border-white/10 pt-4"
                    >
                      <label
                        htmlFor="zoku-direct-stream-url"
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA]"
                      >
                        <Link2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Direct Video Stream (HTML5 HUD)
                      </label>
                      <input
                        id="zoku-direct-stream-url"
                        type="url"
                        value={directStreamInput}
                        onChange={(e) => {
                          setDirectStreamInput(e.target.value);
                          setDirectStreamError(null);
                        }}
                        placeholder="https://.../video.mp4 or .webm"
                        className="w-full rounded-lg border border-white/10 bg-[#0B0B0F] px-3 py-2 text-xs text-[#F5F5F7] placeholder:text-[#A1A1AA]/60 focus:border-primary focus:outline-none"
                      />
                      {directStreamError && (
                        <p className="text-[11px] text-red-400">{directStreamError}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-contrast hover:opacity-90"
                        >
                          <Film className="h-3.5 w-3.5" aria-hidden="true" />
                          Play Direct Stream
                        </button>
                        {isDirectMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDirectStreamUrl(null);
                              setDirectStreamInput("");
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-[#0B0B0F] px-3 text-xs text-[#A1A1AA] hover:text-[#F5F5F7]"
                          >
                            Use Embed
                          </button>
                        )}
                      </div>
                    </form>

                    {/* Container Safeguards & Auto-Next */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={onToggleSandbox}
                        className={`flex min-h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          useSandbox
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                            : "border-white/10 bg-[#0B0B0F] text-[#F5F5F7] hover:bg-[#1C1C24]"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {useSandbox ? (
                            <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                          ) : (
                            <ShieldOff className="h-4 w-4 text-[#A1A1AA]" aria-hidden="true" />
                          )}
                          {sandboxLabel}
                        </span>
                        <span className="font-mono text-[11px] font-semibold">
                          {useSandbox ? "ON" : "OFF"}
                        </span>
                      </button>

                      {onToggleAutoNext && (
                        <button
                          type="button"
                          onClick={onToggleAutoNext}
                          data-testid="toggle-auto-next-btn"
                          className={`flex min-h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            autoNextEnabled
                              ? "border-primary/45 bg-primary/15 text-primary"
                              : "border-white/10 bg-[#0B0B0F] text-[#F5F5F7] hover:bg-[#1C1C24]"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <FastForward className="h-4 w-4" aria-hidden="true" />
                            Auto-Next Episode
                          </span>
                          <span className="font-mono text-[11px] font-semibold">
                            {autoNextEnabled ? "ON" : "OFF"}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {(quickEpisodes ?? []).map((ep) => (
                      <button
                        key={ep.number}
                        type="button"
                        onClick={() => {
                          ep.onSelect();
                          setDrawerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                          ep.isCurrent
                            ? "border-primary bg-primary/15 text-[#F5F5F7] font-semibold"
                            : "border-white/8 bg-[#0B0B0F] text-[#A1A1AA] hover:border-white/20 hover:text-[#F5F5F7]"
                        }`}
                      >
                        <span className="truncate">
                          E{ep.number}
                          {ep.title ? ` · ${ep.title}` : ""}
                        </span>
                        {ep.isWatched && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Below-Stage Controls & Companion Content (hidden during viewport lock) */}
      {!isViewportTheater && (
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-[var(--cinematic-gutter)] pb-16">
          {/* Clean Horizontal Utility Strip */}
          <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <ServerSelect
                value={currentServerId}
                onChange={(sid) => {
                  setActiveDirectStreamUrl(null);
                  onServerChange(sid);
                }}
                newServers={newServers}
                defaultServers={defaultServers}
                serverHealth={serverHealth}
                className="flex-1 sm:flex-initial"
              />

              <button
                type="button"
                onClick={onRetryFrame}
                aria-label="Retry loading current server"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#14141A] px-3.5 text-xs font-medium text-[#F5F5F7] transition-colors hover:border-white/25 hover:bg-[#1C1C24]"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Retry</span>
              </button>

              <button
                type="button"
                onClick={onNextServer}
                aria-label="Switch to next server"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#14141A] px-3.5 text-xs font-medium text-[#A1A1AA] transition-colors hover:border-white/25 hover:bg-[#1C1C24] hover:text-[#F5F5F7]"
              >
                <SkipForward className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Next Server</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleWatched}
                className={`flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
                  isWatched
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-white/10 bg-[#14141A] text-[#F5F5F7] hover:border-white/25 hover:bg-[#1C1C24]"
                }`}
              >
                {isWatched ? (
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{watchedActionLabel ?? (isWatched ? "Watched" : "Mark Watched")}</span>
              </button>

              {onPrevEpisode && (
                <button
                  type="button"
                  disabled={!hasPrevEpisode}
                  onClick={onPrevEpisode}
                  className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-[#14141A] px-4 text-xs font-semibold text-[#F5F5F7] transition-colors hover:border-white/25 hover:bg-[#1C1C24] disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
              )}

              {onNextEpisode && (
                <button
                  type="button"
                  disabled={!hasNextEpisode}
                  onClick={onNextEpisode}
                  className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-contrast transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {belowStageContent}
        </div>
      )}

      {floatingOverlays}
    </div>
  );
}
