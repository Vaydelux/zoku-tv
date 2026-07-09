"use client";

import { useEffect } from "react";

export type PlayerProgressEvent = {
  currentTimeSec: number;
  durationSec?: number;
  progressPercent: number;
};

const PROGRESS_SERVERS = new Set([
  "peachify",
  "vidlink",
  "vixsrc",
  "cinesrc",
]);

const START_AT_SERVERS = new Set(["vidfast", "peachify", "primesrc"]);

export function isProgressCapableServer(serverId: string): boolean {
  return PROGRESS_SERVERS.has(serverId);
}

export function supportsStartAt(serverId: string): boolean {
  return START_AT_SERVERS.has(serverId);
}

export function isTrustedPlayerOrigin(
  origin: string,
  allowedDomains: string[],
  embedUrl?: string
): boolean {
  if (!origin || origin === "null") return false;
  try {
    const host = new URL(origin).hostname;
    const embedHost = embedUrl ? new URL(embedUrl).hostname : null;
    return (
      allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
      host === embedHost
    );
  } catch {
    return false;
  }
}

export function parsePlayerMessage(
  data: unknown,
  serverId: string
): PlayerProgressEvent | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;

  if (serverId === "cinesrc" && msg.type === "cinesrc:timeupdate") {
    const current = Number(msg.currentTime ?? msg.time ?? 0);
    const duration = Number(msg.duration ?? 0);
    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;
    return { currentTimeSec: current, durationSec: duration, progressPercent };
  }

  if (msg.type === "PLAYER_EVENT" || msg.event === "PLAYER_EVENT") {
    const eventData = (msg.data ?? msg.payload ?? msg) as Record<string, unknown>;
    const current = Number(eventData.currentTime ?? eventData.time ?? eventData.position ?? 0);
    const duration = Number(eventData.duration ?? eventData.totalDuration ?? 0);
    if (current <= 0 && !duration) return null;
    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;
    return { currentTimeSec: current, durationSec: duration || undefined, progressPercent };
  }

  if (msg.type === "MEDIA_DATA" || msg.event === "MEDIA_DATA") {
    const eventData = (msg.data ?? msg.payload ?? msg) as Record<string, unknown>;
    const current = Number(eventData.currentTime ?? eventData.time ?? 0);
    const duration = Number(eventData.duration ?? 0);
    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;
    return { currentTimeSec: current, durationSec: duration || undefined, progressPercent };
  }

  if (typeof msg.currentTime === "number" || typeof msg.time === "number") {
    const current = Number(msg.currentTime ?? msg.time);
    const duration = Number(msg.duration ?? 0);
    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;
    return { currentTimeSec: current, durationSec: duration || undefined, progressPercent };
  }

  return null;
}

type UsePlayerProgressListenerOptions = {
  serverId: string;
  domains: string[];
  embedUrl?: string;
  enabled?: boolean;
  onProgress: (progressPercent: number, currentTimeSec: number, durationSec?: number) => void;
};

export function usePlayerProgressListener({
  serverId,
  domains,
  embedUrl,
  enabled = true,
  onProgress,
}: UsePlayerProgressListenerOptions) {
  useEffect(() => {
    if (!enabled || !isProgressCapableServer(serverId)) return;

    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedPlayerOrigin(event.origin, domains, embedUrl)) return;
      const parsed = parsePlayerMessage(event.data, serverId);
      if (!parsed || parsed.currentTimeSec <= 0) return;
      onProgress(parsed.progressPercent, parsed.currentTimeSec, parsed.durationSec);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [serverId, domains, embedUrl, enabled, onProgress]);
}
