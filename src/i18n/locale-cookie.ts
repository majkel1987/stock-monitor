import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  isAppLocale,
  type AppLocale,
} from "./config";

export const parseLocale = (value: string | null | undefined): AppLocale =>
  isAppLocale(value) ? value : DEFAULT_LOCALE;

export const readLocaleFromCookieString = (
  cookieHeader: string | null | undefined,
): AppLocale => {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!match) return DEFAULT_LOCALE;
  return parseLocale(decodeURIComponent(match.split("=").slice(1).join("=")));
};

export const buildLocaleCookie = (locale: AppLocale): string =>
  `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;

export const persistLocaleClient = (locale: AppLocale) => {
  document.cookie = buildLocaleCookie(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable; cookie remains the SSR source of truth.
  }
};
