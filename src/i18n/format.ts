import type { AppLocale } from "./config";
import { intlLocaleFor, numberLocaleFor } from "./config";
import { createTranslator } from "./translate";

export const formatDate = (
  value: string | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return createTranslator(locale)("relative.timeUnavailable");

  return new Intl.DateTimeFormat(intlLocaleFor(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Warsaw",
    ...options,
  }).format(date);
};

export const formatDateTime = (
  value: string | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return createTranslator(locale)("relative.timeUnavailable");
  }

  return new Intl.DateTimeFormat(intlLocaleFor(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Warsaw",
    ...options,
  }).format(date);
};

export const formatPrice = (
  value: string | number,
  currency: string,
  locale: AppLocale,
): string => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return createTranslator(locale)("common.emptyValue");

  if (locale === "pl") {
    return `${new Intl.NumberFormat(numberLocaleFor(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number)} ${currency}`;
  }

  return `${new Intl.NumberFormat(numberLocaleFor(locale), {
    maximumFractionDigits: 6,
  }).format(number)} ${currency}`;
};

export const formatRelativeTime = (
  value: string,
  now: Date,
  locale: AppLocale,
): string => {
  const t = createTranslator(locale);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return t("relative.timeUnavailable");

  const minutes = Math.max(0, Math.round((now.getTime() - timestamp) / 60_000));
  if (minutes < 1) return t("relative.justNow");
  if (minutes < 60) {
    return t("relative.minutesAgo", { count: minutes });
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return t("relative.hoursAgo", { count: hours });
  }

  const days = Math.round(hours / 24);
  return t("relative.daysAgo", { count: days });
};
