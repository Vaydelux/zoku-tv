"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/Spinner";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingText = "Please wait...",
  children,
  disabled,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <>
          <Spinner className="h-3.5 w-3.5 shrink-0" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
