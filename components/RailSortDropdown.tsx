"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpDown, Calendar, Check, ChevronDown, Eye, Flame, Star } from "lucide-react";
import { RAIL_SORT_OPTIONS, type RailSortOption } from "@/lib/rail-sorting";
import { useDropdownViewportClamp } from "@/hooks/useDropdownViewportClamp";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useDropdownViewportClamp(open, menuRef);

  const selectedOption =
    RAIL_SORT_OPTIONS.find((opt) => opt.id === value) ?? RAIL_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const currentIdx = RAIL_SORT_OPTIONS.findIndex((opt) => opt.id === value);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % RAIL_SORT_OPTIONS.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + RAIL_SORT_OPTIONS.length) % RAIL_SORT_OPTIONS.length
        );
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const target = RAIL_SORT_OPTIONS[highlightedIndex];
        if (target) {
          onChange(target.id);
          setOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, value, highlightedIndex, onChange]);

  const renderSortIcon = (id: RailSortOption, active = false) => {
    const iconClass = `h-3.5 w-3.5 shrink-0 ${
      active ? "text-primary-contrast" : "text-primary"
    }`;
    if (id === "newest") return <Calendar className={iconClass} />;
    if (id === "ratings") return <Star className={iconClass} />;
    if (id === "most_watched") return <Eye className={iconClass} />;
    return <Flame className={iconClass} />;
  };

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${open ? "z-50" : "z-20"}`}
    >
      <button
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={`theme-panel inline-flex items-center gap-1.5 rounded-xl border transition-colors cursor-pointer ${
          compact
            ? "px-2.5 py-1 text-[11px] font-semibold"
            : "px-3 py-1.5 text-xs font-semibold"
        } ${
          open
            ? "border-primary ring-1 ring-primary/40 text-on-surface"
            : "border-border-custom text-on-surface hover:border-primary/60 hover:text-primary"
        }`}
      >
        <ArrowUpDown className="h-3 w-3 shrink-0 text-primary" />
        <span className="hidden xs:inline font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
          Sort:
        </span>
        <span className="truncate font-semibold text-on-surface">
          {selectedOption.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="glass-panel absolute right-0 top-[calc(100%+0.4rem)] w-48 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border-custom bg-surface/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-scale-up"
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
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-contrast font-semibold"
                    : isHighlighted
                    ? "bg-surface-hover text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {renderSortIcon(option.id, isSelected)}
                  <span className="truncate">{option.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
