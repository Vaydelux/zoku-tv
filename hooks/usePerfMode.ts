"use client";

import { useState, useEffect, useCallback } from "react";
import {
  is32BitOrLowSpecTvEnvironment,
  isAndroidTvOrSmartTvUserAgent,
  PERF_MODE_CHANGE_EVENT,
  PERF_MODE_STORAGE_KEY,
  resolveEffectivePerfMode,
  type PerfModePreference,
} from "@/lib/tv-navigation";

export function detectHardwareLowSpecOrTv(): {
  isLowSpecOrTv: boolean;
  isTvBrowser: boolean;
} {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isLowSpecOrTv: false, isTvBrowser: false };
  }
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hardwareConcurrency = navigator.hardwareConcurrency;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  const isTvBrowser = isAndroidTvOrSmartTvUserAgent(ua);
  const isLowSpecOrTv = is32BitOrLowSpecTvEnvironment({
    userAgent: ua,
    platform,
    hardwareConcurrency,
    deviceMemory,
  });

  return { isLowSpecOrTv, isTvBrowser };
}

export function readStoredPerfPreference(): PerfModePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(PERF_MODE_STORAGE_KEY);
    if (raw === "60fps" || raw === "standard" || raw === "auto") {
      return raw;
    }
  } catch {
    // Ignore storage read errors in restricted WebViews
  }
  return "auto";
}

export function syncPerfModeToDocument(
  preference: PerfModePreference
): {
  effectiveMode: "60fps" | "standard";
  isLowSpecOrTv: boolean;
  isTvBrowser: boolean;
} {
  const { isLowSpecOrTv, isTvBrowser } = detectHardwareLowSpecOrTv();
  const effectiveMode = resolveEffectivePerfMode(preference, isLowSpecOrTv);

  if (typeof document !== "undefined") {
    const html = document.documentElement;
    html.dataset.perfMode = effectiveMode;
    html.dataset.perfPref = preference;
    if (isTvBrowser || isLowSpecOrTv || effectiveMode === "60fps") {
      html.dataset.tvWebview = "true";
    } else {
      delete html.dataset.tvWebview;
    }
    if (isTvBrowser) {
      html.dataset.tvMode = "true";
    }
  }

  return { effectiveMode, isLowSpecOrTv, isTvBrowser };
}

export function usePerfMode() {
  const [preference, setPreferenceState] = useState<PerfModePreference>("auto");
  const [effectiveMode, setEffectiveMode] = useState<"60fps" | "standard">("standard");
  const [isAutoDetectedTvOr32Bit, setIsAutoDetectedTvOr32Bit] = useState(false);

  const refreshState = useCallback(() => {
    const pref = readStoredPerfPreference();
    const { effectiveMode: resolved, isLowSpecOrTv } = syncPerfModeToDocument(pref);
    setPreferenceState(pref);
    setEffectiveMode(resolved);
    setIsAutoDetectedTvOr32Bit(isLowSpecOrTv);
  }, []);

  useEffect(() => {
    refreshState();

    const handleChange = () => refreshState();
    window.addEventListener(PERF_MODE_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(PERF_MODE_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [refreshState]);

  const setPreference = useCallback((nextPref: PerfModePreference) => {
    try {
      window.localStorage.setItem(PERF_MODE_STORAGE_KEY, nextPref);
    } catch {
      // Ignore storage write errors
    }
    const { effectiveMode: resolved, isLowSpecOrTv } = syncPerfModeToDocument(nextPref);
    setPreferenceState(nextPref);
    setEffectiveMode(resolved);
    setIsAutoDetectedTvOr32Bit(isLowSpecOrTv);
    window.dispatchEvent(new CustomEvent(PERF_MODE_CHANGE_EVENT));
  }, []);

  const togglePerfMode = useCallback(() => {
    const nextPref: PerfModePreference = effectiveMode === "60fps" ? "standard" : "60fps";
    setPreference(nextPref);
  }, [effectiveMode, setPreference]);

  return {
    preference,
    effectiveMode,
    is60FpsActive: effectiveMode === "60fps",
    isAutoDetectedTvOr32Bit,
    setPreference,
    togglePerfMode,
  };
}
