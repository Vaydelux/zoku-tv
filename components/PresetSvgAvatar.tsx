"use client";

import { useEffect, useState } from "react";

const svgCache = new Map<string, string>();

const BACKGROUND_RECT =
  /<rect fill="var\(--color\d+,[^)]+\)" width="100" height="100"\s*\/>/;

type Props = {
  src: string;
  backgroundColor: string;
  className?: string;
};

async function loadPresetSvg(src: string, backgroundColor: string): Promise<string> {
  const cacheKey = `${src}::${backgroundColor}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to load avatar preset: ${src}`);
  const raw = await response.text();
  const tinted = raw.replace(
    BACKGROUND_RECT,
    `<rect fill="${backgroundColor}" width="100" height="100" />`
  );
  svgCache.set(cacheKey, tinted);
  return tinted;
}

export function preloadPresetSvgAssets(urls: string[], backgroundColor: string): void {
  for (const url of urls) {
    void loadPresetSvg(url, backgroundColor).catch(() => undefined);
  }
}

export function PresetSvgAvatar({ src, backgroundColor, className = "" }: Props) {
  const [markup, setMarkup] = useState<string | null>(
    () => svgCache.get(`${src}::${backgroundColor}`) ?? null
  );

  useEffect(() => {
    let cancelled = false;
    void loadPresetSvg(src, backgroundColor)
      .then((next) => {
        if (!cancelled) setMarkup(next);
      })
      .catch(() => {
        if (!cancelled) setMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src, backgroundColor]);

  if (!markup) {
    return <span className={`block h-full w-full rounded-2xl bg-white/10 ${className}`} aria-hidden />;
  }

  return (
    <span
      aria-hidden
      className={`block h-full w-full [&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
