import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientInitializer } from "@/components/ClientInitializer";
import { AuthGate } from "@/components/AuthGate";
import { SiteChrome } from "@/components/SiteChrome";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { getPwaIconUrl } from "@/lib/pwa-brand";
import { INLINE_FETCH_AND_EXTENSION_GUARD_SCRIPT } from "@/lib/runtime-guards";

export const metadata: Metadata = {
  title: "Zoku TV - Infinite Streaming Portal",
  description:
    "Zoku TV is your high-fidelity, customizable dashboard for cinematic discovery and streaming. Explore genres, manage your watchlists, track your history, and customize your experience with 18 dynamic visual themes.",
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
      className="h-full"
      data-theme="theme-crimson"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: INLINE_FETCH_AND_EXTENSION_GUARD_SCRIPT,
          }}
        />
      </head>
      <body
        className="antialiased min-h-full bg-background text-on-surface"
        suppressHydrationWarning
      >
        <ClientInitializer />
        <AuthGate>
          <SiteChrome>{children}</SiteChrome>
        </AuthGate>
      </body>
    </html>
  );
}
