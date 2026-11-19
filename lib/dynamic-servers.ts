import { EMBED_SERVER_CATALOG, type EmbedServer } from "@/lib/embed";
import { ANIME_EMBED_SERVER_CATALOG, type AnimeEmbedServer } from "@/lib/anime-embed";

export const SERVER_CONFIG_VERSION = 1;
const DEFAULT_SANDBOX_POLICY =
  "allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation";

export interface CustomTmdbServer {
  id: string;
  name: string;
  movieTemplate: string;
  tvTemplate: string;
  domains: string[];
  supportsSandbox: boolean;
  notes?: string;
  createdAt: string;
}

export interface CustomAnimeServer {
  id: string;
  name: string;
  template: string;
  domains: string[];
  supportsSandbox: boolean;
  notes?: string;
  createdAt: string;
}

export interface DynamicServerConfig {
  version: 1;
  tmdbActiveIds: string[];
  animeActiveIds: string[];
  customTmdbServers: CustomTmdbServer[];
  customAnimeServers: CustomAnimeServer[];
  updatedAt: string;
}

export interface CustomTmdbServerInput {
  id?: string;
  name: string;
  movieTemplate: string;
  tvTemplate: string;
  supportsSandbox?: boolean;
  notes?: string;
}

export interface CustomAnimeServerInput {
  id?: string;
  name: string;
  template: string;
  supportsSandbox?: boolean;
  notes?: string;
}

const BUILTIN_TMDB_MAP = new Map<string, EmbedServer>(
  EMBED_SERVER_CATALOG.map((s) => [s.id, s])
);
const BUILTIN_ANIME_MAP = new Map<string, AnimeEmbedServer>(
  ANIME_EMBED_SERVER_CATALOG.map((s) => [s.id, s])
);

const PREFERRED_DEFAULT_TMDB_IDS = [
  "vidsrc",
  "vidfast",
  "vidlink",
  "embed-su",
  "autoembed",
  "cinezo",
  "fmov",
  "cinetaro",
  "vidy",
  "stellar",
];

export const DEFAULT_ACTIVE_TMDB_SERVER_IDS: string[] = PREFERRED_DEFAULT_TMDB_IDS.filter(
  (id) => BUILTIN_TMDB_MAP.has(id)
);

export const DEFAULT_ACTIVE_ANIME_SERVER_IDS: string[] = ANIME_EMBED_SERVER_CATALOG.map(
  (s) => s.id
);

export function createDefaultServerConfig(): DynamicServerConfig {
  return {
    version: SERVER_CONFIG_VERSION,
    tmdbActiveIds: [...DEFAULT_ACTIVE_TMDB_SERVER_IDS],
    animeActiveIds: [...DEFAULT_ACTIVE_ANIME_SERVER_IDS],
    customTmdbServers: [],
    customAnimeServers: [],
    updatedAt: new Date().toISOString(),
  };
}

function slugifyId(prefix: string, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${base || "server"}-${rand}`;
}

function extractHttpsHost(template: string): { ok: true; host: string } | { ok: false; error: string } {
  const trimmed = template.trim();
  if (!trimmed.startsWith("https://")) {
    return { ok: false, error: "URL template must start with https://" };
  }
  const sample = trimmed
    .replace(/\{tmdbId\}|\{id\}|\{anilistId\}/g, "12345")
    .replace(/\{season\}/g, "1")
    .replace(/\{episode\}/g, "1");
  try {
    const parsed = new URL(sample);
    if (parsed.protocol !== "https:" || !parsed.hostname) {
      return { ok: false, error: "Invalid HTTPS URL template." };
    }
    return { ok: true, host: parsed.hostname.toLowerCase() };
  } catch {
    return { ok: false, error: "URL template could not be parsed as a valid HTTPS URL." };
  }
}

export function validateCustomTmdbServer(
  input: CustomTmdbServerInput
): { ok: true; server: CustomTmdbServer } | { ok: false; error: string } {
  const name = (input.name || "").trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Server name must be between 2 and 60 characters." };
  }

  const movieTemplate = (input.movieTemplate || "").trim();
  const tvTemplate = (input.tvTemplate || "").trim();

  if (!movieTemplate.includes("{tmdbId}") && !movieTemplate.includes("{id}")) {
    return { ok: false, error: "Movie template must include {tmdbId} or {id}." };
  }
  if (!tvTemplate.includes("{tmdbId}") && !tvTemplate.includes("{id}")) {
    return { ok: false, error: "TV template must include {tmdbId} or {id}." };
  }
  if (!tvTemplate.includes("{season}") || !tvTemplate.includes("{episode}")) {
    return { ok: false, error: "TV template must include {season} and {episode}." };
  }

  const movieHost = extractHttpsHost(movieTemplate);
  if (!movieHost.ok) return { ok: false, error: `Movie template: ${movieHost.error}` };
  const tvHost = extractHttpsHost(tvTemplate);
  if (!tvHost.ok) return { ok: false, error: `TV template: ${tvHost.error}` };

  const domains = [...new Set([movieHost.host, tvHost.host])];
  const rawId = (input.id || "").trim();
  const id =
    rawId && /^[a-z0-9][a-z0-9_-]{1,59}$/i.test(rawId) && !BUILTIN_TMDB_MAP.has(rawId)
      ? rawId.toLowerCase()
      : slugifyId("custom-tmdb", name);

  return {
    ok: true,
    server: {
      id,
      name,
      movieTemplate,
      tvTemplate,
      domains,
      supportsSandbox: input.supportsSandbox !== false,
      notes: (input.notes || "").trim().slice(0, 160) || undefined,
      createdAt: new Date().toISOString(),
    },
  };
}

export function validateCustomAnimeServer(
  input: CustomAnimeServerInput
): { ok: true; server: CustomAnimeServer } | { ok: false; error: string } {
  const name = (input.name || "").trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Server name must be between 2 and 60 characters." };
  }

  const template = (input.template || "").trim();
  if (!template.includes("{anilistId}")) {
    return { ok: false, error: "Anime template must include {anilistId}." };
  }

  const hostRes = extractHttpsHost(template);
  if (!hostRes.ok) return { ok: false, error: `Anime template: ${hostRes.error}` };

  const rawId = (input.id || "").trim();
  const id =
    rawId && /^[a-z0-9][a-z0-9_-]{1,59}$/i.test(rawId) && !BUILTIN_ANIME_MAP.has(rawId)
      ? rawId.toLowerCase()
      : slugifyId("custom-anime", name);

  return {
    ok: true,
    server: {
      id,
      name,
      template,
      domains: [hostRes.host],
      supportsSandbox: input.supportsSandbox !== false,
      notes: (input.notes || "").trim().slice(0, 160) || undefined,
      createdAt: new Date().toISOString(),
    },
  };
}

export function customTmdbToEmbedServer(custom: CustomTmdbServer): EmbedServer {
  return {
    id: custom.id,
    name: custom.name,
    domains: custom.domains,
    idTypes: ["tmdb"],
    movieTemplate: custom.movieTemplate,
    tvTemplate: custom.tvTemplate,
    category: "new",
    sandboxPolicy: DEFAULT_SANDBOX_POLICY,
    supportsSandbox: custom.supportsSandbox,
    allowsPopups: !custom.supportsSandbox,
    allowsFullscreen: true,
    testedOnAndroidTV: false,
    isAdHeavy: !custom.supportsSandbox,
  };
}

export function customAnimeToEmbedServer(custom: CustomAnimeServer): AnimeEmbedServer {
  return {
    id: custom.id,
    name: custom.name,
    domains: custom.domains,
    template: custom.template,
    category: "new",
  };
}

export function sanitizeDynamicServerConfig(raw: unknown): DynamicServerConfig {
  const fallback = createDefaultServerConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;

  const customTmdbServers: CustomTmdbServer[] = [];
  const customTmdbIds = new Set<string>();
  if (Array.isArray(obj.customTmdbServers)) {
    for (const entry of obj.customTmdbServers.slice(0, 40)) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const res = validateCustomTmdbServer({
        id: typeof e.id === "string" ? e.id : undefined,
        name: typeof e.name === "string" ? e.name : "",
        movieTemplate: typeof e.movieTemplate === "string" ? e.movieTemplate : "",
        tvTemplate: typeof e.tvTemplate === "string" ? e.tvTemplate : "",
        supportsSandbox: typeof e.supportsSandbox === "boolean" ? e.supportsSandbox : true,
        notes: typeof e.notes === "string" ? e.notes : undefined,
      });
      if (res.ok && !customTmdbIds.has(res.server.id)) {
        customTmdbIds.add(res.server.id);
        customTmdbServers.push({
          ...res.server,
          createdAt: typeof e.createdAt === "string" ? e.createdAt : res.server.createdAt,
        });
      }
    }
  }

  const customAnimeServers: CustomAnimeServer[] = [];
  const customAnimeIds = new Set<string>();
  if (Array.isArray(obj.customAnimeServers)) {
    for (const entry of obj.customAnimeServers.slice(0, 40)) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const res = validateCustomAnimeServer({
        id: typeof e.id === "string" ? e.id : undefined,
        name: typeof e.name === "string" ? e.name : "",
        template: typeof e.template === "string" ? e.template : "",
        supportsSandbox: typeof e.supportsSandbox === "boolean" ? e.supportsSandbox : true,
        notes: typeof e.notes === "string" ? e.notes : undefined,
      });
      if (res.ok && !customAnimeIds.has(res.server.id)) {
        customAnimeIds.add(res.server.id);
        customAnimeServers.push({
          ...res.server,
          createdAt: typeof e.createdAt === "string" ? e.createdAt : res.server.createdAt,
        });
      }
    }
  }

  const dedupeValid = (ids: unknown, isValid: (id: string) => boolean, defaultIds: string[]) => {
    if (!Array.isArray(ids)) return [...defaultIds];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of ids) {
      if (typeof item === "string" && isValid(item) && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
    return out;
  };

  const tmdbActiveIds = dedupeValid(
    obj.tmdbActiveIds,
    (id) => BUILTIN_TMDB_MAP.has(id) || customTmdbIds.has(id),
    DEFAULT_ACTIVE_TMDB_SERVER_IDS
  );
  const animeActiveIds = dedupeValid(
    obj.animeActiveIds,
    (id) => BUILTIN_ANIME_MAP.has(id) || customAnimeIds.has(id),
    DEFAULT_ACTIVE_ANIME_SERVER_IDS
  );

  return {
    version: SERVER_CONFIG_VERSION,
    tmdbActiveIds: tmdbActiveIds.length > 0 ? tmdbActiveIds : [...DEFAULT_ACTIVE_TMDB_SERVER_IDS],
    animeActiveIds: animeActiveIds.length > 0 ? animeActiveIds : [...DEFAULT_ACTIVE_ANIME_SERVER_IDS],
    customTmdbServers,
    customAnimeServers,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

export function resolveActiveTmdbServers(config: DynamicServerConfig): EmbedServer[] {
  const customMap = new Map<string, EmbedServer>(
    config.customTmdbServers.map((c) => [c.id, customTmdbToEmbedServer(c)])
  );
  const resolved: EmbedServer[] = [];
  const seen = new Set<string>();
  for (const id of config.tmdbActiveIds) {
    if (seen.has(id)) continue;
    const server = customMap.get(id) ?? BUILTIN_TMDB_MAP.get(id);
    if (server) {
      seen.add(id);
      resolved.push(server);
    }
  }
  if (resolved.length === 0) {
    return DEFAULT_ACTIVE_TMDB_SERVER_IDS.map((id) => BUILTIN_TMDB_MAP.get(id)!).filter(Boolean);
  }
  return resolved;
}

export function resolveActiveAnimeServers(config: DynamicServerConfig): AnimeEmbedServer[] {
  const customMap = new Map<string, AnimeEmbedServer>(
    config.customAnimeServers.map((c) => [c.id, customAnimeToEmbedServer(c)])
  );
  const resolved: AnimeEmbedServer[] = [];
  const seen = new Set<string>();
  for (const id of config.animeActiveIds) {
    if (seen.has(id)) continue;
    const server = customMap.get(id) ?? BUILTIN_ANIME_MAP.get(id);
    if (server) {
      seen.add(id);
      resolved.push(server);
    }
  }
  if (resolved.length === 0) {
    return [...ANIME_EMBED_SERVER_CATALOG];
  }
  return resolved;
}

export function getAvailableBuiltInTmdbServers(config: DynamicServerConfig): EmbedServer[] {
  const activeSet = new Set(config.tmdbActiveIds);
  return EMBED_SERVER_CATALOG.filter((s) => !activeSet.has(s.id));
}

export function getAvailableBuiltInAnimeServers(config: DynamicServerConfig): AnimeEmbedServer[] {
  const activeSet = new Set(config.animeActiveIds);
  return ANIME_EMBED_SERVER_CATALOG.filter((s) => !activeSet.has(s.id));
}

export function isCustomServerId(config: DynamicServerConfig, kind: "tmdb" | "anime", id: string): boolean {
  return kind === "tmdb"
    ? config.customTmdbServers.some((s) => s.id === id)
    : config.customAnimeServers.some((s) => s.id === id);
}

export function exportServerConfigJson(config: DynamicServerConfig): string {
  const payload = {
    app: "zoku-tv",
    schema: "dynamic-servers",
    version: SERVER_CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    tmdbActiveIds: config.tmdbActiveIds,
    animeActiveIds: config.animeActiveIds,
    customTmdbServers: config.customTmdbServers,
    customAnimeServers: config.customAnimeServers,
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportServerSummary {
  tmdbActiveCount: number;
  animeActiveCount: number;
  customTmdbCount: number;
  customAnimeCount: number;
}

export function importServerConfigJson(
  rawJson: string,
  currentConfig: DynamicServerConfig,
  mode: "merge" | "replace"
):
  | { ok: true; config: DynamicServerConfig; summary: ImportServerSummary }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Invalid JSON syntax. Please verify the file or pasted JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Imported JSON must be a configuration object." };
  }

  const obj = parsed as Record<string, unknown>;
  const hasAnyKey =
    "tmdbActiveIds" in obj ||
    "animeActiveIds" in obj ||
    "customTmdbServers" in obj ||
    "customAnimeServers" in obj;
  if (!hasAnyKey) {
    return {
      ok: false,
      error:
        "JSON does not contain any Zoku TV server lists (tmdbActiveIds, animeActiveIds, customTmdbServers, or customAnimeServers).",
    };
  }

  const incoming = sanitizeDynamicServerConfig(obj);
  const now = new Date().toISOString();

  let nextConfig: DynamicServerConfig;
  if (mode === "replace") {
    nextConfig = { ...incoming, updatedAt: now };
  } else {
    // Merge custom servers by id (incoming updates matching id, preserves others)
    const mergedCustomTmdbMap = new Map<string, CustomTmdbServer>();
    for (const s of currentConfig.customTmdbServers) mergedCustomTmdbMap.set(s.id, s);
    for (const s of incoming.customTmdbServers) mergedCustomTmdbMap.set(s.id, s);

    const mergedCustomAnimeMap = new Map<string, CustomAnimeServer>();
    for (const s of currentConfig.customAnimeServers) mergedCustomAnimeMap.set(s.id, s);
    for (const s of incoming.customAnimeServers) mergedCustomAnimeMap.set(s.id, s);

    const mergedTmdbActive = [
      ...new Set([...currentConfig.tmdbActiveIds, ...incoming.tmdbActiveIds]),
    ];
    const mergedAnimeActive = [
      ...new Set([...currentConfig.animeActiveIds, ...incoming.animeActiveIds]),
    ];

    nextConfig = sanitizeDynamicServerConfig({
      version: SERVER_CONFIG_VERSION,
      tmdbActiveIds: mergedTmdbActive,
      animeActiveIds: mergedAnimeActive,
      customTmdbServers: [...mergedCustomTmdbMap.values()],
      customAnimeServers: [...mergedCustomAnimeMap.values()],
      updatedAt: now,
    });
  }

  return {
    ok: true,
    config: nextConfig,
    summary: {
      tmdbActiveCount: nextConfig.tmdbActiveIds.length,
      animeActiveCount: nextConfig.animeActiveIds.length,
      customTmdbCount: nextConfig.customTmdbServers.length,
      customAnimeCount: nextConfig.customAnimeServers.length,
    },
  };
}

function storageKey(profileId?: string | null): string {
  return `zoku_dynamic_servers_v1_${profileId || "default"}`;
}

export function readLocalServerConfig(profileId?: string | null): DynamicServerConfig {
  if (typeof window === "undefined") return createDefaultServerConfig();
  try {
    const raw =
      localStorage.getItem(storageKey(profileId)) ??
      localStorage.getItem(storageKey(null));
    if (!raw) return createDefaultServerConfig();
    return sanitizeDynamicServerConfig(JSON.parse(raw));
  } catch {
    return createDefaultServerConfig();
  }
}

export function writeLocalServerConfig(
  config: DynamicServerConfig,
  profileId?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(config);
    localStorage.setItem(storageKey(profileId), serialized);
    localStorage.setItem(storageKey(null), serialized);
  } catch {
    /* ignore storage quota / private mode errors */
  }
}
