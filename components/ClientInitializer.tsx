"use client";

import { useEffect } from "react";
import { useSessionStore, useWatchlistStore, useContinueWatchingStore } from "@/stores";
import {
  DEFAULT_PROFILE_AVATAR_COLOR,
  preloadProfileAvatars,
  PROFILE_PRESET_AVATAR_OPTIONS,
} from "@/lib/profile-avatars";
import { preloadPresetSvgAssets } from "@/components/PresetSvgAvatar";
import { applyTheme } from "@/lib/themes";

export function ClientInitializer() {
  const initSession = useSessionStore((state) => state.initSession);
  const initWatchlist = useWatchlistStore((state) => state.initWatchlist);
  const initContinueWatching = useContinueWatchingStore((state) => state.initContinueWatching);
  const user = useSessionStore((state) => state.user);
  const currentProfile = useSessionStore((state) => state.currentProfile);

  // Initialize auth & profile listener
  useEffect(() => {
    const unsubscribeSession = initSession();
    return () => {
      unsubscribeSession();
    };
  }, [initSession]);

  // Apply active profile theme tokens on load / profile switch
  useEffect(() => {
    applyTheme(currentProfile?.themePreference);
  }, [currentProfile?.themePreference]);

  // Preload local avatar artwork during idle time so the picker opens instantly
  useEffect(() => {
    preloadProfileAvatars();
    preloadPresetSvgAssets(
      PROFILE_PRESET_AVATAR_OPTIONS.map((option) => option.src),
      DEFAULT_PROFILE_AVATAR_COLOR
    );
  }, []);

  // Register service worker for offline asset and request caching
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
    }
  }, []);

  // Initialize watchlist listener whenever user or profile changes
  useEffect(() => {
    if (user && currentProfile) {
      const unsubscribeWatchlist = initWatchlist();
      const unsubscribeContinueWatching = initContinueWatching();
      return () => {
        unsubscribeWatchlist();
        unsubscribeContinueWatching();
      };
    }
  }, [user, currentProfile, initWatchlist, initContinueWatching]);

  return null;
}
