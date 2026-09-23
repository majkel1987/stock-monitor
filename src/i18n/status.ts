import type { Translator } from "./translate";
import type { TranslationKey } from "./dictionaries";
import en from "./en";

/** Seeded English labels. Custom user labels must remain unchanged. */
const SEEDED_STATUS_LABELS_EN: Readonly<Record<string, string>> = en.status;

const STATUS_TRANSLATION_KEYS = Object.keys(
  en.status,
) as ReadonlyArray<keyof typeof en.status>;

const isKnownStatusSlug = (
  slug: string,
): slug is keyof typeof en.status =>
  STATUS_TRANSLATION_KEYS.includes(slug as keyof typeof en.status);

/**
 * Maps a seeded status slug to a localized label.
 * If the stored label was customized (differs from the English seed),
 * the user's label is returned unchanged.
 */
export const resolveStatusLabel = (
  status: { slug: string; label: string },
  t: Translator,
): string => {
  if (!isKnownStatusSlug(status.slug)) return status.label;

  const seededEnglish = SEEDED_STATUS_LABELS_EN[status.slug];
  if (status.label !== seededEnglish) return status.label;

  return t(`status.${status.slug}` as TranslationKey);
};
