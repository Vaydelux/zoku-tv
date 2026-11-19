"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, Server, Settings2 } from "lucide-react";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = findSelected(value, newServers, defaultServers);
  const isSelectedFailing = selected
    ? serverHealth?.[selected.id]?.status === "failing"
    : false;
  const selectedName = selected ? selected.name : "Select server";

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

  // Sync highlighted option when opening (and clamp if flatOptions shrinks dynamically)
  useEffect(() => {
    if (!open) return;
    const idx = flatOptions.findIndex((s) => s.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, flatOptions, value]);

  // Keep highlighted server option visible inside the floating menu without scrolling the outer document
  useEffect(() => {
    if (!open || flatOptions.length === 0) return;
    const rafId = window.requestAnimationFrame(() => {
      const menu = menuRef.current;
      const activeServerId = flatOptions[activeIndex]?.id;
      const activeEl = activeServerId
        ? menu?.querySelector<HTMLElement>(`[data-server-id="${CSS.escape(activeServerId)}"]`)
        : null;
      if (menu && activeEl) {
        const menuRect = menu.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        if (itemRect.top < menuRect.top) {
          menu.scrollTop -= menuRect.top - itemRect.top + 8;
        } else if (itemRect.bottom > menuRect.bottom) {
          menu.scrollTop += itemRect.bottom - menuRect.bottom + 8;
        }
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [open, activeIndex, flatOptions]);

  // Keyboard navigation while open
  useEffect(() => {
    if (!open || flatOptions.length === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatOptions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? flatOptions.length - 1 : prev - 1
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(flatOptions.length - 1);
      } else if (
        (event.key === "Enter" || event.key === " ") &&
        flatOptions[activeIndex]
      ) {
        event.preventDefault();
        onChange(flatOptions[activeIndex].id);
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, flatOptions, activeIndex, onChange]);

  const pick = (serverId: string) => {
    onChange(serverId);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const renderGroup = (groupLabel: string, servers: ServerSelectOption[]) => {
    if (servers.length === 0) return null;
    return (
      <div className="py-1" role="group" aria-label={groupLabel}>
        <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-on-surface-variant">
          {groupLabel}
        </div>
        <div className="space-y-0.5">
          {servers.map((server) => {
            const isSelected = server.id === value;
            const isFocused = flatOptions[activeIndex]?.id === server.id;
            const failing = serverHealth?.[server.id]?.status === "failing";
            return (
              <button
                key={server.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-server-id={server.id}
                data-tv-focusable="true"
                onMouseEnter={() => {
                  const idx = flatOptions.findIndex((s) => s.id === server.id);
                  if (idx >= 0) setActiveIndex(idx);
                }}
                onClick={() => pick(server.id)}
                className={`zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-primary/15 text-primary font-semibold"
                    : isFocused
                      ? "bg-surface-hover text-on-surface font-medium"
                      : "text-on-surface/90 hover:bg-surface-hover hover:text-on-surface font-medium"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{server.name}</span>
                  {failing && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0 text-amber-400"
                      aria-label="Reported slow or unavailable"
                    />
                  )}
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`zoku-server-select inline-flex items-center gap-2 max-w-full min-w-0 ${className}`}
      data-testid="server-select"
    >
      <span className="hidden md:inline shrink-0 text-xs font-medium text-on-surface-variant">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label} selection: ${selectedName}`}
        data-tv-focusable="true"
        onClick={() => setOpen((prev) => !prev)}
        className={`zoku-dropdown-trigger inline-flex h-10 min-w-[9.5rem] max-w-full flex-1 items-center justify-between gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
          open
            ? "border-primary bg-surface text-on-surface ring-1 ring-primary/35"
            : "border-border-custom bg-surface text-on-surface hover:border-primary/60 hover:bg-surface-hover"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Server className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{selectedName}</span>
          {isSelectedFailing && (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          )}
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
        menuRef={menuRef}
        onClose={() => setOpen(false)}
        id={listId}
        role="listbox"
        ariaLabel={`${label} options`}
        align={align}
        minWidth={240}
        maxWidth={300}
        preferredMaxHeight={340}
        className="p-1.5"
      >
        <div className="divide-y divide-border-custom/60">
          {renderGroup("Recommended", newServers)}
          {renderGroup("All servers", defaultServers)}
        </div>
        {manageHref && (
          <div className="mt-1 border-t border-border-custom/70 pt-1">
            <Link
              href={manageHref}
              onClick={() => setOpen(false)}
              className="zoku-menu-item flex min-h-[38px] items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              data-tv-focusable="true"
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Manage servers</span>
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant shrink-0">Settings</span>
            </Link>
          </div>
        )}
      </FloatingMenu>
    </div>
  );
}
