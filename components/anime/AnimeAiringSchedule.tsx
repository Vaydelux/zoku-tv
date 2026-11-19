"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, Star, Tv, RefreshCw } from "lucide-react";
import {
  getAnimeAiringSchedule,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListAiringScheduleItem,
} from "@/lib/anilist";
import { filterAnimeForKidsMode } from "@/lib/kids-mode";

interface AnimeAiringScheduleProps {
  isKidMode: boolean;
}

interface DayBucket {
  key: string;
  shortLabel: string;
  dateLabel: string;
  startSec: number;
  endSec: number;
}

function buildSevenDayBuckets(): DayBucket[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const buckets: DayBucket[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const start = new Date(base.getTime() + offset * 86_400_000);
    const end = new Date(start.getTime() + 86_400_000 - 1000);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate()
    ).padStart(2, "0")}`;
    const shortLabel =
      offset === 0
        ? "Today"
        : offset === 1
        ? "Tomorrow"
        : start.toLocaleDateString(undefined, { weekday: "short" });
    const dateLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    buckets.push({
      key,
      shortLabel,
      dateLabel,
      startSec: Math.floor(start.getTime() / 1000),
      endSec: Math.floor(end.getTime() / 1000),
    });
  }

  return buckets;
}

export function formatCountdown(airingAtSec: number, nowSec: number): string {
  const diff = airingAtSec - nowSec;
  if (diff <= 0) {
    const ago = Math.abs(diff);
    if (ago < 3600) return `Aired ${Math.max(1, Math.floor(ago / 60))}m ago`;
    const hours = Math.floor(ago / 3600);
    return `Aired ${hours}h ago`;
  }
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${minutes}m`;
  return `In ${Math.max(1, minutes)}m`;
}

function formatLocalAirTime(airingAtSec: number): string {
  return new Date(airingAtSec * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AnimeAiringSchedule({ isKidMode }: AnimeAiringScheduleProps) {
  const buckets = useMemo(() => buildSevenDayBuckets(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(buckets[0].key);
  const [items, setItems] = useState<AniListAiringScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setLoading(true);
      setError(false);
      try {
        const startSec = buckets[0].startSec;
        const endSec = buckets[buckets.length - 1].endSec;
        const page1 = await getAnimeAiringSchedule(startSec, endSec, 1, 50);
        let all = [...page1.schedules];
        if (page1.pageInfo.hasNextPage) {
          const page2 = await getAnimeAiringSchedule(startSec, endSec, 2, 50);
          all = [...all, ...page2.schedules];
        }
        if (cancelled) return;

        const safeMediaIds = new Set(
          filterAnimeForKidsMode(
            all.map((entry) => entry.media),
            isKidMode
          ).map((m) => m.id)
        );
        const filtered = all.filter((entry) => safeMediaIds.has(entry.media.id));
        setItems(filtered);
      } catch (err) {
        console.error("Failed to load anime airing schedule:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [buckets, isKidMode, refreshTick]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, AniListAiringScheduleItem[]>();
    for (const b of buckets) map.set(b.key, []);
    for (const entry of items) {
      const target = buckets.find(
        (b) => entry.airingAt >= b.startSec && entry.airingAt <= b.endSec
      );
      if (target) {
        map.get(target.key)!.push(entry);
      }
    }
    return map;
  }, [buckets, items]);

  const activeItems = groupedByDay.get(selectedDayKey) ?? [];

  return (
    <div className="space-y-6" data-testid="anime-airing-schedule">
      {/* 7-Day Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="7-day anime broadcast schedule"
        >
          {buckets.map((bucket) => {
            const count = groupedByDay.get(bucket.key)?.length ?? 0;
            const active = selectedDayKey === bucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                role="tab"
                aria-selected={active}
                data-tv-focusable="true"
                onClick={() => setSelectedDayKey(bucket.key)}
                className={`shrink-0 flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors min-w-[96px] ${
                  active
                    ? "border-primary bg-primary text-primary-contrast shadow-md"
                    : "border-border-custom bg-surface/60 text-on-surface hover:border-primary/60"
                }`}
              >
                <span className="text-xs font-bold leading-tight">{bucket.shortLabel}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                    active ? "text-primary-contrast/85" : "text-on-surface-variant"
                  }`}
                >
                  {bucket.dateLabel} · {loading ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          data-tv-focusable="true"
          className="theme-panel inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Schedule List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl border border-border-custom bg-surface/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-border-custom bg-surface/20 py-16 px-6 text-center space-y-3">
          <CalendarDays className="h-8 w-8 text-on-surface-variant mx-auto" />
          <p className="text-sm font-semibold text-on-surface">
            Live airing schedule is temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast"
          >
            Try Again
          </button>
        </div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom bg-surface/20 py-16 px-6 text-center space-y-2">
          <CalendarDays className="h-8 w-8 text-on-surface-variant mx-auto" />
          <p className="text-sm font-semibold text-on-surface">No scheduled broadcasts for this day</p>
          <p className="text-xs text-on-surface-variant">
            Select another day above to browse upcoming simulcasts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeItems.map((entry) => {
            const title = getAnimeDisplayTitle(entry.media);
            const poster = getAnimePoster(entry.media);
            const studio = entry.media.studios?.nodes?.[0]?.name;
            const score = entry.media.averageScore
              ? (entry.media.averageScore / 10).toFixed(1)
              : null;
            const isUpcoming = entry.airingAt > nowSec;

            return (
              <Link
                key={entry.id}
                href={`/anime/${entry.media.id}`}
                data-tv-focusable="true"
                className="group flex gap-3.5 rounded-2xl border border-border-custom bg-surface/60 hover:border-primary hover:bg-surface p-3 transition-colors"
              >
                <div className="h-24 w-[68px] rounded-xl overflow-hidden bg-background border border-border-custom shrink-0">
                  {poster ? (
                    <img
                      src={poster}
                      alt={title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                      <Tv className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                      <span className="font-bold text-primary">EP {entry.episode}</span>
                      <span
                        className={
                          isUpcoming
                            ? "text-emerald-400 font-semibold"
                            : "text-on-surface-variant"
                        }
                      >
                        {formatCountdown(entry.airingAt, nowSec)}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-on-surface-variant tabular-nums">
                    <span className="inline-flex items-center gap-1 text-on-surface">
                      <Clock className="h-3 w-3 text-primary" />
                      {formatLocalAirTime(entry.airingAt)}
                    </span>
                    {score && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {score}
                        </span>
                      </>
                    )}
                    {studio && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{studio}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
