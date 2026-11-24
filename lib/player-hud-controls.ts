export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type NativeVideoShortcutAction =
  | { type: "toggle_play" }
  | { type: "seek_delta"; seconds: number }
  | { type: "volume_delta"; delta: number }
  | { type: "toggle_mute" }
  | { type: "toggle_fullscreen" }
  | { type: "toggle_theater" }
  | { type: "toggle_captions" }
  | { type: "seek_percent"; percent: number };

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function clampSeekTime(targetSec: number, durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  if (!Number.isFinite(targetSec)) return 0;
  return Math.max(0, Math.min(durationSec, targetSec));
}

export interface BufferedRange {
  start: number;
  end: number;
}

/**
 * Returns the buffered progress percentage (0-100) covering the current
 * playback position, falling back to the furthest buffered range.
 */
export function computeBufferedPercent(
  ranges: BufferedRange[],
  currentTimeSec: number,
  durationSec: number
): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || ranges.length === 0) {
    return 0;
  }

  let furthestEnd = 0;
  for (const range of ranges) {
    if (range.start <= currentTimeSec + 0.5 && range.end >= currentTimeSec) {
      return Math.max(0, Math.min(100, (range.end / durationSec) * 100));
    }
    if (range.end > furthestEnd) {
      furthestEnd = range.end;
    }
  }

  return Math.max(0, Math.min(100, (furthestEnd / durationSec) * 100));
}

export function isDirectMediaUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const path = parsed.pathname.toLowerCase();
    return /\.(mp4|webm|ogg|ogv|m4v|mov|m3u8)$/i.test(path);
  } catch {
    return false;
  }
}

export function resolveNativeVideoShortcut(input: {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): NativeVideoShortcutAction | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null;

  const key = input.key;
  const lower = key.toLowerCase();

  if (key === " " || input.code === "Space" || lower === "k") {
    return { type: "toggle_play" };
  }
  if (key === "ArrowLeft" || lower === "j") {
    return { type: "seek_delta", seconds: -10 };
  }
  if (key === "ArrowRight" || lower === "l") {
    return { type: "seek_delta", seconds: 10 };
  }
  if (key === "ArrowUp") {
    return { type: "volume_delta", delta: 0.1 };
  }
  if (key === "ArrowDown") {
    return { type: "volume_delta", delta: -0.1 };
  }
  if (lower === "m") {
    return { type: "toggle_mute" };
  }
  if (lower === "f") {
    return { type: "toggle_fullscreen" };
  }
  if (lower === "t") {
    return { type: "toggle_theater" };
  }
  if (lower === "c") {
    return { type: "toggle_captions" };
  }
  if (/^[0-9]$/.test(key)) {
    return { type: "seek_percent", percent: Number(key) * 10 };
  }

  return null;
}
