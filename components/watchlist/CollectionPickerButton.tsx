"use client";

import { useRef, useState } from "react";
import { FolderPlus, Check, Plus } from "lucide-react";
import { useCustomCollectionsStore } from "@/stores";
import { canonicalMediaKey } from "@/lib/custom-collections";
import type { MediaType } from "@/lib/media-types";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const mediaKey = canonicalMediaKey(mediaType, id);
  const assignedCount = collections.filter((c) => c.itemKeys.includes(mediaKey)).length;

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
    <div className={`inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-tv-focusable="true"
        aria-expanded={open}
        aria-label="Add to custom collection"
        className={`zoku-dropdown-trigger inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
          assignedCount > 0 || open
            ? "border-primary/60 bg-primary/15 text-primary"
            : "border-border-custom bg-surface text-on-surface hover:border-primary/60 hover:bg-surface-hover"
        }`}
      >
        <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {assignedCount > 0
            ? `In ${assignedCount} ${assignedCount === 1 ? "List" : "Lists"}`
            : "Add to List"}
        </span>
      </button>

      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        role="dialog"
        ariaLabel="Choose custom collections"
        align="left"
        minWidth={280}
        maxWidth={310}
        preferredMaxHeight={360}
        className="p-3 space-y-2.5"
      >
        <p className="px-1 text-xs font-semibold text-on-surface">
          Save to Custom Collections
        </p>

        {collections.length > 0 ? (
          <div className="max-h-48 overflow-y-auto overscroll-contain space-y-1 custom-scrollbar">
            {collections.map((col) => {
              const included = col.itemKeys.includes(mediaKey);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => void toggleItemInCollection(col.id, mediaKey)}
                  className={`zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    included
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-on-surface/90 hover:bg-surface-hover hover:text-on-surface font-medium"
                  }`}
                >
                  <span className="truncate">{col.name}</span>
                  {included && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-1 text-xs text-on-surface-variant">
            Create your first collection below.
          </p>
        )}

        <form
          onSubmit={handleQuickCreate}
          className="flex items-center gap-1.5 border-t border-border-custom pt-2.5"
        >
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
            className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-contrast hover:brightness-110 transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </FloatingMenu>
    </div>
  );
}
