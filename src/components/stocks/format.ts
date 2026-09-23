import {
  formatDecision,
  formatHistoryDate as formatMonitoringHistoryDate,
  formatSourceLabel as formatMonitoringSourceLabel,
} from "@/components/monitoring/format";
import { emptyValue, providerLabel } from "@/components/watchlist/format";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import { createTranslator } from "@/i18n/translate";

const enTranslator = createTranslator("en");

/** Stock Details keeps EN formatting until that page is localized. */
export const formatHistoryDate = (value: string) =>
  formatMonitoringHistoryDate(value, "en");

export const formatSourceLabel = (sourceType: string) =>
  formatMonitoringSourceLabel(sourceType, enTranslator);

export {
  emptyValue,
  formatDecision,
  providerLabel,
};

export const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

export const todayInWarsaw = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date());

export const formatNumber = (
  value: string | null,
  maximumFractionDigits = 6,
) => {
  if (value === null) return emptyValue;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(
    Number(value),
  );
};

export const formatMoney = (value: string | null, currency: string) => {
  if (value === null) return emptyValue;
  return `${formatNumber(value)} ${currency}`;
};

export const signed = (value: number, fractionDigits = 1) => {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}`;
};

export const signedPercent = (value: number, fractionDigits = 1) =>
  `${signed(value, fractionDigits)}%`;

export const dailyChangeToneClass = (value: number) => {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-muted-foreground";
};

export const formatEntryZone = (
  from: string | null,
  to: string | null,
  currency: string | null,
  fallbackCurrency: string,
) => {
  if (!from && !to) return emptyValue;
  return `${from ?? emptyValue}–${to ?? emptyValue} ${currency ?? fallbackCurrency}`;
};

export const formatPercentValue = (value: string | null) => {
  if (!value) return emptyValue;
  return `${value}%`;
};

export const formatAsymmetry = (value: string | null) => {
  if (!value) return emptyValue;
  return `${value}×`;
};

export const dataModeLabel = (mode: "manual" | "provider") =>
  mode === "manual" ? "Manual instrument" : "Provider instrument";

export type QuoteStatusTone =
  | "positive"
  | "warning"
  | "negative"
  | "info"
  | "muted";

export type QuoteStatusPresentation = {
  label: string;
  description: string;
  tone: QuoteStatusTone;
};

const freshnessLabels: Record<MarketDataFreshness, string> = {
  fresh: "Fresh",
  delayed: "Delayed",
  stale: "Stale",
  closed: "Closed",
  unknown: "Unknown",
};

export const quoteStatusPresentation = (quote: {
  qualityStatus: MarketDataFreshness;
  asOf: string;
  provider: string;
} | null): QuoteStatusPresentation => {
  if (!quote) {
    return {
      label: "Unavailable",
      description: "Latest market quote is not available.",
      tone: "muted",
    };
  }

  const source = providerLabel(quote.provider);
  const asOf = dateTimeFormatter.format(new Date(quote.asOf));
  const tone: QuoteStatusTone =
    quote.qualityStatus === "fresh"
      ? "positive"
      : quote.qualityStatus === "stale"
        ? "negative"
        : quote.qualityStatus === "delayed"
          ? "warning"
          : quote.qualityStatus === "closed"
            ? "info"
            : "muted";

  return {
    label: freshnessLabels[quote.qualityStatus],
    description: `As of ${asOf} · ${source}`,
    tone,
  };
};

export const reachedLabel = (reached: boolean | null) => {
  if (reached === null) return emptyValue;
  return reached ? "Reached" : "Not reached";
};

export const secondaryActionClass =
  "ui-button ui-button-secondary w-full justify-center whitespace-normal px-3 text-center leading-snug lg:w-auto lg:whitespace-nowrap";
