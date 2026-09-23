"use client";

import type { DashboardQuoteFreshness } from "@/application/dashboard/types";
import { StatusBadge } from "@/components/ui/terminal";
import { formatDateTime, formatRelativeTime } from "@/i18n/format";
import { useTranslate } from "@/i18n/provider";

const tones: Record<
  DashboardQuoteFreshness["status"],
  "positive" | "warning" | "negative" | "info"
> = {
  current: "positive",
  delayed: "warning",
  stale: "negative",
  unavailable: "info",
};

export function DataFreshnessIndicator({
  freshness,
  lastSuccessfulSyncAt,
  now,
}: {
  freshness: DashboardQuoteFreshness;
  lastSuccessfulSyncAt: string | null;
  now: Date;
}) {
  const { t, locale } = useTranslate();

  const labels: Record<DashboardQuoteFreshness["status"], string> = {
    current: t("freshness.fresh"),
    delayed: t("freshness.delayed"),
    stale: t("freshness.stale"),
    unavailable: t("freshness.unavailable"),
  };

  const updatedLabel = freshness.lastQuoteAsOf
    ? t("freshness.updatedRelative", {
        relative: formatRelativeTime(freshness.lastQuoteAsOf, now, locale),
      })
    : lastSuccessfulSyncAt
      ? t("freshness.lastSync", {
          datetime: formatDateTime(lastSuccessfulSyncAt, locale),
        })
      : t("freshness.noQuotes");

  return (
    <div
      aria-label={t("freshness.quoteFreshness")}
      className="flex flex-wrap items-center gap-2 text-sm lg:justify-end"
    >
      <StatusBadge tone={tones[freshness.status]}>
        {labels[freshness.status]}
      </StatusBadge>
      <span className="font-mono text-secondary-foreground">
        {updatedLabel}
      </span>
    </div>
  );
}
