"use client";

import type { WatchlistSummary } from "@/application/watchlist/types";
import { PageHeader } from "@/components/ui/terminal";
import { useTranslate } from "@/i18n/provider";

export function WatchlistHeader({ summary }: { summary: WatchlistSummary }) {
  const { t } = useTranslate();
  const activeLabel = t("watchlist.activeInstruments", {
    count: summary.active,
  });
  const marketBreakdown = t("watchlist.marketBreakdown", {
    gpw: summary.gpw,
    usa: summary.usa,
  });

  return (
    <PageHeader
      description={t("watchlist.summary", { activeLabel, marketBreakdown })}
      eyebrow={t("brand.markets")}
      index
      title={t("watchlist.title")}
    />
  );
}
