import type { CSSProperties, ReactNode } from "react";

interface BrandShellProps {
  children: ReactNode;
  className?: string;
  /** When false, content is not vertically centered (full-page scroll layouts) */
  centered?: boolean;
}

function BrandAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="ambient-orb ambient-orb--a" />
      <div className="ambient-orb ambient-orb--b" />
      <div className="ambient-orb ambient-orb--c" />
      <div className="ambient-particles">
        {Array.from({ length: 18 }, (_, i) => (
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

/** Shared pre-app chrome: substantial theme-reactive gradient + ambient orbs */
export function BrandShell({
  children,
  className = "",
  centered = true,
}: BrandShellProps) {
  return (
    <div
      className={`splash-shell ${centered ? "" : "!items-stretch !justify-start"} ${className}`.trim()}
    >
      <BrandAtmosphere />
      <div className="relative z-[1] w-full">{children}</div>
    </div>
  );
}
