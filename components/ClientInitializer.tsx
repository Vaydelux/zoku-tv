"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  useSessionStore, 
  useWatchlistStore, 
  useContinueWatchingStore, 
  useWatchHistoryStore, 
  useEpisodeProgressStore,
  useEmbedStore 
} from "@/stores";
import { isBrandRoute } from "@/lib/auth-routes";
import {
  applyTheme,
  BRAND_THEME_ID,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from "@/lib/themes";
import { installWindowFetchGuard } from "@/lib/runtime-guards";

if (typeof window !== "undefined") {
  installWindowFetchGuard(window);
}

export function ClientInitializer() {
  const pathname = usePathname();
  const initSession = useSessionStore((state) => state.initSession);
  const initWatchlist = useWatchlistStore((state) => state.initWatchlist);
  const initContinueWatching = useContinueWatchingStore((state) => state.initContinueWatching);
  const initWatchHistory = useWatchHistoryStore((state) => state.initWatchHistory);
  const initEpisodeProgress = useEpisodeProgressStore((state) => state.initEpisodeProgress);
  const hydrateEmbedPreferences = useEmbedStore((state) => state.hydrateEmbedPreferences);
  const user = useSessionStore((state) => state.user);
  const currentProfile = useSessionStore((state) => state.currentProfile);
  const initializing = useSessionStore((state) => state.initializing);

  // Initialize auth, profile listener & persisted client preferences after hydration
  useEffect(() => {
    installWindowFetchGuard(window);
    (window as unknown as Record<string, unknown>).__ZOKU_SESSION_STORE__ = useSessionStore;
    (window as unknown as Record<string, unknown>).__ZOKU_APPLY_THEME__ = applyTheme;
    (window as unknown as Record<string, unknown>).__ZOKU_EPISODE_STORE__ = useEpisodeProgressStore;
    (window as unknown as Record<string, unknown>).__ZOKU_WATCH_HISTORY_STORE__ = useWatchHistoryStore;
    hydrateEmbedPreferences();
    const unsubscribeSession = initSession();
    return () => {
      unsubscribeSession();
    };
  }, [initSession, hydrateEmbedPreferences]);

  // Brand lock on splash / login / signup / profiles; profile theme only in-app
  useEffect(() => {
    if (initializing || isBrandRoute(pathname)) {
      applyTheme(BRAND_THEME_ID, "dark");
      return;
    }

    if (currentProfile) {
      applyTheme(
        currentProfile.themePreference,
        normalizeAppearance(currentProfile.appearancePreference ?? DEFAULT_APPEARANCE)
      );
      return;
    }

    applyTheme(BRAND_THEME_ID, "dark");
  }, [
    pathname,
    initializing,
    currentProfile?.themePreference,
    currentProfile?.appearancePreference,
    currentProfile,
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

  // Initialize watchlist, continue watching, watch history, and episode progress listeners whenever user or profile changes
  useEffect(() => {
    if (user && currentProfile && !isBrandRoute(pathname)) {
      const unsubscribeWatchlist = initWatchlist();
      const unsubscribeContinueWatching = initContinueWatching();
      const unsubscribeWatchHistory = initWatchHistory();
      const unsubscribeEpisodeProgress = initEpisodeProgress();
      return () => {
        unsubscribeWatchlist();
        unsubscribeContinueWatching();
        unsubscribeWatchHistory();
        unsubscribeEpisodeProgress();
      };
    }
  }, [user, currentProfile, pathname, initWatchlist, initContinueWatching, initWatchHistory, initEpisodeProgress]);

  return null;
}
