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
      className="dynamic-island-capsule fixed bottom-24 lg:bottom-6 left-1/2 z-[100] flex w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-full px-4 py-3 animate-slide-up"
    >
      {isSuccess ? (
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
      )}
      <p className={`min-w-0 flex-1 text-xs sm:text-sm font-medium ${isSuccess ? "text-white" : "text-red-300"}`}>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
