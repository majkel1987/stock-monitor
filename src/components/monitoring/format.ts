import type { MonitoringTimelineItem } from "@/application/monitoring/history-types";
import type { AppLocale } from "@/i18n/config";
import { formatDate, formatPrice as formatLocalizedPrice } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";

export const emptyValue = "—";

export const monitoringHref = (id: string) => `/monitoring/${id}`;

export const formatHistoryDate = (value: string, locale: AppLocale) =>
  formatDate(value, locale);

export const historyDateKey = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));

export const formatPrice = (
  value: string | null,
  currency: string,
  locale: AppLocale,
) => {
  if (value === null) return emptyValue;
  return formatLocalizedPrice(value, currency, locale);
};

/**
 * Presentation-only Title Case for a stored decision_action code.
 * Does not localize — historical analysis text/codes stay as stored.
 */
export const formatDecision = (value: string | null) => {
  if (!value) return emptyValue;
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

export const formatSourceLabel = (sourceType: string, t: Translator) => {
  if (sourceType === "json_import") return t("common.sources.jsonImport");
  if (sourceType === "api_import") return t("common.sources.apiImport");
  if (sourceType === "manual") return t("common.sources.manual");

  return sourceType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

/** Presentation-only mapping aligned with seeded status definitions. */
export const statusColorTokenFromSlug = (slug: string) => {
  const map: Record<string, string> = {
    BUY_CANDIDATE: "positive",
    WATCH: "info",
    WAIT_FOR_CORRECTION: "warning",
    DEEP_DIVE: "accent",
    PORTFOLIO: "portfolio",
    HOLD: "neutral",
    REDUCE: "negative",
    AVOID: "negative",
    KILL_THE_THESIS: "danger",
  };
  return map[slug] ?? "accent";
};

export type MonitoringDateGroup = {
  key: string;
  label: string;
  records: MonitoringTimelineItem[];
};

export const groupByHistoryDate = (
  records: MonitoringTimelineItem[],
  locale: AppLocale,
): MonitoringDateGroup[] => {
  const groups: MonitoringDateGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const record of records) {
    const key = historyDateKey(record.analyzedAt);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: formatHistoryDate(record.analyzedAt, locale),
        records: [record],
      });
      continue;
    }
    groups[existingIndex]?.records.push(record);
  }

  return groups;
};
