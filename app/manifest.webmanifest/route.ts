import { NextRequest, NextResponse } from "next/server";
import { getManifestThemeId, getPwaIconUrl, PWA_THEME_COOKIE } from "@/lib/pwa-brand";
import { getThemeOption } from "@/lib/themes";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const themeId = getManifestThemeId(
    request.cookies.get(PWA_THEME_COOKIE)?.value,
    request.nextUrl.searchParams.get("theme")
  );
  const theme = getThemeOption(themeId);

  const manifest = {
    name: "Zoku TV",
    short_name: "Zoku TV",
    description:
      "Infinite cinematic discovery, customizable streaming dashboards, and robust playback modes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: theme.tokens.background,
    theme_color: theme.tokens.primary,
    categories: ["entertainment", "movies", "tv"],
    icons: [
      {
        src: getPwaIconUrl(192, themeId),
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: getPwaIconUrl(512, themeId),
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: getPwaIconUrl(512, themeId, true),
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache",
    },
  });
}
