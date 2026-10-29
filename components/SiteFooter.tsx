"use client";

import { usePathname } from "next/navigation";
import { isBrandRoute } from "@/lib/auth-routes";

export function SiteFooter() {
  const pathname = usePathname();
  // Hide on player + pre-app brand surfaces (splash/auth/profiles)
  if (pathname?.startsWith("/watch") || isBrandRoute(pathname)) return null;

  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-[#05060b]/95 px-4 sm:px-6 lg:px-8 py-6 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: Red Engine Emblem & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-red-500 via-red-600 to-rose-700 shadow-md shadow-red-950/60 ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-[2px] bg-white/90 shadow-inner" />
          </div>
          <div className="leading-tight">
            <p className="font-mono text-xs font-black tracking-wider text-white uppercase sm:text-sm">
              ZOKU TV ULTRA-CINEMA
            </p>
            <p className="font-mono text-[10px] font-extrabold tracking-widest text-primary uppercase">
              ENGINE
            </p>
          </div>
        </div>

        {/* Center: Dolby & Lossless Codec Certifications + Network Node Status */}
        <div className="flex flex-col items-start lg:items-center text-left lg:text-center space-y-1.5 font-mono">
          <p className="text-[11px] leading-relaxed text-[#c49a60] tracking-wide">
            Dolby Vision &amp; Dolby Atmos are registered trademarks of Dolby Laboratories.
            <span className="mx-2 text-[#8c6b3e]">•</span>
            Lossless Codec Certifications
            <span className="mx-2 text-[#8c6b3e]">•</span>
          </p>
          <div className="flex items-center gap-2 text-[10px] text-[#e0a96d] font-semibold tracking-wider">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span>Network Node Status: 99.99% OK</span>
          </div>
        </div>

        {/* Right: Copyright */}
        <div className="font-mono text-[11px] text-white/50 lg:text-right shrink-0">
          <p>© 2024 Zoku Entertainment</p>
          <p>Network Inc.</p>
        </div>

      </div>
    </footer>
  );
}
