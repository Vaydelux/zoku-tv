"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, ArrowLeft, MonitorPlay } from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { AnimeRail } from "@/components/anime/AnimeRail";
import {
  getAnimeDetails,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
} from "@/lib/anilist";
import { buildAnimeSeasons, type AnimeSeason } from "@/lib/anilist-seasons";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const anilistId = Number(id);
  const { currentProfile } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();

  const [details, setDetails] = useState<Awaited<ReturnType<typeof getAnimeDetails>>>(null);
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AniListMedia[]>([]);

  useEffect(() => {
    if (!currentProfile || !anilistId) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getAnimeDetails(anilistId);
        setDetails(data);
        if (data) {
          const built = buildAnimeSeasons(data);
          setSeasons(built);
          setSelectedSeason(built[0]?.seasonNumber ?? 1);
          setRecommendations(
            (data.recommendations?.nodes ?? [])
              .map((n) => n.mediaRecommendation)
              .filter((m): m is AniListMedia => Boolean(m))
          );
        }
      } catch (err) {
        console.error("Failed to load anime details", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentProfile, anilistId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <p>Anime details could not be loaded.</p>
        <button onClick={() => router.push("/home")} className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold text-white">
          Return Home
        </button>
      </div>
    );
  }

  const title = getAnimeDisplayTitle(details);
  const poster = getAnimePoster(details);
  const banner = details.bannerImage || poster;
  const score = details.averageScore ? (details.averageScore / 10).toFixed(1) : "N/A";
  const inWatchlist = hasItem("anime", anilistId);
  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeason) || seasons[0];

  const handleWatchlist = () => {
    if (inWatchlist) {
      removeItem("anime", anilistId);
    } else {
      addItem({
        media_type: "anime",
        anilistId,
        title,
        poster_path: poster,
        backdrop_path: details.bannerImage ?? null,
        vote_average: details.averageScore ? details.averageScore / 10 : undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <Navbar />

      <div
        className="relative h-[40vh] min-h-[280px] bg-cover bg-center"
        style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/40" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8 gap-6">
          <button
            onClick={() => router.back()}
            className="absolute top-6 left-4 sm:left-8 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {poster && (
            <img src={poster} alt={title} className="hidden sm:block w-36 aspect-[2/3] rounded-xl border border-border-custom shadow-xl object-cover" />
          )}

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <Star className="h-4 w-4 fill-primary" />
              <span>{score}</span>
              <span className="text-on-surface-variant">•</span>
              <span className="uppercase">{details.status || "ANIME"}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold">{title}</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-3 max-w-3xl">{details.description}</p>
            <div className="flex flex-wrap gap-2">
              {(details.genres ?? []).map((genre) => (
                <span key={genre} className="text-[10px] font-mono uppercase px-2 py-1 rounded-lg bg-surface border border-border-custom">
                  {genre}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() =>
                  router.push(`/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/1`)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white"
              >
                <Play className="h-4 w-4 fill-white" />
                Play S{activeSeason.seasonNumber} E1
              </button>
              <button
                onClick={handleWatchlist}
                className="inline-flex items-center gap-2 rounded-xl border border-border-custom px-5 py-2.5 text-xs font-semibold"
              >
                {inWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {seasons.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <button
                key={season.seasonNumber}
                onClick={() => setSelectedSeason(season.seasonNumber)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  selectedSeason === season.seasonNumber
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border-custom hover:border-primary"
                }`}
              >
                Season {season.seasonNumber}
              </button>
            ))}
          </div>
        )}

        {activeSeason && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-on-surface-variant">
              <MonitorPlay className="h-4 w-4 text-primary" />
              <span>{activeSeason.title} — Episodes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {activeSeason.episodes.map((ep) => (
                <button
                  key={ep.episodeNumber}
                  onClick={() =>
                    router.push(
                      `/watch/anime/${activeSeason.anilistId}/${activeSeason.filmuSeason}/${ep.episodeNumber}`
                    )
                  }
                  className="flex flex-col items-start p-2.5 rounded-xl border border-border-custom bg-surface hover:border-primary hover:bg-primary/5 text-left transition-all"
                >
                  {ep.thumbnail && (
                    <img
                      src={ep.thumbnail}
                      alt={ep.title}
                      className="w-full aspect-video object-cover rounded-lg mb-2"
                    />
                  )}
                  <span className="text-[10px] font-mono text-on-surface-variant">Episode {ep.episodeNumber}</span>
                  <span className="text-xs font-semibold line-clamp-2">{ep.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <AnimeRail title="You Might Also Like" items={recommendations} />
        )}
      </div>
    </div>
  );
}
