"use client";

import { Spinner } from "@/components/Spinner";

type Props = {
  message: string;
  className?: string;
};

export function LoadingBanner({ message, className = "" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 border-b border-primary/30 bg-primary/15 px-4 py-2.5 text-xs font-semibold text-on-surface backdrop-blur-md animate-fade-in ${className}`}
    >
      <Spinner className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{message}</span>
    </div>
  );
}
