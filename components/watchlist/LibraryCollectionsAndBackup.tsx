"use client";

import { useRef, useState } from "react";
import {
  FolderPlus,
  FolderHeart,
  Trash2,
  Pencil,
  Check,
  X,
  Download,
  Upload,
  Copy,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import {
  useCustomCollectionsStore,
  useWatchlistStore,
  useWatchHistoryStore,
  useSessionStore,
} from "@/stores";
import { exportLibraryBackupJson, type CustomCollection } from "@/lib/custom-collections";

interface LibraryCollectionsAndBackupProps {
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onNotify: (msg: string) => void;
}

export function LibraryCollectionsAndBackup({
  selectedCollectionId,
  onSelectCollection,
  onNotify,
}: LibraryCollectionsAndBackupProps) {
  const { currentProfile } = useSessionStore();
  const watchlistItems = useWatchlistStore((s) => s.items);
  const watchHistoryItems = useWatchHistoryStore((s) => s.items);
  const {
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    importLibraryJson,
  } = useCustomCollectionsStore();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // JSON Backup state
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = await createCollection({
      name: newName,
      description: newDescription,
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setNewName("");
    setNewDescription("");
    onSelectCollection(res.collection.id);
    onNotify(`Created collection "${res.collection.name}".`);
  };

  const handleStartRename = (col: CustomCollection) => {
    setEditingId(col.id);
    setEditName(col.name);
  };

  const handleCommitRename = async (colId: string) => {
    const res = await renameCollection(colId, { name: editName });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setEditingId(null);
    onNotify("Collection renamed.");
  };

  const handleDelete = async (col: CustomCollection) => {
    await deleteCollection(col.id);
    if (selectedCollectionId === col.id) {
      onSelectCollection(null);
    }
    onNotify(`Deleted collection "${col.name}".`);
  };

  const buildBackupString = () =>
    exportLibraryBackupJson({
      profileName: currentProfile?.name,
      watchlist: watchlistItems,
      collections,
      watchHistory: watchHistoryItems,
    });

  const handleDownloadJson = () => {
    const json = buildBackupString();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (currentProfile?.name || "profile")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `zoku-tv-library-${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify("Library backup JSON downloaded.");
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(buildBackupString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify("Library JSON copied to clipboard.");
    } catch {
      setImportError("Clipboard permission unavailable. Use Download JSON instead.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleImport = async () => {
    setImportError(null);
    if (!jsonInput.trim()) {
      setImportError("Paste a Zoku TV library JSON backup or upload a .json file first.");
      return;
    }
    const res = await importLibraryJson(jsonInput, importMode);
    if (!res.ok) {
      setImportError(res.error);
      return;
    }
    setJsonInput("");
    onNotify(
      `Library imported (${res.summary.watchlistCount} saved, ${res.summary.collectionsCount} collections, ${res.summary.watchHistoryCount} history).`
    );
  };

  return (
    <section className="space-y-6" aria-label="Custom collections and library backup">
      {/* Create Collection + Backup Toggle Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-2xl border border-border-custom bg-surface p-5">
        <form onSubmit={handleCreate} className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-on-surface">
              Create a Custom Collection
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Weekend Marathon"
              maxLength={60}
              className="min-h-[44px] rounded-xl border border-border-custom bg-background px-3.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional note (e.g. Sci-fi classics)"
              maxLength={160}
              className="min-h-[44px] rounded-xl border border-border-custom bg-background px-3.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              data-tv-focusable="true"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast hover:opacity-90 transition-opacity"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Create List
            </button>
          </div>
          {formError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {formError}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => setShowBackupPanel((prev) => !prev)}
          data-tv-focusable="true"
          data-testid="toggle-library-backup-btn"
          className="min-h-[44px] shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-xs font-semibold text-on-surface hover:border-primary/60 hover:text-primary transition-colors"
        >
          <FileJson className="h-4 w-4 text-primary" aria-hidden="true" />
          {showBackupPanel ? "Hide JSON Backup" : "Export / Import JSON"}
        </button>
      </div>

      {/* JSON Backup & Restore Drawer */}
      {showBackupPanel && (
        <div
          data-testid="library-backup-panel"
          className="rounded-2xl border border-border-custom bg-surface p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">
                Personal Library JSON Backup
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 tabular-nums">
                {watchlistItems.length} watchlist · {collections.length} collections ·{" "}
                {watchHistoryItems.length} history entries
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                data-tv-focusable="true"
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-contrast hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download JSON
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                data-tv-focusable="true"
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-background px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary/50"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
          </div>

          <div className="border-t border-border-custom pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border-custom">
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    importMode === "merge"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Merge with Current
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    importMode === "replace"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Replace Library
                </button>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-border-custom bg-background px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary/50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Load .json File
                </button>
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={4}
              placeholder='Paste exported Zoku TV library JSON here (e.g. {"schema":"library-backup","watchlist":[...]})'
              className="w-full rounded-xl border border-border-custom bg-background p-3 font-mono text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />

            {importError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {importError}
              </p>
            )}

            <button
              type="button"
              onClick={handleImport}
              data-tv-focusable="true"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast hover:opacity-90"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import Library ({importMode === "merge" ? "Merge" : "Replace"})
            </button>
          </div>
        </div>
      )}

      {/* Existing Collections Grid */}
      {collections.length === 0 ? (
        <div className="rounded-2xl border border-border-custom bg-surface/60 p-8 text-center space-y-2">
          <FolderHeart className="h-8 w-8 mx-auto text-primary/70" aria-hidden="true" />
          <p className="text-sm font-semibold text-on-surface">
            No custom collections yet
          </p>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Create your first list above, then add any movie, series, or anime from its detail page or your saved watchlist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id;
            const isEditing = editingId === col.id;
            return (
              <div
                key={col.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border-custom bg-surface hover:border-primary/40"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      className="flex-1 min-h-[38px] rounded-lg border border-border-custom bg-background px-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCommitRename(col.id)}
                      aria-label="Save collection name"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-contrast"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel rename"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-custom bg-background text-on-surface-variant"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectCollection(isSelected ? null : col.id)}
                      data-tv-focusable="true"
                      className="min-w-0 flex-1 text-left space-y-1"
                    >
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {col.name}
                      </p>
                      <p className="text-xs text-on-surface-variant tabular-nums">
                        {col.itemKeys.length}{" "}
                        {col.itemKeys.length === 1 ? "title" : "titles"}
                        {col.description ? ` · ${col.description}` : ""}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartRename(col)}
                        aria-label={`Rename ${col.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-background hover:text-on-surface"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(col)}
                        aria-label={`Delete ${col.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
