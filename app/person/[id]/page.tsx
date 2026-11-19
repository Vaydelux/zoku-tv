"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Film, Tv, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TitleCard } from "@/components/TitleCard";
import { CustomSelect } from "@/components/CustomSelect";
import { useSessionStore } from "@/stores";
import { getPersonDetails, type TMDBPersonDetail, type TMDBPersonCredit } from "@/lib/tmdb";
import { filterTmdbForKidsMode } from "@/lib/kids-mode";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

type MediaFilter = "all" | "movie" | "tv";
type CreditSort = "popularity" | "newest" | "rating";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PersonDetailPage({ params }: PersonPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const personId = Number(id);
  const { currentProfile } = useSessionStore();
  const isKidMode = Boolean(currentProfile?.kidMode);

  const [person, setPerson] = useState<TMDBPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sortBy, setSortBy] = useState<CreditSort>("popularity");
  const [bioExpanded, setBioExpanded] = useState(false);

  useDocumentTitle(person?.name || "Cast & Crew");

  useEffect(() => {
    if (!Number.isSafeInteger(personId) || personId <= 0) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getPersonDetails(personId);
        if (!cancelled) setPerson(data);
      } catch (err) {
        console.error("Failed to load person details:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const combinedCredits = useMemo(() => {
    if (!person?.combined_credits) return [];
    const seen = new Map<string, TMDBPersonCredit>();
    const raw = [...(person.combined_credits.cast || []), ...(person.combined_credits.crew || [])];
    for (const item of raw) {
      if (!item || (item.media_type !== "movie" && item.media_type !== "tv")) continue;
      const key = `${item.media_type}:${item.id}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
    return filterTmdbForKidsMode([...seen.values()], isKidMode);
  }, [person, isKidMode]);

  const movieCount = useMemo(
    () => combinedCredits.filter((c) => c.media_type === "movie").length,
    [combinedCredits]
  );
  const tvCount = useMemo(
    () => combinedCredits.filter((c) => c.media_type === "tv").length,
    [combinedCredits]
  );

  const filteredCredits = useMemo(() => {
    const base =
      mediaFilter === "all"
        ? combinedCredits
        : combinedCredits.filter((item) => item.media_type === mediaFilter);

    return [...base].sort((a, b) => {
      if (sortBy === "newest") {
        const da = a.release_date || a.first_air_date || "0000-00-00";
        const db = b.release_date || b.first_air_date || "0000-00-00";
        return db.localeCompare(da);
      }
      if (sortBy === "rating") {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      return (b.popularity || 0) - (a.popularity || 0);
    });
  }, [combinedCredits, mediaFilter, sortBy]);

  if (loading) {
    return (
      <div className="app-page-shell text-on-surface pb-16">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="h-56 w-44 rounded-2xl bg-surface animate-pulse shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-8 w-64 rounded-lg bg-surface animate-pulse" />
              <div className="h-4 w-48 rounded-lg bg-surface animate-pulse" />
              <div className="h-24 w-full rounded-xl bg-surface animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="aspect-video rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="app-page-shell text-on-surface pb-16">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center space-y-4">
          <p className="font-display text-lg font-bold">Profile Unavailable</p>
          <p className="text-xs text-on-surface-variant">
            We couldn&apos;t load this person&apos;s filmography right now.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-contrast"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const profileUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : null;
  const hasLongBio = person.biography.length > 360;

  return (
    <div className="app-page-shell text-on-surface pb-20 transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
        <button
          type="button"
          onClick={() => router.back()}
          data-tv-focusable="true"
          className="inline-flex items-center gap-2 rounded-xl border border-border-custom bg-surface/60 px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {/* Person Hero Header */}
        <section className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          <div className="w-40 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden border border-border-custom bg-surface shadow-xl shrink-0 mx-auto md:mx-0">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-surface to-background">
                <span className="font-display text-4xl font-bold text-primary">
                  {getInitials(person.name)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-mono text-on-surface-variant">
              <span className="text-primary font-bold uppercase tracking-wider">
                {person.known_for_department}
              </span>
              {person.birthday && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{person.birthday}</span>
                  </span>
                </>
              )}
              {person.place_of_birth && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{person.place_of_birth}</span>
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-on-surface">
              {person.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-on-surface-variant tabular-nums">
              <span>{combinedCredits.length} Credits</span>
              <span>·</span>
              <span>{movieCount} Movies</span>
              <span>·</span>
              <span>{tvCount} TV Series</span>
            </div>

            {person.biography ? (
              <div className="space-y-2 max-w-3xl">
                <p
                  className={`text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line ${
                    !bioExpanded && hasLongBio ? "line-clamp-4" : ""
                  }`}
                >
                  {person.biography}
                </p>
                {hasLongBio && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {bioExpanded ? (
                      <>
                        <span>Show less</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Read full biography</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                No biography available for {person.name}.
              </p>
            )}
          </div>
        </section>

        {/* Filmography Controls */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base sm:text-lg font-bold text-on-surface">
                Filmography
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="theme-panel flex rounded-xl p-1"
                role="tablist"
                aria-label="Filter credits by media type"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaFilter === "all"}
                  onClick={() => setMediaFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                    mediaFilter === "all"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  All ({combinedCredits.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaFilter === "movie"}
                  onClick={() => setMediaFilter("movie")}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                    mediaFilter === "movie"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Film className="h-3 w-3" />
                  <span>Movies ({movieCount})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaFilter === "tv"}
                  onClick={() => setMediaFilter("tv")}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                    mediaFilter === "tv"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Tv className="h-3 w-3" />
                  <span>TV ({tvCount})</span>
                </button>
              </div>

              <div className="w-44">
                <CustomSelect
                  ariaLabel="Sort filmography"
                  value={sortBy}
                  onChange={(val) => setSortBy(val as CreditSort)}
                  align="right"
                  options={[
                    { value: "popularity", label: "Most Popular" },
                    { value: "newest", label: "Newest First" },
                    { value: "rating", label: "Top Rated" },
                  ]}
                  testId="person-credits-sort"
                />
              </div>
            </div>
          </div>

          {filteredCredits.length > 0 ? (
            <div className="zoku-poster-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCredits.slice(0, 48).map((credit) => (
                <div key={`${credit.media_type}-${credit.id}`} className="space-y-1.5">
                  <TitleCard
                    title={credit}
                    mediaType={credit.media_type === "tv" ? "tv" : "movie"}
                    fullWidth
                  />
                  {(credit.character || credit.job) && (
                    <p className="px-1 text-[11px] text-on-surface-variant truncate">
                      as <span className="text-on-surface font-medium">{credit.character || credit.job}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-custom bg-surface/20 py-16 text-center">
              <p className="text-sm font-semibold text-on-surface">No matching credits</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {isKidMode
                  ? "Some titles are hidden while Kids Mode is active."
                  : "Try switching the media filter above."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
