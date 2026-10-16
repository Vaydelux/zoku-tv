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

type SolidTokens = Omit<ThemeTokens, "backgroundGradient">;

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
  return luminance > 0.45 ? "#141418" : "#ffffff";
}

/** Lift near-black shells slightly — keep cool, avoid washed mud */
function liftHex(hex: string, amount = 0.1): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const lifted = rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * amount)));
  return `#${lifted.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Nudge warm/muddy dark shells toward cool slate without killing theme hue */
function coolMix(hex: string, slate = "#151922", amount = 0.35): string {
  const a = parseHex(hex);
  const b = parseHex(slate);
  if (!a || !b) return hex;
  const mixed = a.map((c, i) => Math.round(c * (1 - amount) + b[i] * amount));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function softenDarkTokens(tokens: SolidTokens): SolidTokens {
  return {
    ...tokens,
    background: liftHex(coolMix(tokens.background, "#12151c", 0.4), 0.08),
    surface: liftHex(coolMix(tokens.surface, "#1a1e28", 0.32), 0.06),
    surfaceHover: liftHex(coolMix(tokens.surfaceHover, "#242a36", 0.28), 0.05),
  };
}

function withGradient(tokens: SolidTokens, mode: AppearanceMode): ThemeTokens {
  const bg = tokens.background;
  const primary = tokens.primary;
  /** Cool slate atmosphere + whisper of primary — no muddy pink wash */
  const backgroundGradient =
    mode === "dark"
      ? [
          `radial-gradient(ellipse 105% 70% at 6% -10%, color-mix(in srgb, #64748b 22%, transparent), transparent 58%)`,
          `radial-gradient(ellipse 85% 55% at 98% 5%, color-mix(in srgb, ${primary} 9%, transparent), transparent 52%)`,
          `radial-gradient(ellipse 75% 50% at 48% 108%, color-mix(in srgb, #334155 16%, transparent), transparent 58%)`,
          `linear-gradient(175deg, ${bg} 0%, color-mix(in srgb, ${bg} 88%, #1c2230) 48%, color-mix(in srgb, ${bg} 78%, #0f1218) 100%)`,
        ].join(", ")
      : [
          `radial-gradient(ellipse 100% 60% at 8% 0%, color-mix(in srgb, #94a3b8 14%, transparent), transparent 52%)`,
          `radial-gradient(ellipse 80% 50% at 100% 18%, color-mix(in srgb, ${primary} 8%, transparent), transparent 48%)`,
          `linear-gradient(170deg, ${bg} 0%, color-mix(in srgb, ${bg} 92%, #e8ecf2) 50%, ${tokens.surface} 100%)`,
        ].join(", ");

  return { ...tokens, backgroundGradient };
}

function toLightTokens(dark: ThemeTokens): ThemeTokens {
  const primaryContrast = contrastOn(dark.primary);
  const accentContrast = contrastOn(dark.accent);
  const rgb = parseHex(dark.primary);
  const glow = rgb
    ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.28)`
    : dark.primaryGlow;

  return withGradient(
    {
      background: "#f0eef2",
      surface: "#ffffff",
      surfaceHover: "#e8e6ec",
      primary: dark.primary,
      primaryContrast,
      primaryGlow: glow,
      accent: dark.accent,
      accentContrast,
      onSurface: "#121218",
      onSurfaceVariant: "rgba(18, 18, 24, 0.72)",
      borderColor: "rgba(18, 18, 24, 0.14)",
    },
    "light"
  );
}

type ThemeSeed = Omit<ThemeOption, "tokens" | "lightTokens"> & { tokens: SolidTokens };

const THEME_SEEDS: ThemeSeed[] = [
  {
    id: "theme-sunset",
    name: "Sunset Graphite",
    hint: "Warm orange embers",
    desc: "Warm dusky graphite with ember-orange highlights",
    preview: "bg-gradient-to-br from-orange-500 to-stone-700",
    tokens: token("#100d0b", "#191411", "#241c17", "#f97316", "#1b0b03", "rgba(249,115,22,0.4)", "#fb923c", "#1b0b03", "#f7f7f9", "#b8a498", "rgba(249,115,22,0.22)"),
  },
  {
    id: "theme-aurora",
    name: "Dark Aurora",
    hint: "Teal + violet electric",
    desc: "Cosmic boreal luminescence with electric violet accents",
    preview: "bg-gradient-to-br from-teal-400 to-violet-600",
    tokens: token("#050b12", "#0b1520", "#102230", "#2dd4bf", "#031412", "rgba(45,212,191,0.4)", "#a78bfa", "#16082e", "#e6f4ea", "#8ea194", "rgba(45,212,191,0.22)"),
  },
  {
    id: "theme-moonlight",
    name: "Moonlight",
    hint: "Silver-blue minimal",
    desc: "Cool monochrome silver-blue minimal cinema",
    preview: "bg-gradient-to-br from-slate-200 to-blue-500",
    tokens: token("#0b101a", "#141b28", "#1c2637", "#93c5fd", "#0b172a", "rgba(147,197,253,0.4)", "#cbd5e1", "#0b172a", "#f8fafc", "#94a3b8", "rgba(147,197,253,0.2)"),
  },
  {
    id: "theme-crimson",
    name: "Crimson Cinema",
    hint: "Cool charcoal + red",
    desc: "Cool slate cinema shell with restrained crimson accents",
    preview: "bg-gradient-to-br from-red-500 to-slate-900",
    tokens: token(
      "#12141a",
      "#1a1d26",
      "#252a36",
      "#e11d48",
      "#ffffff",
      "rgba(225,29,72,0.35)",
      "#f43f5e",
      "#ffffff",
      "#f4f4f5",
      "rgba(228,228,231,0.62)",
      "rgba(255,255,255,0.09)"
    ),
  },
  {
    id: "theme-ocean",
    name: "Deep Ocean",
    hint: "Sapphire navy",
    desc: "Abyssal indigo marine depths with cyan glow",
    preview: "bg-gradient-to-br from-cyan-400 to-blue-900",
    tokens: token("#06111c", "#0b1b2b", "#10263a", "#38bdf8", "#042033", "rgba(56,189,248,0.4)", "#22d3ee", "#042033", "#eef4f8", "#8da9c4", "rgba(56,189,248,0.22)"),
  },
  {
    id: "theme-neon",
    name: "Toxic Neon",
    hint: "Acid green edge",
    desc: "Cyberpunk acid radioactive green edge lighting",
    preview: "bg-gradient-to-br from-lime-300 to-green-950",
    tokens: token("#070b05", "#10170b", "#192411", "#bef264", "#132004", "rgba(190,242,100,0.4)", "#a3e635", "#132004", "#e5e2e3", "#b4bf9a", "rgba(190,242,100,0.24)"),
  },
  {
    id: "theme-rose",
    name: "Rose Dusk",
    hint: "Soft rose on slate",
    desc: "Cool slate dusk with soft rose accents — no muddy plum wash",
    preview: "bg-gradient-to-br from-rose-300 to-slate-900",
    tokens: token(
      "#13151c",
      "#1c2030",
      "#282e40",
      "#fb7185",
      "#1a0610",
      "rgba(251,113,133,0.35)",
      "#fda4af",
      "#1a0610",
      "#faf5f6",
      "rgba(228,218,222,0.62)",
      "rgba(255,255,255,0.09)"
    ),
  },
  {
    id: "theme-sand",
    name: "Sand Storm",
    hint: "Caramel gold earth",
    desc: "Arid desert gold grain dune warmth",
    preview: "bg-gradient-to-br from-amber-300 to-stone-800",
    tokens: token("#110e09", "#1b1610", "#282015", "#fbbf24", "#241703", "rgba(251,191,36,0.4)", "#f59e0b", "#241703", "#f4eae1", "#b09f8f", "rgba(251,191,36,0.22)"),
  },
  {
    id: "theme-void",
    name: "Void Purple",
    hint: "Space indigo",
    desc: "Deep ultraviolet event horizon nebula",
    preview: "bg-gradient-to-br from-indigo-400 to-violet-950",
    tokens: token("#070611", "#100d1d", "#19142b", "#a78bfa", "#16082e", "rgba(167,139,250,0.4)", "#818cf8", "#0d1035", "#f9f5fc", "#a28cb8", "rgba(167,139,250,0.22)"),
  },
  {
    id: "theme-arctic",
    name: "Arctic Fog",
    hint: "Icy cyan steel",
    desc: "Chilled glacial frost silver mist",
    preview: "bg-gradient-to-br from-cyan-200 to-slate-700",
    tokens: token("#081014", "#101c21", "#17272d", "#a5f3fc", "#082128", "rgba(165,243,252,0.4)", "#67e8f9", "#082128", "#f0f5f9", "#94a3b0", "rgba(165,243,252,0.22)"),
  },
  {
    id: "theme-amber",
    name: "Amber Twilight",
    hint: "Fireside orange glow",
    desc: "Cozy warm fireside amber evening light",
    preview: "bg-gradient-to-br from-amber-400 to-orange-950",
    tokens: token("#140e0a", "#261b13", "#3a281c", "#f39c12", "#241703", "rgba(243,156,18,0.4)", "#fbbf24", "#241703", "#fdf5f0", "#beaa9d", "rgba(243,156,18,0.22)"),
  },
  {
    id: "theme-ember",
    name: "Electric Ember",
    hint: "Molten magma orange",
    desc: "Supercharged molten magma orange heat",
    preview: "bg-gradient-to-br from-orange-500 to-red-950",
    tokens: token("#120909", "#241313", "#381d1d", "#ff4500", "#1a0500", "rgba(255,69,0,0.4)", "#ff6b35", "#1a0500", "#faeeee", "#c09e9e", "rgba(255,69,0,0.22)"),
  },
  {
    id: "theme-lavender",
    name: "Frosted Lavender",
    hint: "Chilled violet floral",
    desc: "Chilled violet floral moonlit glow",
    preview: "bg-gradient-to-br from-violet-300 to-indigo-950",
    tokens: token("#110e1a", "#1f1b30", "#2e2847", "#c7a4ff", "#1a0f2e", "rgba(199,164,255,0.4)", "#d8b4fe", "#1a0f2e", "#faf9fd", "#ab9ebf", "rgba(199,164,255,0.22)"),
  },
  {
    id: "theme-cobalt",
    name: "Midnight Cobalt",
    hint: "Electric blue nebula",
    desc: "Intense electric blue midnight nebula",
    preview: "bg-gradient-to-br from-blue-500 to-indigo-950",
    tokens: token("#050814", "#0c122b", "#141e45", "#1e88e5", "#ffffff", "rgba(30,136,229,0.4)", "#60a5fa", "#04122b", "#edf4fa", "#8ea1bf", "rgba(30,136,229,0.22)"),
  },
  {
    id: "theme-oasis",
    name: "Neon Oasis",
    hint: "Synthetic digital cyan",
    desc: "Futuristic synthetic digital oasis cyan",
    preview: "bg-gradient-to-br from-teal-300 to-emerald-950",
    tokens: token("#051210", "#0d2621", "#153d35", "#00ffcc", "#042a24", "rgba(0,255,204,0.35)", "#2dd4bf", "#042a24", "#edfbf7", "#8caea7", "rgba(0,255,204,0.22)"),
  },
  {
    id: "theme-platinum",
    name: "Platinum Frost",
    hint: "Ice metallic silver",
    desc: "Bright ice metallic luxury silver frost",
    preview: "bg-gradient-to-br from-slate-200 to-slate-700",
    tokens: token("#10141a", "#1d232e", "#2b3342", "#e2e8f0", "#111827", "rgba(226,232,240,0.35)", "#cbd5e1", "#111827", "#f8fafc", "#94a3b8", "rgba(226,232,240,0.2)"),
  },
  {
    id: "theme-sage",
    name: "Shadow Sage",
    hint: "Deep herbal forest",
    desc: "Organic botanical deep herbal forest calm",
    preview: "bg-gradient-to-br from-green-400 to-emerald-950",
    tokens: token("#0a0f0c", "#14211a", "#1e3328", "#78e08f", "#0d1f14", "rgba(120,224,143,0.4)", "#86efac", "#0d1f14", "#edfbf2", "#94bba2", "rgba(120,224,143,0.22)"),
  },
  {
    id: "theme-solar",
    name: "Solar Flare",
    hint: "Interstellar solar corona",
    desc: "Blazing interstellar solar corona gold",
    preview: "bg-gradient-to-br from-yellow-400 to-orange-950",
    tokens: token("#141007", "#241d0e", "#362c15", "#f1c40f", "#2a1f03", "rgba(241,196,15,0.4)", "#fbbf24", "#2a1f03", "#fefcf3", "#bfb294", "rgba(241,196,15,0.22)"),
  },
];

function enrichTheme(seed: ThemeSeed): ThemeOption {
  const dark = withGradient(softenDarkTokens(seed.tokens), "dark");
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

/** Product brand theme for splash / auth / profiles (locked crimson cinema) */
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
      `0 10px 28px color-mix(in srgb, ${tokens.primary} 28%, transparent)`
    );
    root.style.setProperty(
      "--shadow-elevated",
      "0 14px 36px rgba(0, 0, 0, 0.45)"
    );
    root.style.setProperty(
      "--shadow-card",
      "0 8px 22px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25)"
    );
    root.style.setProperty(
      "--shadow-card-hover",
      `0 24px 52px color-mix(in srgb, ${tokens.primary} 36%, transparent), 0 14px 32px rgba(0, 0, 0, 0.5)`
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
