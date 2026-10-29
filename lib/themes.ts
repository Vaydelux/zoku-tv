export type ThemeId =
  | "theme-sunset"
  | "theme-aurora"
  | "theme-moonlight"
  | "theme-crimson"
  | "theme-ocean"
  | "theme-neon"
  | "theme-rose"
  | "theme-sand"
  | "theme-void"
  | "theme-arctic"
  | "theme-amber"
  | "theme-ember"
  | "theme-lavender"
  | "theme-cobalt"
  | "theme-oasis"
  | "theme-platinum"
  | "theme-sage"
  | "theme-solar";

export type AppearanceMode = "dark" | "light";

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceHover: string;
  primary: string;
  primaryContrast: string;
  primaryGlow: string;
  accent: string;
  accentContrast: string;
  onSurface: string;
  onSurfaceVariant: string;
  borderColor: string;
  backgroundGradient: string;
  surfaceGradient: string;
  buttonGradient: string;
  orbA: string;
  orbB: string;
  orbC: string;
};

export type ThemeOption = {
  id: ThemeId;
  name: string;
  hint: string;
  desc: string;
  preview: string;
  /** Dark appearance tokens (default) */
  tokens: ThemeTokens;
  /** Light appearance tokens derived from the same palette */
  lightTokens: ThemeTokens;
};

type SolidTokens = Omit<
  ThemeTokens,
  | "backgroundGradient"
  | "surfaceGradient"
  | "buttonGradient"
  | "orbA"
  | "orbB"
  | "orbC"
>;

const token = (
  background: string,
  surface: string,
  surfaceHover: string,
  primary: string,
  primaryContrast: string,
  primaryGlow: string,
  accent: string,
  accentContrast: string,
  onSurface: string,
  onSurfaceVariant: string,
  borderColor: string
): SolidTokens => ({
  background,
  surface,
  surfaceHover,
  primary,
  primaryContrast,
  primaryGlow,
  accent,
  accentContrast,
  onSurface,
  onSurfaceVariant,
  borderColor,
});

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

/** Pick readable text on a filled primary/accent surface */
function contrastOn(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#101218" : "#ffffff";
}

/** Gently enrich dark shells while preserving the substantial hue of each theme */
function tuneDarkTokens(tokens: SolidTokens): SolidTokens {
  return {
    ...tokens,
    primaryContrast: contrastOn(tokens.primary),
    accentContrast: contrastOn(tokens.accent),
  };
}

function withGradient(tokens: SolidTokens, mode: AppearanceMode): ThemeTokens {
  const bg = tokens.background;
  const surface = tokens.surface;
  const surfaceHover = tokens.surfaceHover;
  const primary = tokens.primary;
  const accent = tokens.accent;

  const backgroundGradient =
    mode === "dark"
      ? [
          `radial-gradient(ellipse 115% 78% at 8% -12%, color-mix(in srgb, ${primary} 30%, transparent) 0%, transparent 62%)`,
          `radial-gradient(ellipse 95% 68% at 96% 6%, color-mix(in srgb, ${accent} 24%, transparent) 0%, transparent 58%)`,
          `radial-gradient(ellipse 90% 64% at 50% 108%, color-mix(in srgb, ${primary} 20%, ${surface}) 0%, transparent 64%)`,
          `linear-gradient(165deg, color-mix(in srgb, ${bg} 82%, ${primary} 18%) 0%, ${bg} 46%, color-mix(in srgb, ${bg} 80%, ${accent} 20%) 100%)`,
        ].join(", ")
      : [
          `radial-gradient(ellipse 110% 70% at 6% -8%, color-mix(in srgb, ${primary} 22%, transparent) 0%, transparent 58%)`,
          `radial-gradient(ellipse 90% 60% at 96% 12%, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 55%)`,
          `radial-gradient(ellipse 85% 55% at 50% 106%, color-mix(in srgb, ${primary} 14%, transparent) 0%, transparent 60%)`,
          `linear-gradient(168deg, color-mix(in srgb, ${bg} 88%, ${primary} 12%) 0%, ${bg} 52%, color-mix(in srgb, ${surface} 90%, ${accent} 10%) 100%)`,
        ].join(", ");

  const surfaceGradient =
    mode === "dark"
      ? `linear-gradient(145deg, color-mix(in srgb, ${surface} 88%, ${primary} 12%) 0%, color-mix(in srgb, ${surface} 94%, ${bg} 6%) 55%, color-mix(in srgb, ${surfaceHover} 85%, ${accent} 15%) 100%)`
      : `linear-gradient(145deg, color-mix(in srgb, #ffffff 90%, ${primary} 10%) 0%, #ffffff 58%, color-mix(in srgb, ${surfaceHover} 88%, ${accent} 12%) 100%)`;

  const buttonGradient = `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 65%, ${accent} 35%) 100%)`;

  const orbA =
    mode === "dark"
      ? `radial-gradient(circle, color-mix(in srgb, ${primary} 48%, transparent) 0%, transparent 70%)`
      : `radial-gradient(circle, color-mix(in srgb, ${primary} 30%, transparent) 0%, transparent 70%)`;

  const orbB =
    mode === "dark"
      ? `radial-gradient(circle, color-mix(in srgb, ${accent} 42%, transparent) 0%, transparent 70%)`
      : `radial-gradient(circle, color-mix(in srgb, ${accent} 26%, transparent) 0%, transparent 70%)`;

  const orbC =
    mode === "dark"
      ? `radial-gradient(circle, color-mix(in srgb, ${primary} 32%, ${accent} 28%) 0%, transparent 72%)`
      : `radial-gradient(circle, color-mix(in srgb, ${primary} 20%, ${accent} 18%) 0%, transparent 72%)`;

  return {
    ...tokens,
    backgroundGradient,
    surfaceGradient,
    buttonGradient,
    orbA,
    orbB,
    orbC,
  };
}

function toLightTokens(dark: ThemeTokens): ThemeTokens {
  const primaryContrast = contrastOn(dark.primary);
  const accentContrast = contrastOn(dark.accent);
  const rgb = parseHex(dark.primary);
  const glow = rgb
    ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`
    : dark.primaryGlow;

  return withGradient(
    {
      background: "#f4f3f8",
      surface: "#ffffff",
      surfaceHover: "#ebe9f2",
      primary: dark.primary,
      primaryContrast,
      primaryGlow: glow,
      accent: dark.accent,
      accentContrast,
      onSurface: "#111218",
      onSurfaceVariant: "rgba(17, 18, 24, 0.72)",
      borderColor: "rgba(17, 18, 24, 0.14)",
    },
    "light"
  );
}

type ThemeSeed = Omit<ThemeOption, "tokens" | "lightTokens"> & { tokens: SolidTokens };

const THEME_SEEDS: ThemeSeed[] = [
  {
    id: "theme-crimson",
    name: "Crimson Cinema",
    hint: "Velvet crimson & ruby",
    desc: "Signature theatrical obsidian bathed in deep crimson and ruby spotlight gradients",
    preview: "linear-gradient(135deg, #e11d48 0%, #fb7185 50%, #190b14 100%)",
    tokens: token(
      "#0e0a10",
      "#18121c",
      "#251b2b",
      "#e11d48",
      "#ffffff",
      "rgba(225,29,72,0.42)",
      "#fb7185",
      "#19040a",
      "#f8f5f7",
      "rgba(244,230,236,0.68)",
      "rgba(244,63,94,0.22)"
    ),
  },
  {
    id: "theme-sunset",
    name: "Sunset Graphite",
    hint: "Tangerine &rose horizon",
    desc: "Warm dusk horizon blending molten tangerine, coral rose, and deep espresso",
    preview: "linear-gradient(135deg, #f97316 0%, #fb7185 55%, #1c100d 100%)",
    tokens: token(
      "#120b09",
      "#1d1310",
      "#2b1c17",
      "#f97316",
      "#180802",
      "rgba(249,115,22,0.44)",
      "#fb7185",
      "#1f050b",
      "#fbf6f3",
      "rgba(235,214,203,0.7)",
      "rgba(249,115,22,0.24)"
    ),
  },
  {
    id: "theme-aurora",
    name: "Dark Aurora",
    hint: "Emerald teal & electric violet",
    desc: "Boreal sky ribbons of luminous turquoise and ultraviolet over midnight fjords",
    preview: "linear-gradient(135deg, #14b8a6 0%, #8b5cf6 55%, #07131c 100%)",
    tokens: token(
      "#061018",
      "#0d1c28",
      "#152a3b",
      "#2dd4bf",
      "#031815",
      "rgba(45,212,191,0.42)",
      "#a78bfa",
      "#14072b",
      "#ecfdf5",
      "rgba(186,224,214,0.7)",
      "rgba(45,212,191,0.24)"
    ),
  },
  {
    id: "theme-moonlight",
    name: "Moonlight",
    hint: "Celestial sapphire & silver",
    desc: "Luminous lunar sapphire and glacier silver over deep midnight slate",
    preview: "linear-gradient(135deg, #60a5fa 0%, #c7d2fe 55%, #0b1324 100%)",
    tokens: token(
      "#09101d",
      "#111c30",
      "#1a2944",
      "#60a5fa",
      "#061226",
      "rgba(96,165,250,0.42)",
      "#a5b4fc",
      "#0b102b",
      "#f4f7fb",
      "rgba(191,206,228,0.7)",
      "rgba(96,165,250,0.24)"
    ),
  },
  {
    id: "theme-ocean",
    name: "Deep Ocean",
    hint: "Bioluminescent cyan & cobalt",
    desc: "Abyssal marine trenches illuminated by electric aqua and cobalt currents",
    preview: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 55%, #051322 100%)",
    tokens: token(
      "#05111e",
      "#0b1e32",
      "#122d49",
      "#22d3ee",
      "#031c24",
      "rgba(34,211,238,0.42)",
      "#3b82f6",
      "#ffffff",
      "#eef8ff",
      "rgba(176,212,238,0.7)",
      "rgba(34,211,238,0.24)"
    ),
  },
  {
    id: "theme-neon",
    name: "Toxic Neon",
    hint: "Cyber lime & emerald pulse",
    desc: "High-voltage cybernetic lime and emerald laser gradients on bio-carbon",
    preview: "linear-gradient(135deg, #a3e635 0%, #10b981 55%, #091307 100%)",
    tokens: token(
      "#081006",
      "#111f0e",
      "#1a2f15",
      "#a3e635",
      "#0f1c03",
      "rgba(163,230,53,0.42)",
      "#10b981",
      "#031c13",
      "#f2fce8",
      "rgba(195,222,175,0.7)",
      "rgba(163,230,53,0.24)"
    ),
  },
  {
    id: "theme-rose",
    name: "Rose Dusk",
    hint: "Blush sakura & amethyst",
    desc: "Velvet sakura rose and twilightorchid gradients over dusky plum slate",
    preview: "linear-gradient(135deg, #fb7185 0%, #e879f9 55%, #190e1c 100%)",
    tokens: token(
      "#130c16",
      "#1f1424",
      "#2d1e35",
      "#fb7185",
      "#1f050b",
      "rgba(251,113,133,0.4)",
      "#e879f9",
      "#240529",
      "#fdf4f7",
      "rgba(235,205,220,0.7)",
      "rgba(251,113,133,0.24)"
    ),
  },
  {
    id: "theme-sand",
    name: "Sand Storm",
    hint: "Sunlit gold & copper",
    desc: "Mirage dunes of burnished gold, warm amber, and spiced terracotta",
    preview: "linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #1c1309 100%)",
    tokens: token(
      "#130e08",
      "#20180e",
      "#2f2314",
      "#fbbf24",
      "#211502",
      "rgba(251,191,36,0.42)",
      "#f97316",
      "#1f0a02",
      "#fcf6ed",
      "rgba(226,208,184,0.7)",
      "rgba(251,191,36,0.24)"
    ),
  },
  {
    id: "theme-void",
    name: "Void Purple",
    hint: "Ultraviolet & magenta nebula",
    desc: "Deep space singularity pulsing with violet, indigo, and fuchsia nebula light",
    preview: "linear-gradient(135deg, #a855f7 0%, #ec4899 55%, #0c071a 100%)",
    tokens: token(
      "#090614",
      "#140e26",
      "#1f163a",
      "#a855f7",
      "#ffffff",
      "rgba(168,85,247,0.44)",
      "#ec4899",
      "#ffffff",
      "#faf5ff",
      "rgba(216,196,240,0.7)",
      "rgba(168,85,247,0.25)"
    ),
  },
  {
    id: "theme-arctic",
    name: "Arctic Fog",
    hint: "Glacial cyan & sky crystal",
    desc: "Crystalline polar ice sheets reflecting sky-blue and frost-cyan auroras",
    preview: "linear-gradient(135deg, #67e8f9 0%, #38bdf8 55%, #09161c 100%)",
    tokens: token(
      "#081217",
      "#102028",
      "#18303b",
      "#67e8f9",
      "#051d24",
      "rgba(103,232,249,0.42)",
      "#38bdf8",
      "#041a29",
      "#f0faff",
      "rgba(182,216,230,0.7)",
      "rgba(103,232,249,0.24)"
    ),
  },
  {
    id: "theme-amber",
    name: "Amber Twilight",
    hint: "Honey amber & crimson hearth",
    desc: "Rich fireside honey-amber glowing against warm mahogany and ember red",
    preview: "linear-gradient(135deg, #f59e0b 0%, #ef4444 55%, #1d1008 100%)",
    tokens: token(
      "#140c07",
      "#23160d",
      "#342014",
      "#f59e0b",
      "#1f1202",
      "rgba(245,158,11,0.42)",
      "#ef4444",
      "#ffffff",
      "#fff7ed",
      "rgba(230,204,184,0.7)",
      "rgba(245,158,11,0.24)"
    ),
  },
  {
    id: "theme-ember",
    name: "Electric Ember",
    hint: "Volcanic scarlet & magma",
    desc: "Superheated volcanic scarlet and molten orange surging through obsidian",
    preview: "linear-gradient(135deg, #ff5722 0%, #f43f5e 55%, #1b0909 100%)",
    tokens: token(
      "#130808",
      "#221010",
      "#331818",
      "#ff5722",
      "#ffffff",
      "rgba(255,87,34,0.44)",
      "#f43f5e",
      "#ffffff",
      "#fff1f0",
      "rgba(232,195,195,0.7)",
      "rgba(255,87,34,0.25)"
    ),
  },
  {
    id: "theme-lavender",
    name: "Frosted Lavender",
    hint: "Orchid lilac & periwinkle",
    desc: "Dreamlike orchid lavender and soft periwinkle floating over twilight indigo",
    preview: "linear-gradient(135deg, #c084fc 0%, #818cf8 55%, #130e24 100%)",
    tokens: token(
      "#0f0b1c",
      "#1b1530",
      "#282046",
      "#c084fc",
      "#19082b",
      "rgba(192,132,252,0.42)",
      "#818cf8",
      "#090d2b",
      "#faf7ff",
      "rgba(210,198,236,0.7)",
      "rgba(192,132,252,0.24)"
    ),
  },
  {
    id: "theme-cobalt",
    name: "Midnight Cobalt",
    hint: "Royal cobalt & electric indigo",
    desc: "Deep-sea royal cobalt and electric indigo beams cutting through midnight",
    preview: "linear-gradient(135deg, #3b82f6 0%, #6366f1 55%, #070c24 100%)",
    tokens: token(
      "#060a1c",
      "#0e1634",
      "#17234f",
      "#3b82f6",
      "#ffffff",
      "rgba(59,130,246,0.45)",
      "#6366f1",
      "#ffffff",
      "#eff6ff",
      "rgba(180,200,238,0.7)",
      "rgba(59,130,246,0.25)"
    ),
  },
  {
    id: "theme-oasis",
    name: "Neon Oasis",
    hint: "Aquamarine & tropical cyan",
    desc: "Luminous tropical lagoon aquamarine and emerald-cyan over deep jungle slate",
    preview: "linear-gradient(135deg, #00f5d4 0%, #06b6d4 55%, #051917 100%)",
    tokens: token(
      "#051311",
      "#0c2420",
      "#143832",
      "#00f5d4",
      "#02241f",
      "rgba(0,245,212,0.4)",
      "#06b6d4",
      "#021e24",
      "#edfdfb",
      "rgba(176,224,216,0.7)",
      "rgba(0,245,212,0.24)"
    ),
  },
  {
    id: "theme-platinum",
    name: "Platinum Frost",
    hint: "Liquid chrome & titanium blue",
    desc: "High-contrast brushed platinum and cool titanium-blue studio reflections",
    preview: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 55%, #0f141d 100%)",
    tokens: token(
      "#0d1118",
      "#171e2a",
      "#232d3f",
      "#e2e8f0",
      "#0f172a",
      "rgba(226,232,240,0.38)",
      "#38bdf8",
      "#041b29",
      "#f8fafc",
      "rgba(194,206,222,0.7)",
      "rgba(226,232,240,0.22)"
    ),
  },
  {
    id: "theme-sage",
    name: "Shadow Sage",
    hint: "Botanical jade & mint",
    desc: "Lush rainforest jade and vibrant mint canopies over deep mossy charcoal",
    preview: "linear-gradient(135deg, #34d399 0%, #84cc16 55%, #09140e 100%)",
    tokens: token(
      "#08110c",
      "#112118",
      "#1a3325",
      "#34d399",
      "#042115",
      "rgba(52,211,153,0.42)",
      "#a3e635",
      "#112104",
      "#ecfdf5",
      "rgba(182,222,200,0.7)",
      "rgba(52,211,153,0.24)"
    ),
  },
  {
    id: "theme-solar",
    name: "Solar Flare",
    hint: "Helios gold & corona orange",
    desc: "Radiant helios gold and stellar corona orange erupting across deep cosmos",
    preview: "linear-gradient(135deg, #facc15 0%, #f97316 55%, #191306 100%)",
    tokens: token(
      "#130f06",
      "#211a0b",
      "#322811",
      "#facc15",
      "#211802",
      "rgba(250,204,21,0.42)",
      "#f97316",
      "#1f0b02",
      "#fefce8",
      "rgba(230,218,180,0.7)",
      "rgba(250,204,21,0.24)"
    ),
  },
];

function enrichTheme(seed: ThemeSeed): ThemeOption {
  const dark = withGradient(tuneDarkTokens(seed.tokens), "dark");
  return {
    id: seed.id,
    name: seed.name,
    hint: seed.hint,
    desc: seed.desc,
    preview: seed.preview,
    tokens: dark,
    lightTokens: toLightTokens(dark),
  };
}

export const THEME_OPTIONS: ThemeOption[] = THEME_SEEDS.map(enrichTheme);

export const DEFAULT_THEME_ID: ThemeId = "theme-crimson";

/** Product brand theme for splash / auth / profiles */
export const BRAND_THEME_ID: ThemeId = DEFAULT_THEME_ID;
export const DEFAULT_APPEARANCE: AppearanceMode = "dark";
export const APPEARANCE_STORAGE_KEY = "zoku_appearance";

const THEME_MAP = new Map<ThemeId, ThemeOption>(THEME_OPTIONS.map((theme) => [theme.id, theme]));

const LEGACY_THEME_IDS: Record<string, ThemeId> = {
  "Crimson Cinema": "theme-crimson",
  "crimson-cinema": "theme-crimson",
  "theme-default": "theme-crimson",
  default: "theme-crimson",
  "Sunset Graphite": "theme-sunset",
  "sunset-graphite": "theme-sunset",
  "Dark Aurora": "theme-aurora",
  "dark-aurora": "theme-aurora",
  Moonlight: "theme-moonlight",
  moonlight: "theme-moonlight",
  "Deep Ocean": "theme-ocean",
  "deep-ocean": "theme-ocean",
  "Toxic Neon": "theme-neon",
  "toxic-neon": "theme-neon",
  "Rose Dusk": "theme-rose",
  "rose-dusk": "theme-rose",
  "Sand Storm": "theme-sand",
  "sand-storm": "theme-sand",
  "Void Purple": "theme-void",
  "void-purple": "theme-void",
  "Arctic Fog": "theme-arctic",
  "arctic-fog": "theme-arctic",
  "Amber Twilight": "theme-amber",
  "amber-twilight": "theme-amber",
  "Electric Ember": "theme-ember",
  "electric-ember": "theme-ember",
  "Frosted Lavender": "theme-lavender",
  "frosted-lavender": "theme-lavender",
  "Midnight Cobalt": "theme-cobalt",
  "midnight-cobalt": "theme-cobalt",
  "Neon Oasis": "theme-oasis",
  "neon-oasis": "theme-oasis",
  "Platinum Frost": "theme-platinum",
  "platinum-frost": "theme-platinum",
  "Shadow Sage": "theme-sage",
  "shadow-sage": "theme-sage",
  "Solar Flare": "theme-solar",
  "solar-flare": "theme-solar",
  "theme-emerald": "theme-neon",
  "theme-obsidian": "theme-moonlight",
  "theme-cinecho": "theme-void",
};

export const VALID_THEME_IDS = new Set<ThemeId>(THEME_OPTIONS.map((theme) => theme.id));

export function isValidThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && VALID_THEME_IDS.has(value as ThemeId);
}

export function normalizeThemeId(value: unknown): ThemeId {
  if (typeof value === "string" && VALID_THEME_IDS.has(value as ThemeId)) {
    return value as ThemeId;
  }
  if (typeof value === "string" && LEGACY_THEME_IDS[value]) {
    return LEGACY_THEME_IDS[value];
  }
  return DEFAULT_THEME_ID;
}

export function normalizeAppearance(value: unknown): AppearanceMode {
  return value === "light" ? "light" : "dark";
}

export function getThemeOption(id: unknown): ThemeOption {
  return THEME_MAP.get(normalizeThemeId(id)) ?? THEME_MAP.get(DEFAULT_THEME_ID)!;
}

export function resolveThemeTokens(
  themeId: unknown,
  appearance: unknown = DEFAULT_APPEARANCE
): ThemeTokens {
  const theme = getThemeOption(themeId);
  return normalizeAppearance(appearance) === "light" ? theme.lightTokens : theme.tokens;
}

const TOKEN_CSS_MAP: Record<keyof ThemeTokens, string> = {
  background: "--background",
  surface: "--surface",
  surfaceHover: "--surface-hover",
  primary: "--primary",
  primaryContrast: "--primary-contrast",
  primaryGlow: "--primary-glow",
  accent: "--accent",
  accentContrast: "--accent-contrast",
  onSurface: "--on-surface",
  onSurfaceVariant: "--on-surface-variant",
  borderColor: "--border-color",
  backgroundGradient: "--background-gradient",
  surfaceGradient: "--surface-gradient",
  buttonGradient: "--button-gradient",
  orbA: "--orb-a",
  orbB: "--orb-b",
  orbC: "--orb-c",
};

export function applyTheme(
  themeId: unknown,
  appearance: unknown = DEFAULT_APPEARANCE
): ThemeId {
  const id = normalizeThemeId(themeId);
  const mode = normalizeAppearance(appearance);
  const tokens = resolveThemeTokens(id, mode);

  if (typeof document === "undefined") return id;

  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  root.setAttribute("data-appearance", mode);
  root.classList.toggle("appearance-light", mode === "light");
  root.classList.toggle("appearance-dark", mode === "dark");

  for (const [key, cssVar] of Object.entries(TOKEN_CSS_MAP) as [keyof ThemeTokens, string][]) {
    root.style.setProperty(cssVar, tokens[key]);
  }

  if (mode === "light") {
    root.style.setProperty(
      "--shadow-glow",
      `0 12px 32px color-mix(in srgb, ${tokens.primary} 38%, transparent)`
    );
    root.style.setProperty(
      "--shadow-elevated",
      "0 14px 36px rgba(20, 20, 24, 0.14)"
    );
    root.style.setProperty(
      "--shadow-card",
      "0 6px 18px rgba(20, 20, 24, 0.1), 0 2px 6px rgba(20, 20, 24, 0.06)"
    );
    root.style.setProperty(
      "--shadow-card-hover",
      `0 22px 48px color-mix(in srgb, ${tokens.primary} 32%, transparent), 0 12px 28px rgba(20, 20, 24, 0.16)`
    );
  } else {
    root.style.setProperty(
      "--shadow-glow",
      `0 10px 30px color-mix(in srgb, ${tokens.primary} 34%, transparent)`
    );
    root.style.setProperty(
      "--shadow-elevated",
      "0 16px 42px rgba(0, 0, 0, 0.52)"
    );
    root.style.setProperty(
      "--shadow-card",
      "0 8px 24px rgba(0, 0, 0, 0.44), 0 2px 8px rgba(0, 0, 0, 0.28)"
    );
    root.style.setProperty(
      "--shadow-card-hover",
      `0 24px 52px color-mix(in srgb, ${tokens.primary} 40%, transparent), 0 14px 32px rgba(0, 0, 0, 0.52)`
    );
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "light" ? tokens.background : tokens.primary);
  }

  void import("@/lib/pwa-brand").then(({ applyPwaBranding }) => applyPwaBranding(id));

  return id;
}
