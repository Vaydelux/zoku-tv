"use client";

import { useEffect, useRef, useState } from "react";
import { FolderPlus, Check, Plus } from "lucide-react";
import { useCustomCollectionsStore } from "@/stores";
import { canonicalMediaKey } from "@/lib/custom-collections";
import type { MediaType } from "@/lib/media-types";

interface CollectionPickerButtonProps {
  mediaType: MediaType;
  id: number;
  className?: string;
}

export function CollectionPickerButton({
  mediaType,
  id,
  className = "",
}: CollectionPickerButtonProps) {
  const { collections, createCollection, toggleItemInCollection } =
    useCustomCollectionsStore();
  const [open, setOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const mediaKey = canonicalMediaKey(mediaType, id);
  const assignedCount = collections.filter((c) => c.itemKeys.includes(mediaKey)).length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const res = await createCollection({
      name: quickName.trim(),
      initialMediaKey: mediaKey,
    });
    if (res.ok) {
      setQuickName("");
    }
  };

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : "z-20"} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-tv-focusable="true"
        aria-expanded={open}
        aria-label="Add to custom collection"
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
          assignedCount > 0
            ? "border-primary/50 bg-primary/15 text-primary"
            : "border-border-custom bg-surface/90 text-on-surface hover:border-primary/50 hover:text-primary"
        }`}
      >
        <FolderPlus className="h-4 w-4" aria-hidden="true" />
        <span>
          {assignedCount > 0 ? `In ${assignedCount} ${assignedCount === 1 ? "List" : "Lists"}` : "Add to List"}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose custom collections"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border-custom bg-surface p-3 shadow-2xl space-y-2.5 z-50"
        >
          <p className="px-1 text-xs font-semibold text-on-surface">
            Save to Custom Collections
          </p>

          {collections.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
              {collections.map((col) => {
                const included = col.itemKeys.includes(mediaKey);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => void toggleItemInCollection(col.id, mediaKey)}
                    className={`w-full min-h-[40px] flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                      included
                        ? "bg-primary/15 text-primary"
                        : "text-on-surface hover:bg-background"
                    }`}
                  >
                    <span className="truncate">{col.name}</span>
                    {included && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-1 text-xs text-on-surface-variant">
              Create your first collection below.
            </p>
          )}

          <form onSubmit={handleQuickCreate} className="flex items-center gap-1.5 pt-2 border-t border-border-custom">
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="New list name..."
              maxLength={60}
              className="flex-1 min-h-[38px] rounded-lg border border-border-custom bg-background px-2.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Create and add to collection"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-contrast hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
