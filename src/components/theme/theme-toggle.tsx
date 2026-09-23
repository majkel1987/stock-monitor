"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  THEME_EVENT,
  THEME_STORAGE_KEY,
  applyTheme,
  getTheme,
  subscribeTheme,
  type AppTheme,
} from "@/components/theme/theme-store";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle() {
  const t = useT();
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "dark");

  const handleToggle = () => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      aria-label={
        theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")
      }
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-border",
        "bg-card text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground",
      )}
      onClick={handleToggle}
      type="button"
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" className="size-3.5" />
      ) : (
        <Moon aria-hidden="true" className="size-3.5" />
      )}
    </button>
  );
}
