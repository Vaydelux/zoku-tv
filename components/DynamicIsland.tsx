"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Cloud,
  Command,
  Film,
  HardDrive,
  Moon,
  Play,
  RotateCcw,
  Server,
  Shield,
  SkipForward,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  useSessionStore,
  useContinueWatchingStore,
  useWatchlistStore,
  useCommandPaletteStore,
  useDynamicIslandStore,
} from "@/stores";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePerfMode } from "@/hooks/usePerfMode";
import { isCloudFirebaseConfigured } from "@/lib/firebase";
import { normalizeAppearance } from "@/lib/themes";
import {
  filterContinueWatchingByCatalog,
  getContinueWatchingItemId,
  type ContinueWatchingItem,
} from "@/lib/continue-watching";
import { resolveDynamicIslandState } from "@/lib/dynamic-island";
import type { CatalogMode } from "@/lib/media-types";

function buildResumeHref(item: ContinueWatchingItem): string {
  const id = getContinueWatchingItemId(item);
  if (item.media_type === "anime") {
    return `/watch/anime/${id}/${item.season || 1}/${item.episode || 1}`;
  }
  if (item.media_type === "tv") {
    return `/watch/tv/${id}/${item.season || 1}/${item.episode || 1}`;
  }
  return `/watch/movie/${id}`;
}

function getThumbUrl(item: {
  media_type: "movie" | "tv" | "anime";
  poster_path?: string | null;
  backdrop_path?: string | null;
}): string | null {
  const raw = item.backdrop_path || item.poster_path;
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
  return `https://image.tmdb.org/t/p/w300${raw}`;
}

export function DynamicIsland() {
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { is60FpsActive, togglePerfMode } = usePerfMode();

  const currentProfile = useSessionStore((s) => s.currentProfile);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const continueItems = useContinueWatchingStore((s) => s.items);
  const watchlistCount = useWatchlistStore((s) => s.items.length);
  const openSpotlight = useCommandPaletteStore((s) => s.setOpen);

  const expanded = useDynamicIslandStore((s) => s.expanded);
  const setExpanded = useDynamicIslandStore((s) => s.setExpanded);
  const toggleExpanded = useDynamicIslandStore((s) => s.toggleExpanded);
  const activity = useDynamicIslandStore((s) => s.activity);
  const playerTelemetry = useDynamicIslandStore((s) => s.playerTelemetry);
  const pushActivity = useDynamicIslandStore((s) => s.pushActivity);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setExpanded(false);
  }, [pathname, setExpanded]);

  const catalogMode: CatalogMode = currentProfile?.catalogMode ?? "tmdb";
  const appearance = normalizeAppearance(currentProfile?.appearancePreference);
  const isWatchRoute = Boolean(pathname?.startsWith("/watch/"));

  const latestCw = useMemo(() => {
    const scoped = filterContinueWatchingByCatalog(continueItems, catalogMode);
    return scoped[0] ?? continueItems[0] ?? null;
  }, [continueItems, catalogMode]);

  const display = useMemo(
    () =>
      resolveDynamicIslandState({
        activity,
        isOnline,
        isWatchRoute,
        playerTelemetry,
        latestContinueWatching: latestCw,
        catalogMode,
        watchlistCount,
        isKidMode: Boolean(currentProfile?.kidMode),
      }),
    [
      activity,
      isOnline,
      isWatchRoute,
      playerTelemetry,
      latestCw,
      catalogMode,
      watchlistCount,
      currentProfile?.kidMode,
    ]
  );

  // Compute centered popover geometry safely inside viewport
  useEffect(() => {
    if (!expanded || !mounted) return;

    const reposition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const width = Math.min(372, vw - 24);
      const centerX = rect.left + rect.width / 2;
      const clampedLeft = Math.max(12, Math.min(vw - width - 12, centerX - width / 2));
      setCoords({
        top: rect.bottom + 10,
        left: clampedLeft,
        width,
      });
    };

    reposition();
    window.addEventListener("resize", reposition, { passive: true });
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [expanded, mounted]);

  // Dismiss on Escape or outside pointer
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setExpanded(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, setExpanded]);

  const handleCatalogSwitch = async (next: CatalogMode) => {
    if (!currentProfile || catalogMode === next) return;
    pushActivity(next === "anime" ? "Switched to Anime" : "Movies & TV", {
      detail: "Catalog active",
      tone: "accent",
    });
    try {
      await updateProfile(currentProfile.id, { catalogMode: next });
    } catch (err) {
      console.error("Failed to switch catalog from Dynamic Island", err);
    }
  };

  const handleAppearanceToggle = async () => {
    if (!currentProfile) return;
    const next = appearance === "dark" ? "light" : "dark";
    pushActivity(next === "light" ? "Light Glass Mode" : "Dark Obsidian Glass", {
      detail: "Appearance updated",
      tone: "accent",
    });
    try {
      await updateProfile(currentProfile.id, { appearancePreference: next });
    } catch (err) {
      console.error("Failed to toggle appearance from Dynamic Island", err);
    }
  };

  const toneDotClass =
    display.tone === "success"
      ? "bg-emerald-400"
      : display.tone === "warning"
      ? "bg-amber-400"
      : display.tone === "accent"
      ? "bg-sky-400"
      : "bg-slate-400";

  const toneTextClass =
    display.tone === "success"
      ? "text-emerald-300"
      : display.tone === "warning"
      ? "text-amber-300"
      : display.tone === "accent"
      ? "text-sky-300"
      : "text-white/75";

  const ringRadius = 7;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    display.progressPercent !== null
      ? ringCircumference * (1 - display.progressPercent / 100)
      : ringCircumference;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-haspopup="dialog"
        aria-label={`Dynamic Island: ${display.label}, ${display.sublabel}. Click for quick controls`}
        data-testid="zoku-dynamic-island"
        data-island-mode={display.mode}
        data-tv-focusable="true"
        className={`dynamic-island-capsule group inline-flex h-10 max-w-[230px] sm:max-w-[300px] items-center gap-2 rounded-full px-3 sm:px-3.5 text-xs font-medium select-none active:scale-[0.97] ${
          display.mode === "activity" ? "scale-[1.03] ring-1 ring-sky-400/40" : ""
        }`}
      >
        {/* Left live status glyph or SVG progress ring */}
        {display.mode === "resume" && display.progressPercent !== null ? (
          <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
              <circle
                cx="10"
                cy="10"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
              />
              <circle
                cx="10"
                cy="10"
                r={ringRadius}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <Play className="absolute h-2.5 w-2.5 fill-white text-white ml-[1px]" aria-hidden="true" />
          </span>
        ) : (
          <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${toneDotClass} ${
                display.mode === "offline" || display.mode === "activity" ? "animate-ping" : ""
              }`}
            />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${toneDotClass}`} />
          </span>
        )}

        {/* Primary concise label */}
        <span className="truncate font-semibold tracking-tight text-white/95">
          {display.label}
        </span>

        {/* Hairline separator & contextual sublabel */}
        <span className="hidden sm:inline h-3 w-px shrink-0 bg-white/15" aria-hidden="true" />
        <span className={`hidden sm:inline shrink-0 font-mono text-[10px] font-semibold tracking-wide ${toneTextClass}`}>
          {display.sublabel}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-white/60 transition-transform duration-200 group-hover:text-white ${
            expanded ? "rotate-180 text-white" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {mounted &&
        expanded &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Dynamic Island Live Controls"
            data-testid="zoku-dynamic-island-sheet"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 85,
            }}
            className="dynamic-island-popover dynamic-island-capsule overflow-hidden rounded-[26px] p-3.5 text-white"
          >
            {/* Header Status Strip */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${toneDotClass}`} />
                <span className="text-[11px] font-semibold tracking-tight text-white/90 truncate">
                  {currentProfile ? `${currentProfile.name} · Live Island` : "Zoku Live Island"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentProfile?.kidMode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                    Kids
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${
                    isOnline
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Active Watch-Page Server Telemetry */}
            {isWatchRoute && playerTelemetry && (
              <div className="mt-3 rounded-[18px] border border-white/12 bg-white/[0.06] p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                      Now Streaming
                    </p>
                    <p className="text-xs font-semibold text-white truncate">
                      {playerTelemetry.title}
                      {playerTelemetry.subtitle ? ` · ${playerTelemetry.subtitle}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300 shrink-0">
                    <Server className="h-2.5 w-2.5" />
                    {playerTelemetry.serverName}
                  </span>
                </div>
                {(playerTelemetry.onNextServer || playerTelemetry.onRetryFrame) && (
                  <div className="flex items-center gap-2">
                    {playerTelemetry.onNextServer && (
                      <button
                        type="button"
                        onClick={() => {
                          playerTelemetry.onNextServer?.();
                          setExpanded(false);
                        }}
                        className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white/12 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors"
                      >
                        <SkipForward className="h-3 w-3" />
                        Next Server
                      </button>
                    )}
                    {playerTelemetry.onRetryFrame && (
                      <button
                        type="button"
                        onClick={() => {
                          playerTelemetry.onRetryFrame?.();
                          setExpanded(false);
                        }}
                        className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white/12 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry Stream
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resume Watching Mini-Card */}
            {latestCw && !isWatchRoute && (
              <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-white/12 bg-white/[0.06] p-2.5">
                {getThumbUrl(latestCw) ? (
                  <img
                    src={getThumbUrl(latestCw)!}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Film className="h-4 w-4 text-white/60" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-sky-300/90">
                    Continue Watching
                  </p>
                  <p className="truncate text-xs font-semibold text-white">
                    {latestCw.title}
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{
                        width: `${Math.max(8, Math.min(100, latestCw.progress_percent ?? 20))}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    router.push(buildResumeHref(latestCw));
                  }}
                  aria-label={`Resume ${latestCw.title}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-contrast)] shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                </button>
              </div>
            )}

            {/* Segmented Catalog Mode Switcher */}
            {currentProfile && (
              <div className="mt-3">
                <div
                  role="group"
                  aria-label="Quick catalog switch"
                  className="grid grid-cols-2 gap-1 rounded-full border border-white/12 bg-white/[0.06] p-1"
                >
                  <button
                    type="button"
                    aria-pressed={catalogMode === "tmdb"}
                    onClick={() => void handleCatalogSwitch("tmdb")}
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      catalogMode === "tmdb"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-white/75 hover:text-white"
                    }`}
                  >
                    <Film className="h-3 w-3" />
                    Movies &amp; TV
                  </button>
                  <button
                    type="button"
                    aria-pressed={catalogMode === "anime"}
                    onClick={() => void handleCatalogSwitch("anime")}
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      catalogMode === "anime"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-white/75 hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    Anime
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Pill Controls */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => void handleAppearanceToggle()}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] py-2 text-[10px] font-semibold text-white/85 hover:bg-white/12 transition-colors"
              >
                {appearance === "dark" ? (
                  <Sun className="h-3.5 w-3.5 text-amber-300" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-sky-300" />
                )}
                <span>{appearance === "dark" ? "Light" : "Dark"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePerfMode();
                  pushActivity(is60FpsActive ? "Liquid Glass Full" : "60fps TV Mode", {
                    detail: is60FpsActive ? "Blur restored" : "Blur bypassed",
                    tone: "accent",
                  });
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-2 text-[10px] font-semibold transition-colors ${
                  is60FpsActive
                    ? "border-sky-400/50 bg-sky-500/20 text-sky-200"
                    : "border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/12"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{is60FpsActive ? "60fps ON" : "60fps TV"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  openSpotlight(true);
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] py-2 text-[10px] font-semibold text-white/85 hover:bg-white/12 transition-colors"
              >
                <Command className="h-3.5 w-3.5 text-sky-300" />
                <span>Spotlight</span>
              </button>
            </div>

            {/* Footer Sync Metadata */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/55">
              <span className="inline-flex items-center gap-1.5">
                {isCloudFirebaseConfigured ? (
                  <>
                    <Cloud className="h-3 w-3 text-emerald-400" />
                    Cloud Sync Active
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3 w-3 text-sky-400" />
                    Local Device Storage
                  </>
                )}
              </span>
              <span className="font-mono">{watchlistCount} in library</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
