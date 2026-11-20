"use client";

import { useEffect, useState } from "react";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import {
  PROFILE_PREMIUM_AVATAR_OPTIONS,
  PROFILE_PREMIUM_COLLECTIONS,
  getPremiumAvatarsByCollection,
  getProfileAvatarOption,
  preloadAvatarCollection,
  resolveAvatarId,
  type AvatarCollectionFilter,
  type ProfileAvatarOption,
} from "@/lib/profile-avatars";

type Props = {
  selectedAvatarId: string;
  selectedColor?: string;
  profileName: string;
  onAvatarChange: (avatarId: string) => void;
  onColorChange?: (color: string) => void;
};

type CollectionTab = {
  id: AvatarCollectionFilter;
  label: string;
  count: number;
};

const COLLECTION_TABS: CollectionTab[] = [
  { id: "all", label: "All", count: PROFILE_PREMIUM_AVATAR_OPTIONS.length },
  ...PROFILE_PREMIUM_COLLECTIONS.map((collection) => ({
    id: collection.slug,
    label: collection.label,
    count: collection.count,
  })),
];

export function AvatarPicker({
  selectedAvatarId,
  selectedColor,
  profileName,
  onAvatarChange,
}: Props) {
  const [selectedCollection, setSelectedCollection] = useState<AvatarCollectionFilter>("all");
  const resolvedSelectedId = resolveAvatarId(selectedAvatarId);
  const activeOption = getProfileAvatarOption(resolvedSelectedId);
  const activeCollectionLabel =
    PROFILE_PREMIUM_COLLECTIONS.find((c) => c.slug === activeOption.collection)?.label ??
    "Premium";

  // Warm only the currently viewed collection when the picker is open
  useEffect(() => {
    preloadAvatarCollection(selectedCollection);
  }, [selectedCollection]);

  const visibleAvatars = getPremiumAvatarsByCollection(selectedCollection);
  const activeTabMeta =
    COLLECTION_TABS.find((tab) => tab.id === selectedCollection) ?? COLLECTION_TABS[0];

  const renderOption = (option: ProfileAvatarOption) => {
    const isActive = resolvedSelectedId === option.id;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onAvatarChange(option.id)}
        aria-label={`Avatar ${option.label}`}
        aria-pressed={isActive}
        className={`relative aspect-square min-h-[48px] rounded-xl border p-1 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
          isActive
            ? "border-primary bg-primary/10 ring-2 ring-primary/40 scale-[1.03]"
            : "border-transparent bg-background/40 opacity-85 hover:opacity-100 hover:bg-surface-hover"
        }`}
      >
        <ProfileAvatarDisplay
          avatar={option.id}
          avatarColor={selectedColor}
          name={profileName}
          size="sm"
          className="!h-full !w-full !rounded-lg"
        />
      </button>
    );
  };

  const activeOptionNumber = activeOption.id.match(/-(\d+)$/)?.[1] ?? "1";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-border-custom bg-background/30 p-3.5 sm:p-4">
        <ProfileAvatarDisplay
          avatar={resolvedSelectedId}
          avatarColor={selectedColor}
          name={profileName}
          size="xl"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-on-surface">Avatar preview</p>
          <p className="text-xs text-on-surface-variant tabular-nums">
            {activeCollectionLabel}
            <span aria-hidden="true"> · </span>
            Avatar #{activeOptionNumber}
          </p>
          <p className="text-xs leading-relaxed text-on-surface-variant/85">
            Choose a character avatar for this profile.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Avatar collections"
        className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar rounded-xl border border-border-custom bg-background/30 p-1"
      >
        {COLLECTION_TABS.map((tab) => {
          const isSelected = selectedCollection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCollection(tab.id)}
              className={`min-h-[44px] flex-1 whitespace-nowrap shrink-0 rounded-lg px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                isSelected
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`ml-1 sm:ml-1.5 font-mono text-[10px] sm:text-[11px] tabular-nums ${
                  isSelected ? "text-white/85" : "text-on-surface-variant/75"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <span className="text-xs font-semibold text-on-surface">
            {selectedCollection === "all" ? "All collections" : activeTabMeta.label}
          </span>
          <span className="text-xs font-mono tabular-nums text-on-surface-variant">
            {visibleAvatars.length} avatars
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-border-custom bg-background/20 p-2.5 sm:max-h-64">
          {selectedCollection === "all" ? (
            <div className="space-y-4">
              {PROFILE_PREMIUM_COLLECTIONS.map((collection) => {
                const items = getPremiumAvatarsByCollection(collection.slug);
                if (items.length === 0) return null;
                return (
                  <div key={collection.slug}>
                    <p className="mb-2 px-1 text-xs font-medium text-on-surface-variant tabular-nums">
                      {collection.label}
                      <span aria-hidden="true"> · </span>
                      {items.length}
                    </p>
                    <div className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8">
                      {items.map(renderOption)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8">
              {visibleAvatars.map(renderOption)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
