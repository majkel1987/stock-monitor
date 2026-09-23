export const LOCALES = ["en", "pl"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_COOKIE_NAME = "stock-monitor-locale";

export const LOCALE_STORAGE_KEY = "stock-monitor-locale";

export const LOCALE_EVENT = "stock-monitor-locale";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const isAppLocale = (value: unknown): value is AppLocale =>
  value === "en" || value === "pl";

export const intlLocaleFor = (locale: AppLocale): string =>
  locale === "pl" ? "pl-PL" : "en-GB";

export const numberLocaleFor = (locale: AppLocale): string =>
  locale === "pl" ? "pl-PL" : "en-US";
