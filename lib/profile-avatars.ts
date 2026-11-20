export type AvatarGroup = "presets" | "premium";

export const PROFILE_PREMIUM_COLLECTIONS = [
  { slug: "avengers", label: "Avengers", folder: "avengers", filePrefix: "avengers", count: 8 },
  { slug: "onepiece", label: "One Piece", folder: "one piece", filePrefix: "onepiece", count: 10 },
  { slug: "sanrio", label: "Sanrio", folder: "sanrio", filePrefix: "sanrio", count: 7 },
] as const;

export type PremiumCollectionSlug = (typeof PROFILE_PREMIUM_COLLECTIONS)[number]["slug"];
export type AvatarCollectionFilter = "all" | PremiumCollectionSlug;

export type ProfileAvatarOption = {
  id: string;
  label: string;
  group: AvatarGroup;
  collection?: PremiumCollectionSlug;
  src: string;
  supportsBackgroundColor: boolean;
};

const PRESET_COUNT = 66;

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

const PREMIUM_OPTIONS: ProfileAvatarOption[] = PROFILE_PREMIUM_COLLECTIONS.flatMap((collection) =>
  Array.from({ length: collection.count }, (_, index) => {
    const number = index + 1;
    return {
      id: `premium-${collection.slug}-${number}`,
      label: `${collection.label} ${number}`,
      group: "premium" as const,
      collection: collection.slug,
      supportsBackgroundColor: false,
      src: premiumSrc(collection.folder, collection.filePrefix, number),
    };
  })
);

/** Preserved for non-destructive backward compatibility; hidden from the avatar picker UI. */
export const PROFILE_PRESET_AVATAR_OPTIONS = PRESET_OPTIONS;
export const PROFILE_PREMIUM_AVATAR_OPTIONS = PREMIUM_OPTIONS;
export const PROFILE_AVATAR_OPTIONS: ProfileAvatarOption[] = [...PREMIUM_OPTIONS];

const PREMIUM_CATALOG_MAP = new Map(PREMIUM_OPTIONS.map((option) => [option.id, option]));
const PREMIUM_SRC_TO_ID = new Map<string, string>();
for (const option of PREMIUM_OPTIONS) {
  PREMIUM_SRC_TO_ID.set(option.src, option.id);
  try {
    PREMIUM_SRC_TO_ID.set(decodeURIComponent(option.src), option.id);
  } catch {
    // ignore malformed URI
  }
}

export const DEFAULT_PROFILE_AVATAR = PREMIUM_OPTIONS[0];

export const PROFILE_AVATAR_PRELOAD_URLS = PREMIUM_OPTIONS.map((option) => option.src);

const PRESET_ID_PATTERN = /^preset-(\d+)$/i;
const PRESET_PATH_PATTERN = /\/avatars\/presets\/presets(?:\s|%20)*\((\d+)\)\.svg$/i;

function extractLegacyPresetIndex(value: string): number | null {
  const idMatch = value.match(PRESET_ID_PATTERN);
  if (idMatch) {
    const parsed = Number.parseInt(idMatch[1], 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // keep raw string
  }

  const pathMatch = decoded.match(PRESET_PATH_PATTERN);
  if (pathMatch) {
    const parsed = Number.parseInt(pathMatch[1], 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
  }

  return null;
}

export function fallbackPremiumAvatarForPresetIndex(presetIndex: number): ProfileAvatarOption {
  const safeIndex = Math.max(1, Math.floor(presetIndex));
  return PREMIUM_OPTIONS[(safeIndex - 1) % PREMIUM_OPTIONS.length] ?? DEFAULT_PROFILE_AVATAR;
}

export function isPresetAvatarPath(value: string): boolean {
  return value.includes("/avatars/presets/");
}

export function isPremiumAvatarPath(value: string): boolean {
  return value.includes("/avatars/") && !isPresetAvatarPath(value);
}

export function resolveAvatarId(value: string | undefined): string {
  if (!value) return DEFAULT_PROFILE_AVATAR.id;
  if (PREMIUM_CATALOG_MAP.has(value)) return value;
  if (PREMIUM_SRC_TO_ID.has(value)) return PREMIUM_SRC_TO_ID.get(value)!;

  try {
    const decoded = decodeURIComponent(value);
    if (PREMIUM_SRC_TO_ID.has(decoded)) return PREMIUM_SRC_TO_ID.get(decoded)!;
  } catch {
    // ignore malformed URI
  }

  const legacyPresetIndex = extractLegacyPresetIndex(value);
  if (legacyPresetIndex !== null) {
    return fallbackPremiumAvatarForPresetIndex(legacyPresetIndex).id;
  }

  if (isPresetAvatarPath(value)) {
    return DEFAULT_PROFILE_AVATAR.id;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return "legacy";
  }

  return DEFAULT_PROFILE_AVATAR.id;
}

export function getProfileAvatarOption(id: string | undefined): ProfileAvatarOption {
  const resolved = resolveAvatarId(id);
  if (resolved === "legacy") return DEFAULT_PROFILE_AVATAR;
  return PREMIUM_CATALOG_MAP.get(resolved) ?? DEFAULT_PROFILE_AVATAR;
}

export function profileAvatarSrc(id: string): string {
  return getProfileAvatarOption(id).src;
}

export function getAvatarCollectionSlug(idOrSrc: string | undefined): PremiumCollectionSlug {
  return getProfileAvatarOption(idOrSrc).collection ?? PROFILE_PREMIUM_COLLECTIONS[0].slug;
}

export function getPremiumAvatarsByCollection(
  filter: AvatarCollectionFilter
): ProfileAvatarOption[] {
  if (filter === "all") return PREMIUM_OPTIONS;
  return PREMIUM_OPTIONS.filter((option) => option.collection === filter);
}

export function normalizeProfileAvatarColor(value: unknown): string {
  if (typeof value === "string" && (PROFILE_AVATAR_COLORS as readonly string[]).includes(value)) {
    return value;
  }
  return DEFAULT_PROFILE_AVATAR_COLOR;
}

export function randomPremiumAvatarId(): string {
  const index = Math.floor(Math.random() * PREMIUM_OPTIONS.length);
  return PREMIUM_OPTIONS[index]?.id ?? DEFAULT_PROFILE_AVATAR.id;
}

/** @deprecated Alias kept for backward compatibility; now returns a random Premium PNG avatar. */
export function randomPresetAvatarId(): string {
  return randomPremiumAvatarId();
}

export function randomProfileAvatarColor(): string {
  return PROFILE_AVATAR_COLORS[Math.floor(Math.random() * PROFILE_AVATAR_COLORS.length)];
}

const preloadedCollections = new Set<string>();

/** Preload only the requested Premium collection when the picker opens — never SVG presets. */
export function preloadAvatarCollection(
  filter: AvatarGroup | AvatarCollectionFilter = "all"
): void {
  if (typeof window === "undefined") return;
  const key = filter === "presets" || filter === "premium" ? "all" : filter;
  if (preloadedCollections.has(key)) return;
  preloadedCollections.add(key);

  const urls = getPremiumAvatarsByCollection(key).map((option) => option.src);

  const run = () => {
    for (const url of urls) {
      fetch(url, { cache: "force-cache" }).catch(() => undefined);
    }
  };

  const idle = window.requestIdleCallback?.(run, { timeout: 1500 });
  if (idle !== undefined) return;
  window.setTimeout(run, 200);
}

/** @deprecated Prefer preloadAvatarCollection — warms Premium avatars only. */
export function preloadProfileAvatars(): void {
  preloadAvatarCollection("all");
}
