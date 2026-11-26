"use client";

import { Activity, Gauge, Shield, Sliders } from "lucide-react";
import { FirebaseStatusIndicator } from "@/components/FirebaseStatusIndicator";
import {
  GPU_FLAG_PRESETS,
  type GpuCapabilities,
  type HardwareAccelerationFlags,
} from "@/lib/gpu-diagnostics";

interface DiagnosticsSectionProps {
  userId: string;
  profileId: string;
  gpuCaps: GpuCapabilities | null;
  hardwareFlags: HardwareAccelerationFlags;
  onOpenGpuOverlay: () => void;
  onApplyPreset: (presetKey: keyof typeof GPU_FLAG_PRESETS) => void;
  onToggleFlag: (key: keyof HardwareAccelerationFlags) => void;
  onOpenPerfTelemetry: () => void;
}

const FLAG_ITEMS: Array<{
  key: keyof HardwareAccelerationFlags;
  testId: string;
  title: string;
  desc: string;
}> = [
  {
    key: "forceGpuCompositing",
    testId: "flag-force-gpu-compositing",
    title: "Force GPU 3D Compositing",
    desc: "Dedicated GPU texture layers (translate3d)",
  },
  {
    key: "bypassBackdropFilter",
    testId: "flag-bypass-backdrop-filter",
    title: "Bypass Backdrop Blur Shaders",
    desc: "Zero-overhead solid panels for Mali/Adreno",
  },
  {
    key: "cssLayoutContainment",
    testId: "flag-css-layout-containment",
    title: "CSS Layout Containment",
    desc: "contain: layout style to isolate rail reflows",
  },
  {
    key: "limitTextureResolution",
    testId: "flag-limit-texture-resolution",
    title: "Conserve VRAM / Texture Limit",
    desc: "Downsamples textures for 32-bit TV WebViews",
  },
  {
    key: "reducedOverdraw",
    testId: "flag-reduced-overdraw",
    title: "Reduced Overdraw (Hide Aura)",
    desc: "Suppresses ambient radial mesh for raster throughput",
  },
  {
    key: "railInertiaFriction",
    testId: "flag-rail-inertia-friction",
    title: "Kinetic Rail Momentum",
    desc: "Velocity-based friction fling for virtual mouse",
  },
];

export function DiagnosticsSection({
  userId,
  profileId,
  gpuCaps,
  hardwareFlags,
  onOpenGpuOverlay,
  onApplyPreset,
  onToggleFlag,
  onOpenPerfTelemetry,
}: DiagnosticsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          Graphics (GPU), System &amp; Cloud Diagnostics
        </h2>
        <p className="text-xs text-on-surface-variant">
          Inspect graphics hardware capabilities, tune Liquid Glass acceleration flags, and verify cloud sync.
        </p>
      </div>

      {/* GPU Capability & Hardware Acceleration Card */}
      <div
        data-testid="settings-gpu-diagnostics-card"
        className="rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--glass-border)] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                GPU Hardware Capabilities &amp; WebGL Engine
              </h3>
              {gpuCaps?.is32BitArchitecture && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300 border border-amber-500/40">
                  32-Bit TV
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Detected Tier: <strong className="text-primary">{gpuCaps?.tierTitle || "Probing..."}</strong>
            </p>
          </div>

          <button
            type="button"
            data-testid="open-gpu-overlay-btn"
            onClick={onOpenGpuOverlay}
            className="liquid-glass-pill shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Open GPU Overlay</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">Unmasked GPU</span>
            <p className="font-semibold text-on-surface truncate" title={gpuCaps?.unmaskedRenderer}>
              {gpuCaps?.unmaskedRenderer || "Probing..."}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">Vendor</span>
            <p className="font-semibold text-on-surface truncate" title={gpuCaps?.unmaskedVendor}>
              {gpuCaps?.unmaskedVendor || "Probing..."}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">Max Texture</span>
            <p className="font-mono tabular-nums font-semibold text-on-surface">
              {gpuCaps?.maxTextureSize ? `${gpuCaps.maxTextureSize} × ${gpuCaps.maxTextureSize} px` : "Probing..."}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">WebGL</span>
            <p className="font-semibold text-on-surface">{gpuCaps?.webglVersion || "Probing..."}</p>
          </div>
        </div>

        {/* 1-Click Presets */}
        <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            1-Click Acceleration Presets
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(["tv32BitRecommended", "maxPerformance", "standardDesktop"] as const).map((presetKey) => {
              const preset = GPU_FLAG_PRESETS[presetKey];
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => onApplyPreset(presetKey)}
                  className="flex flex-col items-start rounded-2xl border border-[var(--glass-border)] bg-background/30 p-3 text-left hover:border-primary/50 transition-all"
                >
                  <span className="text-xs font-bold text-on-surface">{preset.title}</span>
                  <span className="mt-0.5 text-[10px] text-on-surface-variant line-clamp-2">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Granular Flags */}
        <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            Granular Hardware Flags
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FLAG_ITEMS.map((item) => {
              const active = hardwareFlags[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  data-testid={item.testId}
                  onClick={() => onToggleFlag(item.key)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    active
                      ? "border-primary bg-primary/12 ring-1 ring-primary/40"
                      : "border-[var(--glass-border)] bg-background/25 hover:border-primary/40"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-on-surface">{item.title}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{item.desc}</p>
                  </div>
                  <span
                    className={`font-mono text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      active
                        ? "bg-primary text-primary-contrast"
                        : "bg-on-surface/10 text-on-surface-variant"
                    }`}
                  >
                    {active ? "Active" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cloud & Firebase Section */}
      <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Cloud Database &amp; Auth Diagnostics</span>
          </h3>
          <p className="text-xs text-on-surface-variant">
            Inspect active user token, Firestore session scope, and security rules connectivity.
          </p>
        </div>
        <FirebaseStatusIndicator userId={userId} profileId={profileId} />
      </div>

      {/* Performance Telemetry Shortcut */}
      <div className="pt-4 border-t border-[var(--glass-border)]">
        <div className="p-4 rounded-[22px] border border-primary/30 bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-on-surface">
                Live GPU Frame Times &amp; Memory Diagnostics
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Track 60fps frame times, dropped frames, P99 latency, and JS heap memory in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPerfTelemetry}
            className="liquid-glass-cta px-4 py-2 rounded-full text-xs font-semibold shrink-0 self-start sm:self-auto"
          >
            Open Live Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
