"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSessionStore, useWatchlistStore, useContinueWatchingStore } from "@/stores";
import { isBrandRoute } from "@/lib/auth-routes";
import {
  applyTheme,
  BRAND_THEME_ID,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from "@/lib/themes";

export function ClientInitializer() {
  const pathname = usePathname();
  const initSession = useSessionStore((state) => state.initSession);
  const initWatchlist = useWatchlistStore((state) => state.initWatchlist);
  const initContinueWatching = useContinueWatchingStore((state) => state.initContinueWatching);
  const user = useSessionStore((state) => state.user);
  const currentProfile = useSessionStore((state) => state.currentProfile);
  const initializing = useSessionStore((state) => state.initializing);

  // Initialize auth & profile listener
  useEffect(() => {
    const unsubscribeSession = initSession();
    return () => {
      unsubscribeSession();
    };
  }, [initSession]);

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

  // Initialize watchlist listener whenever user or profile changes
  useEffect(() => {
    if (user && currentProfile && !isBrandRoute(pathname)) {
      const unsubscribeWatchlist = initWatchlist();
      const unsubscribeContinueWatching = initContinueWatching();
      return () => {
        unsubscribeWatchlist();
        unsubscribeContinueWatching();
      };
    }
  }, [user, currentProfile, pathname, initWatchlist, initContinueWatching]);

  return null;
}
