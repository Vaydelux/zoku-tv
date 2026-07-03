import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientInitializer } from "@/components/ClientInitializer";
import { AuthGate } from "@/components/AuthGate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zoku TV - Infinite Streaming Portal",
  description: "Zoku TV is your high-fidelity, customizable dashboard for cinematic discovery and streaming. Explore genres, manage your watchlists, track your history, and customize your experience with 18 dynamic visual themes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`} data-theme="theme-crimson">
      <head>
        <meta name="theme-color" content="#0a0a0b" />
      </head>
      <body className="antialiased min-h-full bg-background text-on-surface">
        <ClientInitializer />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
