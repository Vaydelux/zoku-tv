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
};

export type ThemeOption = {
  id: ThemeId;
  name: string;
  hint: string;
  desc: string;
  preview: string;
  tokens: ThemeTokens;
};

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
): ThemeTokens => ({
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

export const THEME_OPTIONS: ThemeOption[] = [
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
    hint: "Deep red velvet",
    desc: "Default dark cinematic crimson velvet branding",
    preview: "bg-gradient-to-br from-red-500 to-rose-900",
    tokens: token("#0a0a0b", "#111112", "#1b1b1c", "#e11d48", "#ffffff", "rgba(225,29,72,0.4)", "#fb7185", "#280307", "#ffffff", "rgba(255,255,255,0.68)", "rgba(255,255,255,0.1)"),
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
    hint: "Dusty pink plum",
    desc: "Ethereal mauve dusky twilight romance",
    preview: "bg-gradient-to-br from-rose-300 to-fuchsia-950",
    tokens: token("#120910", "#1d1020", "#29152c", "#f9a8d4", "#2c0922", "rgba(249,168,212,0.4)", "#e879f9", "#2c0922", "#faeef0", "#c09eb2", "rgba(249,168,212,0.22)"),
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

export const DEFAULT_THEME_ID: ThemeId = "theme-crimson";

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

export function getThemeOption(id: unknown): ThemeOption {
  return THEME_MAP.get(normalizeThemeId(id)) ?? THEME_MAP.get(DEFAULT_THEME_ID)!;
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
};

export function applyTheme(themeId: unknown): ThemeId {
  const id = normalizeThemeId(themeId);
  const theme = getThemeOption(id);

  if (typeof document === "undefined") return id;

  const root = document.documentElement;
  root.setAttribute("data-theme", id);

  for (const [key, cssVar] of Object.entries(TOKEN_CSS_MAP) as [keyof ThemeTokens, string][]) {
    root.style.setProperty(cssVar, theme.tokens[key]);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme.tokens.primary);
  }

  void import("@/lib/pwa-brand").then(({ applyPwaBranding }) => applyPwaBranding(id));

  return id;
}
