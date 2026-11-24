"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export interface UseTheaterFullscreenOptions {
  stageRef: RefObject<HTMLElement | null>;
  /** Prevent HUD and cursor from hiding while a menu, drawer, or modal is open */
  keepHudVisible?: boolean;
  /** Milliseconds of inactivity before hiding HUD & cursor */
  idleDelayMs?: number;
}

/**
 * Manages native Fullscreen API (`requestFullscreen`) with automatic iOS/mobile
 * `100dvh` viewport-lock fallback, dedicated Theater Mode, and idle HUD + cursor hiding.
 */
export function useTheaterFullscreen({
  stageRef,
  keepHudVisible = false,
  idleDelayMs = 3000,
}: UseTheaterFullscreenOptions) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isViewportTheater, setIsViewportTheater] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [cursorHidden, setCursorHidden] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = isNativeFullscreen || isViewportTheater;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const revealHud = useCallback(() => {
    setHudVisible(true);
    setCursorHidden(false);
    clearIdleTimer();

    if (keepHudVisible) return;

    idleTimerRef.current = setTimeout(() => {
      setHudVisible(false);
      setCursorHidden(true);
    }, idleDelayMs);
  }, [clearIdleTimer, keepHudVisible, idleDelayMs]);

  useEffect(() => {
    if (keepHudVisible) {
      clearIdleTimer();
      setHudVisible(true);
      setCursorHidden(false);
    } else {
      revealHud();
    }
    return clearIdleTimer;
  }, [keepHudVisible, revealHud, clearIdleTimer]);

  // Sync native Fullscreen API state across Escape key & browser controls
  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as WebkitFullscreenDocument;
      const fsElement = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      const active = Boolean(fsElement && stageRef.current && fsElement === stageRef.current);
      setIsNativeFullscreen(active);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, [stageRef]);

  // Body scroll lock while in 100dvh viewport fallback / theater mode
  useEffect(() => {
    if (!isViewportTheater) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isViewportTheater]);

  const exitFullscreenOrTheater = useCallback(async () => {
    const doc = document as WebkitFullscreenDocument;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } catch {
        /* ignore native exit error */
      }
    }
    setIsNativeFullscreen(false);
    setIsViewportTheater(false);
    revealHud();
  }, [revealHud]);

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current as WebkitFullscreenElement | null;
    const doc = document as WebkitFullscreenDocument;

    if (isNativeFullscreen || isViewportTheater) {
      await exitFullscreenOrTheater();
      return;
    }

    if (el) {
      const requestFn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (typeof requestFn === "function") {
        try {
          await requestFn.call(el);
          revealHud();
          return;
        } catch {
          // Fall back cleanly to 100dvh full-viewport mode (iOS Safari / restricted WebView)
        }
      }
    }

    // Check if another element was fullscreen
    if (doc.fullscreenElement) {
      try {
        await doc.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    setIsViewportTheater(true);
    revealHud();
  }, [stageRef, isNativeFullscreen, isViewportTheater, exitFullscreenOrTheater, revealHud]);

  const toggleTheater = useCallback(async () => {
    if (isNativeFullscreen) {
      await exitFullscreenOrTheater();
      return;
    }
    setIsViewportTheater((prev) => !prev);
    revealHud();
  }, [isNativeFullscreen, exitFullscreenOrTheater, revealHud]);

  return {
    isNativeFullscreen,
    isViewportTheater,
    isExpanded,
    hudVisible,
    cursorHidden: cursorHidden && !keepHudVisible,
    revealHud,
    toggleFullscreen,
    toggleTheater,
    exitFullscreenOrTheater,
  };
}
