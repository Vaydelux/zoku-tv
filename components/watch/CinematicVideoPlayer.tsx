"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  clampSeekTime,
  computeBufferedPercent,
  formatTimecode,
  PLAYBACK_SPEED_OPTIONS,
  resolveNativeVideoShortcut,
  type BufferedRange,
} from "@/lib/player-hud-controls";
import { shouldIgnoreShortcutTarget } from "@/lib/watch-shortcuts";

export interface VideoSubtitleTrack {
  label: string;
  srcLang: string;
  src: string;
  default?: boolean;
}

export interface VideoQualityOption {
  label: string;
  src: string;
}

interface CinematicVideoPlayerProps {
  src: string;
  poster?: string | null;
  title: string;
  startAtSec?: number;
  tracks?: VideoSubtitleTrack[];
  qualities?: VideoQualityOption[];
  isFullscreen: boolean;
  isTheater: boolean;
  hudVisible: boolean;
  onUserActivity: () => void;
  onToggleFullscreen: () => void;
  onToggleTheater: () => void;
  onProgress?: (progressPercent: number, currentTimeSec: number, durationSec?: number) => void;
  onEnded?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
}

/**
 * Custom full-screen responsive HTML5 <video> engine with auto-hiding cinema HUD:
 * play/pause, timeline scrubber with buffered progress & hover preview, timecode,
 * volume/mute slider, playback speed, subtitles/quality menus, and Space/Arrows/F/M shortcuts.
 */
export function CinematicVideoPlayer({
  src,
  poster,
  title,
  startAtSec,
  tracks = [],
  qualities = [],
  isFullscreen,
  isTheater,
  hudVisible,
  onUserActivity,
  onToggleFullscreen,
  onToggleTheater,
  onProgress,
  onEnded,
  onMenuOpenChange,
}: CinematicVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lastReportedRef = useRef<number>(0);

  const [activeSrc, setActiveSrc] = useState(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [activeTrackIdx, setActiveTrackIdx] = useState<number>(-1);
  const [activeMenu, setActiveMenu] = useState<"none" | "settings" | "captions">("none");
  const [hoverTime, setHoverTime] = useState<{ pct: number; sec: number } | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [feedbackLabel, setFeedbackLabel] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveSrc(src);
    setHasError(false);
    setIsBuffering(true);
  }, [src]);

  useEffect(() => {
    onMenuOpenChange?.(activeMenu !== "none" || isScrubbing);
  }, [activeMenu, isScrubbing, onMenuOpenChange]);

  const showFeedback = useCallback((label: string) => {
    setFeedbackLabel(label);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedbackLabel(null), 700);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const syncBuffered = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const ranges: BufferedRange[] = [];
    for (let i = 0; i < v.buffered.length; i++) {
      ranges.push({ start: v.buffered.start(i), end: v.buffered.end(i) });
    }
    setBufferedPct(computeBufferedPercent(ranges, v.currentTime, v.duration));
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    onUserActivity();
    if (v.paused || v.ended) {
      void v.play().catch(() => {});
      showFeedback("Play");
    } else {
      v.pause();
      showFeedback("Paused");
    }
  }, [onUserActivity, showFeedback]);

  const seekTo = useCallback(
    (targetSec: number) => {
      const v = videoRef.current;
      if (!v) return;
      const clamped = clampSeekTime(targetSec, v.duration || duration);
      v.currentTime = clamped;
      setCurrentTime(clamped);
      onUserActivity();
    },
    [duration, onUserActivity]
  );

  const seekBy = useCallback(
    (deltaSec: number) => {
      const v = videoRef.current;
      if (!v) return;
      seekTo(v.currentTime + deltaSec);
      showFeedback(deltaSec > 0 ? `+${deltaSec}s` : `${deltaSec}s`);
    },
    [seekTo, showFeedback]
  );

  const setVolumeSafe = useCallback(
    (nextVol: number) => {
      const v = videoRef.current;
      const clamped = Math.max(0, Math.min(1, Number(nextVol.toFixed(2))));
      setVolume(clamped);
      if (v) {
        v.volume = clamped;
        v.muted = clamped === 0;
      }
      setIsMuted(clamped === 0);
      onUserActivity();
    },
    [onUserActivity]
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && v.volume === 0) {
      v.volume = 0.7;
      setVolume(0.7);
    }
    onUserActivity();
    showFeedback(nextMuted ? "Muted" : `${Math.round((v.volume || volume) * 100)}%`);
  }, [onUserActivity, showFeedback, volume]);

  const handleSpeedChange = useCallback(
    (rate: number) => {
      const v = videoRef.current;
      if (v) v.playbackRate = rate;
      setPlaybackRate(rate);
      setActiveMenu("none");
      onUserActivity();
      showFeedback(`${rate}x`);
    },
    [onUserActivity, showFeedback]
  );

  const handleTrackSelect = useCallback(
    (trackIndex: number) => {
      const v = videoRef.current;
      if (v && v.textTracks) {
        for (let i = 0; i < v.textTracks.length; i++) {
          v.textTracks[i].mode = i === trackIndex ? "showing" : "disabled";
        }
      }
      setActiveTrackIdx(trackIndex);
      setActiveMenu("none");
      onUserActivity();
    },
    [onUserActivity]
  );

  const handleQualitySwitch = useCallback(
    (option: VideoQualityOption) => {
      const v = videoRef.current;
      const resumeAt = v?.currentTime ?? 0;
      const wasPlaying = v ? !v.paused : true;
      setActiveSrc(option.src);
      setActiveMenu("none");
      setIsBuffering(true);
      onUserActivity();
      requestAnimationFrame(() => {
        const nextV = videoRef.current;
        if (!nextV) return;
        const onLoaded = () => {
          nextV.currentTime = resumeAt;
          if (wasPlaying) void nextV.play().catch(() => {});
          nextV.removeEventListener("loadedmetadata", onLoaded);
        };
        nextV.addEventListener("loadedmetadata", onLoaded);
      });
    },
    [onUserActivity]
  );

  // Keyboard shortcuts for native video playback
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcutTarget(e.target)) return;
      const action = resolveNativeVideoShortcut(e);
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();

      switch (action.type) {
        case "toggle_play":
          togglePlay();
          break;
        case "seek_delta":
          seekBy(action.seconds);
          break;
        case "volume_delta":
          setVolumeSafe((isMuted ? 0 : volume) + action.delta);
          showFeedback(`${Math.round(Math.max(0, Math.min(1, (isMuted ? 0 : volume) + action.delta)) * 100)}%`);
          break;
        case "toggle_mute":
          toggleMute();
          break;
        case "toggle_fullscreen":
          onToggleFullscreen();
          break;
        case "toggle_theater":
          onToggleTheater();
          break;
        case "toggle_captions":
          if (tracks.length > 0) {
            handleTrackSelect(activeTrackIdx >= 0 ? -1 : 0);
          }
          break;
        case "seek_percent":
          if (duration > 0) {
            seekTo((action.percent / 100) * duration);
          }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    togglePlay,
    seekBy,
    setVolumeSafe,
    isMuted,
    volume,
    showFeedback,
    toggleMute,
    onToggleFullscreen,
    onToggleTheater,
    tracks.length,
    handleTrackSelect,
    activeTrackIdx,
    duration,
    seekTo,
  ]);

  const computeTimeFromPointer = useCallback(
    (clientX: number) => {
      const bar = timelineRef.current;
      if (!bar || duration <= 0) return { pct: 0, sec: 0 };
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      return { pct: ratio * 100, sec: ratio * duration };
    },
    [duration]
  );

  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const { sec } = computeTimeFromPointer(e.clientX);
    seekTo(sec);
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const info = computeTimeFromPointer(e.clientX);
    setHoverTime(info);
    if (isScrubbing) {
      seekTo(info.sec);
    }
  };

  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsScrubbing(false);
    }
  };

  const playedPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const activeQualityLabel =
    qualities.find((q) => q.src === activeSrc)?.label ?? "Auto";

  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-black select-none"
      data-testid="cinematic-video-player"
      onClick={(e) => {
        if (activeMenu !== "none") {
          setActiveMenu("none");
          return;
        }
        if ((e.target as HTMLElement).closest("[data-player-hud]")) return;
        togglePlay();
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-player-hud]")) return;
        onToggleFullscreen();
      }}
    >
      <video
        ref={videoRef}
        src={activeSrc}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        aria-label={title}
        className="h-full w-full object-contain bg-black"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration || 0);
          setIsBuffering(false);
          if (startAtSec && startAtSec > 0 && v.duration > startAtSec) {
            v.currentTime = startAtSec;
          }
          syncBuffered();
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          syncBuffered();
          if (onProgress && v.duration > 0) {
            const now = Date.now();
            if (now - lastReportedRef.current >= 4000) {
              lastReportedRef.current = now;
              onProgress((v.currentTime / v.duration) * 100, v.currentTime, v.duration);
            }
          }
        }}
        onProgress={syncBuffered}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (onProgress && duration > 0) {
            onProgress(100, duration, duration);
          }
          onEnded?.();
        }}
        onError={() => {
          setHasError(true);
          setIsBuffering(false);
        }}
      >
        {tracks.map((track, idx) => (
          <track
            key={`${track.srcLang}_${idx}`}
            kind="subtitles"
            src={track.src}
            srcLang={track.srcLang}
            label={track.label}
            default={track.default}
          />
        ))}
      </video>

      {/* Buffering indicator */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0B0B0F]/75 border border-white/10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Brief center action feedback pill */}
      {feedbackLabel && !isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-lg bg-[#0B0B0F]/85 border border-white/10 px-4 py-2 font-mono text-sm font-semibold text-[#F5F5F7]">
            {feedbackLabel}
          </span>
        </div>
      )}

      {/* Stream Error State */}
      {hasError && (
        <div
          data-player-hud
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0B0B0F]/95 p-6 text-center"
        >
          <AlertCircle className="h-9 w-9 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#F5F5F7]">
            Unable to play this stream source
          </p>
          <p className="max-w-md text-xs text-[#A1A1AA]">
            Check that the URL points directly to a browser-playable video file (MP4, WebM, or HLS) with CORS enabled.
          </p>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setIsBuffering(true);
              videoRef.current?.load();
            }}
            className="mt-1 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry stream
          </button>
        </div>
      )}

      {/* Bottom Auto-Hiding Cinema Control Bar */}
      <div
        data-player-hud
        className={`absolute inset-x-0 bottom-0 z-20 px-4 pb-3 pt-16 sm:px-6 sm:pb-4 transition-opacity duration-200 ${
          hudVisible || !isPlaying || activeMenu !== "none" || isScrubbing
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(to top, rgba(11,11,15,0.95) 0%, rgba(11,11,15,0.6) 52%, transparent 100%)",
        }}
      >
        {/* Scrubbable Timeline with Buffered Progress */}
        <div
          ref={timelineRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTimecode(currentTime)} of ${formatTimecode(duration)}`}
          onPointerDown={handleScrubStart}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubEnd}
          onPointerLeave={() => setHoverTime(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              seekBy(-10);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              seekBy(10);
            }
          }}
          className="group/bar relative mb-3 flex h-5 w-full cursor-pointer items-center touch-none"
        >
          {hoverTime && duration > 0 && (
            <span
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-[#14141A] border border-white/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#F5F5F7] tabular-nums"
              style={{ left: `${Math.max(4, Math.min(96, hoverTime.pct))}%` }}
            >
              {formatTimecode(hoverTime.sec)}
            </span>
          )}

          <div className="relative h-1 w-full rounded-full bg-white/20 transition-[height] duration-150 group-hover/bar:h-1.5">
            {/* Buffered track */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Played progress track */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${playedPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5F5F7] opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100"
              style={{ left: `${playedPct}%` }}
            />
          </div>
        </div>

        {/* Control Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left transport & volume */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F5F5F7] transition-colors hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label="Rewind 10 seconds"
              title="Back 10s (←)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F5F5F7]/85 transition-colors hover:bg-white/10 hover:text-[#F5F5F7]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label="Forward 10 seconds"
              title="Forward 10s (→)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F5F5F7]/85 transition-colors hover:bg-white/10 hover:text-[#F5F5F7]"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="group/vol flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                title="Mute (M)"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F5F5F7]/85 transition-colors hover:bg-white/10 hover:text-[#F5F5F7]"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => setVolumeSafe(Number(e.target.value))}
                className="hidden sm:block h-1 w-16 accent-[#E50914] cursor-pointer"
              />
            </div>

            <span className="ml-1 font-mono text-xs text-[#F5F5F7]/85 tabular-nums whitespace-nowrap">
              {formatTimecode(currentTime)}
              <span className="mx-1 text-[#A1A1AA]">/</span>
              <span className="text-[#A1A1AA]">{formatTimecode(duration)}</span>
            </span>
          </div>

          {/* Right speed, subtitles, quality, theater & fullscreen */}
          <div className="relative flex items-center gap-1">
            {/* Subtitles / Captions Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu((prev) => (prev === "captions" ? "none" : "captions"))
                }
                aria-expanded={activeMenu === "captions"}
                aria-label="Subtitles and captions"
                title="Subtitles (C)"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  activeTrackIdx >= 0 || activeMenu === "captions"
                    ? "bg-white/15 text-primary"
                    : "text-[#F5F5F7]/85 hover:bg-white/10 hover:text-[#F5F5F7]"
                }`}
              >
                <Subtitles className="h-4 w-4" aria-hidden="true" />
              </button>

              {activeMenu === "captions" && (
                <div className="absolute bottom-12 right-0 z-30 w-44 rounded-xl border border-white/10 bg-[#14141A] p-1.5 shadow-2xl">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-[#A1A1AA]">
                    Subtitles
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTrackSelect(-1)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                      activeTrackIdx === -1
                        ? "bg-primary/15 font-semibold text-primary"
                        : "text-[#F5F5F7] hover:bg-white/10"
                    }`}
                  >
                    <span>Off</span>
                  </button>
                  {tracks.length === 0 ? (
                    <p className="px-2.5 py-1.5 text-[11px] text-[#A1A1AA]">
                      No external tracks loaded
                    </p>
                  ) : (
                    tracks.map((track, idx) => (
                      <button
                        key={`${track.srcLang}_${idx}`}
                        type="button"
                        onClick={() => handleTrackSelect(idx)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                          activeTrackIdx === idx
                            ? "bg-primary/15 font-semibold text-primary"
                            : "text-[#F5F5F7] hover:bg-white/10"
                        }`}
                      >
                        <span>{track.label}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Playback Speed & Quality Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu((prev) => (prev === "settings" ? "none" : "settings"))
                }
                aria-expanded={activeMenu === "settings"}
                aria-label="Playback speed and quality"
                title="Speed & quality"
                className={`inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-mono transition-colors ${
                  activeMenu === "settings"
                    ? "bg-white/15 text-[#F5F5F7]"
                    : "text-[#F5F5F7]/85 hover:bg-white/10 hover:text-[#F5F5F7]"
                }`}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                {playbackRate !== 1 && <span>{playbackRate}x</span>}
              </button>

              {activeMenu === "settings" && (
                <div className="absolute bottom-12 right-0 z-30 w-52 rounded-xl border border-white/10 bg-[#14141A] p-2 shadow-2xl space-y-2.5">
                  <div>
                    <p className="px-2 pb-1 text-[11px] font-semibold text-[#A1A1AA]">
                      Playback speed
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {PLAYBACK_SPEED_OPTIONS.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedChange(rate)}
                          className={`rounded-md py-1.5 font-mono text-xs transition-colors ${
                            playbackRate === rate
                              ? "bg-primary font-semibold text-primary-contrast"
                              : "bg-white/5 text-[#F5F5F7] hover:bg-white/10"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {qualities.length > 0 && (
                    <div className="border-t border-white/10 pt-2">
                      <p className="px-2 pb-1 text-[11px] font-semibold text-[#A1A1AA]">
                        Quality ({activeQualityLabel})
                      </p>
                      <div className="space-y-0.5">
                        {qualities.map((q) => (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => handleQualitySwitch(q)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                              q.src === activeSrc
                                ? "bg-primary/15 font-semibold text-primary"
                                : "text-[#F5F5F7] hover:bg-white/10"
                            }`}
                          >
                            <span>{q.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleTheater}
              aria-label={isTheater ? "Exit theater mode" : "Enter theater mode"}
              title="Theater mode (T)"
              className={`hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                isTheater
                  ? "bg-white/15 text-primary"
                  : "text-[#F5F5F7]/85 hover:bg-white/10 hover:text-[#F5F5F7]"
              }`}
            >
              <RectangleHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title="Fullscreen (F)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F5F5F7]/85 transition-colors hover:bg-white/10 hover:text-[#F5F5F7]"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
