"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  X,
  RotateCcw,
  Gauge,
  Sliders,
  ShieldAlert,
  HardDrive,
  Monitor,
} from "lucide-react";
import {
  probeGpuCapabilities,
  readStoredHardwareFlags,
  storeAndApplyHardwareFlags,
  runQuickFpsBenchmark,
  GPU_FLAG_PRESETS,
  type GpuCapabilities,
  type HardwareAccelerationFlags,
} from "@/lib/gpu-diagnostics";

interface GpuDiagnosticOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onFlagsChanged?: (flags: HardwareAccelerationFlags) => void;
}

export function GpuDiagnosticOverlay({
  isOpen,
  onClose,
  onFlagsChanged,
}: GpuDiagnosticOverlayProps) {
  const [capabilities, setCapabilities] = useState<GpuCapabilities | null>(null);
  const [flags, setFlags] = useState<HardwareAccelerationFlags>(() =>
    readStoredHardwareFlags()
  );
  const [benchmarkResult, setBenchmarkResult] = useState<{
    fps: number;
    frameJankCount: number;
    averageFrameMs: number;
  } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const refreshCapabilities = useCallback(() => {
    const caps = probeGpuCapabilities();
    setCapabilities(caps);
    const loaded = readStoredHardwareFlags(caps.tier);
    setFlags(loaded);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshCapabilities();
    }
  }, [isOpen, refreshCapabilities]);

  // Handle Escape key to close overlay
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 2800);
  };

  const handleToggleFlag = (key: keyof HardwareAccelerationFlags) => {
    const next: HardwareAccelerationFlags = {
      ...flags,
      [key]: !flags[key],
    };
    setFlags(next);
    storeAndApplyHardwareFlags(next);
    onFlagsChanged?.(next);
    showNotification(`Toggled ${formatFlagLabel(key)}: ${next[key] ? "Enabled" : "Disabled"}`);
  };

  const handleApplyPreset = (
    presetKey: keyof typeof GPU_FLAG_PRESETS
  ) => {
    const preset = GPU_FLAG_PRESETS[presetKey];
    setFlags(preset.flags);
    storeAndApplyHardwareFlags(preset.flags);
    onFlagsChanged?.(preset.flags);
    showNotification(`Applied preset: ${preset.title}`);
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const res = await runQuickFpsBenchmark(40);
      setBenchmarkResult(res);
      showNotification(`Benchmark completed: ${res.fps} FPS average`);
    } catch {
      // Ignore benchmark failure
    } finally {
      setIsBenchmarking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GPU Capability Diagnostics and Hardware Acceleration"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-border-custom bg-surface text-on-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-custom px-5 py-4 shrink-0 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-display uppercase tracking-wide text-on-surface">
                  GPU Capability Diagnostics &amp; Hardware Flags
                </h2>
                {capabilities?.is32BitArchitecture && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300 border border-amber-500/40">
                    32-Bit TV Architecture
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Diagnostic inspector and hardware acceleration toggles tailored for 32-bit Android TV &amp; Downloader by AFTVnews.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Diagnostics"
            className="rounded-xl border border-border-custom p-2 text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {feedbackMsg && (
            <div
              role="status"
              className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-xs font-semibold text-primary flex items-center gap-2 animate-fade-in"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* GPU Hardware Probe Card */}
          <div className="rounded-xl border border-border-custom bg-background/50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Detected Graphics Hardware &amp; WebGL Engine
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                  {capabilities?.tierTitle ?? "Detecting..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Unmasked GPU
                </span>
                <p className="font-semibold text-on-surface truncate" title={capabilities?.unmaskedRenderer}>
                  {capabilities?.unmaskedRenderer ?? "Probing..."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Vendor
                </span>
                <p className="font-semibold text-on-surface truncate" title={capabilities?.unmaskedVendor}>
                  {capabilities?.unmaskedVendor ?? "Probing..."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Max Texture Size
                </span>
                <p className="font-mono tabular-nums font-semibold text-on-surface">
                  {capabilities?.maxTextureSize
                    ? `${capabilities.maxTextureSize} × ${capabilities.maxTextureSize} px`
                    : "Probing..."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  WebGL Profile
                </span>
                <p className="font-semibold text-on-surface">
                  {capabilities?.webglVersion ?? "Probing..."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  CPU Cores
                </span>
                <p className="font-mono tabular-nums font-semibold text-on-surface">
                  {capabilities?.hardwareConcurrency ?? 4} Concurrency
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Device Memory
                </span>
                <p className="font-mono tabular-nums font-semibold text-on-surface">
                  {capabilities?.deviceMemoryGb
                    ? `~${capabilities.deviceMemoryGb} GB Available`
                    : "Unconstrained / Not reported"}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Platform Architecture
                </span>
                <p className="font-semibold text-on-surface truncate">
                  {capabilities?.archDescription ?? "Probing..."}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Max Renderbuffer
                </span>
                <p className="font-mono tabular-nums font-semibold text-on-surface">
                  {capabilities?.maxRenderbufferSize
                    ? `${capabilities.maxRenderbufferSize} px`
                    : "Probing..."}
                </p>
              </div>
            </div>
          </div>

          {/* Frame Rate / 60fps Benchmark Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border-custom bg-background/40 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-on-surface">
                  Compositor Frame Pacing Probe (40-Frame Test)
                </h4>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Runs real-time requestAnimationFrame samples to measure effective frame rate and jank frames.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {benchmarkResult && (
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <span className="rounded bg-primary/10 border border-primary/30 px-2.5 py-1 font-bold text-primary tabular-nums">
                    {benchmarkResult.fps} FPS
                  </span>
                  <span className="text-on-surface-variant tabular-nums text-[11px]">
                    · {benchmarkResult.averageFrameMs}ms avg ({benchmarkResult.frameJankCount} jank)
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/60 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-all disabled:opacity-50"
              >
                <Activity className={`h-3.5 w-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
                <span>{isBenchmarking ? "Measuring..." : "Run FPS Test"}</span>
              </button>
            </div>
          </div>

          {/* Quick-Apply Hardware Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>1-Click Hardware Acceleration Presets</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  "tv32BitRecommended",
                  "maxPerformance",
                  "standardDesktop",
                ] as const
              ).map((presetKey) => {
                const preset = GPU_FLAG_PRESETS[presetKey];
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => handleApplyPreset(presetKey)}
                    className="flex flex-col items-start rounded-xl border border-border-custom bg-background/40 p-3.5 text-left hover:border-primary/50 hover:bg-background/70 transition-all group"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                        {preset.title}
                      </span>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-on-surface-variant leading-snug">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hardware Acceleration Flags (Interactive Toggles) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Granular Hardware Acceleration Flags</span>
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset("standardDesktop")}
                className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Flag 1: Force GPU 3D Compositing */}
              <ToggleCard
                title="Force GPU 3D Layer Compositing"
                description="Promotes rail cards, tracks, and hero layers into dedicated GPU hardware textures (translate3d), bypassing CPU software rasterization on 32-bit ARM Mali/Adreno GPUs."
                enabled={flags.forceGpuCompositing}
                icon={Layers}
                onToggle={() => handleToggleFlag("forceGpuCompositing")}
              />

              {/* Flag 2: Bypass Costly Backdrop-Filter Blurs */}
              <ToggleCard
                title="Bypass Backdrop Blur Shaders"
                description="Disables multi-pass Gaussian backdrop-filter shaders on panels and headers. Critical for achieving a locked 60fps on Mali-400 / Mali-G31 TV sticks."
                enabled={flags.bypassBackdropFilter}
                icon={ShieldAlert}
                onToggle={() => handleToggleFlag("bypassBackdropFilter")}
              />

              {/* Flag 3: CSS Layout Containment */}
              <ToggleCard
                title="CSS Layout Containment (contain: layout paint)"
                description="Isolates individual rail card bounds so horizontal panning with a virtual mouse doesn't invalidate or reflow the entire page DOM."
                enabled={flags.cssLayoutContainment}
                icon={Cpu}
                onToggle={() => handleToggleFlag("cssLayoutContainment")}
              />

              {/* Flag 4: Conserve VRAM / Texture Limit */}
              <ToggleCard
                title="Conserve VRAM / Texture Downscaling"
                description="Limits decoded image buffer allocations and applies contrast optimization to prevent 32-bit WebViews from exceeding 2GB memory ceilings."
                enabled={flags.limitTextureResolution}
                icon={HardDrive}
                onToggle={() => handleToggleFlag("limitTextureResolution")}
              />

              {/* Flag 5: Reduced Overdraw */}
              <ToggleCard
                title="Reduced Overdraw (Suppress Glow Orbs)"
                description="Hides animated ambient background orbs and particles to eliminate fill-rate bottlenecks in low-end TV GPU fragment shaders."
                enabled={flags.reducedOverdraw}
                icon={Sparkles}
                onToggle={() => handleToggleFlag("reducedOverdraw")}
              />

              {/* Flag 6: Kinetic Velocity Friction Momentum */}
              <ToggleCard
                title="Kinetic Velocity-Based Rail Momentum"
                description="Enables smooth decaying inertia when releasing virtual mouse clicks or touch flicks across horizontal rails for a fluid 60fps feel."
                enabled={flags.railInertiaFriction}
                icon={Gauge}
                onToggle={() => handleToggleFlag("railInertiaFriction")}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-custom px-5 py-3.5 shrink-0 bg-surface/90">
          <span className="font-mono text-[10px] text-on-surface-variant">
            Settings automatically persist to local device storage.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary text-primary-contrast px-5 py-2 text-xs font-bold hover:brightness-110 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  enabled,
  icon: Icon,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
        enabled
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border-custom bg-background/30 hover:border-primary/40 hover:bg-background/50"
      }`}
    >
      <div
        className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
          enabled ? "bg-primary text-primary-contrast" : "bg-surface text-on-surface-variant"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-on-surface truncate">
            {title}
          </span>
          <span
            className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
              enabled
                ? "bg-primary text-primary-contrast"
                : "bg-surface text-on-surface-variant"
            }`}
          >
            {enabled ? "Active" : "Off"}
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>
    </button>
  );
}

function formatFlagLabel(key: keyof HardwareAccelerationFlags): string {
  switch (key) {
    case "forceGpuCompositing":
      return "Force GPU 3D Compositing";
    case "bypassBackdropFilter":
      return "Bypass Backdrop Blur Shaders";
    case "limitTextureResolution":
      return "Conserve VRAM / Texture Limit";
    case "cssLayoutContainment":
      return "CSS Layout Containment";
    case "reducedOverdraw":
      return "Reduced Overdraw";
    case "railInertiaFriction":
      return "Kinetic Rail Momentum";
  }
}
