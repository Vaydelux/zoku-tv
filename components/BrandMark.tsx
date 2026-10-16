import { Tv } from "lucide-react";

type BrandMarkSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<
  BrandMarkSize,
  { icon: string; wordmark: string; tv: string; gap: string }
> = {
  sm: {
    icon: "h-6 w-6",
    wordmark: "text-sm",
    tv: "text-[10px]",
    gap: "gap-1.5",
  },
  md: {
    icon: "h-8 w-8",
    wordmark: "text-xl",
    tv: "text-sm",
    gap: "gap-2",
  },
  lg: {
    icon: "h-10 w-10",
    wordmark: "text-2xl",
    tv: "text-sm",
    gap: "gap-2",
  },
};

interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
  /** Show pulsing icon (splash only) */
  pulse?: boolean;
}

/** Canonical ZOKU TV wordmark — white ZOKU + crimson TV / icon */
export function BrandMark({ size = "md", className = "", pulse = false }: BrandMarkProps) {
  const s = SIZE_MAP[size];

  return (
    <span
      className={`inline-flex items-center ${s.gap} text-on-surface ${className}`.trim()}
    >
      <Tv
        className={`${s.icon} text-primary ${pulse ? "animate-pulse" : ""}`.trim()}
        aria-hidden
      />
      <span className={`font-display font-bold tracking-wider ${s.wordmark}`}>
        ZOKU
        <span className={`text-primary font-mono ml-0.5 ${s.tv}`}>TV</span>
      </span>
    </span>
  );
}
