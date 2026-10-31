export type DirectionalKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export interface SpatialRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  railIndex?: number;
  itemIndex?: number;
}

export function isDirectionalKey(key: string): key is DirectionalKey {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}

export type PerfModePreference = "auto" | "60fps" | "standard";

export const PERF_MODE_STORAGE_KEY = "zoku_perf_mode";
export const PERF_MODE_CHANGE_EVENT = "zoku:perf-mode-change";

/**
 * Detects Android TV System WebView, Fire TV, Google TV, Shield TV, Smart TV browsers,
 * and virtual-mouse TV browsers such as Downloader by AFTVnews.
 */
export function isAndroidTvOrSmartTvUserAgent(ua: string): boolean {
  if (!ua) return false;
  return (
    /\b(Android\s+TV|GoogleTV|SmartTV|SMART-TV|BRAVIA|AFT[A-Z0-9]*|Silk|SHIELD\s+Android\s+TV|Chromecast|MiBox|MIBOX|ADT-\d|Tizen|Web0S|webOS|NetCast|Viera|HbbTV|TV\s*Bro|BrowseHere|Puffin\s*TV|Downloader|AFTVnews|Fire\s*TV|Nexus\s*Player)\b/i.test(
      ua
    ) ||
    (/Android/i.test(ua) && /\b(TV|Large\s+Screen|AFT|Dalvik)\b/i.test(ua))
  );
}

/**
 * Detects 32-bit Android/Linux architectures (armv7l, armv8l, armeabi-v7a, i686),
 * Android WebView (; wv), TV browsers (Downloader by AFTVnews, Fire TV, Android TV),
 * or constrained CPU/RAM hardware where 60fps compositor optimizations are essential.
 */
export function is32BitOrLowSpecTvEnvironment(params: {
  userAgent?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}): boolean {
  const ua = params.userAgent || "";
  const platform = params.platform || "";

  if (isAndroidTvOrSmartTvUserAgent(ua)) {
    return true;
  }

  // 32-bit ARM / x86 indicators in User-Agent or navigator.platform
  const arch32Pattern =
    /\b(armv7l|armv8l|armeabi-v7a|armeabi|aarch64_32|i686|i386|x86_32|Linux\s+armv7|Linux\s+i686)\b/i;
  if (arch32Pattern.test(ua) || arch32Pattern.test(platform)) {
    return true;
  }

  // Android System WebView (; wv) on embedded/TV devices
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) {
    return true;
  }

  // Low-core or low-RAM hardware typical of 32-bit Android TV / Fire TV sticks
  if (
    typeof params.hardwareConcurrency === "number" &&
    params.hardwareConcurrency > 0 &&
    params.hardwareConcurrency <= 4 &&
    /Android|Linux/i.test(ua + " " + platform)
  ) {
    return true;
  }

  if (
    typeof params.deviceMemory === "number" &&
    params.deviceMemory > 0 &&
    params.deviceMemory <= 2
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves whether 60fps Butter Mode is active given user preference and hardware probe.
 */
export function resolveEffectivePerfMode(
  preference: PerfModePreference,
  isLowSpecOrTv: boolean
): "60fps" | "standard" {
  if (preference === "60fps") return "60fps";
  if (preference === "standard") return "standard";
  return isLowSpecOrTv ? "60fps" : "standard";
}

/**
 * Computes horizontal rail scroll boundary booleans and normalized progress (0..1)
 * with a 6px boundary deadzone to prevent unnecessary React state re-renders.
 */
export function computeRailScrollMetrics(params: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}): {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  progress: number;
  maxScroll: number;
} {
  const { scrollLeft, scrollWidth, clientWidth } = params;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const canScrollLeft = scrollLeft > 6;
  const canScrollRight = maxScroll > 6 && scrollLeft < maxScroll - 6;
  const progress =
    maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;

  return {
    canScrollLeft,
    canScrollRight,
    progress,
    maxScroll,
  };
}

/**
 * Determines whether a pointer drag gesture on a horizontal rail exceeded the click
 * suppression threshold so releasing a virtual mouse drag does not open a card link.
 */
export function shouldSuppressRailClickAfterDrag(
  dragDistancePx: number,
  thresholdPx = 8
): boolean {
  return Math.abs(dragDistancePx) >= thresholdPx;
}

export interface PointerDragSample {
  x: number;
  time: number;
}

/**
 * Computes release velocity in pixels per frame (~16.67ms) based on trailing
 * pointer position samples within a recent time window.
 * Designed for virtual mouse cursors (e.g. Downloader by AFTVnews) and touch/pointer flicks.
 * Note: Dragging left (negative delta X) increases scrollLeft (reveals titles to the right).
 */
export function computeDragVelocity(
  samples: PointerDragSample[],
  now = typeof performance !== "undefined" ? performance.now() : Date.now(),
  windowMs = 120,
  maxVelocity = 48
): number {
  if (!samples || samples.length < 2) return 0;
  const recent = samples.filter((s) => now - s.time <= windowMs);
  if (recent.length < 2) return 0;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = last.time - first.time;
  const dx = last.x - first.x;
  if (dt <= 8 || dx === 0) return 0;

  const pxPerMs = dx / dt;
  // Invert because pointer drag direction is opposite to scrollLeft displacement
  const pxPerFrame = -pxPerMs * 16.67;
  if (Math.abs(pxPerFrame) < 0.001) return 0;

  return Math.max(-maxVelocity, Math.min(maxVelocity, pxPerFrame));
}

/**
 * Computes a single decaying step in the velocity-based friction momentum curve.
 * v_{t+1} = v_t * friction.
 * Returns the next velocity and the pixel displacement delta to apply to scrollLeft.
 */
export function computeFrictionStep(
  currentVelocity: number,
  friction = 0.93,
  stopThreshold = 0.25
): { nextVelocity: number; delta: number; isStopped: boolean } {
  if (Math.abs(currentVelocity) <= stopThreshold) {
    return { nextVelocity: 0, delta: 0, isStopped: true };
  }
  const nextVelocity = currentVelocity * friction;
  const isStopped = Math.abs(nextVelocity) <= stopThreshold;
  return {
    nextVelocity: isStopped ? 0 : nextVelocity,
    delta: currentVelocity,
    isStopped,
  };
}

/**
 * Recognizes Enter, Space, and Android TV remote DPAD_CENTER (keyCode 23 / "Select")
 */
export function isTvSelectKey(event: { key?: string; keyCode?: number }): boolean {
  return (
    event.key === "Enter" ||
    event.key === "Select" ||
    event.key === " " ||
    event.keyCode === 23 ||
    event.keyCode === 66
  );
}

/**
 * Computes the next focusable item index within a 1D horizontal rail or 2D grid.
 */
export function getNextGridFocusIndex(params: {
  currentIndex: number;
  totalItems: number;
  columns: number;
  key: DirectionalKey;
}): number {
  const { currentIndex, totalItems, columns, key } = params;
  if (totalItems <= 0) return -1;
  const cols = Math.max(1, columns);
  const clamped = Math.max(0, Math.min(totalItems - 1, currentIndex));

  switch (key) {
    case "ArrowRight":
      return Math.min(totalItems - 1, clamped + 1);
    case "ArrowLeft":
      return Math.max(0, clamped - 1);
    case "ArrowDown": {
      const next = clamped + cols;
      return next < totalItems ? next : clamped;
    }
    case "ArrowUp": {
      const prev = clamped - cols;
      return prev >= 0 ? prev : clamped;
    }
  }
}

/**
 * Given a list of spatial rectangles and a currently focused item ID,
 * selects the best candidate in the requested direction for 10-foot TV navigation.
 */
export function findNearestSpatialCandidate(
  current: SpatialRect,
  candidates: SpatialRect[],
  direction: DirectionalKey
): SpatialRect | null {
  const curCenterX = current.left + current.width / 2;
  const curCenterY = current.top + current.height / 2;

  let best: SpatialRect | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.id === current.id) continue;
    const candCenterX = candidate.left + candidate.width / 2;
    const candCenterY = candidate.top + candidate.height / 2;
    const dx = candCenterX - curCenterX;
    const dy = candCenterY - curCenterY;

    if (direction === "ArrowRight" && dx <= 4) continue;
    if (direction === "ArrowLeft" && dx >= -4) continue;
    if (direction === "ArrowDown" && dy <= 4) continue;
    if (direction === "ArrowUp" && dy >= -4) continue;

    // Weight primary axis distance + orthogonal penalty
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";
    const primaryDist = isHorizontal ? Math.abs(dx) : Math.abs(dy);
    const orthoDist = isHorizontal ? Math.abs(dy) : Math.abs(dx);

    // If moving horizontally, strongly prefer items in the same rail/row
    const score = primaryDist + orthoDist * (isHorizontal ? 3.5 : 1.5);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * Ensures a focused element inside a horizontally scrollable rail stays smoothly visible.
 */
export function ensureRailItemVisible(element: HTMLElement | null) {
  if (!element || typeof element.scrollIntoView !== "function") return;
  try {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  } catch {
    element.scrollIntoView();
  }
}

