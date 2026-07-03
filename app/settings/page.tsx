"use client";

import { useEffect, useState } from "react";
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
  Eye,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { useSessionStore, useEmbedStore } from "@/stores";
import { Navbar } from "@/components/Navbar";
import { FirebaseStatusIndicator } from "@/components/FirebaseStatusIndicator";
import { LoadingBanner } from "@/components/LoadingBanner";
import { getGenres, TMDBGenre } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";
import { applyTheme, getThemeOption, normalizeThemeId, THEME_OPTIONS } from "@/lib/themes";

import { Suspense } from "react";

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, currentProfile, updateProfile } = useSessionStore();
  const { iframeMode, setIframeMode } = useEmbedStore();

  const [activeTab, setActiveTab] = useState<"theme" | "iframe-mode" | "genre-rails" | "cache">("theme");
  const [availableGenres, setAvailableGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [localIframeMode, setLocalIframeMode] = useState<"Strict" | "Compatibility">("Strict");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Parse URL if they navigated to subroutes via query
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "theme" || section === "iframe-mode" || section === "genre-rails" || section === "cache") {
      setActiveTab(section as any);
    }
  }, [searchParams]);

  // Load available genres & profile preferences
  useEffect(() => {
    if (!user || !currentProfile) return;

    async function loadGenreOptions() {
      try {
        const movieGenres = await getGenres("movie");
        const tvGenres = await getGenres("tv");
        const combined = [...movieGenres, ...tvGenres].reduce((acc, curr) => {
          if (!acc.some(g => g.id === curr.id)) acc.push(curr);
          return acc;
        }, [] as TMDBGenre[]);

        setAvailableGenres(combined);
        setSelectedGenreIds(currentProfile?.homeGenreRailPreferences || [28, 12, 35, 18]);
        setLocalIframeMode(currentProfile?.iframeModePreference || iframeMode || "Strict");
      } catch (err) {
        console.error("Failed to load settings data:", err);
      }
    }

    loadGenreOptions();
  }, [user, currentProfile, iframeMode]);

  const handleThemeSelect = async (themeId: string) => {
    setSaving(true);
    try {
      const normalized = normalizeThemeId(themeId);
      await updateProfile(currentProfile.id, {
        themePreference: normalized,
      });
      applyTheme(normalized);

      setSuccessMsg(`Applied ${getThemeOption(normalized).name} theme!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
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
      setSuccessMsg(`Default iframe sandbox mode configured to: ${mode}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenreCheckboxToggle = (genreId: number) => {
    let nextGenres = [...selectedGenreIds];
    if (nextGenres.includes(genreId)) {
      nextGenres = nextGenres.filter(id => id !== genreId);
    } else {
      if (nextGenres.length >= 6) {
        alert("You can select up to 6 custom genre rails to keep home dashboard loading fast!");
        return;
      }
      nextGenres.push(genreId);
    }
    setSelectedGenreIds(nextGenres);
  };

  const saveGenrePreferences = async () => {
    if (selectedGenreIds.length === 0) {
      alert("Please select at least 1 preferred genre rail.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(currentProfile.id, {
        homeGenreRailPreferences: selectedGenreIds,
      });
      setSuccessMsg("Preferred genre rails saved! Refreshing dashboards...");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setSaving(true);
    try {
      // 1. Clear TMDB caches from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("zoku_tmdb_cache_") || key.includes("cache"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // 2. Clear Service Worker Cache if available
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setSuccessMsg("System & TMDB media caches successfully cleared! Reloading dashboard...");
      setTimeout(() => {
        setSuccessMsg("");
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Failed to clear system cache:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16 transition-colors duration-300">
      {saving && <LoadingBanner message="Saving your settings..." />}
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation back */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/home")}
            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-custom text-on-surface hover:text-primary transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-on-surface uppercase tracking-wide flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <span>Portal Settings</span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              Configure layout aesthetics, sandbox layers, and preferred genre channels.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-xs text-primary font-semibold animate-fade-in flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <FirebaseStatusIndicator userId={user.uid} profileId={currentProfile.id} />

        {/* Custom Tabbed layout panel */}
        <div className="flex flex-col md:flex-row gap-8 items-start pt-4">
          
          {/* Sub-nav Sidebar tabs */}
          <div className="w-full md:w-64 flex flex-col gap-1.5 shrink-0 rounded-2xl border border-border-custom bg-surface/30 p-4">
            <button
              onClick={() => { setActiveTab("theme"); applyFiltersQuery("theme"); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "theme" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Palette className="h-4.5 w-4.5" />
              <span>18-Theme Canvas</span>
            </button>

            <button
              onClick={() => { setActiveTab("iframe-mode"); applyFiltersQuery("iframe-mode"); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "iframe-mode" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>IFrame Sandbox Mode</span>
            </button>

            <button
              onClick={() => { setActiveTab("genre-rails"); applyFiltersQuery("genre-rails"); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "genre-rails" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <LayoutGrid className="h-4.5 w-4.5" />
              <span>Home Genre Rails</span>
            </button>

            <button
              onClick={() => { setActiveTab("cache"); applyFiltersQuery("cache"); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === "cache" ? "bg-primary text-primary-contrast" : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" />
              <span>Data & Local Cache</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 w-full rounded-2xl border border-border-custom bg-surface p-6 sm:p-8 shadow-xl min-h-[400px]">
            
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">Cinema Colors Presets</h2>
                  <p className="text-xs text-on-surface-variant">
                    Pick from 18 bespoke cinematic stylesheets. Applies instantly to your active profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {THEME_OPTIONS.map((theme) => {
                    const isActive = normalizeThemeId(currentProfile.themePreference) === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme.id)}
                        disabled={saving}
                        className={`group flex flex-col items-start p-4 rounded-xl border text-left transition-all relative overflow-hidden min-h-[108px] ${
                          isActive
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border-custom hover:border-primary bg-background/40 hover:bg-background/65"
                        }`}
                      >
                        <div className={`absolute inset-x-0 top-0 h-1.5 ${theme.preview}`} aria-hidden />
                        <div className="flex items-center justify-between w-full gap-2 pt-2">
                          <span className="text-xs sm:text-sm font-semibold text-on-surface">{theme.name}</span>
                          {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                          {theme.hint}
                        </p>
                        <div className="flex gap-1 mt-3 w-full h-2 rounded overflow-hidden bg-black/20">
                          <div className="flex-[2]" style={{ backgroundColor: theme.tokens.primary }} />
                          <div className="flex-[2]" style={{ backgroundColor: theme.tokens.background }} />
                          <div className="flex-[3]" style={{ backgroundColor: theme.tokens.onSurface }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "iframe-mode" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">Default Containment Sandbox Mode</h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage iframe shielding rules. Protects your device from unwanted redirects, popups, or tracking cookies.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Strict Mode details */}
                  <div 
                    onClick={() => handleIframePreferenceChange("Strict")}
                    className={`p-5 rounded-xl border cursor-pointer transition-all space-y-2 flex items-start gap-4 ${
                      localIframeMode === "Strict" 
                        ? "border-emerald-500 bg-emerald-500/5" 
                        : "border-border-custom hover:border-white/20 bg-background/40"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">Strict Mode (Containment Shield)</h3>
                        {localIframeMode === "Strict" && <span className="text-[9px] bg-emerald-500 text-neutral-950 font-bold px-1.5 rounded">Active Default</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Applies HTML5 sandbox directives (<code className="font-mono text-[10px]">allow-scripts allow-same-origin allow-forms</code>). Prevents intrusive advertisements from escaping the frame, creating new window tabs, or forcing browser redirects. 
                      </p>
                    </div>
                  </div>

                  {/* Compatibility Mode details */}
                  <div 
                    onClick={() => handleIframePreferenceChange("Compatibility")}
                    className={`p-5 rounded-xl border cursor-pointer transition-all space-y-2 flex items-start gap-4 ${
                      localIframeMode === "Compatibility" 
                        ? "border-amber-500 bg-amber-500/5" 
                        : "border-border-custom hover:border-white/20 bg-background/40"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-on-surface">Compatibility Mode (Relaxed Rules)</h3>
                        {localIframeMode === "Compatibility" && <span className="text-[9px] bg-amber-500 text-neutral-950 font-bold px-1.5 rounded">Active Default</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Removes HTML5 sandboxing containment. Best for legacy devices or servers that fail to load scripts inside contained spaces, but allows popup ads and tracking cookies. Highly advised to use with standard browser ad blockers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "genre-rails" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">Home Genre Channels Selection</h2>
                  <p className="text-xs text-on-surface-variant">
                    Pick up to 6 genre categories to show on your home dashboard. Tailored exclusively for this profile.
                  </p>
                </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2 border border-border-custom rounded-xl bg-background/40">
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
                          <GenreIcon className={`h-4 w-4 shrink-0 ${isChecked ? "text-primary" : "text-on-surface-variant"}`} />
                          <span>{g.name}</span>
                        </span>
                        <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                          isChecked ? "bg-primary border-primary text-primary-contrast" : "border-border-custom"
                        }`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-custom">
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    Selected: {selectedGenreIds.length} / 6 Genres
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

            {activeTab === "cache" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-on-surface">Data & Offline Caching</h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage your locally stored TMDB metadata, active theme preference cache, and offline service worker storage.
                  </p>
                </div>

                <div className="rounded-xl border border-border-custom bg-background/20 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-on-surface">Force Refresh Cache</h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        If you are seeing outdated titles, broken media streams, or offline states, clearing your local caches will force Zoku TV to reload the latest official channels directly from TMDB servers.
                      </p>
                    </div>
                  </div>

                  <div className="flex pt-2">
                    <button
                      onClick={handleClearCache}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-95 text-primary-contrast py-3 px-6 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear Local Caches</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );

  function applyFiltersQuery(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tab);
    router.push(`/settings?${params.toString()}`);
  }
}
