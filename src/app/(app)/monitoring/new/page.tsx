import { notFound, redirect } from "next/navigation";

import { getStockResearchDetail } from "@/application/stocks/get-stock-research-detail";
import { getLatestUsdPlnRate } from "@/application/sync/get-latest-fx-rate";
import { MonitoringForm } from "@/components/monitoring/monitoring-form";
import { isMarketCode } from "@/domain/markets/market";
import {
  createSupabaseStockResearchReader,
  ResearchInfrastructureError,
} from "@/infrastructure/supabase/queries/research";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import {
  createSupabaseFxRateReader,
  FxRateInfrastructureError,
} from "@/infrastructure/supabase/queries/fx-rates";

type NewMonitoringPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewMonitoringPage({
  searchParams,
}: NewMonitoringPageProps) {
  const query = await searchParams;
  const marketValue =
    typeof query.market === "string" ? query.market.toUpperCase() : "";
  const ticker = typeof query.ticker === "string" ? query.ticker : "";
  if (!isMarketCode(marketValue) || !ticker) {
    redirect("/watchlist?error=invalid_action");
  }

  const user = await requireAllowedUser();
  const client = await createClient();
  let detail: Awaited<ReturnType<typeof getStockResearchDetail>>;
  try {
    detail = await getStockResearchDetail(
      createSupabaseStockResearchReader(client),
      user.id,
      marketValue,
      ticker,
    );
  } catch (error) {
    if (error instanceof ResearchInfrastructureError) {
      redirect("/watchlist?error=invalid_action");
    }
    throw error;
  }
  if (!detail) notFound();
  if (detail.stock.currency !== "PLN" && detail.stock.currency !== "USD") {
    notFound();
  }

  let fxRate = null;
  if (detail.stock.currency === "USD") {
    try {
      fxRate = await getLatestUsdPlnRate(createSupabaseFxRateReader(client));
    } catch (error) {
      if (!(error instanceof FxRateInfrastructureError)) throw error;
    }
  }

  const requestedSupersedes =
    typeof query.supersedes === "string" ? query.supersedes : null;
  const supersedes = requestedSupersedes
    ? (detail.monitoringHistory.find(
        (item) => item.id === requestedSupersedes,
      ) ?? null)
    : null;

  return (
    <MonitoringForm
      currentStatus={detail.currentStatus}
      fxRate={fxRate}
      initialNow={new Date().toISOString()}
      previous={supersedes ?? detail.latestMonitoring}
      quote={detail.quote}
      statuses={detail.availableStatuses}
      stock={{
        id: detail.stock.id,
        ticker: detail.stock.ticker,
        name: detail.stock.name,
        marketCode: detail.stock.marketCode,
        currency: detail.stock.currency,
      }}
      supersedesId={supersedes?.id ?? null}
      thesis={detail.latestThesis}
    />
  );
}
