import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import type { CurrencyCode } from "@/domain/markets/market";
import type { StockResearchDetail } from "@/application/stocks/research-types";
import { InvestmentDialog } from "@/components/portfolio/investment-dialog";
import { ManualQuoteDialog } from "@/components/stocks/manual-quote-dialog";
import { NoteDialog } from "@/components/stocks/notes-panel";
import { PriceLevelsEditor } from "@/components/stocks/price-levels-panel";
import { StatusBadge, Surface } from "@/components/ui/terminal";
import {
  MarketBadge,
  WatchlistStatusBadge,
} from "@/components/watchlist/watchlist-badges";
import { cn } from "@/lib/utils/cn";

import {
  dailyChangeToneClass,
  dataModeLabel,
  formatMoney,
  quoteStatusPresentation,
  secondaryActionClass,
  signedPercent,
  todayInWarsaw,
} from "./format";

const freshnessTone: Record<
  ReturnType<typeof quoteStatusPresentation>["tone"],
  "positive" | "warning" | "negative" | "info" | "neutral"
> = {
  positive: "positive",
  warning: "warning",
  negative: "negative",
  info: "info",
  muted: "neutral",
};

function QuoteStatusBadge({
  quote,
}: {
  quote: StockResearchDetail["quote"];
}) {
  const status = quoteStatusPresentation(quote);

  return (
    <StatusBadge tone={freshnessTone[status.tone]}>{status.label}</StatusBadge>
  );
}

function CurrentPrice({ detail }: { detail: StockResearchDetail }) {
  const quote = detail.quote;
  const status = quoteStatusPresentation(quote);
  const dayChange =
    quote?.dayChangePct === null || !quote
      ? null
      : Number(quote.dayChangePct);
  const ChangeIcon =
    dayChange !== null && dayChange < 0 ? ArrowDownRight : ArrowUpRight;

  if (!quote) {
    return (
      <Surface className="flex min-w-0 flex-col gap-2 p-4 lg:min-w-[16rem] lg:items-end lg:text-right">
        <span className="ui-meta font-medium tracking-wide uppercase">
          Last price
        </span>
        <p className="ui-kpi text-muted-foreground">Unavailable</p>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {status.description}
        </p>
        <QuoteStatusBadge quote={quote} />
      </Surface>
    );
  }

  return (
    <Surface className="flex min-w-0 flex-col gap-2 p-4 lg:min-w-[16rem] lg:items-end lg:text-right">
      <span className="ui-meta font-medium tracking-wide uppercase">
        Last price
      </span>
      <p className="ui-kpi font-mono tabular-nums text-foreground">
        {formatMoney(quote.price, quote.currency)}
      </p>
      {dayChange !== null ? (
        <p
          className={cn(
            "inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums lg:justify-end",
            dailyChangeToneClass(dayChange),
          )}
        >
          <ChangeIcon aria-hidden="true" className="size-3.5" />
          <span>{signedPercent(dayChange)}</span>
        </p>
      ) : null}
      <p className="ui-meta">{status.description}</p>
      <QuoteStatusBadge quote={quote} />
    </Surface>
  );
}

function stockCurrency(detail: StockResearchDetail): CurrencyCode {
  return detail.stock.currency === "USD" ? "USD" : "PLN";
}

function CompanyActions({ detail }: { detail: StockResearchDetail }) {
  const monitoringUrl = `/monitoring/new?market=${detail.stock.marketCode.toLowerCase()}&ticker=${encodeURIComponent(detail.stock.ticker)}`;
  const currency = stockCurrency(detail);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
      <Link
        className="ui-button ui-button-primary w-full justify-center lg:w-auto"
        href={monitoringUrl}
      >
        New monitoring
      </Link>
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
        <InvestmentDialog
          compactTrigger
          defaultDate={todayInWarsaw()}
          defaultStockId={detail.stock.id}
          stocks={[
            {
              id: detail.stock.id,
              ticker: detail.stock.ticker,
              name: detail.stock.name,
              marketCode: detail.stock.marketCode,
              currency,
            },
          ]}
          triggerClassName={secondaryActionClass}
        />
        <NoteDialog
          stockId={detail.stock.id}
          triggerClassName={secondaryActionClass}
        />
        <ManualQuoteDialog
          currency={currency}
          currentPrice={detail.quote?.price ?? null}
          marketCode={detail.stock.marketCode}
          stockId={detail.stock.id}
          ticker={detail.stock.ticker}
          triggerClassName={secondaryActionClass}
        />
        <PriceLevelsEditor
          currency={currency}
          levels={detail.priceLevels}
          stockId={detail.stock.id}
          triggerClassName={secondaryActionClass}
        />
      </div>
    </div>
  );
}

export function CompanyHeader({ detail }: { detail: StockResearchDetail }) {
  const { stock } = detail;

  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="ui-eyebrow">{stock.ticker}</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-page-title break-words">{stock.name}</h1>
            <MarketBadge code={stock.marketCode} />
          </div>
          <p className="mt-1 truncate text-sm leading-normal text-muted-foreground">
            {stock.exchange} · {stock.currency} · {dataModeLabel(stock.dataMode)}
          </p>
          <div className="mt-3">
            <WatchlistStatusBadge
              colorToken={detail.currentStatus.colorToken}
              label={detail.currentStatus.label}
            />
          </div>
        </div>
        <CurrentPrice detail={detail} />
      </div>
      <CompanyActions detail={detail} />
    </header>
  );
}
