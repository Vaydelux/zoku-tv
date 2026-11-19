export type WatchShortcutAction =
  | "next_episode"
  | "prev_episode"
  | "next_server"
  | "retry_frame"
  | "toggle_watched"
  | "toggle_shortcuts_help";

export const AUTO_NEXT_STORAGE_KEY = "zoku_auto_next_episode_v1";
export const AUTO_NEXT_COUNTDOWN_SECONDS = 10;

export interface ShortcutDefinition {
  key: string;
  label: string;
  action: WatchShortcutAction;
}

export const WATCH_SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { key: "N", label: "Next episode", action: "next_episode" },
  { key: "P", label: "Previous episode", action: "prev_episode" },
  { key: "S", label: "Switch to next server", action: "next_server" },
  { key: "R", label: "Reload player frame", action: "retry_frame" },
  { key: "M", label: "Mark episode watched", action: "toggle_watched" },
  { key: "?", label: "Show or hide shortcuts", action: "toggle_shortcuts_help" },
];

export function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  const tag = (el.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function resolveWatchShortcutAction(input: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): WatchShortcutAction | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null;
  const k = input.key;
  if (k === "?") return "toggle_shortcuts_help";
  switch (k.toLowerCase()) {
    case "n":
      return "next_episode";
    case "p":
      return "prev_episode";
    case "s":
      return "next_server";
    case "r":
      return "retry_frame";
    case "m":
      return "toggle_watched";
    default:
      return null;
  }
}

export function readAutoNextEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(AUTO_NEXT_STORAGE_KEY);
    if (raw === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function writeAutoNextEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_NEXT_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore private storage errors */
  }
}
