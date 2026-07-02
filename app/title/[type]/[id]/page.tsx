"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, ArrowLeft, Clock, Monitor, Users, Eye, Sparkles } from "lucide-react";
import { useSessionStore, useWatchlistStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { TitleRail } from "@/components/TitleRail";
import { 
  getTitleDetails, 
  getCredits, 
  getVideos, 
  getSimilar, 
  getSeasonDetails,
  TMDBTitle, 
  TMDBCredit, 
  TMDBVideo, 
  TMDBSeasonDetail 
} from "@/lib/tmdb";

interface TitlePageProps {
  params: Promise<{ type: string; id: string }>;
}

export default function TitleDetailPage({ params }: TitlePageProps) {
  const router = useRouter();
  const { type, id } = use(params);
  const mediaType = type as "movie" | "tv";
  const titleId = Number(id);

  const { user, currentProfile, initializing } = useSessionStore();
  const { addItem, removeItem, hasItem } = useWatchlistStore();

  const [details, setDetails] = useState<TMDBTitle | null>(null);
  const [cast, setCast] = useState<TMDBCredit[]>([]);
  const [trailers, setTrailers] = useState<TMDBVideo[]>([]);
  const [similar, setSimilar] = useState<TMDBTitle[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetail, setSeasonDetail] = useState<TMDBSeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Redirection guard
  useEffect(() => {
    if (!initializing) {
      if (!user) {
        router.replace("/login");
      } else if (!currentProfile) {
        router.replace("/profiles");
      }
    }
  }, [user, currentProfile, initializing, router]);

  // Fetch Core Details
  useEffect(() => {
    if (!user || !currentProfile || !titleId) return;

    async function loadTitleData() {
      setLoading(true);
      try {
        const titleDetails = await getTitleDetails(mediaType, titleId);
        setDetails(titleDetails);

        const castList = await getCredits(mediaType, titleId);
        setCast(castList.slice(0, 10)); // Top 10 actors

        const videoList = await getVideos(mediaType, titleId);
        setTrailers(videoList);

        const similarList = await getSimilar(mediaType, titleId);
        // Filter kidMode
        const filteredSimilar = currentProfile?.kidMode 
          ? similarList.filter(t => (t.vote_average || 0) < 7.5)
          : similarList;
        setSimilar(filteredSimilar);

        // If TV, auto-select first season and load details
        if (mediaType === "tv" && titleDetails.seasons && titleDetails.seasons.length > 0) {
          const firstSeasonNum = titleDetails.seasons[0].season_number;
          setSelectedSeason(firstSeasonNum);
        }
      } catch (err) {
        console.error("Failed to load title details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTitleData();
  }, [user, currentProfile, mediaType, titleId]);

  // Fetch Season Details when season selection changes
  useEffect(() => {
    if (mediaType !== "tv" || !titleId) return;

    async function loadSeasonData() {
      setLoadingSeason(true);
      try {
        const data = await getSeasonDetails(titleId, selectedSeason);
        setSeasonDetail(data);
      } catch (err) {
        console.error("Failed to load season details:", err);
      } finally {
        setLoadingSeason(false);
      }
    }

    loadSeasonData();
  }, [mediaType, titleId, selectedSeason]);

  if (initializing || !user || !currentProfile || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-on-surface gap-4">
        <p className="font-semibold">Failed to find requested archive title.</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-primary rounded-xl text-xs font-semibold">
          Return to Deck
        </button>
      </div>
    );
  }

  const name = details.title || details.name || "Untitled Masterpiece";
  const backdropUrl = details.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920";
  const posterUrl = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500";

  const rating = details.vote_average ? details.vote_average.toFixed(1) : "N/A";
  const releaseYear = (details.release_date || details.first_air_date || "").split("-")[0];
  const isInWatchlist = hasItem(details.id, mediaType);

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeItem(details.id, mediaType);
    } else {
      addItem(
        details.id,
        mediaType,
        name,
        details.poster_path,
        details.backdrop_path,
        details.vote_average
      );
    }
  };

  const handlePlayClick = () => {
    if (mediaType === "movie") {
      router.push(`/watch/movie/${details.id}`);
    } else {
      // Find first valid episode or default to 1/1
      const sNum = seasonDetail?.episodes[0]?.season_number || 1;
      const eNum = seasonDetail?.episodes[0]?.episode_number || 1;
      router.push(`/watch/tv/${details.id}/${sNum}/${eNum}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      <Navbar />

      {/* 1. Immersive Spotlight Backdrop */}
      <div className="relative w-full h-[50dvh] md:h-[65dvh] lg:h-[70dvh] overflow-hidden bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backdropUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />

        {/* Back button overlay */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-4 sm:left-6 lg:left-8 z-20 p-2.5 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-border-custom hover:text-primary transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Core Profile Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 md:-mt-40 lg:-mt-48 space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Main Poster left column */}
          <div className="w-48 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-border-custom shadow-2xl shrink-0 mx-auto md:mx-0">
            <img src={posterUrl} alt={name} className="h-full w-full object-cover" />
          </div>

          {/* Core metadata details right column */}
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono text-on-surface-variant">
              <span className="text-primary font-bold uppercase">{mediaType}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
              <span>{releaseYear}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-on-surface font-semibold">{rating}</span>
              </span>
              {details.runtime && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-border-custom" />
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{details.runtime} min</span>
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-tight">
              {name}
            </h1>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-3xl">
              {details.overview}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <button
                onClick={handlePlayClick}
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-90 py-3.5 px-8 text-xs sm:text-sm font-semibold text-white shadow-lg active:scale-95 transition-all duration-300"
              >
                <Play className="h-4.5 w-4.5 fill-white" />
                <span>{mediaType === "movie" ? "Play Movie" : "Start Watching"}</span>
              </button>

              <button
                onClick={handleWatchlistToggle}
                className={`flex items-center gap-2 rounded-xl border py-3.5 px-6 text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  isInWatchlist 
                    ? "bg-primary/15 border-primary text-primary" 
                    : "bg-surface hover:bg-surface-hover border-border-custom text-on-surface hover:text-primary"
                }`}
              >
                {isInWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{isInWatchlist ? "In Watchlist" : "Add Watchlist"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. TV Season and Episode Selector Panel */}
        {mediaType === "tv" && details.seasons && details.seasons.length > 0 && (
          <div className="rounded-2xl border border-border-custom bg-surface/30 p-6 backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Episodes & Portal Seasons</span>
              </span>

              {/* Season Selection Dropdown */}
              <div className="relative">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="rounded-xl border border-border-custom bg-background px-4 py-2 text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
                >
                  {details.seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.name} ({s.episode_count} Episodes)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingSeason ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : seasonDetail && seasonDetail.episodes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seasonDetail.episodes.map((ep) => {
                  const epStill = ep.still_path 
                    ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300";
                  return (
                    <div 
                      key={ep.id}
                      onClick={() => router.push(`/watch/tv/${details.id}/${selectedSeason}/${ep.episode_number}`)}
                      className="group flex gap-4 p-3 rounded-xl border border-border-custom hover:border-primary bg-background/40 hover:bg-surface/50 cursor-pointer transition-all duration-300"
                    >
                      {/* Episode Still thumbnail */}
                      <div className="relative w-28 sm:w-36 aspect-[16/10] rounded-lg overflow-hidden shrink-0 shadow bg-black border border-border-custom">
                        <img src={epStill} alt={ep.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-6 w-6 text-white fill-white animate-pulse" />
                        </div>
                      </div>

                      {/* Episode Meta */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-on-surface-variant">
                          <span>Episode {ep.episode_number}</span>
                          {ep.vote_average > 0 && (
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Star className="h-2.5 w-2.5 fill-yellow-500" />
                              <span>{ep.vote_average.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-snug">
                          {ep.overview || "No episode summary available."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-on-surface-variant py-8">
                No episodes found for this season.
              </p>
            )}
          </div>
        )}

        {/* 4. Cast list */}
        {cast.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-display font-semibold tracking-wide text-on-surface uppercase border-l-2 border-primary pl-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Spotlight Cast Members</span>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {cast.map((actor) => {
                const profileUrl = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : `https://api.dicebear.com/7.x/initials/svg?seed=${actor.name}`;
                return (
                  <div key={actor.id} className="flex flex-col items-center gap-2 text-center shrink-0 w-20 sm:w-24">
                    <img
                      src={profileUrl}
                      alt={actor.name}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border border-border-custom"
                    />
                    <div className="space-y-0.5 min-w-0 w-full">
                      <p className="font-semibold text-[10px] sm:text-xs text-on-surface truncate">{actor.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-on-surface-variant truncate">{actor.character}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Embedded YouTube Trailer */}
        {trailers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-display font-semibold tracking-wide text-on-surface uppercase border-l-2 border-primary pl-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>YouTube Trailers & Clips</span>
            </h2>

            <div className="aspect-[16/9] w-full max-w-3xl rounded-2xl overflow-hidden border border-border-custom bg-black mx-auto shadow-xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailers[0].key}`}
                title="Cinematic Trailer"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* 6. Recommendations / Similar section */}
        {similar.length > 0 && (
          <TitleRail 
            title="Recommended Feed Titles" 
            items={similar} 
            mediaType={mediaType} 
          />
        )}

      </div>
    </div>
  );
}
