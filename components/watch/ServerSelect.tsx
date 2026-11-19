"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Settings2 } from "lucide-react";
import { useDropdownViewportClamp } from "@/hooks/useDropdownViewportClamp";

export interface ServerSelectOption {
  id: string;
  name: string;
}

interface ServerSelectProps {
  value: string;
  onChange: (serverId: string) => void;
  newServers: ServerSelectOption[];
  defaultServers: ServerSelectOption[];
  serverHealth?: Record<string, { status: "good" | "failing"; lastTested: number }>;
  className?: string;
  label?: string;
  align?: "left" | "right";
  manageHref?: string;
}

function optionLabel(
  server: ServerSelectOption,
  serverHealth?: ServerSelectProps["serverHealth"]
) {
  const failing = serverHealth?.[server.id]?.status === "failing";
  return `${server.name}${failing ? " ⚠️" : ""}`;
}

function findSelected(
  value: string,
  newServers: ServerSelectOption[],
  defaultServers: ServerSelectOption[]
) {
  return (
    newServers.find((s) => s.id === value) ||
    defaultServers.find((s) => s.id === value) ||
    newServers[0] ||
    defaultServers[0]
  );
}

export function ServerSelect({
  value,
  onChange,
  newServers,
  defaultServers,
  serverHealth,
  className = "",
  label = "Server",
  align = "left",
  manageHref = "/settings?section=servers",
}: ServerSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  useDropdownViewportClamp(open, pickerRef);
  const selected = findSelected(value, newServers, defaultServers);
  const selectedLabel = selected
    ? optionLabel(selected, serverHealth)
    : "Select server";

  const flatOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: ServerSelectOption[] = [];
    for (const s of [...newServers, ...defaultServers]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        list.push(s);
      }
    }
    return list;
  }, [newServers, defaultServers]);

  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    const idx = flatOptions.findIndex((s) => s.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);

    // Scroll active option into view within the picker container
    requestAnimationFrame(() => {
      const selectedEl = pickerRef.current?.querySelector(
        '[aria-selected="true"]'
      ) as HTMLElement | null;
      if (selectedEl && pickerRef.current) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    });

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, flatOptions.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? Math.max(0, flatOptions.length - 1) : prev - 1
        );
      } else if (event.key === "Enter" && flatOptions[activeIndex]) {
        event.preventDefault();
        onChange(flatOptions[activeIndex].id);
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, flatOptions, value, activeIndex, onChange]);

  const pick = (serverId: string) => {
    onChange(serverId);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const renderGroup = (groupLabel: string, servers: ServerSelectOption[]) => {
    if (servers.length === 0) return null;
    return (
      <div className="zoku-server-select__group" role="group" aria-label={groupLabel}>
        <div className="zoku-server-select__group-label">{groupLabel}</div>
        {servers.map((server) => {
          const isSelected = server.id === value;
          const isFocused = flatOptions[activeIndex]?.id === server.id;
          return (
            <button
              key={server.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`zoku-server-select__option ${isSelected ? "is-selected" : ""} ${
                isFocused ? "ring-1 ring-primary/50" : ""
              }`}
              onClick={() => pick(server.id)}
            >
              <span className="zoku-server-select__option-label">
                {optionLabel(server, serverHealth)}
              </span>
              {isSelected && (
                <Check className="zoku-server-select__checkmark" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`zoku-server-select ${open ? "is-open" : ""} ${
        align === "right" ? "zoku-server-select--right" : "zoku-server-select--left"
      } ${className}`}
      data-testid="server-select"
    >
      <span className="zoku-server-select__eyebrow hidden md:inline">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="zoku-server-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label} selection: ${selectedLabel}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="zoku-server-select__value">{selectedLabel}</span>
        <ChevronDown className="zoku-server-select__icon" aria-hidden />
      </button>

      {open && (
        <div
          ref={pickerRef}
          id={listId}
          role="listbox"
          aria-label={`${label} options`}
          className="zoku-server-select__picker"
        >
          {renderGroup("Recommended servers", newServers)}
          {renderGroup("All servers", defaultServers)}
          {manageHref && (
            <div className="border-t border-white/10 mt-1 pt-1 px-1 pb-0.5">
              <Link
                href={manageHref}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                data-tv-focusable="true"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" aria-hidden />
                  Manage &amp; Add Servers
                </span>
                <span className="text-[10px] opacity-75">JSON</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
