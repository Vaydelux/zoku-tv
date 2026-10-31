"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  HardDrive,
  Cpu,
  Sparkles,
  Sliders,
} from "lucide-react";
import {
  FrameTelemetryLogger,
  probeMemoryUsage,
  runStutterStressTest,
  type FrameTimeRecord,
  type RollingPerfStats,
} from "@/lib/perf-telemetry";
import {
  readStoredHardwareFlags,
  storeAndApplyHardwareFlags,
  GPU_FLAG_PRESETS,
  type HardwareAccelerationFlags,
} from "@/lib/gpu-diagnostics";

export function PerformanceDiagnosticsPanel() {
  const loggerRef = useRef<FrameTelemetryLogger | null>(null);
  const [isLogging, setIsLogging] = useState(true);
  const [history, setHistory] = useState<FrameTimeRecord[]>([]);
  const [stats, setStats] = useState<RollingPerfStats | null>(null);
  const [hardwareFlags, setHardwareFlags] = useState<HardwareAccelerationFlags>(() =>
    readStoredHardwareFlags()
  );
  const [copied, setCopied] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressResult, setStressResult] = useState<{
    framesCounted: number;
    jankCount: number;
    averageFrameMs: number;
    maxFrameMs: number;
    p99FrameMs: number;
    diagnosis: string;
  } | null>(null);

  const initLogger = useCallback(() => {
    if (!loggerRef.current) {
      loggerRef.current = new FrameTelemetryLogger(60);
    }
    const logger = loggerRef.current;

    const unsubscribe = logger.subscribe((record, nextStats) => {
      setHistory(logger.getHistory());
      setStats(nextStats);
    });

    if (isLogging) {
      logger.start();
    }

    return () => {
      unsubscribe();
      logger.stop();
    };
  }, [isLogging]);

  useEffect(() => {
    const cleanup = initLogger();
    return cleanup;
  }, [initLogger]);

  // Periodic memory update every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const mem = probeMemoryUsage();
      setStats((prev) => (prev ? { ...prev, memory: mem } : null));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const toggleLogging = () => {
    if (!loggerRef.current) return;
    if (isLogging) {
      loggerRef.current.stop();
      setIsLogging(false);
    } else {
      loggerRef.current.start();
      setIsLogging(true);
    }
  };

  const handleClearLogs = () => {
    if (!loggerRef.current) return;
    loggerRef.current.clear();
    setHistory([]);
    setStats(loggerRef.current.getStats());
    setStressResult(null);
  };

  const handleCopyReport = () => {
    if (!loggerRef.current) return;
    const report = loggerRef.current.exportReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    setStressResult(null);
    try {
      const res = await runStutterStressTest(3000);
      setStressResult(res);
    } catch {
      // Ignore stress test failure
    } finally {
      setIsStressTesting(false);
    }
  };

  const handleQuickOptimize = () => {
    const preset = GPU_FLAG_PRESETS.tv32BitRecommended;
    setHardwareFlags(preset.flags);
    storeAndApplyHardwareFlags(preset.flags);
  };

  const memory = stats?.memory || probeMemoryUsage();
  const currentFps = stats?.currentFps ?? 60;
  const avgFrameMs = stats?.averageFrameMs ?? 16.6;
  const p99FrameMs = stats?.p99FrameMs ?? 16.6;
  const jankCount = stats?.jankCount ?? 0;
  const stutterPct = stats?.stutterPercentage ?? 0;

  return (
    <div
      data-testid="performance-diagnostics-panel"
      className="space-y-6 text-on-surface select-none"
    >
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold font-display uppercase tracking-wide text-on-surface">
              Performance Diagnostics &amp; GPU Frame Logger
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant">
            Live GPU compositor frame pacing, latency spikes, and JS heap telemetry for debugging stutter on 32-bit Android TV devices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="toggle-logger-btn"
            onClick={toggleLogging}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              isLogging
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border-custom bg-surface text-on-surface hover:border-primary"
            }`}
          >
            {isLogging ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Logging Active</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Resume Logger</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="stress-test-btn"
            onClick={handleRunStressTest}
            disabled={isStressTesting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-all disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${isStressTesting ? "animate-spin" : ""}`} />
            <span>{isStressTesting ? "Testing (3s)..." : "Run Stutter Stress Test"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-on-surface transition-all"
            title="Copy JSON diagnostic telemetry report"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Export Report</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="rounded-xl border border-border-custom bg-surface p-2 text-on-surface-variant hover:border-primary hover:text-on-surface transition-all"
            title="Clear recorded telemetry frames"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: FPS */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">
              Compositor FPS
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                currentFps >= 55
                  ? "bg-emerald-500"
                  : currentFps >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-on-surface tabular-nums">
              {currentFps}
            </span>
            <span className="text-xs text-on-surface-variant">/ 60 FPS</span>
          </div>
          <p className="text-[10px] text-on-surface-variant">
            Target: 16.6ms frame budget
          </p>
        </div>

        {/* Metric 2: Frame Latency */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">
              Frame Render Latency
            </span>
            <Cpu className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-on-surface tabular-nums">
              {avgFrameMs}
            </span>
            <span className="text-xs text-on-surface-variant">ms avg</span>
          </div>
          <p className="text-[10px] text-on-surface-variant">
            P99 Latency: <strong className="text-on-surface font-mono">{p99FrameMs}ms</strong>
          </p>
        </div>

        {/* Metric 3: Jank / Stutter Spikes */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">
              Jank Spikes (&gt;28ms)
            </span>
            {jankCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${
                jankCount > 0 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {jankCount}
            </span>
            <span className="text-xs text-on-surface-variant">
              ({stutterPct}% stutter)
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant">
            {jankCount === 0 ? "Zero dropped frames" : `${jankCount} frame drop events`}
          </p>
        </div>

        {/* Metric 4: JS Heap & 32-bit Memory */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant">
              32-Bit Memory Pressure
            </span>
            <HardDrive className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-on-surface tabular-nums">
              {memory.supported ? `${memory.usedHeapMb} MB` : "Available"}
            </span>
            <span className="text-xs text-on-surface-variant">
              {memory.supported ? `/ ${memory.heapLimitMb}MB` : `(~${memory.deviceMemoryGb ?? 2}GB RAM)`}
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${
                memory.percentUsed >= 80
                  ? "bg-red-500"
                  : memory.percentUsed >= 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(8, memory.percentUsed))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stress Test Results Banner */}
      {stressResult && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wide">
                Stutter Stress Test Results (3000ms compositor benchmark)
              </h4>
            </div>
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              P99: {stressResult.p99FrameMs}ms · Max: {stressResult.maxFrameMs}ms
            </span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {stressResult.diagnosis}
          </p>
          {stressResult.jankCount > 0 && (
            <button
              type="button"
              onClick={handleQuickOptimize}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-contrast px-3 py-1.5 text-xs font-bold hover:brightness-110 transition-all"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Apply Recommended 32-Bit TV Optimization</span>
            </button>
          )}
        </div>
      )}

      {/* Live GPU Frame Time Timeline (Sparkline Visualizer) */}
      <div className="rounded-xl border border-border-custom bg-background/50 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Live GPU Frame Times Timeline (Last 60 Frames)
            </h3>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-emerald-500" />
              <span>&le;18ms (60fps)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-amber-500" />
              <span>19-28ms (Slow)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-red-500" />
              <span>&gt;28ms (Jank)</span>
            </span>
          </div>
        </div>

        {/* Visual Frame Bar Graph */}
        <div className="h-24 w-full flex items-end gap-1 pt-2 pb-1 bg-surface/40 rounded-lg px-2 border border-border-custom/50 overflow-hidden">
          {history.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full text-xs text-on-surface-variant">
              Waiting for animation frames...
            </div>
          ) : (
            history.map((record) => {
              // Height normalized to 50ms ceiling
              const heightPct = Math.min(100, Math.max(12, (record.deltaMs / 45) * 100));
              const barColor =
                record.status === "jank"
                  ? "bg-red-500"
                  : record.status === "warning"
                  ? "bg-amber-400"
                  : "bg-emerald-500";

              return (
                <div
                  key={record.id}
                  className="flex-1 flex flex-col justify-end items-center group relative h-full"
                >
                  <div
                    className={`w-full rounded-t-sm transition-all duration-75 ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-black/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      {record.deltaMs}ms · {record.fps}fps
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Frame Time Log Table */}
      <div className="rounded-xl border border-border-custom bg-background/50 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border-custom pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Recorded Telemetry Stream ({history.length} samples)
          </h3>
          <span className="font-mono text-[10px] text-on-surface-variant">
            High-Resolution Timer ({typeof performance !== "undefined" ? "performance.now()" : "Date.now()"})
          </span>
        </div>

        <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-lg border border-border-custom/60 font-mono text-[11px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface/95 border-b border-border-custom text-on-surface-variant text-[10px] uppercase">
              <tr>
                <th className="py-2 px-3">Frame</th>
                <th className="py-2 px-3">Delta (ms)</th>
                <th className="py-2 px-3">Rate</th>
                <th className="py-2 px-3">Diagnostic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/40">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-on-surface-variant">
                    No frames logged yet.
                  </td>
                </tr>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((rec) => (
                    <tr
                      key={rec.id}
                      className={
                        rec.status === "jank"
                          ? "bg-red-500/10 text-red-300"
                          : rec.status === "warning"
                          ? "bg-amber-500/5 text-amber-300"
                          : "text-on-surface"
                      }
                    >
                      <td className="py-1.5 px-3 tabular-nums">#{rec.id}</td>
                      <td className="py-1.5 px-3 tabular-nums font-bold">
                        {rec.deltaMs}ms
                      </td>
                      <td className="py-1.5 px-3 tabular-nums">
                        {rec.fps} fps
                      </td>
                      <td className="py-1.5 px-3 flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            rec.status === "jank"
                              ? "bg-red-500"
                              : rec.status === "warning"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span className="truncate">{rec.details}</span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 32-Bit Android TV Debug Recommendations */}
      <div className="rounded-xl border border-border-custom bg-background/30 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>32-Bit Android TV Stutter Troubleshooting Guide</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
          <div className="rounded-lg border border-border-custom/50 bg-background/40 p-3 space-y-1">
            <h4 className="font-bold text-on-surface">1. Frame Pacing Spikes (&gt;28ms)</h4>
            <p className="leading-relaxed">
              Caused by multi-pass backdrop Gaussian blur shaders. Ensure the <strong>Bypass Backdrop Blur Shaders</strong> flag is enabled to allow Mali/Adreno fragment processors to stay within the 16.6ms window.
            </p>
          </div>

          <div className="rounded-lg border border-border-custom/50 bg-background/40 p-3 space-y-1">
            <h4 className="font-bold text-on-surface">2. Out-of-Memory Tab Reboots</h4>
            <p className="leading-relaxed">
              32-bit Android TV WebViews have a strict 512MB–1024MB heap ceiling. Enable <strong>Conserve VRAM / Texture Downscaling</strong> to keep decoded poster textures within the hardware budget.
            </p>
          </div>

          <div className="rounded-lg border border-border-custom/50 bg-background/40 p-3 space-y-1">
            <h4 className="font-bold text-on-surface">3. Virtual Mouse Drag Stutter</h4>
            <p className="leading-relaxed">
              Horizontal rails use <strong>framer-motion velocity-based inertia</strong> and CSS layout containment (<code>contain: layout paint</code>) so cursor flings don&apos;t trigger page reflows.
            </p>
          </div>

          <div className="rounded-lg border border-border-custom/50 bg-background/40 p-3 space-y-1">
            <h4 className="font-bold text-on-surface">4. CPU Software Rasterization Fallback</h4>
            <p className="leading-relaxed">
              Ensure <strong>Force GPU 3D Compositing</strong> is active to prevent the CPU from rendering rail items in software raster mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
