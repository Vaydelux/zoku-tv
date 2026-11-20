import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cinematic.css";
import "./cinematic-reference.css";
import "./cinematic-fidelity.css";
import { ClientInitializer } from "@/components/ClientInitializer";
import { AuthGate } from "@/components/AuthGate";
import { SiteChrome } from "@/components/SiteChrome";
import { TVSpatialNavProvider } from "@/components/TVSpatialNavProvider";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { getPwaIconUrl } from "@/lib/pwa-brand";
import { INLINE_FETCH_AND_EXTENSION_GUARD_SCRIPT } from "@/lib/runtime-guards";

export const metadata: Metadata = {
  title: "Zoku TV - Infinite Streaming Portal",
  description:
    "Zoku TV is your high-fidelity, customizable dashboard for cinematic discovery and streaming. Explore genres, manage your watchlists, track your history, and customize your experience with 24 dynamic visual themes and theme-matched background patterns.",
  applicationName: "Zoku TV",
  manifest: `/manifest.webmanifest?theme=${DEFAULT_THEME_ID}`,
  appleWebApp: {
    capable: true,
    title: "Zoku TV",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: getPwaIconUrl(192, DEFAULT_THEME_ID),
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: getPwaIconUrl(512, DEFAULT_THEME_ID),
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: getPwaIconUrl(180, DEFAULT_THEME_ID),
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e11d48",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      
      data-theme="theme-crimson"
      data-scroll-behavior="smooth"
      data-zoku-layout={process.env.NEXT_PUBLIC_ZOKU_LAYOUT === "classic" ? "classic" : "cinematic"}
      suppressHydrationWarning
    >
      <head>
        {/* Runtime stylesheet loading keeps builds independent of Google Fonts availability. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: INLINE_FETCH_AND_EXTENSION_GUARD_SCRIPT,
          }}
        />
      </head>
      <body
        className="antialiased min-h-dvh bg-background text-on-surface"
        suppressHydrationWarning
      >
        <ClientInitializer />
        <TVSpatialNavProvider />
        <AuthGate>
          <SiteChrome>{children}</SiteChrome>
        </AuthGate>
      </body>
    </html>
  );
}
