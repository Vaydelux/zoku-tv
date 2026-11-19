"use client";

import { useEffect } from "react";

const SITE_TITLE = "Zoku TV";

/**
 * Updates the browser tab title for client-rendered routes while keeping
 * clean fallback semantics when data is still loading.
 */
export function useDocumentTitle(pageTitle?: string | null) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const trimmed = (pageTitle || "").trim();
    document.title = trimmed
      ? `${trimmed} — ${SITE_TITLE}`
      : `${SITE_TITLE} - Infinite Streaming Portal`;
  }, [pageTitle]);
}
