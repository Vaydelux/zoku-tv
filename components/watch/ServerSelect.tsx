"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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
}: ServerSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
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
      className={`zoku-server-select ${open ? "is-open" : ""} ${className}`}
      data-testid="server-select"
    >
      <span className="zoku-server-select__eyebrow hidden sm:inline">{label}</span>
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
          id={listId}
          role="listbox"
          aria-label={`${label} options`}
          className="zoku-server-select__picker"
        >
          {renderGroup("Recommended servers", newServers)}
          {renderGroup("All servers", defaultServers)}
        </div>
      )}
    </div>
  );
}
