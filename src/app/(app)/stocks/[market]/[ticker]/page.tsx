import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getStockResearchDetail } from "@/application/stocks/get-stock-research-detail";
import { CompanyHeader } from "@/components/stocks/company-header";
import { CompanyScores } from "@/components/stocks/company-scores";
import {
  InvestmentThesisCard,
  KeyRisksCard,
  KillTheThesisCard,
} from "@/components/stocks/investment-thesis-card";
import { LatestAnalysisCard } from "@/components/stocks/latest-analysis-card";
import { MonitoringHistoryCard } from "@/components/stocks/monitoring-history-card";
import { NotesPanel } from "@/components/stocks/notes-panel";
import { PriceLevelsCard } from "@/components/stocks/price-levels-card";
import { Surface } from "@/components/ui/terminal";
import { isMarketCode } from "@/domain/markets/market";
import {
  createSupabaseStockResearchReader,
  ResearchInfrastructureError,
} from "@/infrastructure/supabase/queries/research";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

type StockPageProps = { params: Promise<{ market: string; ticker: string }> };

export async function generateMetadata({
  params,
}: StockPageProps): Promise<Metadata> {
  const { ticker } = await params;
  return { title: ticker.toUpperCase() };
}

function DataError() {
  return (
    <div className="page-frame flex flex-col gap-5">
      <Surface className="border-destructive bg-[var(--negative-subtle)] p-4 sm:p-5">
        <h1 className="text-card-title">Research data unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary-foreground">
          Refresh the page and try again. No historical data was changed.
        </p>
      </Surface>
    </div>
  );
}

export default async function StockPage({ params }: StockPageProps) {
  const raw = await params;
  const market = raw.market.toUpperCase();
  if (!isMarketCode(market)) notFound();
  const user = await requireAllowedUser();
  const client = await createClient();
  let detail: Awaited<ReturnType<typeof getStockResearchDetail>>;
  try {
    detail = await getStockResearchDetail(
      createSupabaseStockResearchReader(client),
      user.id,
      market,
      raw.ticker,
    );
  } catch (error) {
    if (error instanceof ResearchInfrastructureError) return <DataError />;
    throw error;
  }
  if (!detail) notFound();
  if (detail.stock.currency !== "PLN" && detail.stock.currency !== "USD") {
    return <DataError />;
  }

  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 sm:gap-6">
      <CompanyHeader detail={detail} />
      <CompanyScores monitoring={detail.latestMonitoring} />
      <LatestAnalysisCard
        currency={detail.stock.currency}
        monitoring={detail.latestMonitoring}
      />

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(17rem,32%)_minmax(0,1fr)]">
        <PriceLevelsCard detail={detail} />
        <InvestmentThesisCard thesis={detail.latestThesis} />
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <KeyRisksCard
          className="order-1 xl:col-start-2 xl:row-start-1"
          thesis={detail.latestThesis}
        />
        <KillTheThesisCard
          className="order-2 xl:col-start-2 xl:row-start-2"
          thesis={detail.latestThesis}
        />
        <MonitoringHistoryCard
          className="order-3 xl:col-start-1 xl:row-start-1 xl:row-span-3"
          items={detail.monitoringHistory}
        />
        <NotesPanel
          className="order-4 xl:col-start-2 xl:row-start-3"
          notes={detail.notes}
          stockId={detail.stock.id}
        />
      </div>
    </div>
  );
}
