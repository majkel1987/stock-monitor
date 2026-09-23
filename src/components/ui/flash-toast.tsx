"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type FlashToastVariant = "success" | "error" | "warning" | "info";

const DURATIONS: Record<FlashToastVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 5500,
  error: 7000,
};

type FlashToastProps = {
  title: string;
  description?: string;
  variant?: FlashToastVariant;
  /** Query param keys to strip from the URL after showing the toast. */
  clearParams?: readonly string[];
};

/**
 * One-shot toast for server-rendered flash messages (e.g. redirect query params).
 * Keeps inline Alerts optional; use when the message is short-lived.
 */
export function FlashToast({
  title,
  description,
  variant = "info",
  clearParams = [],
}: FlashToastProps) {
  const shownRef = useRef(false);
  const clearKey = clearParams.join(",");

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    const options = {
      description,
      duration: DURATIONS[variant],
    };

    switch (variant) {
      case "success":
        toast.success(title, options);
        break;
      case "error":
        toast.error(title, options);
        break;
      case "warning":
        toast.warning(title, options);
        break;
      default:
        toast.info(title, options);
    }

    if (!clearKey) return;

    const url = new URL(window.location.href);
    let changed = false;
    for (const key of clearKey.split(",")) {
      if (!key) continue;
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return;

    const next =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState(window.history.state, "", next);
  }, [clearKey, description, title, variant]);

  return null;
}
