"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { DEFAULT_LOCALE, type AppLocale } from "./config";
import { getDictionary, type Dictionary, type TranslationKey } from "./dictionaries";
import { persistLocaleClient } from "./locale-cookie";
import { createTranslator, type Translator } from "./translate";
import type { TranslateParams } from "./types";

type LocaleContextValue = {
  locale: AppLocale;
  dictionary: Dictionary;
  t: Translator;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    persistLocaleClient(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      persistLocaleClient(next);
      setLocaleState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(() => {
    const dictionary = getDictionary(locale);
    return {
      locale,
      dictionary,
      t: createTranslator(locale),
      setLocale,
    };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export const useLocaleContext = (): LocaleContextValue => {
  const context = useContext(LocaleContext);
  if (!context) {
    const dictionary = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      dictionary,
      t: createTranslator(DEFAULT_LOCALE),
      setLocale: () => undefined,
    };
  }
  return context;
};

export const useT = (): Translator => useLocaleContext().t;

export const useLocale = (): AppLocale => useLocaleContext().locale;

export const useTranslate = () => {
  const { t, locale, setLocale } = useLocaleContext();
  const translate = useCallback(
    (key: TranslationKey, params?: TranslateParams) => t(key, params),
    [t],
  );
  return { t: translate, locale, setLocale };
};
