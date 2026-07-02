"use client";

import { Crown } from "lucide-react";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import {
  DEFAULT_PROFILE_AVATAR,
  DEFAULT_PROFILE_AVATAR_COLOR,
  PROFILE_AVATAR_COLORS,
  PROFILE_PREMIUM_AVATAR_OPTIONS,
  PROFILE_PREMIUM_COLLECTIONS,
  PROFILE_PRESET_AVATAR_OPTIONS,
  type AvatarGroup,
  type ProfileAvatarOption,
} from "@/lib/profile-avatars";

type Props = {
  selectedAvatarId: string;
  selectedColor: string;
  profileName: string;
  onAvatarChange: (avatarId: string) => void;
  onColorChange: (color: string) => void;
};

const TAB_LABELS: Record<AvatarGroup, string> = {
  presets: "SVG Icons",
  premium: "Premium",
};

const TABS: AvatarGroup[] = ["presets", "premium"];

export function AvatarPicker({
  selectedAvatarId,
  selectedColor,
  profileName,
  onAvatarChange,
  onColorChange,
}: Props) {
  const activeTab: AvatarGroup = selectedAvatarId.startsWith("premium-") ? "premium" : "presets";
  const showColorPicker = activeTab === "presets";

  const renderOption = (option: ProfileAvatarOption) => {
    const isActive = selectedAvatarId === option.id;
    const previewColor = isActive ? selectedColor : PROFILE_AVATAR_COLORS[7];

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onAvatarChange(option.id)}
        aria-label={`Avatar ${option.label}`}
        aria-pressed={isActive}
        className={`relative aspect-square min-h-12 rounded-xl border p-1 transition-all duration-200 ${
          isActive
            ? option.group === "premium"
              ? "border-amber-400/70 bg-amber-500/10 ring-2 ring-amber-400/40 scale-[1.03]"
              : "border-primary bg-primary/10 ring-2 ring-primary/40 scale-[1.03]"
            : "border-transparent bg-background/40 opacity-75 hover:opacity-100 hover:bg-surface-hover"
        }`}
      >
        <ProfileAvatarDisplay
          avatar={option.id}
          avatarColor={option.supportsBackgroundColor ? previewColor : undefined}
          name={profileName}
          size="sm"
          className="!h-full !w-full !rounded-lg"
        />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border-custom bg-background/30 p-3 sm:p-4">
        <ProfileAvatarDisplay
          avatar={selectedAvatarId}
          avatarColor={selectedColor}
          name={profileName}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-on-surface">Avatar preview</p>
          <p className="text-[10px] leading-relaxed text-on-surface-variant">
            {showColorPicker
              ? "Pick a background color, then choose an icon below."
              : "Premium artwork uses fixed colors."}
          </p>
        </div>
      </div>

      {showColorPicker && (
        <div>
          <label className="mb-2 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
            Background color
          </label>
          <div className="grid grid-cols-8 gap-2 sm:flex sm:flex-wrap">
            {PROFILE_AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorChange(color)}
                aria-label={`Profile color ${color}`}
                aria-pressed={selectedColor === color}
                className={`mx-auto flex aspect-square w-full max-w-9 items-center justify-center rounded-full p-0 ring-2 ring-offset-2 ring-offset-background transition sm:h-8 sm:w-8 ${
                  selectedColor === color ? "ring-primary" : "ring-transparent"
                }`}
              >
                <span className="h-[72%] w-[72%] rounded-full" style={{ backgroundColor: color }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border-custom bg-background/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === "presets") onAvatarChange(DEFAULT_PROFILE_AVATAR.id);
              else onAvatarChange(PROFILE_PREMIUM_AVATAR_OPTIONS[0]?.id ?? DEFAULT_PROFILE_AVATAR.id);
            }}
            aria-pressed={activeTab === tab}
            className={`rounded-lg px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition sm:text-xs ${
              activeTab === tab
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
            {TAB_LABELS[activeTab]}
          </label>
          <span className="text-[10px] text-on-surface-variant">
            {activeTab === "presets"
              ? `${PROFILE_PRESET_AVATAR_OPTIONS.length} icons`
              : `${PROFILE_PREMIUM_AVATAR_OPTIONS.length} icons`}
          </span>
        </div>

        {activeTab === "premium" && (
          <p className="mb-3 flex items-center gap-1.5 text-[10px] text-amber-200/90 sm:text-xs">
            <Crown className="h-3.5 w-3.5 shrink-0" />
            Premium PNG avatars — artwork cannot be recolored.
          </p>
        )}

        <div className="max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-border-custom bg-background/20 p-2 sm:max-h-56 md:max-h-64">
          {activeTab === "premium" ? (
            <div className="space-y-4">
              {PROFILE_PREMIUM_COLLECTIONS.map((collection) => {
                const items = PROFILE_PREMIUM_AVATAR_OPTIONS.filter(
                  (option) => option.id.startsWith(`premium-${collection.slug}-`)
                );
                if (items.length === 0) return null;
                return (
                  <div key={collection.slug}>
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                      {collection.label}
                    </p>
                    <div className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
                      {items.map(renderOption)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
              {PROFILE_PRESET_AVATAR_OPTIONS.map(renderOption)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
