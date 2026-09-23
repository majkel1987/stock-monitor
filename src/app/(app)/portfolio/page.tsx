import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

import { getPortfolio } from "@/application/portfolio/get-portfolio";
import { InvestmentDialog } from "@/components/portfolio/investment-dialog";
import { PortfolioPositions } from "@/components/portfolio/portfolio-positions";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import {
  EmptyState,
  PageHeader,
  Surface,
} from "@/components/ui/terminal";
import {
  createSupabasePortfolioReader,
  PortfolioInfrastructureError,
} from "@/infrastructure/supabase/queries/portfolio";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export const metadata = { title: "Portfolio" };

function todayInWarsaw() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date());
}

function DataError() {
  return (
    <div className="page-frame flex flex-col gap-4">
      <PageHeader
        description="Actual holdings, aggregated from BUY transactions and valued with the shared EOD market data."
        index
        title="Portfolio"
      />
      <Surface className="border-negative bg-[var(--negative-subtle)]" padded>
        <h1 className="text-card-title">Portfolio unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The saved transactions were not changed. Refresh the page and try
          again.
        </p>
      </Surface>
    </div>
  );
}

export default async function PortfolioPage() {
  const user = await requireAllowedUser();
  const client = await createClient();
  let portfolio: Awaited<ReturnType<typeof getPortfolio>>;
  try {
    portfolio = await getPortfolio(
      createSupabasePortfolioReader(client),
      user.id,
    );
  } catch (error) {
    if (error instanceof PortfolioInfrastructureError) return <DataError />;
    throw error;
  }

  const hasUsdPosition = portfolio.positions.some(
    (position) => position.currency === "USD",
  );

  const positionsMeta =
    portfolio.summary.unavailablePriceCount > 0
      ? `${portfolio.summary.unavailablePriceCount} position(s) have no current price; total return is unavailable.`
      : hasUsdPosition && portfolio.usdPlnRate
        ? `USD positions converted at ${portfolio.usdPlnRate.rate} PLN · NBP ${portfolio.usdPlnRate.effectiveDate}`
        : hasUsdPosition
          ? "USD/PLN unavailable; combined PLN totals cannot be calculated."
          : "All portfolio totals shown in PLN.";

  return (
    <div className="page-frame flex flex-col gap-4">
      <PageHeader
        description="Actual holdings, aggregated from BUY transactions and valued with the shared EOD market data."
        index
        title="Portfolio"
      >
        <InvestmentDialog
          defaultDate={todayInWarsaw()}
          stocks={portfolio.stocks}
        />
      </PageHeader>

      {portfolio.positions.length ? (
        <>
          <PortfolioSummary summary={portfolio.summary} />
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-section-title">Positions</h2>
            <p className="ui-meta max-w-xl text-right">{positionsMeta}</p>
          </div>
          <PortfolioPositions positions={portfolio.positions} />
        </>
      ) : (
        <Surface className="px-6 py-10">
          <div className="mx-auto mb-2 flex justify-center">
            <span className="grid size-12 place-items-center rounded-[var(--radius-md)] border border-primary/25 bg-[var(--accent-subtle)] text-primary">
              <BriefcaseBusiness aria-hidden="true" className="size-5" />
            </span>
          </div>
          <EmptyState
            action={
              portfolio.stocks.length ? (
                <InvestmentDialog
                  compactTrigger
                  defaultDate={todayInWarsaw()}
                  stocks={portfolio.stocks}
                />
              ) : (
                <Link className="ui-button ui-button-primary" href="/watchlist">
                  Add your first stock
                </Link>
              )
            }
            description="Add your first BUY transaction to start tracking actual holdings."
            title="Your portfolio is empty"
          />
        </Surface>
      )}
    </div>
  );
}
