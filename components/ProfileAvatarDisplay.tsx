"use client";

import Image from "next/image";
import { PresetSvgAvatar } from "@/components/PresetSvgAvatar";
import {
  DEFAULT_PROFILE_AVATAR_COLOR,
  getProfileAvatarOption,
  isPresetAvatarPath,
  isPremiumAvatarPath,
  normalizeProfileAvatarColor,
  resolveAvatarId,
} from "@/lib/profile-avatars";

type Props = {
  avatar: string;
  avatarColor?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-24 w-24 md:h-28 md:w-28",
  xl: "h-20 w-20 sm:h-24 sm:w-24",
} as const;

export function ProfileAvatarDisplay({
  avatar,
  avatarColor,
  name,
  size = "md",
  className = "",
}: Props) {
  const color = normalizeProfileAvatarColor(avatarColor ?? DEFAULT_PROFILE_AVATAR_COLOR);
  const avatarId = resolveAvatarId(avatar);
  const option = avatarId === "legacy" ? null : getProfileAvatarOption(avatarId);
  const src = option?.src ?? avatar;
  const isPreset = isPresetAvatarPath(src);
  const isPremium = isPremiumAvatarPath(src);
  const usesBackground = option?.supportsBackgroundColor ?? isPreset;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/10 shadow-lg ${SIZE_CLASSES[size]} ${className}`}
      style={usesBackground ? { backgroundColor: color } : undefined}
      title={name}
    >
      {isPreset && (
        <PresetSvgAvatar src={src} backgroundColor={color} className="absolute inset-0" />
      )}

      {isPremium && (
        <Image
          src={src}
          alt={name ? `${name} avatar` : "Profile avatar"}
          fill
          sizes="112px"
          className="object-cover"
          unoptimized
        />
      )}

      {!isPreset && !isPremium && (
        <img
          src={src}
          alt={name ? `${name} avatar` : "Profile avatar"}
          className="h-full w-full object-cover bg-surface"
        />
      )}
    </div>
  );
}
