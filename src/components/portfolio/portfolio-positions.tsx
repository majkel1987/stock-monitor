import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { PortfolioPosition } from "@/application/portfolio/types";
import { Surface } from "@/components/ui/terminal";
import { MarketBadge } from "@/components/watchlist/watchlist-badges";
import {
  formatMoney,
  formatPercent,
  formatQuantity,
  resultTone,
} from "./format";

function PriceUnavailable() {
  return (
    <span
      className="text-muted-foreground"
      title="No current market quote is stored"
    >
      N/A
    </span>
  );
}

export function PortfolioPositions({
  positions,
}: {
  positions: PortfolioPosition[];
}) {
  return (
    <>
      <Surface className="hidden overflow-x-auto lg:block">
        <table className="data-table min-w-[72rem]">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Market</th>
              <th className="text-right" scope="col">
                Quantity
              </th>
              <th className="text-right" scope="col">
                Avg. buy price
              </th>
              <th className="text-right" scope="col">
                Current price
              </th>
              <th className="text-right" scope="col">
                Cost basis
              </th>
              <th className="text-right" scope="col">
                Current value
              </th>
              <th className="text-right" scope="col">
                P/L
              </th>
              <th className="text-right" scope="col">
                P/L %
              </th>
              <th className="text-right" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id}>
                <td>
                  <Link
                    className="flex min-w-44 flex-col hover:text-primary"
                    href={`/portfolio/${position.id}`}
                  >
                    <strong className="font-mono text-base font-semibold tracking-tight">
                      {position.ticker}
                    </strong>
                    <span className="max-w-52 truncate text-sm text-muted-foreground">
                      {position.name}
                    </span>
                  </Link>
                </td>
                <td>
                  <MarketBadge code={position.marketCode} />
                </td>
                <td className="text-right font-mono">
                  {formatQuantity(position.totalQuantity)}
                </td>
                <td className="text-right font-mono">
                  {formatMoney(
                    position.averagePurchasePrice,
                    position.currency,
                  )}
                </td>
                <td className="text-right font-mono">
                  <span className="flex flex-col items-end gap-0.5">
                    {position.currentPrice === null ? (
                      <PriceUnavailable />
                    ) : (
                      formatMoney(position.currentPrice, position.currency)
                    )}
                    {position.quote ? (
                      <span
                        className="ui-meta font-sans"
                        title={`As of ${new Date(position.quote.asOf).toLocaleString("en-GB", { timeZone: "Europe/Warsaw" })}`}
                      >
                        {position.quote.provider} ·{" "}
                        {position.quote.qualityStatus}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="text-right font-mono">
                  {formatMoney(position.totalCostBasis, position.currency)}
                </td>
                <td className="text-right font-mono">
                  {position.currentValue === null ? (
                    <PriceUnavailable />
                  ) : (
                    formatMoney(position.currentValue, position.currency)
                  )}
                </td>
                <td
                  className={`text-right font-mono font-semibold ${resultTone(position.profitLoss)}`}
                >
                  {position.profitLoss === null
                    ? "N/A"
                    : formatMoney(position.profitLoss, position.currency)}
                </td>
                <td
                  className={`text-right font-mono font-semibold ${resultTone(position.profitLossPercent)}`}
                >
                  {formatPercent(position.profitLossPercent)}
                </td>
                <td className="text-right">
                  <Link
                    aria-label={`View ${position.ticker} position details`}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    href={`/portfolio/${position.id}`}
                  >
                    Details <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      <div className="grid gap-3 lg:hidden">
        {positions.map((position) => (
          <Link href={`/portfolio/${position.id}`} key={position.id}>
            <Surface className="flex flex-col gap-3 p-4 transition-colors hover:bg-secondary/45">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="font-mono text-base font-semibold tracking-tight">
                    {position.ticker}
                  </strong>
                  <p className="text-sm text-muted-foreground">{position.name}</p>
                </div>
                <MarketBadge code={position.marketCode} />
              </div>
              <div className="flex items-end justify-between gap-4 border-y border-[var(--border-subtle)] py-3">
                <div>
                  <span className="ui-meta block">Current value</span>
                  <strong className="font-mono text-lg">
                    {formatMoney(position.currentValue, position.currency)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="ui-meta block">P/L</span>
                  <strong
                    className={`font-mono text-lg ${resultTone(position.profitLoss)}`}
                  >
                    {position.profitLoss === null
                      ? "N/A"
                      : `${formatMoney(position.profitLoss, position.currency)} · ${formatPercent(position.profitLossPercent)}`}
                  </strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="ui-meta block">Quantity</span>
                  <span className="font-mono">
                    {formatQuantity(position.totalQuantity)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="ui-meta block">Avg. purchase price</span>
                  <span className="font-mono">
                    {formatMoney(
                      position.averagePurchasePrice,
                      position.currency,
                    )}
                  </span>
                </div>
              </div>
              <p className="ui-meta">
                {position.quote
                  ? `Price: ${position.quote.provider} · ${position.quote.qualityStatus} · as of ${new Date(position.quote.asOf).toLocaleString("en-GB", { timeZone: "Europe/Warsaw" })}`
                  : "Price unavailable"}
              </p>
            </Surface>
          </Link>
        ))}
      </div>
    </>
  );
}
