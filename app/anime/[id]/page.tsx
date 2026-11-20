"use client";

import { useEffect, useMemo, useState, use } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, ArrowLeft, MonitorPlay, Shield, Film, Clock, Users } from "lucide-react";
import { useSessionStore, useWatchlistStore, useEpisodeProgressStore, useWatchHistoryStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { CustomSelect } from "@/components/CustomSelect";
import { AnimeRail } from "@/components/anime/AnimeRail";
import { FranchiseTimelineSection } from "@/components/anime/FranchiseTimelineSection";
import { CatalogBridgeBanner } from "@/components/CatalogBridgeBanner";
import { EpisodeThumbnailWithProgress } from "@/components/EpisodeThumbnailWithProgress";
import { CollectionPickerButton } from "@/components/watchlist/CollectionPickerButton";
import { formatCountdown } from "@/components/anime/AnimeAiringSchedule";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const TrailerTheaterModal = dynamic(
  () => import("@/components/TrailerTheaterModal").then((m) => m.TrailerTheaterModal),
  { ssr: false }
);
import {
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
} from "@/lib/anilist";
import {
  classifyAnimeMedia,
  filterAnimeForKidsMode,
} from "@/lib/kids-mode";
import {
  buildAnimeSeasons,
  buildFranchiseTimeline,
  type AnimeSeason,
  type FranchiseTimelineNode,
} from "@/lib/anilist-seasons";
import {
  resolveTmdbBridgeForAnime,
  type CatalogBridgeMatch,
} from "@/lib/catalog-bridge";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const anilistId = Number(id);
  const { currentProfile } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();
  const { getProgress } = useEpisodeProgressStore();
  const episodeProgressRecords = useEpisodeProgressStore((state) => state.records);
  const watchHistoryItems = useWatchHistoryStore((state) => state.items);
  const isKidMode = Boolean(currentProfile?.kidMode);

  const [details, setDetails] = useState<Awaited<ReturnType<typeof getAnimeDetails>>>(null);
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AniListMedia[]>([]);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [bridgeMatch, setBridgeMatch] = useState<CatalogBridgeMatch | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useDocumentTitle(details ? getAnimeDisplayTitle(details) : "Anime Details");

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentProfile || !anilistId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setDetails(null);
      setRecommendations([]);
      setSeasons([]);
      setBridgeMatch(null);
      try {
        const data = await getAnimeDetails(anilistId);
        if (cancelled) return;
        setDetails(data);
        if (data) {
          const built = buildAnimeSeasons(data);
          const matchingSeason = built.find((s) => s.anilistId === anilistId);
          setSeasons(built);
          setSelectedSeason(matchingSeason?.seasonNumber ?? built[0]?.seasonNumber ?? 1);
          const rawRecs = (data.recommendations?.nodes ?? [])
            .map((n) => n.mediaRecommendation)
            .filter((m): m is AniListMedia => Boolean(m));
          setRecommendations(filterAnimeForKidsMode(rawRecs, isKidMode));

          resolveTmdbBridgeForAnime(data, isKidMode)
            .then((matched) => {
              if (!cancelled) setBridgeMatch(matched);
            })
            .catch(() => {
              // Optional cross-catalog bridge enrichment
            });
        }
      } catch (err) {
        console.error("Failed to load anime details", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, anilistId, isKidMode]);

  const franchiseTimeline = useMemo(() => {
    if (!details) return null;
    return buildFranchiseTimeline(
      details,
      (entryAnilistId) => {
        const hist = watchHistoryItems.find(
          (h) => h.media_type === "anime" && Number(h.anilistId) === entryAnilistId
        );
        if (hist?.completed || (hist?.progress_percent ?? 0) >= 90) {
          return {
            status: "completed",
            lastEpisode: hist?.episode ?? null,
            progressPercent: 100,
          };
        }

        const epRecords = Object.values(episodeProgressRecords || {}).filter(
          (r) => r && r.media_type === "anime" && Number(r.anilistId) === entryAnilistId
        );
        if (epRecords.length > 0) {
          const highestEp = Math.max(...epRecords.map((r) => r.episode || 1));
          const latestRec =
            epRecords.find((r) => r.episode === highestEp) ?? epRecords[0];
          return {
            status: "in_progress",
            lastEpisode: highestEp,
            progressPercent: latestRec?.progress_percent ?? hist?.progress_percent ?? 25,
          };
        }

        if (hist && (hist.progress_percent ?? 0) > 0) {
          return {
            status: "in_progress",
            lastEpisode: hist.episode ?? 1,
            progressPercent: hist.progress_percent ?? 15,
          };
        }

        return { status: "unwatched" };
      },
      (media) => !isKidMode || classifyAnimeMedia(media).kidsSafe
    );
  }, [details, watchHistoryItems, episodeProgressRecords, isKidMode]);

  const handleSelectFranchiseNode = (node: FranchiseTimelineNode) => {
    const matchingSeason = seasons.find((s) => s.anilistId === node.anilistId);
    if (node.isCurrent && matchingSeason) {
      setSelectedSeason(matchingSeason.seasonNumber);
      return;
    }
    router.push(`/anime/${node.anilistId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details || details.id !== anilistId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <p>Anime details could not be loaded.</p>
        <button
          onClick={() => router.push("/home")}
          className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold text-primary-contrast"
        >
          Return Home
        </button>
      </div>
    );
  }

  const title = getAnimeDisplayTitle(details);
  const classification = classifyAnimeMedia(details);

  if (isKidMode && !classification.kidsSafe) {
    return (
      <div className="zoku-cinematic-detail zoku-cinematic-anime-detail app-page-shell text-on-surface pb-16">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-20">
          <div
            data-testid="kids-mode-restricted-gate"
            className="glass-panel rounded-3xl border border-amber-500/30 p-8 text-center space-y-5 shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <Shield className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {classification.label}
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-on-surface">
                Restricted in Kids Experience
              </h1>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                “{title}” is hidden while Kids Mode is active on this profile ({classification.reason}).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-contrast shadow-md hover:brightness-110 transition-all"
              >
                Back to Kids Home
              </button>
              <button
                type="button"
                onClick={() => router.push("/discover")}
                className="theme-panel rounded-xl px-5 py-2.5 text-xs font-semibold text-on-surface hover:border-primary transition-all"
              >
                Explore Youth Anime
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const poster = getAnimePoster(details);
  const banner = details.bannerImage || poster;
  const score = details.averageScore ? (details.averageScore / 10).toFixed(1) : "N/A";
  const inWatchlist = hasItem("anime", anilistId);
  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeason) || seasons[0];
  const youtubeTrailer =
    details.trailer?.id && details.trailer?.site?.toLowerCase() === "youtube"
      ? details.trailer
      : null;
  const characters = (details.characters?.edges ?? []).filter((edge) => edge?.node);
  const nextAiring = details.nextAiringEpisode;
  const studioName = details.studios?.nodes?.[0]?.name || null;

  const handleWatchlist = () => {
    if (inWatchlist) {
      removeItem("anime", anilistId);
    } else {
      const relDate = details.startDate?.year
        ? `${details.startDate.year}-${String(details.startDate.month || 1).padStart(2, "0")}-${String(details.startDate.day || 1).padStart(2, "0")}`
        : details.seasonYear
        ? `${details.seasonYear}-01-01`
        : null;
      addItem({
        media_type: "anime",
        anilistId,
        title,
        creator: studioName,
        genres: details.genres || null,
        poster_path: poster,
        backdrop_path: details.bannerImage ?? null,
        vote_average: details.averageScore ? details.averageScore / 10 : undefined,
        release_date: relDate,
      });
    }
  };

  return (
    <div className="zoku-cinematic-detail zoku-cinematic-anime-detail app-page-shell text-on-surface pb-16">
      <Navbar />

      <div className="zoku-detail-backdrop relative min-h-[340px] sm:min-h-[400px]">
        {banner && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="zoku-detail-backdrop-media absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${banner})` }}
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/45" />
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8 flex items-end gap-6">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            data-tv-focusable="true"
            className="absolute top-6 left-4 sm:left-8 p-2.5 rounded-xl bg-black/50 hover:bg-black/75 text-white border border-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {poster && (
            <img
              src={poster}
              alt={title}
              className="hidden sm:block w-40 aspect-[2/3] rounded-xl border border-border-custom shadow-xl object-cover shrink-0"
            />
          )}

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-primary tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary" />
                <span>{score}</span>
              </span>
              <span className="text-on-surface-variant">·</span>
              <span className="uppercase">{details.status || "ANIME"}</span>
              {studioName && (
                <>
                  <span className="text-on-surface-variant">·</span>
                  <span className="text-on-surface">{studioName}</span>
                </>
              )}
              <span className="text-on-surface-variant">·</span>
              <span
                data-testid="anime-maturity-badge"
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  classification.kidsSafe
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {classification.code}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">{title}</h1>

            {nextAiring && (
              <div
                data-testid="anime-next-airing-banner"
                className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono text-emerald-300 tabular-nums"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="font-bold">Episode {nextAiring.episode}</span>
                <span>·</span>
                <span>{formatCountdown(nextAiring.airingAt, nowSec)}</span>
                <span className="hidden sm:inline opacity-80">
                  ({new Date(nextAiring.airingAt * 1000).toLocaleString(undefined, {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })})
                </span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-3 max-w-3xl leading-relaxed">
              {details.description}
            </p>

            {(details.genres ?? []).length > 0 && (
              <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                {(details.genres ?? []).join(" · ")}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {activeSeason && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  onClick={() =>
                    router.push(
                      `/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/1`
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-contrast shadow-md hover:brightness-110 transition-all"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play S{activeSeason.seasonNumber} E1
                </button>
              )}

              {youtubeTrailer?.id && (
                <button
                  type="button"
                  data-testid="anime-watch-trailer-btn"
                  data-tv-focusable="true"
                  onClick={() => setTrailerOpen(true)}
                  className="theme-panel inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
                >
                  <Film className="h-4 w-4 text-primary" />
                  Watch Trailer
                </button>
              )}

              <button
                type="button"
                data-tv-focusable="true"
                onClick={handleWatchlist}
                className="theme-panel inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold hover:border-primary"
              >
                {inWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </button>

              <CollectionPickerButton mediaType="anime" id={anilistId} />
            </div>

            {bridgeMatch && (
              <div className="pt-2">
                <CatalogBridgeBanner match={bridgeMatch} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {franchiseTimeline && franchiseTimeline.totalEntries > 1 && (
          <FranchiseTimelineSection
            timeline={franchiseTimeline}
            onSelectEntry={handleSelectFranchiseNode}
          />
        )}

        {seasons.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {seasons.map((season) => (
                <button
                  key={season.seasonNumber}
                  data-tv-focusable="true"
                  onClick={() => setSelectedSeason(season.seasonNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedSeason === season.seasonNumber
                      ? "bg-primary text-primary-contrast border-primary"
                      : "theme-panel hover:border-primary"
                  }`}
                >
                  Season {season.seasonNumber}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-56">
              <CustomSelect
                ariaLabel="Select anime season"
                value={selectedSeason}
                onChange={(val) => setSelectedSeason(Number(val))}
                align="right"
                options={seasons.map((s) => ({
                  value: s.seasonNumber,
                  label: `Season ${s.seasonNumber}`,
                  badge: `${s.episodes.length} EP`,
                }))}
                testId="anime-season-select"
              />
            </div>
          </div>
        )}

        {activeSeason && (
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-on-surface-variant">
              <MonitorPlay className="h-4 w-4 text-primary" />
              <span>{activeSeason.title} — Episodes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {activeSeason.episodes.map((ep) => {
                const epProgress = getProgress(
                  "anime",
                  activeSeason.anilistId,
                  activeSeason.filmuSeason,
                  ep.episodeNumber
                );
                const progressPct = epProgress?.progress_percent ?? 0;
                const isCompleted = Boolean(epProgress?.completed);

                return (
                  <button
                    key={ep.episodeNumber}
                    data-tv-focusable="true"
                    onClick={() =>
                      router.push(
                        `/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/${ep.episodeNumber}`
                      )
                    }
                    data-testid={`anime-episode-item-${ep.episodeNumber}`}
                    className="group theme-panel flex flex-col items-start p-2.5 rounded-xl hover:border-primary hover:bg-primary/5 text-left transition-all relative overflow-hidden"
                  >
                    <EpisodeThumbnailWithProgress
                      thumbnail={ep.thumbnail}
                      title={ep.title}
                      episodeNumber={ep.episodeNumber}
                      progressPercent={progressPct}
                      completed={isCompleted}
                      aspectRatio="video"
                      className="mb-2 w-full"
                    />
                    <div className="flex items-center justify-between w-full text-[10px] font-mono text-on-surface-variant tabular-nums">
                      <span>Episode {ep.episodeNumber}</span>
                      {isCompleted ? (
                        <span className="text-emerald-400 font-semibold text-[9px]">Watched</span>
                      ) : progressPct > 0 ? (
                        <span className="text-primary font-semibold text-[9px]">
                          {Math.round(progressPct)}%
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold line-clamp-2 mt-0.5">{ep.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Characters & Japanese Voice Actors */}
        {characters.length > 0 && (
          <section className="space-y-4" data-testid="anime-characters-section">
            <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-on-surface flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Characters & Voice Cast</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {characters.map((edge) => {
                const char = edge.node!;
                const va = edge.voiceActors?.[0] ?? null;
                const charName = char.name?.full || "Character";
                const vaName = va?.name?.full || null;
                return (
                  <div
                    key={char.id}
                    className="theme-panel flex items-center justify-between gap-3 rounded-xl p-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-border-custom bg-background shrink-0 flex items-center justify-center">
                        {char.image?.large ? (
                          <img
                            src={char.image.large}
                            alt={charName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-xs font-bold text-primary">
                            {getInitials(charName)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">{charName}</p>
                        <p className="text-[10px] font-mono uppercase text-on-surface-variant">
                          {edge.role || "Cast"}
                        </p>
                      </div>
                    </div>

                    {va && vaName && (
                      <div className="flex items-center gap-2.5 min-w-0 text-right">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-on-surface truncate max-w-[110px]">
                            {vaName}
                          </p>
                          <p className="text-[9px] font-mono uppercase text-on-surface-variant">
                            JP VA
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-full overflow-hidden border border-border-custom bg-background shrink-0 flex items-center justify-center">
                          {va.image?.medium || va.image?.large ? (
                            <img
                              src={va.image.medium || va.image.large || ""}
                              alt={vaName}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-display text-[10px] font-bold text-primary">
                              {getInitials(vaName)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <AnimeRail title="You Might Also Like" items={recommendations} />
        )}
      </div>

      {youtubeTrailer?.id && (
        <TrailerTheaterModal
          open={trailerOpen}
          onClose={() => setTrailerOpen(false)}
          title={title}
          clips={[
            {
              id: youtubeTrailer.id,
              key: youtubeTrailer.id,
              name: "Official Anime Trailer",
              type: "Trailer",
            },
          ]}
        />
      )}
    </div>
  );
}
