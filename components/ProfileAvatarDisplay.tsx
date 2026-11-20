"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PROFILE_AVATAR_COLOR,
  getProfileAvatarOption,
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
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const initial = (name?.trim()?.[0] ?? "Z").toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/10 shadow-lg bg-surface ${SIZE_CLASSES[size]} ${className}`}
      style={imgFailed ? { backgroundColor: color } : undefined}
      title={name}
    >
      {!imgFailed ? (
        <img
          src={src}
          alt={name ? `${name} avatar` : "Profile avatar"}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-white"
        >
          {initial}
        </span>
      )}
    </div>
  );
}
