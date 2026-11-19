"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpDown, Calendar, Check, ChevronDown, Eye, Flame, Star } from "lucide-react";
import { RAIL_SORT_OPTIONS, type RailSortOption } from "@/lib/rail-sorting";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

interface RailSortDropdownProps {
  value: RailSortOption;
  onChange: (nextSort: RailSortOption) => void;
  ariaLabel?: string;
  testId?: string;
  compact?: boolean;
}

export function RailSortDropdown({
  value,
  onChange,
  ariaLabel = "Sort rail items",
  testId = "rail-sort-dropdown",
  compact = true,
}: RailSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedOption =
    RAIL_SORT_OPTIONS.find((opt) => opt.id === value) ?? RAIL_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const currentIdx = RAIL_SORT_OPTIONS.findIndex((opt) => opt.id === value);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % RAIL_SORT_OPTIONS.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + RAIL_SORT_OPTIONS.length) % RAIL_SORT_OPTIONS.length
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setHighlightedIndex(RAIL_SORT_OPTIONS.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const target = RAIL_SORT_OPTIONS[highlightedIndex];
        if (target) {
          onChange(target.id);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, highlightedIndex, onChange]);

  const renderSortIcon = (id: RailSortOption, active = false) => {
    const iconClass = `h-3.5 w-3.5 shrink-0 ${
      active ? "text-primary" : "text-on-surface-variant"
    }`;
    if (id === "newest") return <Calendar className={iconClass} aria-hidden="true" />;
    if (id === "ratings") return <Star className={iconClass} aria-hidden="true" />;
    if (id === "most_watched") return <Eye className={iconClass} aria-hidden="true" />;
    return <Flame className={iconClass} aria-hidden="true" />;
  };

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        data-tv-focusable="true"
        onClick={() => setOpen((prev) => !prev)}
        className={`zoku-dropdown-trigger inline-flex items-center gap-1.5 rounded-xl border transition-colors whitespace-nowrap ${
          compact ? "h-9 px-2.5 text-xs font-medium" : "h-10 px-3 text-xs font-semibold"
        } ${
          open
            ? "border-primary bg-surface text-on-surface ring-1 ring-primary/35"
            : "border-border-custom bg-surface text-on-surface hover:border-primary/60 hover:bg-surface-hover"
        }`}
      >
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="hidden sm:inline text-on-surface-variant">Sort:</span>
        <span className="truncate font-semibold text-on-surface">
          {selectedOption.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-on-surface-variant transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        id={listboxId}
        role="listbox"
        ariaLabel={ariaLabel}
        align="right"
        minWidth={204}
        maxWidth={240}
        preferredMaxHeight={260}
        className="p-1.5 space-y-0.5"
      >
        {RAIL_SORT_OPTIONS.map((option, idx) => {
          const isSelected = option.id === value;
          const isHighlighted = idx === highlightedIndex;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-testid={`${testId}-option-${option.id}`}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                isSelected
                  ? "bg-primary/15 text-primary font-semibold"
                  : isHighlighted
                    ? "bg-surface-hover text-on-surface font-medium"
                    : "text-on-surface/90 hover:bg-surface-hover hover:text-on-surface font-medium"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {renderSortIcon(option.id, isSelected)}
                <span className="truncate">{option.label}</span>
              </span>
              {isSelected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </FloatingMenu>
    </div>
  );
}
