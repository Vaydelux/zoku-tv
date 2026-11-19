"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Shared browser online/offline hook backed by useSyncExternalStore.
 * Eliminates duplicate window event listeners across Navbar, SiteFooter, and Home.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
