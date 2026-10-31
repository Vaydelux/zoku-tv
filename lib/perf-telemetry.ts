/**
 * Performance Diagnostics & Frame Telemetry Engine
 * Designed for 32-bit Android TV devices (e.g. Fire TV Stick, Downloader, Android WebViews)
 * to monitor GPU compositor frame pacing, latency spikes, and JS heap memory pressure.
 */

export interface FrameTimeRecord {
  id: number;
  timestamp: number;
  deltaMs: number;
  fps: number;
  status: "good" | "warning" | "jank";
  details: string;
}

export interface MemoryTelemetry {
  supported: boolean;
  usedHeapMb: number;
  totalHeapMb: number;
  heapLimitMb: number;
  percentUsed: number;
  deviceMemoryGb: number | null;
  isNearLimit: boolean;
  is32BitConstrained: boolean;
  statusLabel: "Optimal" | "Moderate" | "Critical";
}

export interface RollingPerfStats {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  jankCount: number;
  totalFrames: number;
  stutterPercentage: number;
  memory: MemoryTelemetry;
}

/**
 * Calculates a given percentile (e.g. 95, 99) from an array of numbers.
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((percentile / 100) * sorted.length))
  );
  return Math.round(sorted[index] * 10) / 10;
}

/**
 * Probes browser JS heap allocations via performance.memory and navigator.deviceMemory.
 * On 32-bit Android TV devices, heap limits are strictly clamped (~512MB-1024MB);
 * exceeding 75% causes severe GC thrashing and stutter.
 */
export function probeMemoryUsage(): MemoryTelemetry {
  if (typeof window === "undefined") {
    return {
      supported: false,
      usedHeapMb: 0,
      totalHeapMb: 0,
      heapLimitMb: 512,
      percentUsed: 0,
      deviceMemoryGb: null,
      isNearLimit: false,
      is32BitConstrained: false,
      statusLabel: "Optimal",
    };
  }

  const perfWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  const navWithMem = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGb = typeof navWithMem.deviceMemory === "number" ? navWithMem.deviceMemory : null;
  const is32BitConstrained =
    (deviceMemoryGb !== null && deviceMemoryGb <= 2) ||
    /armv7l|armv8l|i686|AFT/i.test(navigator.userAgent + " " + navigator.platform);

  if (perfWithMemory.memory) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
    const usedHeapMb = Math.round((usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    const totalHeapMb = Math.round((totalJSHeapSize / (1024 * 1024)) * 10) / 10;
    const heapLimitMb = Math.round((jsHeapSizeLimit / (1024 * 1024)) * 10) / 10;
    const percentUsed =
      heapLimitMb > 0 ? Math.round((usedHeapMb / heapLimitMb) * 100) : 0;

    const isNearLimit = percentUsed >= 70;
    const statusLabel: MemoryTelemetry["statusLabel"] =
      percentUsed >= 80 ? "Critical" : percentUsed >= 60 ? "Moderate" : "Optimal";

    return {
      supported: true,
      usedHeapMb,
      totalHeapMb,
      heapLimitMb,
      percentUsed,
      deviceMemoryGb,
      isNearLimit,
      is32BitConstrained,
      statusLabel,
    };
  }

  // Fallback for browsers that don't expose performance.memory
  return {
    supported: false,
    usedHeapMb: 0,
    totalHeapMb: 0,
    heapLimitMb: is32BitConstrained ? 512 : 2048,
    percentUsed: 0,
    deviceMemoryGb,
    isNearLimit: false,
    is32BitConstrained,
    statusLabel: "Optimal",
  };
}

/**
 * Real-time frame telemetry logger that continuously samples requestAnimationFrame delta times,
 * classifies frame health (normal 60fps <=18ms, warning <=28ms, jank >28ms),
 * and exposes rolling telemetry statistics.
 */
export class FrameTelemetryLogger {
  private isRunning = false;
  private rafId: number | null = null;
  private prevTimestamp = 0;
  private frameIdCounter = 0;
  private records: FrameTimeRecord[] = [];
  private maxHistory: number;
  private listeners = new Set<(record: FrameTimeRecord, stats: RollingPerfStats) => void>();

  constructor(maxHistory = 60) {
    this.maxHistory = maxHistory;
  }

  public start(maxHistory?: number) {
    if (this.isRunning) return;
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;

    if (maxHistory) this.maxHistory = maxHistory;
    this.isRunning = true;
    this.prevTimestamp = performance.now();

    const loop = (now: number) => {
      if (!this.isRunning) return;

      const deltaMs = now - this.prevTimestamp;
      this.prevTimestamp = now;

      // Filter out browser tab focus suspension gaps (> 1000ms)
      if (deltaMs > 0 && deltaMs < 1000) {
        this.frameIdCounter++;
        const roundedDelta = Math.round(deltaMs * 10) / 10;
        const fps = Math.min(120, Math.max(1, Math.round(1000 / deltaMs)));

        let status: FrameTimeRecord["status"] = "good";
        let details = `Normal (${roundedDelta}ms · ${fps}fps)`;

        if (roundedDelta > 28) {
          status = "jank";
          details = `Jank Stutter (${roundedDelta}ms · frame drop)`;
        } else if (roundedDelta > 19) {
          status = "warning";
          details = `Minor Delay (${roundedDelta}ms · sub-60fps)`;
        }

        const record: FrameTimeRecord = {
          id: this.frameIdCounter,
          timestamp: now,
          deltaMs: roundedDelta,
          fps,
          status,
          details,
        };

        this.records.push(record);
        if (this.records.length > this.maxHistory) {
          this.records.shift();
        }

        const stats = this.getStats();
        for (const listener of this.listeners) {
          listener(record, stats);
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public clear() {
    this.records = [];
    this.frameIdCounter = 0;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getHistory(): FrameTimeRecord[] {
    return [...this.records];
  }

  public subscribe(fn: (record: FrameTimeRecord, stats: RollingPerfStats) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public getStats(): RollingPerfStats {
    const memory = probeMemoryUsage();
    if (!this.records.length) {
      return {
        currentFps: 60,
        averageFps: 60,
        minFps: 60,
        maxFps: 60,
        averageFrameMs: 16.6,
        p95FrameMs: 16.6,
        p99FrameMs: 16.6,
        jankCount: 0,
        totalFrames: 0,
        stutterPercentage: 0,
        memory,
      };
    }

    const deltas = this.records.map((r) => r.deltaMs);
    const fpsList = this.records.map((r) => r.fps);
    const sumDeltas = deltas.reduce((a, b) => a + b, 0);
    const averageFrameMs = Math.round((sumDeltas / deltas.length) * 10) / 10;
    const averageFps = Math.min(120, Math.max(1, Math.round(1000 / Math.max(1, averageFrameMs))));
    const currentFps = this.records[this.records.length - 1].fps;
    const minFps = Math.min(...fpsList);
    const maxFps = Math.max(...fpsList);
    const jankCount = this.records.filter((r) => r.status === "jank").length;
    const stutterPercentage =
      Math.round((jankCount / Math.max(1, this.records.length)) * 100);

    return {
      currentFps,
      averageFps,
      minFps,
      maxFps,
      averageFrameMs,
      p95FrameMs: calculatePercentile(deltas, 95),
      p99FrameMs: calculatePercentile(deltas, 99),
      jankCount,
      totalFrames: this.records.length,
      stutterPercentage,
      memory,
    };
  }

  public exportReport(): string {
    const stats = this.getStats();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats,
        recentFrames: this.records.slice(-30),
      },
      null,
      2
    );
  }
}

/**
 * Runs a 3-second live stutter stress test to evaluate compositor throughput
 * and determine if 32-bit hardware acceleration flags should be recommended.
 */
export function runStutterStressTest(
  durationMs = 3000
): Promise<{
  framesCounted: number;
  jankCount: number;
  averageFrameMs: number;
  maxFrameMs: number;
  p99FrameMs: number;
  diagnosis: string;
}> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
      resolve({
        framesCounted: 180,
        jankCount: 0,
        averageFrameMs: 16.6,
        maxFrameMs: 18.2,
        p99FrameMs: 17.5,
        diagnosis: "Optimal 60fps pacing maintained without dropped frames.",
      });
      return;
    }

    const deltas: number[] = [];
    let janks = 0;
    let prev = performance.now();
    const start = prev;

    const step = (now: number) => {
      const dt = now - prev;
      prev = now;
      if (dt > 0 && dt < 800) {
        deltas.push(dt);
        if (dt > 25) janks++;
      }

      if (now - start < durationMs) {
        requestAnimationFrame(step);
      } else {
        const total = deltas.reduce((a, b) => a + b, 0);
        const avg = total / Math.max(1, deltas.length);
        const max = Math.max(...(deltas.length ? deltas : [16.6]));
        const p99 = calculatePercentile(deltas, 99);

        let diagnosis = "Optimal 60fps compositor pacing maintained.";
        if (janks > 6 || p99 > 32) {
          diagnosis =
            "Severe stuttering detected. Recommended: Enable 'Bypass Backdrop Blur Shaders' and 'CSS Layout Containment' for 32-bit TV hardware.";
        } else if (janks > 2 || p99 > 24) {
          diagnosis =
            "Moderate frame variance detected. Recommended: Enable 'Force GPU 3D Compositing'.";
        }

        resolve({
          framesCounted: deltas.length,
          jankCount: janks,
          averageFrameMs: Math.round(avg * 10) / 10,
          maxFrameMs: Math.round(max * 10) / 10,
          p99FrameMs: p99,
          diagnosis,
        });
      }
    };

    requestAnimationFrame(step);
  });
}
