import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPortfolio } from "@/application/portfolio/get-portfolio";
import type { PortfolioPosition } from "@/application/portfolio/types";
import { DeleteInvestmentButton } from "@/components/portfolio/delete-investment-button";
import {
  formatMoney,
  formatPercent,
  formatQuantity,
  portfolioDateFormatter,
  resultMetricTone,
} from "@/components/portfolio/format";
import { InvestmentDialog } from "@/components/portfolio/investment-dialog";
import {
  MetricCard,
  PageHeader,
  SectionHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";
import { calculatePosition } from "@/domain/portfolio/calculations";
import {
  createSupabasePortfolioReader,
  PortfolioInfrastructureError,
} from "@/infrastructure/supabase/queries/portfolio";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

type PortfolioDetailPageProps = {
  params: Promise<{ stockId: string }>;
};

export const metadata: Metadata = { title: "Portfolio position" };

function todayInWarsaw() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date());
}

function PositionMetrics({ position }: { position: PortfolioPosition }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      <MetricCard
        label="Quantity"
        value={
          <span className="font-mono">
            {formatQuantity(position.totalQuantity)}
          </span>
        }
      />
      <MetricCard
        label="Avg. purchase"
        value={
          <span className="font-mono">
            {formatMoney(position.averagePurchasePrice, position.currency)}
          </span>
        }
      />
      <MetricCard
        label="Current price"
        value={
          <span className="font-mono">
            {formatMoney(position.currentPrice, position.currency)}
          </span>
        }
      />
      <MetricCard
        label="Cost basis"
        value={
          <span className="font-mono">
            {formatMoney(position.totalCostBasis, position.currency)}
          </span>
        }
      />
      <MetricCard
        label="Current value"
        value={
          <span className="font-mono">
            {formatMoney(position.currentValue, position.currency)}
          </span>
        }
      />
      <MetricCard
        label="Profit / Loss"
        tone={resultMetricTone(position.profitLoss)}
        value={
          <span className="font-mono">
            {formatMoney(position.profitLoss, position.currency)}
          </span>
        }
      />
      <MetricCard
        label="Return"
        tone={resultMetricTone(position.profitLossPercent)}
        value={
          <span className="font-mono">
            {formatPercent(position.profitLossPercent)}
          </span>
        }
      />
    </div>
  );
}

export default async function PortfolioDetailPage({
  params,
}: PortfolioDetailPageProps) {
  const { stockId } = await params;
  const user = await requireAllowedUser();
  const client = await createClient();
  let portfolio: Awaited<ReturnType<typeof getPortfolio>>;
  try {
    portfolio = await getPortfolio(
      createSupabasePortfolioReader(client),
      user.id,
    );
  } catch (error) {
    if (error instanceof PortfolioInfrastructureError) {
      return (
        <div className="page-frame flex flex-col gap-5">
          <Surface className="border-negative bg-[var(--negative-subtle)]" padded>
            <h1 className="text-card-title">Position unavailable</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Refresh the page and try again. No transaction was changed.
            </p>
          </Surface>
        </div>
      );
    }
    throw error;
  }

  const position = portfolio.positions.find((item) => item.id === stockId);
  if (!position) notFound();

  return (
    <div className="page-frame flex flex-col gap-5">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
        href="/portfolio"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to portfolio
      </Link>

      <PageHeader
        compact
        description={`${position.ticker} · ${position.currency} · ${position.transactions.length} BUY lot(s)`}
        title={position.name}
      >
        <StatusBadge tone="info">{position.marketCode}</StatusBadge>
        <InvestmentDialog
          defaultDate={todayInWarsaw()}
          defaultStockId={position.id}
          stocks={[position]}
        />
      </PageHeader>

      <p className="ui-meta -mt-2">
        {position.quote
          ? `Price as of ${new Date(position.quote.asOf).toLocaleString("en-GB", { timeZone: "Europe/Warsaw" })} · ${position.quote.provider} · ${position.quote.qualityStatus}`
          : "Price unavailable · add or refresh market data to calculate performance"}
      </p>

      <PositionMetrics position={position} />

      <Surface>
        <SectionHeader
          action={
            <InvestmentDialog
              compactTrigger
              defaultDate={todayInWarsaw()}
              defaultStockId={position.id}
              stocks={[position]}
            />
          }
          meta="Source transactions used for every portfolio calculation"
          title="Purchase history"
        />
        <div className="overflow-x-auto">
          <table className="data-table min-w-[45rem]">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th className="text-right" scope="col">
                  Quantity
                </th>
                <th className="text-right" scope="col">
                  Price
                </th>
                <th className="text-right" scope="col">
                  Value
                </th>
                <th className="text-right" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {position.transactions.map((transaction) => {
                const transactionValue = calculatePosition(
                  [
                    {
                      quantity: transaction.quantity,
                      pricePerShare: transaction.pricePerShare,
                    },
                  ],
                  null,
                ).totalCostBasis;
                return (
                  <tr key={transaction.id}>
                    <td className="font-mono">
                      {portfolioDateFormatter.format(
                        new Date(`${transaction.transactionDate}T12:00:00Z`),
                      )}
                    </td>
                    <td className="text-right font-mono">
                      {formatQuantity(transaction.quantity)}
                    </td>
                    <td className="text-right font-mono">
                      {formatMoney(
                        transaction.pricePerShare,
                        position.currency,
                      )}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {formatMoney(transactionValue, position.currency)}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <InvestmentDialog
                          defaultDate={todayInWarsaw()}
                          defaultStockId={position.id}
                          stocks={[position]}
                          transaction={transaction}
                        />
                        <DeleteInvestmentButton
                          transactionId={transaction.id}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
