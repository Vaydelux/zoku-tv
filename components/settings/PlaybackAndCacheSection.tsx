"use client";

import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";

interface IframeModeSectionProps {
  localIframeMode: "Strict" | "Compatibility";
  onChangeMode: (mode: "Strict" | "Compatibility") => void;
}

export function IframeModeSection({
  localIframeMode,
  onChangeMode,
}: IframeModeSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          Playback Container Sandbox Mode
        </h2>
        <p className="text-xs text-on-surface-variant">
          Control HTML5 iframe shielding rules to defend your browser against unwanted popups and redirects.
        </p>
      </div>

      <div className="space-y-3.5">
        <button
          type="button"
          onClick={() => onChangeMode("Strict")}
          className={`w-full text-left p-5 rounded-[22px] border cursor-pointer transition-all flex items-start gap-4 ${
            localIframeMode === "Strict"
              ? "border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/40"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
          }`}
        >
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-on-surface">
                Strict Mode (Containment Shield)
              </h3>
              {localIframeMode === "Strict" && (
                <span className="rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold px-2.5 py-0.5">
                  Active Default
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Applies HTML5 sandbox directives (
              <code className="font-mono text-[10px]">
                allow-scripts allow-same-origin allow-forms allow-presentation
              </code>
              ) to block popups and top-level navigation hijacks.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("Compatibility")}
          className={`w-full text-left p-5 rounded-[22px] border cursor-pointer transition-all flex items-start gap-4 ${
            localIframeMode === "Compatibility"
              ? "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/40"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
          }`}
        >
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-on-surface">
                Compatibility Mode (Relaxed Rules)
              </h3>
              {localIframeMode === "Compatibility" && (
                <span className="rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold px-2.5 py-0.5">
                  Active Default
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Omits HTML5 sandbox restrictions for third-party providers that explicitly reject sandboxed iframes.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

interface CacheAndPrivacySectionProps {
  profileName: string;
  saving: boolean;
  onRequestAction: (action: "clear_cache" | "clear_history" | "clear_cw") => void;
}

export function CacheAndPrivacySection({
  profileName,
  saving,
  onRequestAction,
}: CacheAndPrivacySectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          Privacy, Viewing Data &amp; Local Caches
        </h2>
        <p className="text-xs text-on-surface-variant">
          Manage profile-scoped viewing data and public catalog metadata caches.
        </p>
      </div>

      <div className="space-y-3.5">
        <div className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-on-surface">
              Clear Continue Watching Queue
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Remove all in-progress resume points for {profileName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestAction("clear_cw")}
            disabled={saving}
            className="shrink-0 rounded-full border border-red-500/40 bg-red-500/12 hover:bg-red-500/20 text-red-400 py-2.5 px-4 text-xs font-semibold transition-all"
          >
            Clear Continue Watching
          </button>
        </div>

        <div className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-on-surface">
              Clear Profile Watch History
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Permanently clear watched titles and completion logs for {profileName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestAction("clear_history")}
            disabled={saving}
            className="shrink-0 rounded-full border border-red-500/40 bg-red-500/12 hover:bg-red-500/20 text-red-400 py-2.5 px-4 text-xs font-semibold transition-all"
          >
            Clear Watch History
          </button>
        </div>

        <div className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-on-surface">
              Force Refresh Catalog &amp; Service Worker Cache
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Evict cached TMDB/AniList responses and static caches without deleting your profile or watchlist.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestAction("clear_cache")}
            disabled={saving}
            className="liquid-glass-cta shrink-0 inline-flex items-center gap-2 rounded-full py-2.5 px-5 text-xs font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Local Caches</span>
          </button>
        </div>
      </div>
    </div>
  );
}
