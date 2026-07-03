import {
  DEFAULT_THEME_ID,
  getThemeOption,
  normalizeThemeId,
  type ThemeId,
  type ThemeTokens,
} from "@/lib/themes";

export const PWA_THEME_COOKIE = "zoku-theme";

export function buildTvLogoSvg(
  tokens: ThemeTokens,
  size: number,
  options?: { maskable?: boolean }
): string {
  const padRatio = options?.maskable ? 0.26 : 0.18;
  const pad = size * padRatio;
  const inner = size - pad * 2;
  const scale = inner / 24;
  const radius = size * (options?.maskable ? 0 : 0.22);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Zoku TV">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${tokens.background}"/>
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${radius}" fill="none" stroke="${tokens.primary}" stroke-opacity="0.28" stroke-width="${Math.max(1, size * 0.006)}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="none" stroke="${tokens.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
    <polyline points="17 2 12 7 7 2"/>
  </g>
</svg>`;
}

export function getPwaIconUrl(size: number, themeId: ThemeId, maskable = false): string {
  const params = new URLSearchParams({
    size: String(size),
    theme: themeId,
  });
  if (maskable) params.set("maskable", "1");
  return `/api/pwa-icon?${params.toString()}`;
}

function upsertLink(rel: string, attrs: Record<string, string>) {
  const sizes = attrs.sizes;
  const selector = sizes ? `link[rel="${rel}"][sizes="${sizes}"]` : `link[rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (key === "rel") continue;
    link.setAttribute(key, value);
  }
}

function svgToPngDataUrl(svg: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to render PWA icon"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function applyPwaBranding(themeId: unknown): Promise<void> {
  if (typeof document === "undefined") return;

  const id = normalizeThemeId(themeId);
  const tokens = getThemeOption(id).tokens;

  document.cookie = `${PWA_THEME_COOKIE}=${id};path=/;max-age=31536000;SameSite=Lax`;

  const svgFavicon = buildTvLogoSvg(tokens, 32);
  const svgApple = buildTvLogoSvg(tokens, 180);

  upsertLink("icon", {
    rel: "icon",
    type: "image/svg+xml",
    href: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFavicon)}`,
  });

  try {
    const pngApple = await svgToPngDataUrl(svgApple, 180);
    upsertLink("apple-touch-icon", {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: pngApple,
    });
  } catch {
    upsertLink("apple-touch-icon", {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: getPwaIconUrl(180, id),
    });
  }

  upsertLink("manifest", {
    rel: "manifest",
    href: `/manifest.webmanifest?theme=${id}`,
  });
}

export function getManifestThemeId(cookieValue: string | undefined, queryTheme?: string | null): ThemeId {
  if (queryTheme) return normalizeThemeId(queryTheme);
  if (cookieValue) return normalizeThemeId(cookieValue);
  return DEFAULT_THEME_ID;
}
