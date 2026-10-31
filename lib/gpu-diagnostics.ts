import {
  is32BitOrLowSpecTvEnvironment,
  isAndroidTvOrSmartTvUserAgent,
} from "./tv-navigation";

export interface GpuCapabilities {
  webglVersion: "WebGL 2.0" | "WebGL 1.0" | "Unsupported";
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxViewportWidth: number;
  maxViewportHeight: number;
  colorBits: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  is32BitArchitecture: boolean;
  archDescription: string;
  isAndroidTvOrStick: boolean;
  tier: "low_spec_32bit_tv" | "balanced_embedded" | "high_spec_desktop";
  tierTitle: string;
  recommendations: string[];
}

export interface HardwareAccelerationFlags {
  forceGpuCompositing: boolean;
  bypassBackdropFilter: boolean;
  limitTextureResolution: boolean;
  cssLayoutContainment: boolean;
  reducedOverdraw: boolean;
  railInertiaFriction: boolean;
}

export const GPU_FLAGS_STORAGE_KEY = "zoku_gpu_hardware_flags";
export const GPU_FLAGS_CHANGE_EVENT = "zoku:gpu-flags-change";

export const GPU_FLAG_PRESETS = {
  tv32BitRecommended: {
    id: "tv32BitRecommended",
    title: "32-Bit Android TV Recommended",
    badge: "Recommended for TV",
    description:
      "Forces GPU compositing, eliminates backdrop blur shaders, and isolates layout containment to lock 60fps on ARM Mali/Adreno TV sticks.",
    flags: {
      forceGpuCompositing: true,
      bypassBackdropFilter: true,
      limitTextureResolution: true,
      cssLayoutContainment: true,
      reducedOverdraw: true,
      railInertiaFriction: true,
    },
  },
  maxPerformance: {
    id: "maxPerformance",
    title: "Maximum Acceleration (Zero Repaints)",
    badge: "Fastest",
    description:
      "All hardware mitigations enabled; bypasses Gaussian blurs and radial overdraw for Downloader by AFTVnews and low-spec WebViews.",
    flags: {
      forceGpuCompositing: true,
      bypassBackdropFilter: true,
      limitTextureResolution: true,
      cssLayoutContainment: true,
      reducedOverdraw: true,
      railInertiaFriction: true,
    },
  },
  standardDesktop: {
    id: "standardDesktop",
    title: "Standard Desktop Defaults",
    badge: "Desktop",
    description:
      "Standard multi-pass glassmorphism and ambient lighting for high-power desktop GPUs.",
    flags: {
      forceGpuCompositing: false,
      bypassBackdropFilter: false,
      limitTextureResolution: false,
      cssLayoutContainment: true,
      reducedOverdraw: false,
      railInertiaFriction: true,
    },
  },
} as const;

/**
 * Pure probe that detects GPU capabilities via WebGL context parameters and debug renderer extensions.
 */
export function probeGpuCapabilities(params?: {
  userAgent?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  canvasFactory?: () => HTMLCanvasElement | null;
}): GpuCapabilities {
  const ua =
    params?.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const platform =
    params?.platform ??
    (typeof navigator !== "undefined" ? navigator.platform : "");
  const hardwareConcurrency =
    params?.hardwareConcurrency ??
    (typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4);
  const deviceMemoryGb =
    params?.deviceMemory ??
    (typeof navigator !== "undefined" && "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
      : null);

  const isTv = isAndroidTvOrSmartTvUserAgent(ua);
  const is32Bit =
    /\b(armv7l|armv8l|armeabi-v7a|armeabi|aarch64_32|i686|i386|x86_32|Linux\s+armv7|Linux\s+i686)\b/i.test(
      ua + " " + platform
    ) || (isTv && (hardwareConcurrency <= 4 || (deviceMemoryGb !== null && deviceMemoryGb <= 2)));

  const archDescription = is32Bit
    ? "32-Bit ARM/x86 Architecture (TV/Embedded)"
    : "64-Bit Architecture (Desktop/Modern Mobile)";

  let webglVersion: "WebGL 2.0" | "WebGL 1.0" | "Unsupported" = "Unsupported";
  let vendor = "Generic / Software";
  let renderer = "Generic Renderer";
  let unmaskedVendor = "Unknown Vendor";
  let unmaskedRenderer = "Unknown GPU";
  let maxTextureSize = 2048;
  let maxRenderbufferSize = 2048;
  let maxViewportWidth = 1920;
  let maxViewportHeight = 1080;
  const colorBits = { red: 8, green: 8, blue: 8, alpha: 8 };

  let canvas: HTMLCanvasElement | null = null;
  if (params?.canvasFactory) {
    canvas = params.canvasFactory();
  } else if (typeof document !== "undefined") {
    try {
      canvas = document.createElement("canvas");
    } catch {
      canvas = null;
    }
  }

  if (canvas) {
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
      if (gl) {
        webglVersion = "WebGL 2.0";
      } else {
        gl = (canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
        if (gl) {
          webglVersion = "WebGL 1.0";
        }
      }
    } catch {
      gl = null;
    }

    if (gl) {
      try {
        vendor = String(gl.getParameter(gl.VENDOR) || vendor);
        renderer = String(gl.getParameter(gl.RENDERER) || renderer);
        maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || maxTextureSize;
        maxRenderbufferSize =
          Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || maxRenderbufferSize;

        const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        if (Array.isArray(dims) || dims instanceof Int32Array) {
          maxViewportWidth = dims[0] || maxViewportWidth;
          maxViewportHeight = dims[1] || maxViewportHeight;
        }

        colorBits.red = Number(gl.getParameter(gl.RED_BITS)) || 8;
        colorBits.green = Number(gl.getParameter(gl.GREEN_BITS)) || 8;
        colorBits.blue = Number(gl.getParameter(gl.BLUE_BITS)) || 8;
        colorBits.alpha = Number(gl.getParameter(gl.ALPHA_BITS)) || 8;

        const dbgExt = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbgExt) {
          unmaskedVendor =
            String(gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL)) || vendor;
          unmaskedRenderer =
            String(gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL)) || renderer;
        } else {
          unmaskedVendor = vendor;
          unmaskedRenderer = renderer;
        }
      } catch {
        // Fallback to defaults
      }
    }
  }

  const hasActiveGl = webglVersion !== "Unsupported";

  // Derive GPU tier
  const isConstrainedTv =
    isTv ||
    is32Bit ||
    (hasActiveGl && maxTextureSize <= 4096) ||
    /Mali-400|Mali-450|Mali-G31|Adreno\s*(306|505|506)|PowerVR|SwiftShader/i.test(
      unmaskedRenderer
    );

  const tier: GpuCapabilities["tier"] = isConstrainedTv
    ? "low_spec_32bit_tv"
    : hardwareConcurrency <= 6 && (deviceMemoryGb === null || deviceMemoryGb <= 4)
    ? "balanced_embedded"
    : "high_spec_desktop";

  const tierTitle =
    tier === "low_spec_32bit_tv"
      ? "32-Bit Constrained TV GPU"
      : tier === "balanced_embedded"
      ? "Balanced Mobile / Embedded GPU"
      : "High-Performance Discrete / Desktop GPU";

  const recommendations: string[] = [];
  if (tier === "low_spec_32bit_tv") {
    recommendations.push(
      "Enable Force GPU 3D Compositing to bypass CPU software rasterization.",
      "Bypass backdrop-filter blur shaders to eliminate 15-20fps drops on Mali/Adreno TV sticks.",
      "Enable CSS Layout Containment so rapid virtual mouse scrolling won't trigger reflow cascades.",
      "Limit high-res texture allocations to keep 32-bit WebViews inside 2GB RAM limits."
    );
  } else if (tier === "balanced_embedded") {
    recommendations.push(
      "Enable CSS Layout Containment for smooth 60fps rail scrolling.",
      "Optionally disable background glow orbs on battery saver mode."
    );
  } else {
    recommendations.push(
      "Your hardware GPU has ample texture memory and fragment fill rate for full glassmorphism."
    );
  }

  return {
    webglVersion,
    vendor,
    renderer,
    unmaskedVendor,
    unmaskedRenderer,
    maxTextureSize,
    maxRenderbufferSize,
    maxViewportWidth,
    maxViewportHeight,
    colorBits,
    hardwareConcurrency,
    deviceMemoryGb,
    is32BitArchitecture: is32Bit,
    archDescription,
    isAndroidTvOrStick: isTv,
    tier,
    tierTitle,
    recommendations,
  };
}

/**
 * Loads stored flags or falls back to hardware-detected defaults.
 */
export function readStoredHardwareFlags(
  fallbackTier?: GpuCapabilities["tier"]
): HardwareAccelerationFlags {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(GPU_FLAGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          return {
            forceGpuCompositing: Boolean(parsed.forceGpuCompositing),
            bypassBackdropFilter: Boolean(parsed.bypassBackdropFilter),
            limitTextureResolution: Boolean(parsed.limitTextureResolution),
            cssLayoutContainment: parsed.cssLayoutContainment !== false,
            reducedOverdraw: Boolean(parsed.reducedOverdraw),
            railInertiaFriction: parsed.railInertiaFriction !== false,
          };
        }
      }
    } catch {
      // Ignore storage parse issues
    }
  }

  if (fallbackTier === "low_spec_32bit_tv") {
    return GPU_FLAG_PRESETS.tv32BitRecommended.flags;
  }
  return GPU_FLAG_PRESETS.standardDesktop.flags;
}

/**
 * Saves flags to localStorage and applies data attributes to the document root.
 */
export function storeAndApplyHardwareFlags(flags: HardwareAccelerationFlags): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GPU_FLAGS_STORAGE_KEY, JSON.stringify(flags));
    } catch {
      // Storage unavailable in private browsing
    }
    applyHardwareAccelerationFlags(flags);
    window.dispatchEvent(
      new CustomEvent(GPU_FLAGS_CHANGE_EVENT, { detail: flags })
    );
  }
}

/**
 * Applies active acceleration flags directly to <html data-gpu-...> attributes
 * for zero-latency CSS activation.
 */
export function applyHardwareAccelerationFlags(flags: HardwareAccelerationFlags): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.gpuForceCompositing = String(flags.forceGpuCompositing);
  root.dataset.gpuBypassBackdrop = String(flags.bypassBackdropFilter);
  root.dataset.gpuLimitTexture = String(flags.limitTextureResolution);
  root.dataset.gpuContainment = String(flags.cssLayoutContainment);
  root.dataset.gpuReducedOverdraw = String(flags.reducedOverdraw);
  root.dataset.gpuRailInertia = String(flags.railInertiaFriction);
}

/**
 * Lightweight real-time frame rate probe that runs over 30 animation frames
 * to measure effective FPS and jank count (frames exceeding 22ms).
 */
export function runQuickFpsBenchmark(
  sampleFrames = 30
): Promise<{ fps: number; frameJankCount: number; averageFrameMs: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
      resolve({ fps: 60, frameJankCount: 0, averageFrameMs: 16.6 });
      return;
    }

    let framesCounted = 0;
    let jankCount = 0;
    const timestamps: number[] = [];
    let prevTime = performance.now();

    const loop = (now: number) => {
      const dt = now - prevTime;
      prevTime = now;
      if (dt > 0) {
        timestamps.push(dt);
        if (dt > 22) {
          jankCount++;
        }
      }

      framesCounted++;
      if (framesCounted < sampleFrames) {
        requestAnimationFrame(loop);
      } else {
        const totalDuration = timestamps.reduce((a, b) => a + b, 0);
        const avgDt = totalDuration / Math.max(1, timestamps.length);
        const calculatedFps = Math.round((1000 / Math.max(1, avgDt)) * 10) / 10;
        resolve({
          fps: Math.min(120, Math.max(10, calculatedFps)),
          frameJankCount: jankCount,
          averageFrameMs: Math.round(avgDt * 100) / 100,
        });
      }
    };

    requestAnimationFrame(loop);
  });
}
