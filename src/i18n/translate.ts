import type { AppLocale } from "./config";
import { DEFAULT_LOCALE } from "./config";
import type { Dictionary, TranslationKey } from "./dictionaries";
import { getDictionary } from "./dictionaries";
import type { MessageValue, PluralMessage, TranslateParams } from "./types";

const isPluralMessage = (value: MessageValue): value is PluralMessage =>
  typeof value === "object" && value !== null && "other" in value;

const getMessage = (
  dictionary: Dictionary,
  key: string,
): MessageValue | undefined => {
  const parts = key.split(".");
  let current: unknown = dictionary;

  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === "string" || isPluralMessage(current as MessageValue)) {
    return current as MessageValue;
  }

  return undefined;
};

const selectPluralForm = (
  message: PluralMessage,
  count: number,
  locale: AppLocale,
): string => {
  const category = new Intl.PluralRules(locale === "pl" ? "pl" : "en").select(
    count,
  );

  if (category === "one" && message.one) return message.one;
  if (category === "few" && message.few) return message.few;
  if (category === "many" && message.many) return message.many;
  return message.other;
};

const interpolate = (template: string, params?: TranslateParams): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
};

export const translate = (
  locale: AppLocale,
  key: TranslationKey,
  params?: TranslateParams,
): string => {
  const primary = getDictionary(locale);
  const fallback = getDictionary(DEFAULT_LOCALE);
  const message =
    getMessage(primary, key) ?? getMessage(fallback, key);

  if (!message) {
    return getMessage(fallback, key)
      ? interpolate(String(getMessage(fallback, key)), params)
      : key;
  }

  if (isPluralMessage(message)) {
    const count = typeof params?.count === "number" ? params.count : 0;
    return interpolate(selectPluralForm(message, count, locale), params);
  }

  return interpolate(message, params);
};

export type Translator = (
  key: TranslationKey,
  params?: TranslateParams,
) => string;

export const createTranslator = (locale: AppLocale): Translator => {
  return (key, params) => translate(locale, key, params);
};
