"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

export type ToastType = "success" | "error";

type Props = {
  message: string;
  type: ToastType;
  onDismiss: () => void;
};

export function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl border border-border-custom bg-surface px-4 py-3 shadow-2xl animate-fade-in"
    >
      {isSuccess ? (
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      )}
      <p className={`min-w-0 flex-1 text-xs sm:text-sm ${isSuccess ? "text-on-surface" : "text-red-300"}`}>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-0.5 text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
