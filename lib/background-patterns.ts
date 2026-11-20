export type BackgroundPatternId =
  | "none"
  | "dot-matrix"
  | "architect-grid"
  | "diagonal-weave"
  | "crosshatch"
  | "aurora-rings"
  | "micro-lattice"
  | "scanlines";

export interface BackgroundPatternOption {
  id: BackgroundPatternId;
  name: string;
  hint: string;
  /** CSS background-image snippet using live theme custom properties */
  previewImage: string;
  previewSize: string;
}

export const DEFAULT_PATTERN_ID: BackgroundPatternId = "none";

export const BACKGROUND_PATTERN_OPTIONS: BackgroundPatternOption[] = [
  {
    id: "none",
    name: "Pure Canvas",
    hint: "Clean atmospheric gradient without surface texture",
    previewImage: "var(--background-gradient)",
    previewSize: "cover",
  },
  {
    id: "dot-matrix",
    name: "Studio Dots",
    hint: "Fine radial dot matrix softly tinted to your theme",
    previewImage:
      "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--primary) 34%, var(--on-surface) 18%) 1.2px, transparent 0)",
    previewSize: "18px 18px",
  },
  {
    id: "architect-grid",
    name: "Cinema Grid",
    hint: "Crisp architectural hairlines with subtle accent cadence",
    previewImage: [
      "linear-gradient(to right, color-mix(in srgb, var(--primary) 20%, var(--on-surface) 10%) 1px, transparent 1px)",
      "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 18%, var(--on-surface) 10%) 1px, transparent 1px)",
    ].join(", "),
    previewSize: "28px 28px",
  },
  {
    id: "diagonal-weave",
    name: "Film Weave",
    hint: "Tailored 45-degree pinstripes matched to your palette",
    previewImage:
      "repeating-linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent) 0px, color-mix(in srgb, var(--primary) 22%, transparent) 1px, transparent 1px, transparent 14px)",
    previewSize: "auto",
  },
  {
    id: "crosshatch",
    name: "Editorial Linen",
    hint: "Woven dual-diagonal texture inspired by print monographs",
    previewImage: [
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--primary) 16%, transparent) 0px, color-mix(in srgb, var(--primary) 16%, transparent) 1px, transparent 1px, transparent 16px)",
      "repeating-linear-gradient(-45deg, color-mix(in srgb, var(--accent) 14%, transparent) 0px, color-mix(in srgb, var(--accent) 14%, transparent) 1px, transparent 1px, transparent 16px)",
    ].join(", "),
    previewSize: "auto",
  },
  {
    id: "aurora-rings",
    name: "Lens Rings",
    hint: "Concentric cinema-lens arcs echoing your accent hue",
    previewImage:
      "repeating-radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--primary) 22%, transparent) 0px, color-mix(in srgb, var(--primary) 22%, transparent) 1px, transparent 1px, transparent 22px)",
    previewSize: "auto",
  },
  {
    id: "micro-lattice",
    name: "Diamond Lattice",
    hint: "Staggered micro-diamonds that catch light gently",
    previewImage: [
      "radial-gradient(circle at 0 0, color-mix(in srgb, var(--primary) 28%, transparent) 1.5px, transparent 1.6px)",
      "radial-gradient(circle at 11px 11px, color-mix(in srgb, var(--accent) 26%, transparent) 1.5px, transparent 1.6px)",
    ].join(", "),
    previewSize: "22px 22px",
  },
  {
    id: "scanlines",
    name: "Broadcast Lines",
    hint: "Ultra-fine horizontal monitor lines for theater depth",
    previewImage:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--on-surface) 14%, var(--primary) 12%) 0px, color-mix(in srgb, var(--on-surface) 14%, var(--primary) 12%) 1px, transparent 1px, transparent 6px)",
    previewSize: "auto",
  },
];

const VALID_PATTERN_IDS = new Set<BackgroundPatternId>(
  BACKGROUND_PATTERN_OPTIONS.map((option) => option.id)
);

const PATTERN_MAP = new Map<BackgroundPatternId, BackgroundPatternOption>(
  BACKGROUND_PATTERN_OPTIONS.map((option) => [option.id, option])
);

export function isValidPatternId(value: unknown): value is BackgroundPatternId {
  return typeof value === "string" && VALID_PATTERN_IDS.has(value as BackgroundPatternId);
}

export function normalizePatternId(value: unknown): BackgroundPatternId {
  return isValidPatternId(value) ? value : DEFAULT_PATTERN_ID;
}

export function getPatternOption(id: unknown): BackgroundPatternOption {
  return PATTERN_MAP.get(normalizePatternId(id)) ?? PATTERN_MAP.get(DEFAULT_PATTERN_ID)!;
}

export function applyBackgroundPattern(patternId: unknown): BackgroundPatternId {
  const normalized = normalizePatternId(patternId);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-bg-pattern", normalized);
  }
  return normalized;
}
