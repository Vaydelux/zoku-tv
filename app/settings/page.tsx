"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  Palette,
  ShieldCheck,
  LayoutGrid,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Trash2,
  Clapperboard,
  User,
  Activity,
  Gauge,
  Server,
} from "lucide-react";
import {
  useSessionStore,
  useEmbedStore,
  useContinueWatchingStore,
  useWatchHistoryStore,
  useDynamicIslandStore,
} from "@/stores";
import type { CatalogMode } from "@/lib/media-types";
import { Navbar } from "@/components/Navbar";
import { LoadingBanner } from "@/components/LoadingBanner";
import { ConfirmDialog } from "@/components/ui/Primitives";
import { ThemeStudioSection } from "@/components/settings/ThemeStudioSection";
import {
  CatalogModeSection,
  GenreRailsSection,
} from "@/components/settings/CatalogAndRailsSection";
import { ProfilesAndSafetySection } from "@/components/settings/ProfilesAndSafetySection";
import {
  IframeModeSection,
  CacheAndPrivacySection,
} from "@/components/settings/PlaybackAndCacheSection";
import { DiagnosticsSection } from "@/components/settings/DiagnosticsSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getGenres, TMDBGenre } from "@/lib/tmdb";
import { getDocRef, getDocumentForVerification, isCloudFirebaseActive } from "@/lib/firebase";
import { genrePreferencesMatch } from "@/lib/genre-preferences";
import { describeGenreSaveError } from "@/lib/firebase-save-errors";
import { setAdultFilterEnabled } from "@/lib/adult-content";
import {
  applyTheme,
  DEFAULT_APPEARANCE,
  getThemeOption,
  normalizeAppearance,
  normalizeThemeId,
  THEME_OPTIONS,
  type AppearanceMode,
  type ThemeCategory,
} from "@/lib/themes";
import {
  applyBackgroundPattern,
  DEFAULT_PATTERN_ID,
  getPatternOption,
  type BackgroundPatternId,
} from "@/lib/background-patterns";
import {
  readProfilePatternPreference,
  writePreAuthThemePreference,
  writeProfilePatternPreference,
} from "@/lib/preauth-theme";
import { usePerfMode, type PerfModePreference } from "@/hooks/usePerfMode";
import {
  probeGpuCapabilities,
  readStoredHardwareFlags,
  storeAndApplyHardwareFlags,
  GPU_FLAG_PRESETS,
  type GpuCapabilities,
  type HardwareAccelerationFlags,
} from "@/lib/gpu-diagnostics";

const GpuDiagnosticOverlay = dynamic(
  () => import("@/components/GpuDiagnosticOverlay").then((m) => m.GpuDiagnosticOverlay),
  { ssr: false }
);
const PerformanceDiagnosticsPanel = dynamic(
  () =>
    import("@/components/PerformanceDiagnosticsPanel").then(
      (m) => m.PerformanceDiagnosticsPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="liquid-glass-subtle h-64 w-full animate-pulse rounded-[22px]" />
    ),
  }
);
const DynamicServersPanel = dynamic(
  () => import("@/components/settings/DynamicServersPanel").then((m) => m.DynamicServersPanel),
  {
    ssr: false,
    loading: () => (
      <div className="liquid-glass-subtle h-72 w-full animate-pulse rounded-[22px]" />
    ),
  }
);

type SettingsSection =
  | "theme"
  | "catalog"
  | "genre-rails"
  | "profiles"
  | "servers"
  | "iframe-mode"
  | "cache"
  | "diagnostics"
  | "perf-diagnostics";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profiles, currentProfile, updateProfile } = useSessionStore();
  const { iframeMode, setIframeMode } = useEmbedStore();
  const clearContinueWatching = useContinueWatchingStore((s) => s.clearContinueWatching);
  const clearWatchHistory = useWatchHistoryStore((s) => s.clearHistory);
  const pushActivity = useDynamicIslandStore((s) => s.pushActivity);
  const {
    preference: perfPreference,
    is60FpsActive,
    isAutoDetectedTvOr32Bit,
    setPreference: setPerfPreference,
  } = usePerfMode();

  const [activeTab, setActiveTab] = useState<SettingsSection>("theme");
  useDocumentTitle("Settings");
  const [localAppearance, setLocalAppearance] = useState<AppearanceMode>(DEFAULT_APPEARANCE);
  const [localPattern, setLocalPattern] = useState<BackgroundPatternId>(DEFAULT_PATTERN_ID);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<"All" | ThemeCategory>("All");
  const [availableGenres, setAvailableGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [genrePreferencesDirty, setGenrePreferencesDirty] = useState(false);
  const [genreSaveError, setGenreSaveError] = useState<string | null>(null);
  const [genreSaveStatus, setGenreSaveStatus] = useState<"idle" | "writing" | "verifying">("idle");
  const editingGenreProfileId = useRef<string | null>(null);
  const [localIframeMode, setLocalIframeMode] = useState<"Strict" | "Compatibility">("Strict");
  const [localCatalogMode, setLocalCatalogMode] = useState<CatalogMode>("tmdb");
  const [saving, setSaving] = useState(false);
  const [adultFilterEnabled, setAdultFilterEnabledState] = useState(true);
  const [adultFilterBusy, setAdultFilterBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    null | "clear_cache" | "clear_history" | "clear_cw"
  >(null);
  const [isGpuOverlayOpen, setIsGpuOverlayOpen] = useState(false);
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [hardwareFlags, setHardwareFlags] = useState<HardwareAccelerationFlags>(() =>
    readStoredHardwareFlags()
  );

  useEffect(() => {
    let active = true;
    fetch("/api/adult-content", { cache: "no-store" })
      .then((response) => response.json())
      .then((state: { filterEnabled?: boolean }) => {
        if (active) setAdultFilterEnabledState(state.filterEnabled !== false);
      })
      .catch(() => {
        if (active) setAdultFilterEnabledState(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const caps = probeGpuCapabilities();
    setGpuCaps(caps);
    setHardwareFlags(readStoredHardwareFlags(caps.tier));
  }, []);

  useEffect(() => {
    const section = searchParams.get("section") as SettingsSection | null;
    if (
      section &&
      [
        "theme",
        "catalog",
        "genre-rails",
        "profiles",
        "servers",
        "iframe-mode",
        "cache",
        "diagnostics",
        "perf-diagnostics",
      ].includes(section)
    ) {
      setActiveTab(section);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !currentProfile) return;
    let cancelled = false;

    async function loadGenreOptions() {
      try {
        const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);
        if (cancelled) return;
        const combined = [...movieGenres, ...tvGenres].reduce((acc, curr) => {
          if (!acc.some((g) => g.id === curr.id)) acc.push(curr);
          return acc;
        }, [] as TMDBGenre[]);
        setAvailableGenres(combined);
        setLocalIframeMode(currentProfile?.iframeModePreference || iframeMode || "Strict");
        setLocalCatalogMode(currentProfile?.catalogMode || "tmdb");
        setLocalAppearance(
          normalizeAppearance(currentProfile?.appearancePreference ?? DEFAULT_APPEARANCE)
        );
        setLocalPattern(readProfilePatternPreference(currentProfile?.id));
      } catch (err) {
        console.error("Failed to load settings data:", err);
      }
    }

    void loadGenreOptions();
    return () => {
      cancelled = true;
    };
  }, [user, currentProfile?.id, iframeMode]);

  // Keep local draft polarity & catalog mode in sync when toggled from Navbar or Dynamic Island
  useEffect(() => {
    if (!currentProfile) return;
    setLocalAppearance(
      normalizeAppearance(currentProfile.appearancePreference ?? DEFAULT_APPEARANCE)
    );
    setLocalCatalogMode(currentProfile.catalogMode || "tmdb");
  }, [currentProfile?.appearancePreference, currentProfile?.catalogMode]);

  useEffect(() => {
    if (!currentProfile) return;
    if (editingGenreProfileId.current !== currentProfile.id) {
      editingGenreProfileId.current = currentProfile.id;
      setGenrePreferencesDirty(false);
      setGenreSaveError(null);
      setSelectedGenreIds(currentProfile.homeGenreRailPreferences ?? [28, 12, 35, 18]);
    } else if (!genrePreferencesDirty) {
      setSelectedGenreIds(currentProfile.homeGenreRailPreferences ?? [28, 12, 35, 18]);
    }
  }, [currentProfile?.id, currentProfile?.homeGenreRailPreferences, genrePreferencesDirty]);

  if (!user || !currentProfile) {
    return null;
  }

  const notifySuccess = (msg: string) => {
    setErrorMsg("");
    setSuccessMsg(msg);
    pushActivity("Settings Updated", { detail: msg, tone: "success" });
    setTimeout(() => setSuccessMsg(""), 3200);
  };

  const notifyError = (msg: string) => {
    setSuccessMsg("");
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const handleAdultFilterToggle = async () => {
    if (adultFilterBusy) return;
    setAdultFilterBusy(true);
    try {
      const response = await fetch("/api/adult-content", {
        method: adultFilterEnabled ? "POST" : "DELETE",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the filter");
      const next = result.filterEnabled !== false;
      setAdultFilterEnabledState(next);
      setAdultFilterEnabled(next);
      if (typeof window !== "undefined") {
        for (const storage of [sessionStorage, localStorage]) {
          for (const key of Object.keys(storage)) {
            if (key.startsWith("zoku_home_tmdb_") || key === "zoku_last_search_session_v1") {
              storage.removeItem(key);
            }
          }
        }
        window.location.reload();
      }
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Failed to update content filter.");
    } finally {
      setAdultFilterBusy(false);
    }
  };

  const handleThemeSelect = async (themeId: string) => {
    setSaving(true);
    try {
      const normalized = normalizeThemeId(themeId);
      await updateProfile(currentProfile.id, { themePreference: normalized });
      applyTheme(normalized, localAppearance);
      writePreAuthThemePreference(
        { themeId: normalized, appearance: localAppearance },
        { markForAuthHandoff: false }
      );
      notifySuccess(`Applied ${getThemeOption(normalized).name}`);
    } catch (err) {
      console.error(err);
      notifyError("Could not save theme preference.");
    } finally {
      setSaving(false);
    }
  };

  const handleAppearanceChange = async (mode: AppearanceMode) => {
    setLocalAppearance(mode);
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, { appearancePreference: mode });
      applyTheme(currentProfile.themePreference, mode);
      writePreAuthThemePreference(
        { themeId: normalizeThemeId(currentProfile.themePreference), appearance: mode },
        { markForAuthHandoff: false }
      );
      notifySuccess(mode === "light" ? "Switched to Light Glass" : "Switched to Dark Glass");
    } catch (err) {
      console.error(err);
      notifyError("Could not update appearance mode.");
    } finally {
      setSaving(false);
    }
  };

  const handlePatternSelect = (patternId: BackgroundPatternId) => {
    const saved = writeProfilePatternPreference(currentProfile.id, patternId);
    writePreAuthThemePreference({ patternId: saved }, { markForAuthHandoff: false });
    applyBackgroundPattern(saved);
    setLocalPattern(saved);
    notifySuccess(`Pattern: ${getPatternOption(saved).name}`);
  };

  const handleIframePreferenceChange = async (mode: "Strict" | "Compatibility") => {
    setLocalIframeMode(mode);
    setIframeMode(mode);
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, { iframeModePreference: mode });
      notifySuccess(`Iframe mode: ${mode}`);
    } catch (err) {
      console.error(err);
      notifyError("Could not update iframe sandbox preference.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenreToggle = (genreId: number) => {
    const next = selectedGenreIds.includes(genreId)
      ? selectedGenreIds.filter((id) => id !== genreId)
      : [...selectedGenreIds, genreId];
    setSelectedGenreIds(next);
    setGenreSaveError(null);
    setGenrePreferencesDirty(true);
  };

  const handleSelectAllGenres = () => {
    setSelectedGenreIds(availableGenres.map((g) => g.id));
    setGenreSaveError(null);
    setGenrePreferencesDirty(true);
  };

  const handleResetDefaultGenres = () => {
    const defaults = [28, 12, 16, 35, 80, 18].filter((id) =>
      availableGenres.some((g) => g.id === id)
    );
    setSelectedGenreIds(
      defaults.length > 0 ? defaults : availableGenres.slice(0, 6).map((g) => g.id)
    );
    setGenreSaveError(null);
    setGenrePreferencesDirty(true);
  };

  const saveGenrePreferences = async () => {
    if (saving) return;
    if (selectedGenreIds.length === 0) {
      notifyError("Please select at least 1 preferred genre rail.");
      return;
    }
    const uid = user.uid as string;
    const profileId = currentProfile.id;
    const expected = [...selectedGenreIds];
    setGenreSaveError(null);
    setGenreSaveStatus("writing");
    setSaving(true);
    let phase: "write" | "verify" = "write";
    try {
      if (isCloudFirebaseActive() && typeof navigator !== "undefined" && !navigator.onLine) {
        throw Object.assign(new Error("Network offline"), { code: "unavailable" });
      }
      await updateProfile(profileId, { homeGenreRailPreferences: expected });
      phase = "verify";
      setGenreSaveStatus("verifying");
      const docRef = getDocRef(`users/${uid}/profiles`, profileId);
      const { snapshot, source } = await getDocumentForVerification(docRef);
      const stored = snapshot.exists() ? snapshot.data()?.homeGenreRailPreferences : undefined;
      if (!genrePreferencesMatch(stored, expected)) {
        throw Object.assign(new Error("Readback differs"), { code: "verify-mismatch" });
      }
      if (editingGenreProfileId.current !== profileId || useSessionStore.getState().user?.uid !== uid) {
        return;
      }
      setGenrePreferencesDirty(false);
      notifySuccess(
        source === "firestore"
          ? "Genre rails verified in Firestore."
          : "Genre rails saved locally."
      );
    } catch (err) {
      console.error("Genre preference persistence verification failed", err);
      const diagnosis = describeGenreSaveError(err, phase);
      setGenreSaveError(`[${diagnosis.code}] ${diagnosis.message}`);
      notifyError(
        phase === "verify" ? "Cloud verification failed." : "Genre rail save failed."
      );
    } finally {
      setGenreSaveStatus("idle");
      setSaving(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      if (confirmAction === "clear_cache") {
        // Only clear Zoku catalog caches; preserve profiles, preferences and
        // unrelated applications' CacheStorage entries on the same origin.
        for (const storage of [localStorage, sessionStorage]) {
          const keys = Object.keys(storage).filter((key) =>
            key.startsWith("zoku_tmdb_cache_") ||
            key.startsWith("zoku_anilist_cache_") ||
            key.startsWith("zoku_home_tmdb_") ||
            key === "zoku_last_search_session_v1"
          );
          keys.forEach((key) => storage.removeItem(key));
        }
        if (typeof window !== "undefined" && "caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.filter((name) => name.startsWith("zoku-tv-")).map((name) => caches.delete(name)));
        }
        setConfirmAction(null);
        notifySuccess("Catalog & service-worker caches cleared!");
      } else if (confirmAction === "clear_history") {
        await clearWatchHistory();
        setConfirmAction(null);
        notifySuccess("Watch history cleared.");
      } else if (confirmAction === "clear_cw") {
        await clearContinueWatching();
        setConfirmAction(null);
        notifySuccess("Continue Watching cleared.");
      }
    } catch (err) {
      console.error("Failed destructive data operation:", err);
      notifyError("Operation could not complete.");
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogModeChange = async (mode: CatalogMode) => {
    setLocalCatalogMode(mode);
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, { catalogMode: mode });
      notifySuccess(`Catalog: ${mode === "anime" ? "Anime" : "Movies & TV"}`);
      setTimeout(() => router.push("/home"), 850);
    } catch (err) {
      console.error(err);
      notifyError("Failed to switch catalog mode.");
    } finally {
      setSaving(false);
    }
  };

  const handleKidModeToggle = async () => {
    setSaving(true);
    try {
      const nextKidMode = !currentProfile.kidMode;
      await updateProfile(currentProfile.id, { kidMode: nextKidMode });
      notifySuccess(nextKidMode ? "Kids Mode enabled." : "Kids Mode disabled.");
    } catch (err) {
      console.error(err);
      notifyError("Failed to update Kids Mode setting.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHardwareFlag = (key: keyof HardwareAccelerationFlags) => {
    const next: HardwareAccelerationFlags = { ...hardwareFlags, [key]: !hardwareFlags[key] };
    setHardwareFlags(next);
    storeAndApplyHardwareFlags(next);
    notifySuccess(`Flag ${next[key] ? "enabled" : "disabled"}`);
  };

  const handleApplyPreset = (presetKey: keyof typeof GPU_FLAG_PRESETS) => {
    const preset = GPU_FLAG_PRESETS[presetKey];
    setHardwareFlags(preset.flags);
    storeAndApplyHardwareFlags(preset.flags);
    notifySuccess(`Preset: ${preset.title}`);
  };

  const switchTab = (tab: SettingsSection) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tab);
    router.push(`/settings?${params.toString()}`);
  };

  const isAnimeCatalog = localCatalogMode === "anime";

  const navGroups: Array<{
    heading: string;
    items: Array<{
      id: SettingsSection;
      label: string;
      icon: typeof Palette;
      disabled?: boolean;
      testId?: string;
    }>;
  }> = [
    {
      heading: "Appearance & Browsing",
      items: [
        { id: "theme", label: `Liquid Glass (${THEME_OPTIONS.length})`, icon: Palette },
        { id: "catalog", label: "Browsing & Catalog", icon: Clapperboard },
        { id: "genre-rails", label: "Home Genre Rails", icon: LayoutGrid, disabled: isAnimeCatalog },
      ],
    },
    {
      heading: "Household & Playback",
      items: [
        { id: "profiles", label: "Profiles & Safety", icon: User },
        { id: "servers", label: "Playback Servers", icon: Server, testId: "tab-servers" },
        { id: "iframe-mode", label: "Playback Container", icon: ShieldCheck },
      ],
    },
    {
      heading: "System & Diagnostics",
      items: [
        { id: "cache", label: "Privacy & Data", icon: Trash2 },
        { id: "diagnostics", label: "GPU & Cloud", icon: Activity },
        { id: "perf-diagnostics", label: "Live Telemetry", icon: Gauge, testId: "tab-perf-diagnostics" },
      ],
    },
  ];

  return (
    <div className="zoku-cinematic-settings app-page-shell text-on-surface pb-16 transition-colors duration-300">
      {saving && <LoadingBanner message="Saving your settings..." />}
      <Navbar />

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Glass Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/home")}
            aria-label="Back to Home"
            className="liquid-glass-pill inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-on-surface tracking-tight flex items-center gap-2.5">
              <Settings className="h-6 w-6 text-primary" />
              <span>Settings</span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              Liquid Glass studio, household safety, playback servers, and enterprise diagnostics.
            </p>
          </div>
        </div>

        {successMsg && (
          <div
            role="status"
            className="liquid-glass rounded-2xl border-primary/40 px-4 py-3 text-xs text-primary font-semibold animate-fade-in flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="liquid-glass rounded-2xl border-red-500/40 px-4 py-3 text-xs text-red-400 font-semibold animate-fade-in flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Kakei-Style Frosted Split Sidebar + Content Layout */}
        <div className="zoku-settings-layout min-w-0">
          <nav aria-label="Settings sections" className="zoku-settings-nav liquid-glass">
            {navGroups.map((group) => (
              <div key={group.heading} className="contents lg:block lg:mb-3 last:lg:mb-0">
                <p className="hidden lg:block px-3 pb-1.5 pt-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/80">
                  {group.heading}
                </p>
                <div className="contents lg:flex lg:flex-col lg:gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={item.testId}
                        disabled={item.disabled}
                        onClick={() => switchTab(item.id)}
                        className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-left transition-all ${
                          active
                            ? "bg-primary text-primary-contrast shadow-md"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.06]"
                        } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="zoku-settings-content liquid-glass-elevated min-w-0">
            {activeTab === "theme" && (
              <ThemeStudioSection
                currentThemePreference={currentProfile.themePreference}
                localAppearance={localAppearance}
                localPattern={localPattern}
                themeCategoryFilter={themeCategoryFilter}
                saving={saving}
                perfPreference={perfPreference}
                is60FpsActive={is60FpsActive}
                isAutoDetectedTvOr32Bit={isAutoDetectedTvOr32Bit}
                gpuCaps={gpuCaps}
                onSelectCategory={setThemeCategoryFilter}
                onSelectTheme={(id) => void handleThemeSelect(id)}
                onSelectAppearance={(mode) => void handleAppearanceChange(mode)}
                onSelectPattern={handlePatternSelect}
                onSelectPerfMode={(pref: PerfModePreference, label: string) => {
                  setPerfPreference(pref);
                  notifySuccess(`Performance mode: ${label}`);
                }}
                onOpenGpuOverlay={() => setIsGpuOverlayOpen(true)}
              />
            )}

            {activeTab === "catalog" && (
              <CatalogModeSection
                localCatalogMode={localCatalogMode}
                onSelectCatalog={(mode) => void handleCatalogModeChange(mode)}
              />
            )}

            {activeTab === "genre-rails" && (
              <GenreRailsSection
                availableGenres={availableGenres}
                selectedGenreIds={selectedGenreIds}
                genrePreferencesDirty={genrePreferencesDirty}
                genreSaveStatus={genreSaveStatus}
                genreSaveError={genreSaveError}
                saving={saving}
                onToggleGenre={handleGenreToggle}
                onSelectAll={handleSelectAllGenres}
                onResetDefaults={handleResetDefaultGenres}
                onSave={() => void saveGenrePreferences()}
              />
            )}

            {activeTab === "profiles" && (
              <ProfilesAndSafetySection
                currentProfile={currentProfile}
                totalProfiles={profiles.length}
                saving={saving}
                adultFilterEnabled={adultFilterEnabled}
                adultFilterBusy={adultFilterBusy}
                onManageProfiles={() => router.push("/profiles")}
                onToggleKidMode={() => void handleKidModeToggle()}
                onToggleAdultFilter={() => void handleAdultFilterToggle()}
              />
            )}

            {activeTab === "iframe-mode" && (
              <IframeModeSection
                localIframeMode={localIframeMode}
                onChangeMode={(mode) => void handleIframePreferenceChange(mode)}
              />
            )}

            {activeTab === "cache" && (
              <CacheAndPrivacySection
                profileName={currentProfile.name}
                saving={saving}
                onRequestAction={setConfirmAction}
              />
            )}

            {activeTab === "diagnostics" && (
              <DiagnosticsSection
                userId={user.uid}
                profileId={currentProfile.id}
                gpuCaps={gpuCaps}
                hardwareFlags={hardwareFlags}
                onOpenGpuOverlay={() => setIsGpuOverlayOpen(true)}
                onApplyPreset={handleApplyPreset}
                onToggleFlag={handleToggleHardwareFlag}
                onOpenPerfTelemetry={() => switchTab("perf-diagnostics")}
              />
            )}

            {activeTab === "servers" && (
              <DynamicServersPanel
                onNotifySuccess={notifySuccess}
                onNotifyError={notifyError}
              />
            )}

            {activeTab === "perf-diagnostics" && <PerformanceDiagnosticsPanel />}
          </div>
        </div>
      </div>

      <GpuDiagnosticOverlay
        isOpen={isGpuOverlayOpen}
        onClose={() => {
          setIsGpuOverlayOpen(false);
          setHardwareFlags(readStoredHardwareFlags());
        }}
        onFlagsChanged={(next) => setHardwareFlags(next)}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === "clear_cache"
            ? "Clear Local Catalog Caches?"
            : confirmAction === "clear_history"
            ? `Clear ${currentProfile.name}'s Watch History?`
            : `Clear ${currentProfile.name}'s Continue Watching?`
        }
        description={
          confirmAction === "clear_cache"
            ? "Cached TMDB, AniList, and Service Worker assets will be evicted and refetched on next load. Your profile and watchlist remain untouched."
            : confirmAction === "clear_history"
            ? "This will permanently remove all watch history records for the active profile."
            : "This will remove all in-progress resume items from the Continue Watching rail for the active profile."
        }
        confirmLabel="Confirm Clear"
        cancelLabel="Cancel"
        destructive={confirmAction !== "clear_cache"}
        loading={saving}
        onConfirm={() => void executeConfirmedAction()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
