import en, { type Dictionary } from "./en";
import pl from "./pl";
import type { AppLocale } from "./config";
import type { TranslationKeyOf } from "./types";

export type { Dictionary };
export type TranslationKey = TranslationKeyOf<Dictionary>;

export const dictionaries: Record<AppLocale, Dictionary> = {
  en,
  pl,
};

export const getDictionary = (locale: AppLocale): Dictionary =>
  dictionaries[locale] ?? dictionaries.en;
