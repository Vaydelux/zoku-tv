export type AvatarGroup = "presets" | "premium";

export type ProfileAvatarOption = {
  id: string;
  label: string;
  group: AvatarGroup;
  src: string;
  supportsBackgroundColor: boolean;
};

const PRESET_COUNT = 66;

const PREMIUM_COLLECTIONS = [
  { slug: "avengers", label: "Avengers", folder: "avengers", filePrefix: "avengers", count: 8 },
  { slug: "onepiece", label: "One Piece", folder: "one piece", filePrefix: "onepiece", count: 10 },
  { slug: "sanrio", label: "Sanrio", folder: "sanrio", filePrefix: "sanrio", count: 7 },
] as const;

export const PROFILE_AVATAR_COLORS = [
  "#e11d48",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#65a30d",
  "#16a34a",
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#9333ea",
  "#c026d3",
  "#db2777",
  "#64748b",
] as const;

export const DEFAULT_PROFILE_AVATAR_COLOR = PROFILE_AVATAR_COLORS[0];

function presetSrc(index: number): string {
  return `/avatars/presets/${encodeURIComponent(`presets (${index}).svg`)}`;
}

function premiumSrc(folder: string, filePrefix: string, index: number): string {
  return `/avatars/${encodeURIComponent(folder)}/${encodeURIComponent(`${filePrefix} (${index}).png`)}`;
}

const PRESET_OPTIONS: ProfileAvatarOption[] = Array.from({ length: PRESET_COUNT }, (_, index) => {
  const number = index + 1;
  return {
    id: `preset-${number}`,
    label: `Icon ${number}`,
    group: "presets",
    supportsBackgroundColor: true,
    src: presetSrc(number),
  };
});

const PREMIUM_OPTIONS: ProfileAvatarOption[] = PREMIUM_COLLECTIONS.flatMap((collection) =>
  Array.from({ length: collection.count }, (_, index) => {
    const number = index + 1;
    return {
      id: `premium-${collection.slug}-${number}`,
      label: `${collection.label} ${number}`,
      group: "premium" as const,
      supportsBackgroundColor: false,
      src: premiumSrc(collection.folder, collection.filePrefix, number),
    };
  })
);

export const PROFILE_PRESET_AVATAR_OPTIONS = PRESET_OPTIONS;
export const PROFILE_PREMIUM_AVATAR_OPTIONS = PREMIUM_OPTIONS;
export const PROFILE_PREMIUM_COLLECTIONS = PREMIUM_COLLECTIONS;
export const PROFILE_AVATAR_OPTIONS: ProfileAvatarOption[] = [...PRESET_OPTIONS, ...PREMIUM_OPTIONS];

const CATALOG_MAP = new Map(PROFILE_AVATAR_OPTIONS.map((option) => [option.id, option]));
const SRC_TO_ID = new Map(PROFILE_AVATAR_OPTIONS.map((option) => [option.src, option.id]));

export const DEFAULT_PROFILE_AVATAR = PRESET_OPTIONS[0];

export const PROFILE_AVATAR_PRELOAD_URLS = PROFILE_AVATAR_OPTIONS.map((option) => option.src);

export function getProfileAvatarOption(id: string | undefined): ProfileAvatarOption {
  return CATALOG_MAP.get(id ?? DEFAULT_PROFILE_AVATAR.id) ?? DEFAULT_PROFILE_AVATAR;
}

export function profileAvatarSrc(id: string): string {
  return getProfileAvatarOption(id).src;
}

export function isPresetAvatarPath(value: string): boolean {
  return value.includes("/avatars/presets/");
}

export function isPremiumAvatarPath(value: string): boolean {
  return value.includes("/avatars/") && !isPresetAvatarPath(value);
}

export function resolveAvatarId(value: string | undefined): string {
  if (!value) return DEFAULT_PROFILE_AVATAR.id;
  if (CATALOG_MAP.has(value)) return value;
  if (SRC_TO_ID.has(value)) return SRC_TO_ID.get(value)!;
  if (value.startsWith("http")) return "legacy";
  return DEFAULT_PROFILE_AVATAR.id;
}

export function normalizeProfileAvatarColor(value: unknown): string {
  if (typeof value === "string" && (PROFILE_AVATAR_COLORS as readonly string[]).includes(value)) {
    return value;
  }
  return DEFAULT_PROFILE_AVATAR_COLOR;
}

export function randomPresetAvatarId(): string {
  const index = Math.floor(Math.random() * PRESET_COUNT);
  return PRESET_OPTIONS[index]?.id ?? DEFAULT_PROFILE_AVATAR.id;
}

export function randomProfileAvatarColor(): string {
  return PROFILE_AVATAR_COLORS[Math.floor(Math.random() * PROFILE_AVATAR_COLORS.length)];
}

let preloadStarted = false;

export function preloadProfileAvatars(): void {
  if (typeof window === "undefined" || preloadStarted) return;
  preloadStarted = true;

  const run = () => {
    for (const url of PROFILE_AVATAR_PRELOAD_URLS) {
      fetch(url, { cache: "force-cache" }).catch(() => undefined);
    }
  };

  const idle = window.requestIdleCallback?.(run, { timeout: 2500 });
  if (idle !== undefined) return;
  window.setTimeout(run, 400);
}
