"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  useSessionStore, 
  useWatchlistStore, 
  useContinueWatchingStore, 
  useWatchHistoryStore, 
  useEpisodeProgressStore,
  useEmbedStore,
  useDynamicServerStore,
  useCustomCollectionsStore,
} from "@/stores";
import { isBrandRoute } from "@/lib/auth-routes";
import {
  applyTheme,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  normalizeThemeId,
} from "@/lib/themes";
import { applyBackgroundPattern } from "@/lib/background-patterns";
import {
  consumePendingLoginThemeHandoff,
  readPreAuthThemePreference,
  readProfilePatternPreference,
  writeProfilePatternPreference,
} from "@/lib/preauth-theme";
import { installWindowFetchGuard } from "@/lib/runtime-guards";
import {
  applyHardwareAccelerationFlags,
  readStoredHardwareFlags,
} from "@/lib/gpu-diagnostics";

if (typeof window !== "undefined") {
  installWindowFetchGuard(window);
  try {
    applyHardwareAccelerationFlags(readStoredHardwareFlags());
    const initialPreAuth = readPreAuthThemePreference();
    applyTheme(initialPreAuth.themeId, initialPreAuth.appearance);
    applyBackgroundPattern(initialPreAuth.patternId);
  } catch {
    // Ignore early probe failure
  }
}

export function ClientInitializer() {
  const pathname = usePathname();
  const initSession = useSessionStore((state) => state.initSession);
  const updateProfile = useSessionStore((state) => state.updateProfile);
  const initWatchlist = useWatchlistStore((state) => state.initWatchlist);
  const initContinueWatching = useContinueWatchingStore((state) => state.initContinueWatching);
  const initWatchHistory = useWatchHistoryStore((state) => state.initWatchHistory);
  const initEpisodeProgress = useEpisodeProgressStore((state) => state.initEpisodeProgress);
  const hydrateEmbedPreferences = useEmbedStore((state) => state.hydrateEmbedPreferences);
  const hydrateDynamicServers = useDynamicServerStore((state) => state.hydrateLocal);
  const initDynamicServers = useDynamicServerStore((state) => state.initDynamicServers);
  const hydrateCollections = useCustomCollectionsStore((state) => state.hydrateLocal);
  const initCollections = useCustomCollectionsStore((state) => state.initCollections);
  const user = useSessionStore((state) => state.user);
  const currentProfile = useSessionStore((state) => state.currentProfile);
  const initializing = useSessionStore((state) => state.initializing);

  // Initialize auth, profile listener & persisted client preferences after hydration
  useEffect(() => {
    installWindowFetchGuard(window);
    if (process.env.NODE_ENV !== "production") {
      const debugWindow = window as unknown as Record<string, unknown>;
      debugWindow.__ZOKU_SESSION_STORE__ = useSessionStore;
      debugWindow.__ZOKU_APPLY_THEME__ = applyTheme;
      debugWindow.__ZOKU_APPLY_PATTERN__ = applyBackgroundPattern;
      debugWindow.__ZOKU_EPISODE_STORE__ = useEpisodeProgressStore;
      debugWindow.__ZOKU_WATCH_HISTORY_STORE__ = useWatchHistoryStore;
    }
    hydrateDynamicServers();
    hydrateCollections();
    hydrateEmbedPreferences();
    const unsubscribeSession = initSession();
    return () => {
      unsubscribeSession();
    };
  }, [initSession, hydrateDynamicServers, hydrateCollections, hydrateEmbedPreferences]);

  // Honor user's pre-auth theme/pattern on login/signup/profiles and hand it off on authenticated entry
  useEffect(() => {
    if (initializing || isBrandRoute(pathname)) {
      const preAuth = readPreAuthThemePreference();
      applyTheme(preAuth.themeId, preAuth.appearance);
      applyBackgroundPattern(preAuth.patternId);
      return;
    }

    if (currentProfile) {
      const handoff = consumePendingLoginThemeHandoff();
      if (handoff) {
        applyTheme(handoff.themeId, handoff.appearance);
        applyBackgroundPattern(handoff.patternId);
        writeProfilePatternPreference(currentProfile.id, handoff.patternId);

        const currentTheme = normalizeThemeId(currentProfile.themePreference);
        const currentAppearance = normalizeAppearance(
          currentProfile.appearancePreference ?? DEFAULT_APPEARANCE
        );
        if (currentTheme !== handoff.themeId || currentAppearance !== handoff.appearance) {
          void updateProfile(currentProfile.id, {
            themePreference: handoff.themeId,
            appearancePreference: handoff.appearance,
          }).catch(() => {
            // Keep applied theme visually active even if cloud write is temporarily unavailable
          });
        }
        return;
      }

      applyTheme(
        currentProfile.themePreference,
        normalizeAppearance(currentProfile.appearancePreference ?? DEFAULT_APPEARANCE)
      );
      applyBackgroundPattern(readProfilePatternPreference(currentProfile.id));
      return;
    }

    const fallbackPreAuth = readPreAuthThemePreference();
    applyTheme(fallbackPreAuth.themeId, fallbackPreAuth.appearance);
    applyBackgroundPattern(fallbackPreAuth.patternId);
  }, [
    pathname,
    initializing,
    currentProfile?.id,
    currentProfile?.themePreference,
    currentProfile?.appearancePreference,
    updateProfile,
  ]);

  // Register service worker for offline asset and request caching (deferred until load)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Zoku TV Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.error("Zoku TV Service Worker registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  // Initialize watchlist, continue watching, watch history, episode progress, dynamic servers, and custom collections listeners whenever user or profile changes
  useEffect(() => {
    if (user && currentProfile && !isBrandRoute(pathname)) {
      const unsubscribeWatchlist = initWatchlist();
      const unsubscribeContinueWatching = initContinueWatching();
      const unsubscribeWatchHistory = initWatchHistory();
      const unsubscribeEpisodeProgress = initEpisodeProgress();
      const unsubscribeDynamicServers = initDynamicServers();
      const unsubscribeCollections = initCollections();
      return () => {
        unsubscribeWatchlist();
        unsubscribeContinueWatching();
        unsubscribeWatchHistory();
        unsubscribeEpisodeProgress();
        unsubscribeDynamicServers();
        unsubscribeCollections();
      };
    }
  }, [user, currentProfile, pathname, initWatchlist, initContinueWatching, initWatchHistory, initEpisodeProgress, initDynamicServers, initCollections]);

  return null;
}
