"use client";

import { useTranslate } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslate();

  const handleSelectEnglish = () => {
    if (locale !== "en") setLocale("en");
  };

  const handleSelectPolish = () => {
    if (locale !== "pl") setLocale("pl");
  };

  return (
    <div
      aria-label={t("language.label")}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-[var(--radius-md)] border border-border bg-card p-0.5",
        className,
      )}
      role="group"
    >
      <button
        aria-label={t("language.switchToEnglish")}
        aria-pressed={locale === "en"}
        className={cn(
          "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] px-2 font-mono text-[0.6875rem] font-semibold transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-secondary-foreground hover:bg-secondary hover:text-foreground",
        )}
        onClick={handleSelectEnglish}
        type="button"
      >
        {t("language.en")}
      </button>
      <button
        aria-label={t("language.switchToPolish")}
        aria-pressed={locale === "pl"}
        className={cn(
          "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] px-2 font-mono text-[0.6875rem] font-semibold transition-colors",
          locale === "pl"
            ? "bg-primary text-primary-foreground"
            : "text-secondary-foreground hover:bg-secondary hover:text-foreground",
        )}
        onClick={handleSelectPolish}
        type="button"
      >
        {t("language.pl")}
      </button>
    </div>
  );
}
