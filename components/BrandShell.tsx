import type { ReactNode } from "react";

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
    </div>
  );
}

/** Shared pre-app chrome: cool charcoal gradient + ambient orbs (product brand) */
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
