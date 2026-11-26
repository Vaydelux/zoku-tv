"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Moon, Palette, Sparkles, Sun, X } from "lucide-react";
import {
  applyTheme,
  getThemeOption,
  THEME_CATEGORIES,
  THEME_OPTIONS,
  type AppearanceMode,
  type ThemeCategory,
  type ThemeId,
} from "@/lib/themes";
import {
  applyBackgroundPattern,
  BACKGROUND_PATTERN_OPTIONS,
  getPatternOption,
  type BackgroundPatternId,
} from "@/lib/background-patterns";
import {
  DEFAULT_STORED_THEME_PREFERENCE,
  readPreAuthThemePreference,
  writePreAuthThemePreference,
  type StoredThemePreference,
} from "@/lib/preauth-theme";
import { computeFloatingPosition, type FloatingPositionResult } from "@/lib/floating-position";

interface AuthThemePickerProps {
  /** Compact mode for tighter headers; defaults to full pill bar */
  compact?: boolean;
}

export function AuthThemePicker({ compact = false }: AuthThemePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<StoredThemePreference>(DEFAULT_STORED_THEME_PREFERENCE);
  const [activeCategory, setActiveCategory] = useState<"All" | ThemeCategory>("All");
  const [pos, setPos] = useState<FloatingPositionResult | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = readPreAuthThemePreference();
    setPref(stored);
    applyTheme(stored.themeId, stored.appearance);
    applyBackgroundPattern(stored.patternId);
  }, []);

  const updatePreference = useCallback((patch: Partial<StoredThemePreference>) => {
    const next = writePreAuthThemePreference(patch, { markForAuthHandoff: true });
    setPref(next);
    applyTheme(next.themeId, next.appearance);
    applyBackgroundPattern(next.patternId);
  }, []);

  const handleToggleAppearance = useCallback(() => {
    const nextAppearance: AppearanceMode = pref.appearance === "dark" ? "light" : "dark";
    updatePreference({ appearance: nextAppearance });
  }, [pref.appearance, updatePreference]);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId) => {
      updatePreference({ themeId });
    },
    [updatePreference]
  );

  const handleSelectPattern = useCallback(
    (patternId: BackgroundPatternId) => {
      updatePreference({ patternId });
    },
    [updatePreference]
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const measuredHeight = panelRef.current?.offsetHeight ?? 520;
    const nextPos = computeFloatingPosition(rect, viewport, measuredHeight, {
      align: "right",
      gap: 10,
      edgePadding: 12,
      minWidth: Math.min(340, viewport.width - 24),
      maxWidth: 440,
      preferredMaxHeight: Math.min(620, viewport.height - 92),
    });
    setPos(nextPos);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition, activeCategory]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeTheme = getThemeOption(pref.themeId);
  const activePattern = getPatternOption(pref.patternId);
  const activeTokens = pref.appearance === "light" ? activeTheme.lightTokens : activeTheme.tokens;

  const filteredThemes =
    activeCategory === "All"
      ? THEME_OPTIONS
      : THEME_OPTIONS.filter((theme) => theme.category === activeCategory);

  return (
    <div className="fixed right-3 top-3 z-40 sm:right-6 sm:top-5 flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggleAppearance}
        data-testid="auth-appearance-toggle"
        aria-label={`Switch to ${pref.appearance === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${pref.appearance === "dark" ? "light" : "dark"} mode`}
        className="liquid-glass-pill flex h-10 w-10 items-center justify-center rounded-full text-on-surface hover:text-primary"
      >
        {pref.appearance === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="auth-theme-picker-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Customize theme and background pattern"
        className={`liquid-glass-pill flex h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-on-surface ${
          open ? "!border-primary ring-2 ring-primary/35" : ""
        }`}
      >
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundImage: activeTokens.buttonGradient }}
          aria-hidden="true"
        />
        {!compact && (
          <span className="max-w-[110px] sm:max-w-[140px] truncate">{activeTheme.name}</span>
        )}
        <Palette className="h-3.5 w-3.5 text-primary shrink-0 sm:hidden" aria-hidden="true" />
        <ChevronDown
          className={`h-3.5 w-3.5 text-on-surface-variant transition-transform duration-150 ${
            open ? "rotate-180 text-primary" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Theme and background pattern studio"
            data-testid="auth-theme-picker-panel"
            style={{
              position: "fixed",
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              maxHeight: `${pos.maxHeight}px`,
              transformOrigin: pos.transformOrigin,
              zIndex: 80,
            }}
            className="liquid-glass-elevated flex flex-col overflow-hidden rounded-[26px] text-on-surface animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border-custom px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  <h2 className="text-xs font-semibold tracking-tight text-on-surface">
                    Theme &amp; Pattern Studio
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant">
                  Saved locally and automatically applied when you sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close theme studio"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-custom text-on-surface-variant transition-colors hover:bg-surface-hover hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4">
              {/* Appearance Mode Switch */}
              <div className="grid grid-cols-2 gap-2">
                {(["dark", "light"] as const).map((mode) => {
                  const selected = pref.appearance === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`auth-mode-${mode}`}
                      onClick={() => updatePreference({ appearance: mode })}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border-custom bg-background/50 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                      }`}
                    >
                      {mode === "dark" ? (
                        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{mode === "dark" ? "Dark Mode" : "Light Mode"}</span>
                    </button>
                  );
                })}
              </div>

              {/* Background Patterns */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                    Background Pattern
                  </span>
                  <span className="text-[11px] font-medium text-primary">{activePattern.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {BACKGROUND_PATTERN_OPTIONS.map((pattern) => {
                    const selected = pref.patternId === pattern.id;
                    return (
                      <button
                        key={pattern.id}
                        type="button"
                        data-testid={`auth-pattern-${pattern.id}`}
                        onClick={() => handleSelectPattern(pattern.id)}
                        title={pattern.hint}
                        className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border-custom bg-background/45 hover:border-primary/50"
                        }`}
                      >
                        <div
                          className="relative h-8 w-full overflow-hidden rounded-lg border border-border-custom bg-background"
                          style={{
                            backgroundImage:
                              pattern.id === "none"
                                ? activeTokens.backgroundGradient
                                : `${pattern.previewImage}, ${activeTokens.backgroundGradient}`,
                            backgroundSize:
                              pattern.id === "none"
                                ? "cover"
                                : `${pattern.previewSize}, cover`,
                          }}
                        >
                          {selected && (
                            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-contrast">
                              <Check className="h-2.5 w-2.5" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                        <span className="w-full truncate text-[10px] font-medium text-on-surface">
                          {pattern.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Palette Picker */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                    Palettes ({THEME_OPTIONS.length})
                  </span>
                  <span className="text-[11px] font-medium text-primary">{activeTheme.name}</span>
                </div>

                {/* Category Filter */}
                <div className="grid grid-cols-6 gap-1">
                  {(["All", ...THEME_CATEGORIES] as const).map((cat) => {
                    const active = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`truncate rounded-lg px-1 py-1 text-center text-[10px] font-semibold transition-colors ${
                          active
                            ? "bg-primary text-primary-contrast"
                            : "bg-background/60 text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {filteredThemes.map((theme) => {
                    const selected = pref.themeId === theme.id;
                    const tokens =
                      pref.appearance === "light" ? theme.lightTokens : theme.tokens;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        data-testid={`auth-theme-${theme.id}`}
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border-custom bg-background/50 hover:border-primary/50 hover:bg-background/80"
                        }`}
                      >
                        <div
                          className="h-2 w-full rounded-full mb-2"
                          style={{ backgroundImage: tokens.buttonGradient }}
                          aria-hidden="true"
                        />
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-on-surface">
                            {theme.name}
                          </span>
                          {selected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                          )}
                        </div>
                        <span className="mt-0.5 line-clamp-1 text-[10px] text-on-surface-variant">
                          {theme.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
