import { Tv } from "lucide-react";

type BrandMarkSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<
  BrandMarkSize,
  { icon: string; wordmark: string; tv: string; gap: string }
> = {
  xs: {
    icon: "h-5 w-5",
    wordmark: "text-sm",
    tv: "text-[10px]",
    gap: "gap-1.5",
  },
  sm: {
    icon: "h-6 w-6",
    wordmark: "text-base",
    tv: "text-[11px]",
    gap: "gap-2",
  },
  md: {
    icon: "h-7 w-7",
    wordmark: "text-lg sm:text-xl",
    tv: "text-xs sm:text-sm",
    gap: "gap-2",
  },
  lg: {
    icon: "h-10 w-10",
    wordmark: "text-2xl",
    tv: "text-sm",
    gap: "gap-2.5",
  },
};

interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
  /** Show subtle pulsing icon (splash / loading only) */
  pulse?: boolean;
}

/** Canonical ZOKU TV wordmark — crisp crimson TV mark + bold ZOKU display + crimson TV */
export function BrandMark({
  size = "md",
  className = "",
  pulse = false,
}: BrandMarkProps) {
  const s = SIZE_MAP[size];

  return (
    <span
      className={`zoku-canonical-brand inline-flex items-center whitespace-nowrap shrink-0 select-none ${s.gap} text-on-surface ${className}`.trim()}
    >
      <Tv
        className={`${s.icon} shrink-0 text-primary ${pulse ? "animate-pulse" : ""}`.trim()}
        strokeWidth={2.2}
        aria-hidden="true"
      />
      <span
        className={`font-display font-extrabold tracking-wider leading-none ${s.wordmark}`}
      >
        ZOKU
        <span className={`text-primary font-mono font-bold ml-0.5 ${s.tv}`}>
          TV
        </span>
      </span>
    </span>
  );
}
