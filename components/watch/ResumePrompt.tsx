"use client";

import { Play, RotateCcw } from "lucide-react";

type Props = {
  progressPercent: number;
  currentTimeSec: number;
  onResume: () => void;
  onStartOver: () => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ResumePrompt({
  progressPercent,
  currentTimeSec,
  onResume,
  onStartOver,
}: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0B0B0F]/88 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#14141A] px-6 py-7 text-center text-[#F5F5F7] shadow-2xl">
        <h3 className="mb-2 font-display text-xl font-bold text-[#F5F5F7]">
          Continue watching?
        </h3>
        <p className="mb-6 text-sm text-[#A1A1AA] tabular-nums">
          You left off at {formatTime(currentTimeSec)} ({Math.round(progressPercent)}%)
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Resume
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/12 bg-[#0B0B0F] px-5 py-2.5 text-sm font-semibold text-[#F5F5F7] transition-colors hover:bg-[#1C1C24]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
