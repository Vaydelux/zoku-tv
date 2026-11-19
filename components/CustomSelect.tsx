"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

export interface CustomSelectOption {
  value: string | number;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  align?: "left" | "right" | "stretch";
  className?: string;
  testId?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  placeholder = "Select option",
  align = "stretch",
  className = "",
  testId,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const triggerId = useId();

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ?? null;
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  const handleToggle = () => {
    if (options.length === 0) return;
    if (open) {
      setOpen(false);
      return;
    }
    const selectedIndex = options.findIndex(
      (opt) => String(opt.value) === String(value)
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  // Scroll only inside the floating menu — never scrolls the outer document
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const menu = menuRef.current;
    const active = menu?.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`
    );
    if (!menu || !active) return;
    const menuBounds = menu.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.top < menuBounds.top) {
      menu.scrollTop -= menuBounds.top - activeBounds.top + 6;
    } else if (activeBounds.bottom > menuBounds.bottom) {
      menu.scrollTop += activeBounds.bottom - menuBounds.bottom + 6;
    }
  }, [open, highlightedIndex]);

  useEffect(() => {
    if (!open || options.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
      } else if ((event.key === "Enter" || event.key === " ") && highlightedIndex >= 0) {
        event.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(String(opt.value));
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, options, highlightedIndex, onChange]);

  const handleSelect = (nextValue: string | number) => {
    onChange(String(nextValue));
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={triggerId}
          className="mb-1.5 block text-xs font-medium text-on-surface-variant"
        >
          {label}
        </label>
      )}

      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        disabled={options.length === 0}
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel || label || placeholder}
        data-tv-focusable="true"
        onClick={handleToggle}
        className={`zoku-dropdown-trigger flex h-10 w-full items-center justify-between gap-2.5 rounded-xl border px-3 text-left text-xs font-semibold text-on-surface transition-colors ${
          open
            ? "border-primary bg-surface ring-1 ring-primary/35"
            : "border-border-custom bg-surface hover:border-primary/60 hover:bg-surface-hover"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selectedOption?.badge && (
            <span className="font-mono text-[10px] text-on-surface-variant tabular-nums">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        menuRef={menuRef}
        onClose={() => setOpen(false)}
        id={listId}
        role="listbox"
        ariaLabel={ariaLabel || label || placeholder}
        align={align}
        minWidth={196}
        maxWidth={320}
        preferredMaxHeight={304}
        className="p-1.5 space-y-0.5"
      >
        {options.map((opt, idx) => {
          const isSelected = String(opt.value) === String(value);
          const isHighlighted = idx === highlightedIndex;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-option-index={idx}
              data-highlighted={isHighlighted}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => handleSelect(opt.value)}
              className={`zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                isSelected
                  ? "bg-primary/15 text-primary font-semibold"
                  : isHighlighted
                    ? "bg-surface-hover text-on-surface font-medium"
                    : "text-on-surface/90 hover:bg-surface-hover hover:text-on-surface font-medium"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {opt.badge && (
                  <span className="font-mono text-[10px] text-on-surface-variant tabular-nums">
                    {opt.badge}
                  </span>
                )}
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </span>
            </button>
          );
        })}
      </FloatingMenu>
    </div>
  );
}
