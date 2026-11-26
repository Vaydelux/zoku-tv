"use client";

import { Shield, ShieldCheck } from "lucide-react";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import type { Profile } from "@/stores";

interface ProfilesAndSafetySectionProps {
  currentProfile: Profile;
  totalProfiles: number;
  saving: boolean;
  adultFilterEnabled: boolean;
  adultFilterBusy: boolean;
  onManageProfiles: () => void;
  onToggleKidMode: () => void;
  onToggleAdultFilter: () => void;
}

export function ProfilesAndSafetySection({
  currentProfile,
  totalProfiles,
  saving,
  adultFilterEnabled,
  adultFilterBusy,
  onManageProfiles,
  onToggleKidMode,
  onToggleAdultFilter,
}: ProfilesAndSafetySectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          Active Profile, Kids Mode &amp; Safety
        </h2>
        <p className="text-xs text-on-surface-variant">
          Manage household profiles, conservative Kids Mode filtering, and server-enforced catalog safety.
        </p>
      </div>

      {/* Active Profile Glass Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5">
        <div className="flex items-center gap-4">
          <ProfileAvatarDisplay
            avatar={currentProfile.avatar}
            avatarColor={currentProfile.avatarColor}
            name={currentProfile.name}
            size="md"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">{currentProfile.name}</h3>
              {currentProfile.kidMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-300 border border-amber-500/40">
                  <Shield className="h-2.5 w-2.5" />
                  <span>Kids</span>
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">
              Active Household Portal ({totalProfiles} total profiles)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onManageProfiles}
          className="liquid-glass-pill rounded-full px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary"
        >
          Switch or Edit All Profiles
        </button>
      </div>

      {/* Kids Mode Switch Card */}
      <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5">
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <span>Kids Experience Protection</span>
          </h4>
          <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
            When enabled, mature R/TV-MA content and restricted genres (Horror, Crime, Thriller, War, Ecchi, Psychological) are filtered across Home, Discover, Search, Details, and Watch routes.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={currentProfile.kidMode}
          aria-label="Toggle Kids Mode"
          onClick={onToggleKidMode}
          disabled={saving}
          className={`ios-switch ${currentProfile.kidMode ? "bg-amber-500" : "bg-on-surface/20"}`}
        >
          <span
            className={`ios-switch-thumb ${
              currentProfile.kidMode ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Server-Backed Adult Content Switch Card */}
      <div
        className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5 space-y-4"
        data-testid="settings-adult-content-filter"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Adult Content
            </h4>
            <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
              Adult content is OFF by default. Hides known Vivamax/VMX titles and TMDB age-restricted movies/TV, plus AniList hentai, ecchi, adult-rated anime, and explicit sexual-content tags. Independent of Kids Mode.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-background/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-on-surface-variant">
            {adultFilterEnabled ? "OFF (LOCKED)" : "ON (UNLOCKED)"}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleAdultFilter}
          disabled={adultFilterBusy}
          role="switch"
          aria-label="Adult Content"
          aria-checked={!adultFilterEnabled}
          data-testid="adult-content-switch"
          className="liquid-glass-pill inline-flex min-h-11 items-center gap-3 rounded-full px-3.5 py-2 text-xs font-bold text-on-surface disabled:cursor-wait disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${
              adultFilterEnabled ? "bg-on-surface/25" : "bg-primary"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                adultFilterEnabled ? "" : "translate-x-5"
              }`}
            />
          </span>
          <span>
            {adultFilterBusy
              ? "Updating…"
              : adultFilterEnabled
              ? "Turn Adult Content On"
              : "Turn Adult Content Off"}
          </span>
        </button>

        <p className="text-[11px] text-on-surface-variant">
          Stored in an HttpOnly SameSite=Strict cookie for up to 30 days in this browser. Filtering defaults ON in new browsers.
        </p>
      </div>
    </div>
  );
}
