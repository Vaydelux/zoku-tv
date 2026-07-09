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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 px-6 py-7 text-center shadow-2xl">
        <h3 className="mb-2 text-xl font-bold text-white">Continue watching?</h3>
        <p className="mb-6 text-sm text-white/60">
          You were at {formatTime(currentTimeSec)} ({Math.round(progressPercent)}%)
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-opacity-95"
          >
            <Play className="h-4 w-4 fill-white" />
            Resume
          </button>
          <button
            onClick={onStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
