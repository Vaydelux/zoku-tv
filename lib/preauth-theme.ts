import {
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID,
  normalizeAppearance,
  normalizeThemeId,
  type AppearanceMode,
  type ThemeId,
} from "./themes";
import {
  DEFAULT_PATTERN_ID,
  normalizePatternId,
  type BackgroundPatternId,
} from "./background-patterns";

export const PREAUTH_THEME_STORAGE_KEY = "zoku_preauth_theme_v1";
export const LOGIN_THEME_HANDOFF_KEY = "zoku_login_theme_handoff_v1";
export const PROFILE_PATTERN_STORAGE_PREFIX = "zoku_profile_pattern_v1_";

export interface StoredThemePreference {
  themeId: ThemeId;
  appearance: AppearanceMode;
  patternId: BackgroundPatternId;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDefaultSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const DEFAULT_STORED_THEME_PREFERENCE: StoredThemePreference = {
  themeId: DEFAULT_THEME_ID,
  appearance: DEFAULT_APPEARANCE,
  patternId: DEFAULT_PATTERN_ID,
};

export function readPreAuthThemePreference(
  localStore: StorageLike | null = getDefaultLocalStorage()
): StoredThemePreference {
  if (!localStore) return { ...DEFAULT_STORED_THEME_PREFERENCE };
  try {
    const raw = localStore.getItem(PREAUTH_THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORED_THEME_PREFERENCE };
    const parsed = JSON.parse(raw) as Partial<StoredThemePreference> | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_STORED_THEME_PREFERENCE };
    }
    return {
      themeId: normalizeThemeId(parsed.themeId),
      appearance: normalizeAppearance(parsed.appearance),
      patternId: normalizePatternId(parsed.patternId),
    };
  } catch {
    return { ...DEFAULT_STORED_THEME_PREFERENCE };
  }
}

export function writePreAuthThemePreference(
  partial: Partial<StoredThemePreference>,
  options?: {
    markForAuthHandoff?: boolean;
    localStore?: StorageLike | null;
    sessionStore?: StorageLike | null;
  }
): StoredThemePreference {
  const localStore =
    options?.localStore !== undefined ? options.localStore : getDefaultLocalStorage();
  const sessionStore =
    options?.sessionStore !== undefined ? options.sessionStore : getDefaultSessionStorage();

  const current = readPreAuthThemePreference(localStore);
  const next: StoredThemePreference = {
    themeId: partial.themeId !== undefined ? normalizeThemeId(partial.themeId) : current.themeId,
    appearance:
      partial.appearance !== undefined
        ? normalizeAppearance(partial.appearance)
        : current.appearance,
    patternId:
      partial.patternId !== undefined
        ? normalizePatternId(partial.patternId)
        : current.patternId,
  };

  if (localStore) {
    try {
      localStore.setItem(PREAUTH_THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore private mode / quota errors */
    }
  }

  if (options?.markForAuthHandoff && sessionStore) {
    try {
      sessionStore.setItem(LOGIN_THEME_HANDOFF_KEY, JSON.stringify(next));
    } catch {
      /* ignore session storage errors */
    }
  }

  return next;
}

export function readPendingLoginThemeHandoff(
  sessionStore: StorageLike | null = getDefaultSessionStorage()
): StoredThemePreference | null {
  if (!sessionStore) return null;
  try {
    const raw = sessionStore.getItem(LOGIN_THEME_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredThemePreference> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      themeId: normalizeThemeId(parsed.themeId),
      appearance: normalizeAppearance(parsed.appearance),
      patternId: normalizePatternId(parsed.patternId),
    };
  } catch {
    return null;
  }
}

export function consumePendingLoginThemeHandoff(
  sessionStore: StorageLike | null = getDefaultSessionStorage()
): StoredThemePreference | null {
  const pending = readPendingLoginThemeHandoff(sessionStore);
  if (pending && sessionStore) {
    try {
      sessionStore.removeItem(LOGIN_THEME_HANDOFF_KEY);
    } catch {
      /* ignore */
    }
  }
  return pending;
}

export function readProfilePatternPreference(
  profileId: string | null | undefined,
  localStore: StorageLike | null = getDefaultLocalStorage()
): BackgroundPatternId {
  if (!localStore) return DEFAULT_PATTERN_ID;
  if (profileId) {
    try {
      const stored = localStore.getItem(`${PROFILE_PATTERN_STORAGE_PREFIX}${profileId}`);
      if (stored) return normalizePatternId(stored);
    } catch {
      /* fall back to preauth preference */
    }
  }
  return readPreAuthThemePreference(localStore).patternId;
}

export function writeProfilePatternPreference(
  profileId: string,
  patternId: unknown,
  localStore: StorageLike | null = getDefaultLocalStorage()
): BackgroundPatternId {
  const normalized = normalizePatternId(patternId);
  if (localStore && profileId) {
    try {
      localStore.setItem(`${PROFILE_PATTERN_STORAGE_PREFIX}${profileId}`, normalized);
    } catch {
      /* ignore */
    }
  }
  return normalized;
}
