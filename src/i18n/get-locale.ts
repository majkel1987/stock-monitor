import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type AppLocale } from "./config";
import { createTranslator, type Translator } from "./translate";
import { getDictionary, type Dictionary } from "./dictionaries";
import { parseLocale } from "./locale-cookie";

export const getLocale = async (): Promise<AppLocale> => {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE_NAME)?.value);
};

export const getServerDictionary = async (): Promise<Dictionary> =>
  getDictionary(await getLocale());

export const getServerTranslator = async (): Promise<{
  locale: AppLocale;
  t: Translator;
  dictionary: Dictionary;
}> => {
  const locale = await getLocale();
  return {
    locale,
    t: createTranslator(locale),
    dictionary: getDictionary(locale),
  };
};

export const getLocaleOrDefault = async (): Promise<AppLocale> => {
  try {
    return await getLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
};
