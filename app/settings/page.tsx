"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  Palette,
  ShieldCheck,
  LayoutGrid,
  Save,
  Sparkles,
  ArrowLeft,
  Check,
  AlertTriangle,
  Trash2,
  Tv,
  Clapperboard,
  Moon,
  Sun,
  User,
  Activity,
  Shield,
  Zap,
} from "lucide-react";
import {
  useSessionStore,
  useEmbedStore,
  useContinueWatchingStore,
  useWatchHistoryStore,
} from "@/stores";
import type { CatalogMode } from "@/lib/media-types";
import { Navbar } from "@/components/Navbar";
import { FirebaseStatusIndicator } from "@/components/FirebaseStatusIndicator";
import { LoadingBanner } from "@/components/LoadingBanner";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import { ConfirmDialog } from "@/components/ui/Primitives";
import { getGenres, TMDBGenre } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";
import {
  applyTheme,
  DEFAULT_APPEARANCE,
  getThemeOption,
  normalizeAppearance,
  normalizeThemeId,
  THEME_OPTIONS,
  type AppearanceMode,
} from "@/lib/themes";
import { usePerfMode } from "@/hooks/usePerfMode";

type SettingsSection =
  | "theme"
  | "catalog"
  | "genre-rails"
  | "profiles"
  | "iframe-mode"
  | "cache"
  | "diagnostics";

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
  const {
    preference: perfPreference,
    is60FpsActive,
    isAutoDetectedTvOr32Bit,
    setPreference: setPerfPreference,
  } = usePerfMode();

  const [activeTab, setActiveTab] = useState<SettingsSection>("theme");
  const [localAppearance, setLocalAppearance] = useState<AppearanceMode>(DEFAULT_APPEARANCE);
  const [availableGenres, setAvailableGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [localIframeMode, setLocalIframeMode] = useState<"Strict" | "Compatibility">("Strict");
  const [localCatalogMode, setLocalCatalogMode] = useState<CatalogMode>("tmdb");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    null | "clear_cache" | "clear_history" | "clear_cw"
  >(null);

  useEffect(() => {
    const section = searchParams.get("section") as SettingsSection | null;
    if (
      section &&
      [
        "theme",
        "catalog",
        "genre-rails",
        "profiles",
        "iframe-mode",
        "cache",
        "diagnostics",
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
        const [movieGenres, tvGenres] = await Promise.all([
          getGenres("movie"),
          getGenres("tv"),
        ]);
        if (cancelled) return;
        const combined = [...movieGenres, ...tvGenres].reduce((acc, curr) => {
          if (!acc.some((g) => g.id === curr.id)) acc.push(curr);
          return acc;
        }, [] as TMDBGenre[]);

        setAvailableGenres(combined);
        setSelectedGenreIds(currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18]);
        setLocalIframeMode(currentProfile?.iframeModePreference || iframeMode || "Strict");
        setLocalCatalogMode(currentProfile?.catalogMode || "tmdb");
        setLocalAppearance(
          normalizeAppearance(currentProfile?.appearancePreference ?? DEFAULT_APPEARANCE)
        );
      } catch (err) {
        console.error("Failed to load settings data:", err);
      }
    }

    loadGenreOptions();

    return () => {
      cancelled = true;
    };
  }, [user, currentProfile, iframeMode]);

  if (!user || !currentProfile) {
    return null;
  }

  const notifySuccess = (msg: string) => {
    setErrorMsg("");
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3200);
  };

  const notifyError = (msg: string) => {
    setSuccessMsg("");
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const handleThemeSelect = async (themeId: string) => {
    setSaving(true);
    try {
      const normalized = normalizeThemeId(themeId);
      await updateProfile(currentProfile.id, {
        themePreference: normalized,
      });
      applyTheme(normalized, localAppearance);
      notifySuccess(`Applied ${getThemeOption(normalized).name} theme!`);
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
      await updateProfile(currentProfile.id, {
        appearancePreference: mode,
      });
      applyTheme(currentProfile.themePreference, mode);
      notifySuccess(`Switched to ${mode === "light" ? "light" : "dark"} mode`);
    } catch (err) {
      console.error(err);
      notifyError("Could not update appearance mode.");
    } finally {
      setSaving(false);
    }
  };

  const handleIframePreferenceChange = async (mode: "Strict" | "Compatibility") => {
    setLocalIframeMode(mode);
    setIframeMode(mode);
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, {
        iframeModePreference: mode,
      });
      notifySuccess(`Default iframe sandbox mode configured to: ${mode}!`);
    } catch (err) {
      console.error(err);
      notifyError("Could not update iframe sandbox preference.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenreCheckboxToggle = (genreId: number) => {
    let nextGenres = [...selectedGenreIds];
    if (nextGenres.includes(genreId)) {
      nextGenres = nextGenres.filter((id) => id !== genreId);
    } else {
      nextGenres.push(genreId);
    }
    setSelectedGenreIds(nextGenres);
  };

  const handleSelectAllGenres = () => {
    setSelectedGenreIds(availableGenres.map((g) => g.id));
  };

  const handleResetDefaultGenres = () => {
    const defaults = [28, 12, 16, 35, 80, 18].filter((id) =>
      availableGenres.some((g) => g.id === id)
    );
    setSelectedGenreIds(defaults.length > 0 ? defaults : availableGenres.slice(0, 6).map((g) => g.id));
  };

  const saveGenrePreferences = async () => {
    if (selectedGenreIds.length === 0) {
      notifyError("Please select at least 1 preferred genre rail.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, {
        homeGenreRailPreferences: selectedGenreIds,
      });
      notifySuccess("Preferred genre rails saved!");
    } catch (err) {
      console.error(err);
      notifyError("Failed to save genre rails.");
    } finally {
      setSaving(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      if (confirmAction === "clear_cache") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("zoku_tmdb_cache_") ||
              key.startsWith("zoku_anilist_cache_") ||
              key.includes("cache"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        if (typeof window !== "undefined" && "caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
        setConfirmAction(null);
        notifySuccess("Catalog & service-worker caches cleared!");
      } else if (confirmAction === "clear_history") {
        await clearWatchHistory();
        setConfirmAction(null);
        notifySuccess("Watch history cleared for this profile.");
      } else if (confirmAction === "clear_cw") {
        await clearContinueWatching();
        setConfirmAction(null);
        notifySuccess("Continue Watching queue cleared for this profile.");
      }
    } catch (err) {
      console.error("Failed destructive data operation:", err);
      notifyError("Operation could not complete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogModeChange = async (mode: CatalogMode) => {
    setLocalCatalogMode(mode);
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, { catalogMode: mode });
      notifySuccess(`Content catalog switched to ${mode === "anime" ? "Anime" : "Movies & TV"}!`);
      setTimeout(() => {
        router.push("/home");
      }, 900);
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
      notifySuccess(
        nextKidMode
          ? "Kids Mode enabled for this profile."
          : "Kids Mode disabled for this profile."
      );
    } catch (err) {
      console.error(err);
      notifyError("Failed to update Kids Mode setting.");
    } finally {
      setSaving(false);
    }
  };

  const isAnimeCatalog = localCatalogMode === "anime";

  function switchTab(tab: SettingsSection) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tab);
    router.push(`/settings?${params.toString()}`);
  }

  return (
    <div className="app-page-shell text-on-surface pb-16 transition-colors duration-300">
      {saving && <LoadingBanner message="Saving your settings..." />}
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/home")}
            aria-label="Back to Home"
            className="theme-panel p-2 rounded-xl hover:bg-surface-hover text-on-surface hover:text-primary transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-on-surface uppercase tracking-wide flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <span>Portal Settings</span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              Configure appearance, browsing preferences, profiles, playback containment, privacy, and diagnostics.
            </p>
          </div>
        </div>

        {successMsg && (
          <div
            role="status"
            className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-xs text-primary font-semibold animate-fade-in flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 text-xs text-red-400 font-semibold animate-fade-in flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 items-start pt-2">
          {/* Structured Settings Navigation */}
          <div className="glass-panel w-full md:w-64 flex flex-col gap-1.5 shrink-0 rounded-2xl p-4">
            <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Appearance & Browsing
            </p>
            <button
              onClick={() => switchTab("theme")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "theme"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Appearance & 18 Themes</span>
            </button>

            <button
              onClick={() => switchTab("catalog")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "catalog"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Clapperboard className="h-4 w-4" />
              <span>Browsing & Catalog</span>
            </button>

            <button
              onClick={() => switchTab("genre-rails")}
              disabled={isAnimeCatalog}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "genre-rails"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              } ${isAnimeCatalog ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Home Genre Rails</span>
            </button>

            <p className="px-2 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Household & Playback
            </p>
            <button
              onClick={() => switchTab("profiles")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "profiles"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Profiles & Kids Mode</span>
            </button>

            <button
              onClick={() => switchTab("iframe-mode")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "iframe-mode"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Playback Container</span>
            </button>

            <p className="px-2 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              System & Privacy
            </p>
            <button
              onClick={() => switchTab("cache")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "cache"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span>Privacy & Data</span>
            </button>

            <button
              onClick={() => switchTab("diagnostics")}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "diagnostics"
                  ? "bg-primary text-primary-contrast"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Diagnostics</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="glass-panel flex-1 w-full rounded-2xl p-6 sm:p-8 shadow-xl min-h-[420px]">
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    Appearance & 18-Theme Cinema Canvas
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Pick a palette, then choose light or dark. Gradients tint the page while text stays high-contrast.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                    Appearance Mode
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => handleAppearanceChange("dark")}
                      disabled={saving}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        localAppearance === "dark"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border-custom bg-background/40 hover:border-primary/50"
                      }`}
                    >
                      <Moon className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface">Dark</p>
                        <p className="text-[10px] text-on-surface-variant">Cinematic night shell</p>
                      </div>
                      {localAppearance === "dark" && (
                        <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppearanceChange("light")}
                      disabled={saving}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        localAppearance === "light"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border-custom bg-background/40 hover:border-primary/50"
                      }`}
                    >
                      <Sun className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface">Light</p>
                        <p className="text-[10px] text-on-surface-variant">Bright day shell</p>
                      </div>
                      {localAppearance === "light" && (
                        <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 60fps Butter Smoothness & 32-Bit Android TV / Virtual Mouse Mode */}
                <div
                  data-testid="settings-perf-mode-card"
                  className="rounded-2xl border border-border-custom bg-background/40 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-primary" />
                        <span>60fps Butter Mode &amp; Android TV / Downloader Optimization</span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Uses GPU-composited transform/opacity pipelines, zero-repaint backgrounds, and virtual-mouse rail controls for 32-bit Android TV and Downloader by AFTVnews.
                      </p>
                    </div>
                    <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                      {is60FpsActive ? "60fps Active" : "Standard"}
                      {isAutoDetectedTvOr32Bit ? " · TV/32-Bit Detected" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        {
                          id: "auto",
                          label: "Auto (TV / 32-Bit)",
                          desc: "Auto-enables on Android TV, Fire TV & Downloader",
                        },
                        {
                          id: "60fps",
                          label: "Always 60fps Butter",
                          desc: "Force maximum GPU compositing on any device",
                        },
                        {
                          id: "standard",
                          label: "Standard Desktop",
                          desc: "Full multi-layer glass blurs & ambient orbs",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = perfPreference === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-testid={`settings-perf-mode-${opt.id}`}
                          onClick={() => {
                            setPerfPreference(opt.id);
                            notifySuccess(`Performance mode set to ${opt.label}`);
                          }}
                          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-[transform,border-color,background-color] duration-150 ${
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border-custom bg-background/40 hover:border-primary/50"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-on-surface">
                              {opt.label}
                            </span>
                            {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>
                          <span className="mt-1 text-[10px] text-on-surface-variant leading-snug">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {THEME_OPTIONS.map((theme) => {
                    const isActive =
                      normalizeThemeId(currentProfile.themePreference) === theme.id;
                    const previewTokens =
                      localAppearance === "light" ? theme.lightTokens : theme.tokens;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme.id)}
                        disabled={saving}
                        className={`group flex flex-col items-start p-4 rounded-xl border text-left transition-all relative overflow-hidden min-h-[114px] ${
                          isActive
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border-custom hover:border-primary bg-background/45 hover:bg-background/70"
                        }`}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-2"
                          style={{ backgroundImage: previewTokens.buttonGradient }}
                          aria-hidden
                        />
                        <div className="flex items-center justify-between w-full gap-2 pt-2">
                          <span className="text-xs sm:text-sm font-semibold text-on-surface">
                            {theme.name}
                          </span>
                          {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                          {theme.hint}
                        </p>
                        <div className="flex gap-1 mt-3 w-full h-3 rounded-md overflow-hidden border border-white/10">
                          <div
                            className="flex-[3]"
                            style={{ backgroundImage: previewTokens.buttonGradient }}
                          />
                          <div
                            className="flex-[4]"
                            style={{ backgroundImage: previewTokens.backgroundGradient }}
                          />
                          <div
                            className="flex-[2]"
                            style={{ backgroundColor: previewTokens.onSurface }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "catalog" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    Browsing & Content Catalog Mode
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Choose which primary catalog this profile browses on Home and Discover.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => handleCatalogModeChange("tmdb")}
                    className={`w-full text-left p-5 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                      localCatalogMode === "tmdb"
                        ? "border-primary bg-primary/5"
                        : "border-border-custom hover:border-primary/40 bg-background/40"
                    }`}
                  >
                    <Tv className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">
                          Movies & TV (TMDB)
                        </h3>
                        {localCatalogMode === "tmdb" && (
                          <span className="text-[9px] bg-primary text-primary-contrast font-bold px-1.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Browse trending movies and TV series from TMDB with multi-server embed playback.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCatalogModeChange("anime")}
                    className={`w-full text-left p-5 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                      localCatalogMode === "anime"
                        ? "border-primary bg-primary/5"
                        : "border-border-custom hover:border-primary/40 bg-background/40"
                    }`}
                  >
                    <Clapperboard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">
                          Anime (AniList)
                        </h3>
                        {localCatalogMode === "anime" && (
                          <span className="text-[9px] bg-primary text-primary-contrast font-bold px-1.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Browse anime from AniList with multi-server anime embeds (Filmu default). Seasons and episodes are sourced from AniList metadata.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "genre-rails" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-on-surface">
                      Home Genre Channels Selection
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Select any or all genre categories to display on your home dashboard (cached &amp; batch-optimized for zero lag).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllGenres}
                      disabled={
                        availableGenres.length > 0 &&
                        selectedGenreIds.length === availableGenres.length
                      }
                      data-testid="select-all-genres-btn"
                      className="rounded-xl border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-all disabled:opacity-45"
                    >
                      Select All ({availableGenres.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefaultGenres}
                      data-testid="reset-default-genres-btn"
                      className="rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:text-on-surface transition-all"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2 border border-border-custom rounded-xl bg-background/40">
                  {availableGenres.map((g) => {
                    const isChecked = selectedGenreIds.includes(g.id);
                    const GenreIcon = getGenreIcon(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGenreCheckboxToggle(g.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                          isChecked
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border-custom hover:border-primary text-on-surface-variant hover:text-on-surface bg-background/20"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <GenreIcon
                            className={`h-4 w-4 shrink-0 ${
                              isChecked ? "text-primary" : "text-on-surface-variant"
                            }`}
                          />
                          <span>{g.name}</span>
                        </span>
                        <div
                          className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                            isChecked
                              ? "bg-primary border-primary text-primary-contrast"
                              : "border-border-custom"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-custom">
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Selected: <strong className="text-primary">{selectedGenreIds.length}</strong> / {availableGenres.length} Genres (No Limit)
                  </span>
                  <button
                    onClick={saveGenrePreferences}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-opacity-95 text-primary-contrast py-2.5 px-5 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Rail Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "profiles" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    Active Profile & Kids Mode Controls
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage your current profile settings or switch to another household portal.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border-custom bg-background/40 p-5">
                  <div className="flex items-center gap-4">
                    <ProfileAvatarDisplay
                      avatar={currentProfile.avatar}
                      avatarColor={currentProfile.avatarColor}
                      name={currentProfile.name}
                      size="md"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-on-surface">
                          {currentProfile.name}
                        </h3>
                        {currentProfile.kidMode && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-300 border border-amber-500/40">
                            <Shield className="h-2.5 w-2.5" />
                            <span>Kids</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Active Household Portal ({profiles.length} total profiles)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/profiles")}
                    className="theme-panel rounded-xl px-4 py-2.5 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors"
                  >
                    Switch or Edit All Profiles
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-custom bg-background/30 p-5">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-400" />
                      <span>Kids Experience Protection</span>
                    </h4>
                    <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                      When enabled, mature R/TV-MA content and restricted genres (Horror, Crime, Thriller, War, Ecchi, Psychological) are filtered out of Home, Discover, Search, Details, and Watch routes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleKidModeToggle}
                    disabled={saving}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                      currentProfile.kidMode
                        ? "bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        : "bg-primary text-primary-contrast hover:brightness-110"
                    }`}
                  >
                    {currentProfile.kidMode ? "Disable Kids Mode" : "Enable Kids Mode"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "iframe-mode" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    Playback Container Sandbox Mode
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage external iframe shielding rules. Protects your browser from unwanted redirects or popups while treating the embedded player as an external black box.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => handleIframePreferenceChange("Strict")}
                    className={`w-full text-left p-5 rounded-xl border cursor-pointer transition-all space-y-2 flex items-start gap-4 ${
                      localIframeMode === "Strict"
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-border-custom hover:border-primary/40 bg-background/40"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">
                          Strict Mode (Containment Shield)
                        </h3>
                        {localIframeMode === "Strict" && (
                          <span className="text-[9px] bg-emerald-500 text-neutral-950 font-bold px-1.5 rounded">
                            Active Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Applies HTML5 sandbox directives (
                        <code className="font-mono text-[10px]">
                          allow-scripts allow-same-origin allow-forms allow-presentation
                        </code>
                        ). Prevents intrusive advertisements from opening popup windows or forcing top-level redirects.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleIframePreferenceChange("Compatibility")}
                    className={`w-full text-left p-5 rounded-xl border cursor-pointer transition-all space-y-2 flex items-start gap-4 ${
                      localIframeMode === "Compatibility"
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-border-custom hover:border-primary/40 bg-background/40"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">
                          Compatibility Mode (Relaxed Rules)
                        </h3>
                        {localIframeMode === "Compatibility" && (
                          <span className="text-[9px] bg-amber-500 text-neutral-950 font-bold px-1.5 rounded">
                            Active Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Omits HTML5 sandbox restrictions for third-party providers that explicitly reject sandboxed iframes. Recommended only when a provider refuses to initialize under Strict Mode.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "cache" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    Privacy, Viewing Data & Local Caches
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage your profile-scoped viewing data and public catalog metadata caches.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border-custom bg-background/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-on-surface">
                        Clear Continue Watching Queue
                      </h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Remove all in-progress resume points for {currentProfile.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction("clear_cw")}
                      disabled={saving}
                      className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-2.5 px-4 text-xs font-semibold transition-all"
                    >
                      Clear Continue Watching
                    </button>
                  </div>

                  <div className="rounded-xl border border-border-custom bg-background/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-on-surface">
                        Clear Profile Watch History
                      </h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Permanently clear watched titles and completion logs for {currentProfile.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction("clear_history")}
                      disabled={saving}
                      className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-2.5 px-4 text-xs font-semibold transition-all"
                    >
                      Clear Watch History
                    </button>
                  </div>

                  <div className="rounded-xl border border-border-custom bg-background/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-on-surface">
                        Force Refresh Catalog & Service Worker Cache
                      </h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Evict cached TMDB/AniList responses and Service Worker static caches without deleting your profile or watchlist.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction("clear_cache")}
                      disabled={saving}
                      className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-contrast py-2.5 px-5 text-xs font-bold transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear Local Caches</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">
                    System & Cloud Diagnostics
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Inspect Firebase connectivity, security rules verification, and active session scope.
                  </p>
                </div>

                <FirebaseStatusIndicator userId={user.uid} profileId={currentProfile.id} />
              </div>
            )}
          </div>
        </div>
      </div>

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
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
