"use client";

import type { DashboardMarketFilter } from "@/application/dashboard/market-query";
import type { DashboardQuoteFreshness } from "@/application/dashboard/types";
import { RefreshMarketDataButton } from "@/components/layout/refresh-market-data-button";
import { PageHeader } from "@/components/ui/terminal";
import { useTranslate } from "@/i18n/provider";

import { DashboardMarketFilter as MarketFilter } from "./dashboard-market-filter";
import { DataFreshnessIndicator } from "./data-freshness-indicator";

export function DashboardHeader({
  market,
  freshness,
  lastSuccessfulSyncAt,
  now,
}: {
  market: DashboardMarketFilter;
  freshness: DashboardQuoteFreshness;
  lastSuccessfulSyncAt: string | null;
  now: Date;
}) {
  const { t } = useTranslate();

  return (
    <PageHeader
      description={t("dashboard.description")}
      index
      title={t("dashboard.title")}
    >
      <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
        <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-center">
          <MarketFilter value={market} />
          <RefreshMarketDataButton
            className="w-full min-[360px]:w-auto"
            label={t("marketData.refresh")}
          />
        </div>
        <DataFreshnessIndicator
          freshness={freshness}
          lastSuccessfulSyncAt={lastSuccessfulSyncAt}
          now={now}
        />
      </div>
    </PageHeader>
  );
}
