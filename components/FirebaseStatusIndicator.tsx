"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, Database, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  runFirestoreHealthCheck,
  type FirebaseHealthResult,
  type FirebaseHealthState,
} from "@/lib/firebase";
import { Spinner } from "@/components/Spinner";

type Props = {
  userId: string;
  profileId?: string;
};

const STATUS_META: Record<
  FirebaseHealthState,
  { label: string; tone: string; icon: typeof Cloud }
> = {
  checking: {
    label: "Checking cloud status...",
    tone: "border-border-custom bg-surface/40 text-on-surface-variant",
    icon: RefreshCw,
  },
  not_configured: {
    label: "Offline mode",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icon: CloudOff,
  },
  offline_mode: {
    label: "Offline mode",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icon: CloudOff,
  },
  network_offline: {
    label: "Network offline",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icon: CloudOff,
  },
  connected: {
    label: "Connected",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    icon: Cloud,
  },
  rules_ok: {
    label: "Connected · Rules OK",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    icon: ShieldCheck,
  },
  rules_error: {
    label: "Rules error",
    tone: "border-red-500/30 bg-red-500/10 text-red-300",
    icon: ShieldAlert,
  },
  index_error: {
    label: "Index required",
    tone: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    icon: Database,
  },
};

export function FirebaseStatusIndicator({ userId, profileId }: Props) {
  const [result, setResult] = useState<FirebaseHealthResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const health = await runFirestoreHealthCheck(userId, profileId);
      setResult(health);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => {
      refresh();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refresh]);

  const state = isRefreshing && !result ? "checking" : result?.state ?? "checking";
  const meta = STATUS_META[state];
  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${meta.tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <Spinner className="h-4 w-4 shrink-0" />
            ) : (
              <Icon className="h-4 w-4 shrink-0" />
            )}
            <h2 className="text-sm font-semibold text-on-surface">Firebase Cloud Status</h2>
            <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {meta.label}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-on-surface-variant">
            {result?.message ?? "Running connectivity, rules, and index checks..."}
          </p>

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-on-surface-variant">
            <span className="rounded-md border border-border-custom bg-background/40 px-2 py-1">
              Project: {result?.projectId ?? "not configured"}
            </span>
            {result?.checkedAt && (
              <span className="rounded-md border border-border-custom bg-background/40 px-2 py-1">
                Checked: {new Date(result.checkedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {result?.details && (
            <p className="text-[10px] leading-relaxed text-on-surface-variant/80">
              {result.details}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-custom bg-background/50 px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span>Recheck</span>
        </button>
      </div>

      {(state === "rules_error" || state === "index_error" || state === "not_configured") && (
        <div className="mt-4 rounded-xl border border-border-custom bg-background/30 p-3 text-[11px] leading-relaxed text-on-surface-variant">
          {state === "rules_error" && (
            <p>Deploy rules: <code className="font-mono">npm run firebase:deploy:rules</code></p>
          )}
          {state === "index_error" && (
            <p>Deploy indexes: <code className="font-mono">npm run firebase:deploy:indexes</code></p>
          )}
          {state === "not_configured" && (
            <p>Add Firebase env vars to <code className="font-mono">.env.local</code> to enable cloud sync.</p>
          )}
        </div>
      )}
    </div>
  );
}
