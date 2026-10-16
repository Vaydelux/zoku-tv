"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { isBrandRoute } from "@/lib/auth-routes";

/** Soft gradient orbs + CSS particles — no external particles.js weight */
export function AmbientBackground() {
  const pathname = usePathname();
  // BrandShell owns atmosphere on splash/auth/profiles; skip player too
  if (pathname?.startsWith("/watch") || isBrandRoute(pathname)) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="ambient-orb ambient-orb--a" />
      <div className="ambient-orb ambient-orb--b" />
      <div className="ambient-orb ambient-orb--c" />
      <div className="ambient-particles">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className="ambient-dot"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
