"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Film, RefreshCw, X } from "lucide-react";

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading titles"
      className="zoku-poster-grid grid"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="liquid-glass-subtle aspect-[2/3] rounded-[18px] animate-pulse"
        />
      ))}
    </div>
  );
}

interface EmptyStatePanelProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStatePanel({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStatePanelProps) {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center rounded-[26px] p-10 sm:p-14 text-center space-y-4">
      <div className="liquid-glass-pill flex h-14 w-14 items-center justify-center rounded-2xl text-primary">
        {icon || <Film className="h-7 w-7" />}
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-display text-base sm:text-lg font-bold text-on-surface">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-on-surface-variant">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="liquid-glass-cta mt-2 inline-flex min-h-10 items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

interface ErrorStatePanelProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorStatePanel({
  title = "Unable to load content",
  message,
  onRetry,
}: ErrorStatePanelProps) {
  return (
    <div
      role="alert"
      className="liquid-glass flex flex-col items-center justify-center rounded-[26px] border-red-500/30 p-8 sm:p-10 text-center space-y-4"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/12 text-red-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="font-display text-base font-bold text-on-surface">{title}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="liquid-glass-cta inline-flex min-h-10 items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      onClick={() => !loading && onCancel()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="zoku-confirm-title"
        aria-describedby="zoku-confirm-desc"
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-elevated relative w-full max-w-md rounded-[28px] p-6 space-y-5 animate-scale-up"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              destructive
                ? "border-red-500/30 bg-red-500/12 text-red-400"
                : "border-primary/30 bg-primary/12 text-primary"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3
              id="zoku-confirm-title"
              className="font-display text-base font-bold text-on-surface"
            >
              {title}
            </h3>
            <p
              id="zoku-confirm-desc"
              className="text-xs leading-relaxed text-on-surface-variant"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="liquid-glass-pill rounded-full px-4 py-2 text-xs font-semibold text-on-surface disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
              destructive
                ? "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/25"
                : "liquid-glass-cta"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
