import { NextRequest, NextResponse } from "next/server";
import { buildTvLogoSvg, getManifestThemeId, PWA_THEME_COOKIE } from "@/lib/pwa-brand";
import { getThemeOption } from "@/lib/themes";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = Math.min(1024, Math.max(32, Number(searchParams.get("size") ?? 512)));
  const maskable = searchParams.get("maskable") === "1";
  const themeId = getManifestThemeId(
    request.cookies.get(PWA_THEME_COOKIE)?.value,
    searchParams.get("theme")
  );
  const tokens = getThemeOption(themeId).tokens;
  const svg = buildTvLogoSvg(tokens, size, { maskable });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
