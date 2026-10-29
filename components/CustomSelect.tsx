"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ?? null;
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (!open) return;

    const currentIdx = options.findIndex(
      (opt) => String(opt.value) === String(value)
    );
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
        setHighlightedIndex((prev) =>
          options.length > 0 ? (prev + 1) % options.length : 0
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          options.length > 0
            ? (prev - 1 + options.length) % options.length
            : 0
        );
      } else if (event.key === "Enter" && highlightedIndex >= 0) {
        event.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(String(opt.value));
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
  }, [open, options, value, highlightedIndex, onChange]);

  const handleSelect = (nextValue: string | number) => {
    onChange(String(nextValue));
    setOpen(false);
  };

  const menuAlignmentClass =
    align === "right"
      ? "left-0 sm:left-auto sm:right-0 w-full sm:w-64 max-w-[calc(100vw-2rem)]"
      : align === "left"
        ? "left-0 w-full sm:w-64 max-w-[calc(100vw-2rem)]"
        : "inset-x-0 w-full min-w-[11rem] max-w-[calc(100vw-2rem)]";

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {label && (
        <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {label}
        </label>
      )}

      <button
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel || label || placeholder}
        onClick={() => setOpen((prev) => !prev)}
        className={`theme-panel flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-on-surface transition-all duration-200 hover:border-primary/70 ${
          open ? "border-primary ring-1 ring-primary/40" : ""
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selectedOption?.badge && (
            <span className="rounded-md border border-border-custom bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-primary">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-primary transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel || label || placeholder}
          className={`glass-panel absolute top-[calc(100%+0.45rem)] z-50 max-h-[min(58dvh,19rem)] overflow-y-auto rounded-xl p-1.5 shadow-2xl animate-scale-up ${menuAlignmentClass}`}
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
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-contrast font-semibold shadow-sm"
                    : isHighlighted
                      ? "bg-surface-hover text-on-surface"
                      : "text-on-surface hover:bg-surface-hover hover:text-primary"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {opt.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        isSelected
                          ? "bg-black/25 text-primary-contrast"
                          : "bg-background/60 text-on-surface-variant"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
