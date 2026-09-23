import type { WatchlistRow } from "@/application/watchlist/types";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type { AppLocale } from "@/i18n/config";
import { intlLocaleFor, numberLocaleFor } from "@/i18n/config";
import { formatPrice as formatLocalizedPrice } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import type { TranslationKey } from "@/i18n/dictionaries";

export const stockHref = (marketCode: string, ticker: string) =>
  `/stocks/${marketCode.toLowerCase()}/${encodeURIComponent(ticker)}`;

export const formatPrice = (
  value: string,
  currency: string,
  locale: AppLocale,
) => formatLocalizedPrice(value, currency, locale);

export const formatDailyChange = (
  value: string | null,
  locale: AppLocale,
  emptyLabel = "—",
) => {
  if (value === null) return emptyLabel;
  const number = Number(value);
  if (!Number.isFinite(number)) return emptyLabel;
  const sign = number > 0 ? "+" : number < 0 ? "−" : "";
  const formatted = new Intl.NumberFormat(numberLocaleFor(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(number));
  return `${sign}${formatted}%`;
};

export const dailyToneClass = (value: string | null) => {
  const number = value === null ? 0 : Number(value);
  if (number > 0) return "text-positive";
  if (number < 0) return "text-negative";
  return "text-muted-foreground";
};

export const formatMonitoringDate = (
  value: string | null,
  locale: AppLocale,
  notAnalyzedLabel: string,
) => {
  if (!value) return notAnalyzedLabel;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return notAnalyzedLabel;
  return new Intl.DateTimeFormat(intlLocaleFor(locale), {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(date);
};

export const providerLabel = (
  provider: string,
  t?: Translator,
): string => {
  if (provider !== "manual") return provider;
  return t ? t("common.manual") : "Manual";
};

type StatusBadgeTone =
  | "accent"
  | "info"
  | "warning"
  | "positive"
  | "negative"
  | "neutral";

export const statusBadgeTone = (colorToken: string): StatusBadgeTone => {
  const map: Record<string, StatusBadgeTone> = {
    accent: "accent",
    danger: "negative",
    info: "info",
    negative: "negative",
    neutral: "neutral",
    portfolio: "positive",
    positive: "positive",
    warning: "warning",
  };
  return map[colorToken] ?? "neutral";
};

export type FreshnessPresentation = {
  label: string;
  source: string | null;
  title: string;
  tone: "positive" | "warning" | "negative" | "info" | "muted";
};

const freshnessLabelKey = (
  quality: MarketDataFreshness | "unavailable",
): TranslationKey => {
  switch (quality) {
    case "fresh":
      return "freshness.fresh";
    case "delayed":
      return "freshness.delayed";
    case "stale":
      return "freshness.stale";
    case "closed":
      return "freshness.closed";
    case "unknown":
      return "freshness.unknown";
    case "unavailable":
      return "freshness.unavailable";
  }
};

export const freshnessPresentation = (
  row: WatchlistRow,
  locale: AppLocale,
  t: Translator,
): FreshnessPresentation => {
  if (!row.price) {
    return {
      label: t(freshnessLabelKey("unavailable")),
      source: null,
      title: t("freshness.noMarketPrice"),
      tone: "negative",
    };
  }

  const quality = row.price.qualityStatus;
  const source = providerLabel(row.price.provider, t);
  const asOf = new Intl.DateTimeFormat(intlLocaleFor(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(row.price.asOf));

  const tone: FreshnessPresentation["tone"] =
    quality === "fresh"
      ? "positive"
      : quality === "stale"
        ? "negative"
        : quality === "delayed"
          ? "warning"
          : quality === "closed"
            ? "info"
            : "muted";

  return {
    label: t(freshnessLabelKey(quality)),
    source,
    title: t("freshness.asOfSource", { datetime: asOf, source }),
    tone,
  };
};

export const emptyValue = "—";
