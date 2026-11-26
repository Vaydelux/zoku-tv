"use client";

import React, { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { tmdbArtworkFallback } from "@/lib/artwork-delivery";

type ArtworkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError" | "onLoad"> & {
  src: string;
  fallback?: ReactNode;
};

const RETRY_DELAYS_MS = [600, 1800] as const;

// A changed source gets its own lifecycle. A temporary network/cache failure
// cannot permanently hide the same poster, and the retry budget stays bounded.
export function RecoverableArtwork(props: ArtworkProps) {
  return <ArtworkAttempt key={props.src} {...props} />;
}

function ArtworkAttempt({ src, fallback = null, ...props }: ArtworkProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed || attempt >= RETRY_DELAYS_MS.length || !navigator.onLine) return;
    const timer = window.setTimeout(() => {
      setAttempt((previous) => previous + 1);
      setFailed(false);
    }, RETRY_DELAYS_MS[attempt]);
    return () => window.clearTimeout(timer);
  }, [attempt, failed]);

  useEffect(() => {
    if (!failed) return;
    const recover = () => {
      setAttempt(0);
      setFailed(false);
    };
    window.addEventListener("online", recover);
    return () => window.removeEventListener("online", recover);
  }, [failed]);

  if (failed) return <>{fallback}</>;
  // First retry stays on the CDN; the last attempt uses the verified same-origin
  // image route when a browser or network cannot reach the public CDN directly.
  const deliveredSrc = attempt >= RETRY_DELAYS_MS.length ? tmdbArtworkFallback(src) ?? src : src;
  return <img {...props} key={attempt} src={deliveredSrc} onError={() => setFailed(true)} />;
}
