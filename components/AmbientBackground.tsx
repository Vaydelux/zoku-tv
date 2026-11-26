"use client";

/**
 * Static, GPU-safe iOS 27/28 atmospheric radial mesh layer rendered behind
 * Liquid Glass surfaces so frosted panels refract luminous theme color in both
 * Dark and Light modes without idle JS timers or continuous repaint loops.
 * Automatically suppressed in 60fps TV / WebView performance mode via CSS.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="zoku-ambient-aura pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Full-canvas theme-reactive atmospheric base gradient */}
      <div
        className="absolute inset-0 opacity-95 transition-opacity duration-500"
        style={{ backgroundImage: "var(--background-gradient)" }}
      />
      {/* Top-left soft specular aura wash */}
      <div
        className="absolute -top-36 -left-32 h-[34rem] w-[34rem] rounded-full opacity-55"
        style={{ backgroundImage: "var(--orb-a)" }}
      />
      {/* Top-right secondary accent aura wash */}
      <div
        className="absolute -top-24 -right-28 h-[28rem] w-[28rem] rounded-full opacity-45"
        style={{ backgroundImage: "var(--orb-b)" }}
      />
      {/* Bottom subtle horizon depth tint */}
      <div
        className="absolute -bottom-44 left-1/2 h-[26rem] w-[48rem] -translate-x-1/2 rounded-full opacity-35"
        style={{ backgroundImage: "var(--orb-c)" }}
      />
    </div>
  );
}
