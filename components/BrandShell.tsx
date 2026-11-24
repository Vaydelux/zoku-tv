import type { ReactNode } from "react";

interface BrandShellProps {
  children: ReactNode;
  className?: string;
  /** When false, content is not vertically centered (full-page scroll layouts) */
  centered?: boolean;
}

/** Shared pre-app obsidian shell for splash, auth, and profile selection */
export function BrandShell({
  children,
  className = "",
  centered = true,
}: BrandShellProps) {
  return (
    <div
      className={`splash-shell ${centered ? "" : "!items-stretch !justify-start"} ${className}`.trim()}
    >
      <div className="relative z-[1] w-full">{children}</div>
    </div>
  );
}
