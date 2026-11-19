"use client";

import { useMemo, useRef, useState } from "react";
import {
  Server,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Tv,
  Sparkles,
  Shield,
  ShieldOff,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { useDynamicServerStore } from "@/stores";
import {
  getAvailableBuiltInTmdbServers,
  getAvailableBuiltInAnimeServers,
  resolveActiveTmdbServers,
  resolveActiveAnimeServers,
  isCustomServerId,
  exportServerConfigJson,
} from "@/lib/dynamic-servers";
import { EMBED_SERVER_CATALOG } from "@/lib/embed";
import { ANIME_EMBED_SERVER_CATALOG } from "@/lib/anime-embed";

interface DynamicServersPanelProps {
  onNotifySuccess?: (msg: string) => void;
  onNotifyError?: (msg: string) => void;
}

export function DynamicServersPanel({
  onNotifySuccess,
  onNotifyError,
}: DynamicServersPanelProps) {
  const {
    config,
    addBuiltInServer,
    removeActiveServer,
    moveActiveServer,
    addAllBuiltIns,
    resetDefaults,
    addCustomTmdbServer,
    addCustomAnimeServer,
    deleteCustomServer,
    importConfigJson,
  } = useDynamicServerStore();

  const [domainTab, setDomainTab] = useState<"tmdb" | "anime">("tmdb");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showJsonPanel, setShowJsonPanel] = useState(false);

  // Custom Server Form State
  const [customName, setCustomName] = useState("");
  const [customMovieTemplate, setCustomMovieTemplate] = useState("");
  const [customTvTemplate, setCustomTvTemplate] = useState("");
  const [customAnimeTemplate, setCustomAnimeTemplate] = useState("");
  const [customSandbox, setCustomSandbox] = useState(true);
  const [customNotes, setCustomNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // JSON Export / Import State
  const [jsonInput, setJsonInput] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [copiedJson, setCopiedJson] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTmdb = useMemo(() => resolveActiveTmdbServers(config), [config]);
  const activeAnime = useMemo(() => resolveActiveAnimeServers(config), [config]);
  const availableBuiltInTmdb = useMemo(() => getAvailableBuiltInTmdbServers(config), [config]);
  const availableBuiltInAnime = useMemo(() => getAvailableBuiltInAnimeServers(config), [config]);

  const activeList = domainTab === "tmdb" ? activeTmdb : activeAnime;
  const availableList = domainTab === "tmdb" ? availableBuiltInTmdb : availableBuiltInAnime;
  const totalBuiltInCount =
    domainTab === "tmdb" ? EMBED_SERVER_CATALOG.length : ANIME_EMBED_SERVER_CATALOG.length;

  const filteredAvailable = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return availableList;
    return availableList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.domains.some((d) => d.toLowerCase().includes(q))
    );
  }, [availableList, libraryQuery]);

  const handleAddCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (domainTab === "tmdb") {
      const res = await addCustomTmdbServer({
        name: customName,
        movieTemplate: customMovieTemplate,
        tvTemplate: customTvTemplate,
        supportsSandbox: customSandbox,
        notes: customNotes,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      onNotifySuccess?.(`Added custom Movies & TV server "${res.server.name}".`);
    } else {
      const res = await addCustomAnimeServer({
        name: customName,
        template: customAnimeTemplate,
        supportsSandbox: customSandbox,
        notes: customNotes,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      onNotifySuccess?.(`Added custom Anime server "${res.server.name}".`);
    }

    setCustomName("");
    setCustomMovieTemplate("");
    setCustomTvTemplate("");
    setCustomAnimeTemplate("");
    setCustomNotes("");
    setCustomSandbox(true);
    setShowCustomForm(false);
  };

  const handleDownloadJson = () => {
    const json = exportServerConfigJson(config);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zoku-tv-servers-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotifySuccess?.("Exported server configuration JSON file.");
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportServerConfigJson(config));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
      onNotifySuccess?.("Copied server JSON to clipboard.");
    } catch {
      onNotifyError?.("Clipboard access blocked. Use Download JSON instead.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setJsonInput(reader.result);
        setImportError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleApplyImport = async () => {
    setImportError(null);
    if (!jsonInput.trim()) {
      setImportError("Paste JSON or upload a .json backup file first.");
      return;
    }
    const res = await importConfigJson(jsonInput, importMode);
    if (!res.ok) {
      setImportError(res.error);
      return;
    }
    setJsonInput("");
    onNotifySuccess?.(
      `Imported server config (${res.summary.tmdbActiveCount} Movie/TV · ${res.summary.animeActiveCount} Anime · ${
        res.summary.customTmdbCount + res.summary.customAnimeCount
      } Custom).`
    );
  };

  const livePreviewUrl = useMemo(() => {
    if (domainTab === "tmdb") {
      if (!customMovieTemplate.trim()) return null;
      return customMovieTemplate
        .trim()
        .replace(/\{tmdbId\}|\{id\}/g, "27205");
    }
    if (!customAnimeTemplate.trim()) return null;
    return customAnimeTemplate
      .trim()
      .replace(/\{anilistId\}/g, "16498")
      .replace(/\{season\}/g, "1")
      .replace(/\{episode\}/g, "1");
  }, [domainTab, customMovieTemplate, customAnimeTemplate]);

  return (
    <div className="space-y-6" data-testid="dynamic-servers-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <span>Dynamic Playback Servers</span>
          </h2>
          <p className="text-xs text-on-surface-variant">
            Pick which built-in servers appear in your player, add your own HTTPS servers, and export or import your cached server list as JSON.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowJsonPanel((v) => !v)}
          data-testid="toggle-json-backup-btn"
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto ${
            showJsonPanel
              ? "border-primary bg-primary/15 text-primary"
              : "border-border-custom bg-background/50 text-on-surface hover:border-primary"
          }`}
        >
          <FileJson className="h-4 w-4" />
          <span>JSON Export / Import</span>
        </button>
      </div>

      {/* JSON Export / Import Drawer */}
      {showJsonPanel && (
        <div
          data-testid="server-json-panel"
          className="rounded-2xl border border-primary/30 bg-background/60 p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Backup &amp; Restore Server Cache (JSON)
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Export your active built-in picks and custom servers to move across devices or TV browsers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                data-testid="export-servers-download-btn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-contrast hover:brightness-110 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                data-testid="export-servers-copy-btn"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary transition-colors"
              >
                {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-border-custom pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-on-surface-variant">
                  Import Mode:
                </span>
                <div className="theme-panel flex rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setImportMode("merge")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      importMode === "merge"
                        ? "bg-primary text-primary-contrast"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      importMode === "replace"
                        ? "bg-primary text-primary-contrast"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Replace All
                  </button>
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface hover:border-primary transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Load .json File</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setImportError(null);
              }}
              placeholder='Paste exported JSON here (e.g. { "version": 1, "tmdbActiveIds": [...], "customTmdbServers": [...] })'
              data-testid="import-servers-textarea"
              className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 font-mono text-[11px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />

            {importError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyImport}
                data-testid="import-servers-apply-btn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-contrast hover:brightness-110 transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import Servers ({importMode === "merge" ? "Merge" : "Replace"})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movies/TV vs Anime Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="theme-panel flex rounded-xl p-1 self-start" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={domainTab === "tmdb"}
            data-testid="servers-tab-tmdb"
            onClick={() => {
              setDomainTab("tmdb");
              setLibraryQuery("");
              setFormError(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
              domainTab === "tmdb"
                ? "bg-primary text-primary-contrast"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span>Movies &amp; TV ({activeTmdb.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={domainTab === "anime"}
            data-testid="servers-tab-anime"
            onClick={() => {
              setDomainTab("anime");
              setLibraryQuery("");
              setFormError(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
              domainTab === "anime"
                ? "bg-primary text-primary-contrast"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Anime ({activeAnime.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCustomForm((v) => !v);
              setFormError(null);
            }}
            data-testid="toggle-add-custom-server-btn"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 border border-primary/40 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Server</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await resetDefaults(domainTab);
              onNotifySuccess?.(
                `Reset ${domainTab === "tmdb" ? "Movies & TV" : "Anime"} active servers to curated defaults.`
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/40 px-3 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Add Custom Server Form */}
      {showCustomForm && (
        <form
          onSubmit={handleAddCustomSubmit}
          data-testid="custom-server-form"
          className="rounded-2xl border border-primary/35 bg-background/60 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Add Custom {domainTab === "tmdb" ? "Movies & TV" : "Anime"} Server
            </h3>
            <span className="text-[10px] font-mono text-on-surface-variant">HTTPS Only</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-on-surface-variant">
                Server Name
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={domainTab === "tmdb" ? "e.g. My Fast Mirror" : "e.g. My Anime Mirror"}
                data-testid="custom-server-name-input"
                className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-on-surface-variant">
                Optional Note
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Low ads, fast 1080p"
                className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {domainTab === "tmdb" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-on-surface-variant">
                  Movie URL Template (must include {"{tmdbId}"} or {"{id}"})
                </label>
                <input
                  type="text"
                  required
                  value={customMovieTemplate}
                  onChange={(e) => setCustomMovieTemplate(e.target.value)}
                  placeholder="https://example.com/embed/movie/{tmdbId}"
                  data-testid="custom-movie-template-input"
                  className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 font-mono text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-on-surface-variant">
                  TV URL Template (must include {"{tmdbId}"}, {"{season}"}, {"{episode}"})
                </label>
                <input
                  type="text"
                  required
                  value={customTvTemplate}
                  onChange={(e) => setCustomTvTemplate(e.target.value)}
                  placeholder="https://example.com/embed/tv/{tmdbId}/{season}/{episode}"
                  data-testid="custom-tv-template-input"
                  className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 font-mono text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-on-surface-variant">
                Anime URL Template (must include {"{anilistId}"}; optional {"{season}"}, {"{episode}"})
              </label>
              <input
                type="text"
                required
                value={customAnimeTemplate}
                onChange={(e) => setCustomAnimeTemplate(e.target.value)}
                placeholder="https://example.com/embed/anime/{anilistId}/{season}/{episode}"
                data-testid="custom-anime-template-input"
                className="w-full rounded-xl border border-border-custom bg-background px-3 py-2 font-mono text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {livePreviewUrl && (
            <div className="rounded-xl border border-border-custom bg-surface/60 px-3 py-2 text-[11px] font-mono text-on-surface-variant truncate">
              Preview: <span className="text-primary">{livePreviewUrl}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCustomSandbox((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                customSandbox
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                  : "border-border-custom bg-surface text-on-surface-variant"
              }`}
            >
              {customSandbox ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
              <span>{customSandbox ? "Strict Sandbox Supported" : "Compatibility Mode Only"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="rounded-xl border border-border-custom px-3.5 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="custom-server-submit-btn"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-contrast hover:brightness-110 transition-all"
              >
                Save Custom Server
              </button>
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </form>
      )}

      {/* Active Servers List (Ordered) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
            Active in Player ({activeList.length}) · Ordered by priority
          </h3>
          <span className="text-[11px] text-on-surface-variant">
            Top server is preferred for Next Server cycling
          </span>
        </div>

        <div className="space-y-2" data-testid="active-servers-list">
          {activeList.map((server, idx) => {
            const isCustom = isCustomServerId(config, domainTab, server.id);
            const primaryDomain = server.domains[0] || "";
            return (
              <div
                key={server.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-custom bg-background/45 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold text-on-surface-variant w-5 tabular-nums">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface truncate">
                        {server.name}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          isCustom
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-surface text-on-surface-variant border border-border-custom"
                        }`}
                      >
                        {isCustom ? "Custom" : "Built-In"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-on-surface-variant truncate">
                      {primaryDomain}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveActiveServer(domainTab, server.id, "up")}
                    aria-label={`Move ${server.name} up`}
                    className="p-1.5 rounded-lg border border-border-custom text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === activeList.length - 1}
                    onClick={() => moveActiveServer(domainTab, server.id, "down")}
                    aria-label={`Move ${server.name} down`}
                    className="p-1.5 rounded-lg border border-border-custom text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeList.length <= 1}
                    onClick={() => {
                      if (isCustom) {
                        void deleteCustomServer(domainTab, server.id);
                      } else {
                        void removeActiveServer(domainTab, server.id);
                      }
                    }}
                    aria-label={isCustom ? `Delete custom server ${server.name}` : `Remove ${server.name}`}
                    className="p-1.5 rounded-lg border border-border-custom text-on-surface-variant hover:border-red-500/50 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Built-In Server Library Picker */}
      <section className="space-y-3 pt-4 border-t border-border-custom">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
              Built-In Server Library ({availableList.length} available of {totalBuiltInCount})
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Add any built-in provider whenever you want it in your player dropdown.
            </p>
          </div>
          {availableList.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await addAllBuiltIns(domainTab);
                onNotifySuccess?.(`Added all built-in ${domainTab === "tmdb" ? "Movies & TV" : "Anime"} servers.`);
              }}
              data-testid="add-all-builtins-btn"
              className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-colors self-start sm:self-auto"
            >
              Add All Built-Ins
            </button>
          )}
        </div>

        {availableList.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
            <input
              type="text"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder={`Search built-in ${domainTab === "tmdb" ? "Movie & TV" : "Anime"} servers by name or domain...`}
              className="w-full rounded-xl border border-border-custom bg-background pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {filteredAvailable.length > 0 ? (
          <div className="custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredAvailable.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-custom bg-background/30 px-3 py-2.5 hover:border-primary/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface truncate">{server.name}</p>
                  <p className="text-[10px] font-mono text-on-surface-variant truncate">
                    {server.domains[0]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addBuiltInServer(domainTab, server.id)}
                  data-testid={`add-builtin-${server.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/35 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-contrast transition-colors shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-custom py-6 text-center text-xs text-on-surface-variant">
            {availableList.length === 0
              ? "All built-in servers for this category are already active in your player."
              : "No built-in servers match your search."}
          </p>
        )}
      </section>
    </div>
  );
}
