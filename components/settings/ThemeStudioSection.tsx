"use client";

import { Activity, Check, Monitor, Moon, Sun, Zap } from "lucide-react";
import {
  getThemeOption,
  normalizeThemeId,
  THEME_CATEGORIES,
  THEME_OPTIONS,
  type AppearanceMode,
  type ThemeCategory,
} from "@/lib/themes";
import {
  BACKGROUND_PATTERN_OPTIONS,
  getPatternOption,
  type BackgroundPatternId,
} from "@/lib/background-patterns";
import type { GpuCapabilities } from "@/lib/gpu-diagnostics";
import type { PerfModePreference } from "@/hooks/usePerfMode";

interface ThemeStudioSectionProps {
  currentThemePreference: string;
  localAppearance: AppearanceMode;
  localPattern: BackgroundPatternId;
  themeCategoryFilter: "All" | ThemeCategory;
  saving: boolean;
  perfPreference: PerfModePreference;
  is60FpsActive: boolean;
  isAutoDetectedTvOr32Bit: boolean;
  gpuCaps: GpuCapabilities | null;
  onSelectCategory: (cat: "All" | ThemeCategory) => void;
  onSelectTheme: (themeId: string) => void;
  onSelectAppearance: (mode: AppearanceMode) => void;
  onSelectPattern: (patternId: BackgroundPatternId) => void;
  onSelectPerfMode: (pref: PerfModePreference, label: string) => void;
  onOpenGpuOverlay: () => void;
}

export function ThemeStudioSection({
  currentThemePreference,
  localAppearance,
  localPattern,
  themeCategoryFilter,
  saving,
  perfPreference,
  is60FpsActive,
  isAutoDetectedTvOr32Bit,
  gpuCaps,
  onSelectCategory,
  onSelectTheme,
  onSelectAppearance,
  onSelectPattern,
  onSelectPerfMode,
  onOpenGpuOverlay,
}: ThemeStudioSectionProps) {
  const activeThemeOption = getThemeOption(currentThemePreference);
  const activeThemeTokens =
    localAppearance === "light" ? activeThemeOption.lightTokens : activeThemeOption.tokens;
  const activePatternOption = getPatternOption(localPattern);
  const visibleThemes =
    themeCategoryFilter === "All"
      ? THEME_OPTIONS
      : THEME_OPTIONS.filter((t) => t.category === themeCategoryFilter);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          iOS Liquid Glass &amp; {THEME_OPTIONS.length}-Theme Studio
        </h2>
        <p className="text-xs text-on-surface-variant">
          Pair any Liquid Glass palette with Dark Obsidian or Crystalline Light mode and a theme-matched canvas pattern.
        </p>
      </div>

      {/* Live Liquid Glass Canvas Preview */}
      <div
        data-testid="settings-live-theme-preview"
        className="relative overflow-hidden rounded-[24px] border border-[var(--glass-border-strong)] p-5 shadow-lg"
        style={{
          backgroundColor: activeThemeTokens.background,
          backgroundImage:
            activePatternOption.id === "none"
              ? activeThemeTokens.backgroundGradient
              : `${activePatternOption.previewImage}, ${activeThemeTokens.backgroundGradient}`,
          backgroundSize:
            activePatternOption.id === "none" ? "cover" : `${activePatternOption.previewSize}, cover`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ backgroundImage: activeThemeTokens.buttonGradient }}
        />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Active Canvas · {activeThemeOption.category} · {localAppearance === "light" ? "Light Glass" : "Dark Glass"}
            </p>
            <h3 className="text-sm sm:text-base font-display font-bold text-on-surface truncate">
              {activeThemeOption.name} + {activePatternOption.name}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xl">
              {activeThemeOption.hint} — {activePatternOption.hint}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold shadow-md"
              style={{
                backgroundImage: activeThemeTokens.buttonGradient,
                color: activeThemeTokens.primaryContrast,
              }}
            >
              Liquid Accent
            </span>
            <span
              className="inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium backdrop-blur-xl"
              style={{
                backgroundColor: activeThemeTokens.surface,
                borderColor: activeThemeTokens.borderColor,
                color: activeThemeTokens.onSurface,
              }}
            >
              Glass Card
            </span>
          </div>
        </div>
      </div>

      {/* Appearance Mode Segmented Cards */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
          Glass Polarity
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {(
            [
              { id: "dark", label: "Dark Glass", sub: "Obsidian frosted depth", icon: Moon },
              { id: "light", label: "Light Glass", sub: "Crystalline mist sheet", icon: Sun },
            ] as const
          ).map((mode) => {
            const Icon = mode.icon;
            const selected = localAppearance === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectAppearance(mode.id)}
                disabled={saving}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/12 ring-1 ring-primary"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
                }`}
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface">{mode.label}</p>
                  <p className="text-[10px] text-on-surface-variant">{mode.sub}</p>
                </div>
                {selected && <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 60fps TV / WebView Optimization */}
      <div
        data-testid="settings-perf-mode-card"
        className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" />
              <span>60fps Butter Mode &amp; Android TV / WebView Safeguard</span>
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Cleanly degrades backdrop blur shaders to solid frosted surfaces on 32-bit TV WebViews while preserving full Liquid Glass on desktop &amp; mobile.
            </p>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/12 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
            {is60FpsActive ? "60fps Active" : "Full Liquid Glass"}
            {isAutoDetectedTvOr32Bit ? " · TV Detected" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(
            [
              { id: "auto", label: "Auto (TV / 32-Bit)", desc: "Auto-enables on Android TV & Fire TV" },
              { id: "60fps", label: "Always 60fps Butter", desc: "Solid frosted tints with zero blur overhead" },
              { id: "standard", label: "Full Liquid Glass", desc: "Multi-layer specular blurs & ambient aura" },
            ] as const
          ).map((opt) => {
            const selected = perfPreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`settings-perf-mode-${opt.id}`}
                onClick={() => onSelectPerfMode(opt.id, opt.label)}
                className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/12 ring-1 ring-primary"
                    : "border-[var(--glass-border)] bg-background/30 hover:border-primary/50"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-on-surface">{opt.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <span className="mt-1 text-[10px] text-on-surface-variant leading-snug">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[var(--glass-border)]">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            <span>
              GPU: <strong className="text-on-surface">{gpuCaps?.unmaskedRenderer || "Probing..."}</strong>
            </span>
          </span>
          <button
            type="button"
            onClick={onOpenGpuOverlay}
            className="liquid-glass-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>GPU Overlay</span>
          </button>
        </div>
      </div>

      {/* Background Pattern Studio */}
      <div className="space-y-3" data-testid="settings-pattern-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
              Background Texture ({BACKGROUND_PATTERN_OPTIONS.length})
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Subtle patterns refract cleanly behind Liquid Glass surfaces.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary">{activePatternOption.name}</span>
        </div>

        <div data-testid="settings-pattern-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BACKGROUND_PATTERN_OPTIONS.map((pattern) => {
            const isSelected = localPattern === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                data-testid={`settings-pattern-${pattern.id}`}
                onClick={() => onSelectPattern(pattern.id)}
                className={`group flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/12 ring-1 ring-primary"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
                }`}
              >
                <div
                  className="relative mb-2 h-14 w-full overflow-hidden rounded-xl border border-[var(--glass-border)] bg-background"
                  style={{
                    backgroundImage:
                      pattern.id === "none"
                        ? activeThemeTokens.backgroundGradient
                        : `${pattern.previewImage}, ${activeThemeTokens.backgroundGradient}`,
                    backgroundSize:
                      pattern.id === "none" ? "cover" : `${pattern.previewSize}, cover`,
                  }}
                >
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-sm">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-on-surface">{pattern.name}</span>
                <span className="mt-0.5 text-[10px] text-on-surface-variant line-clamp-2 leading-snug">
                  {pattern.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curated Theme Palette Library */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
            Liquid Glass Palettes ({visibleThemes.length} of {THEME_OPTIONS.length})
          </p>
          <div
            role="tablist"
            aria-label="Filter themes by collection"
            className="flex flex-wrap gap-1.5"
          >
            {(["All", ...THEME_CATEGORIES] as const).map((cat) => {
              const active = themeCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`settings-theme-cat-${cat.toLowerCase()}`}
                  onClick={() => onSelectCategory(cat)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-contrast"
                      : "border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div
          data-testid="settings-theme-grid"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5"
        >
          {visibleThemes.map((theme) => {
            const isActive = normalizeThemeId(currentThemePreference) === theme.id;
            const previewTokens = localAppearance === "light" ? theme.lightTokens : theme.tokens;
            return (
              <button
                key={theme.id}
                type="button"
                data-testid={`settings-theme-${theme.id}`}
                onClick={() => onSelectTheme(theme.id)}
                disabled={saving}
                className={`group flex flex-col items-start p-4 rounded-2xl border text-left transition-all relative overflow-hidden min-h-[122px] ${
                  isActive
                    ? "border-primary bg-primary/12 ring-1 ring-primary"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/60"
                }`}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundImage: previewTokens.buttonGradient }}
                  aria-hidden
                />
                <div className="flex items-center justify-between w-full gap-2 pt-1.5">
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-semibold text-on-surface truncate">
                      {theme.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/80">
                      {theme.category}
                    </span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">
                  {theme.hint}
                </p>
                <div className="flex gap-1 mt-3 w-full h-2.5 rounded-full overflow-hidden border border-[var(--glass-border)]">
                  <div className="flex-[3]" style={{ backgroundImage: previewTokens.buttonGradient }} />
                  <div className="flex-[4]" style={{ backgroundImage: previewTokens.backgroundGradient }} />
                  <div className="flex-[2]" style={{ backgroundColor: previewTokens.onSurface }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
