import { ChevronDown, Ellipsis, Search } from "lucide-react";
import Link from "next/link";

import { ActionButton, PageHeader } from "@/components/ui/terminal";
import { stocks } from "@/lib/mock-data/stock-monitor";

const columns =
  "grid-cols-[70px_minmax(170px,1fr)_60px_104px_72px_118px_68px_100px_104px_112px_108px_34px]";

function FilterButton({
  children,
  chevron = false,
}: {
  children: string;
  chevron?: boolean;
}) {
  return (
    <button
      className="flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      type="button"
    >
      {children}
      {chevron ? (
        <ChevronDown
          aria-hidden="true"
          className="size-3 text-[var(--text-muted)]"
        />
      ) : null}
    </button>
  );
}

export default function WatchlistPage() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="78 active instruments · 34 GPW · 44 USA"
        title="Watchlist"
      >
        <ActionButton variant="primary">+ Add stock</ActionButton>
      </PageHeader>

      <div className="flex h-[42px] items-center gap-2 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px]">
        <label className="flex h-7 w-[250px] items-center gap-[7px] rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px]">
          <Search
            aria-hidden="true"
            className="size-[13px] text-[var(--text-muted)]"
          />
          <input
            aria-label="Filter watchlist"
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
            placeholder="Ticker or company"
            type="search"
          />
        </label>
        <FilterButton chevron>Market: All</FilterButton>
        <FilterButton chevron>Status: All</FilterButton>
        <FilterButton>Near buy zone</FilterButton>
        <FilterButton>Stale price</FilterButton>
        <FilterButton>No monitoring</FilterButton>
        <button
          className="ml-auto font-mono text-[10px] text-[var(--accent-primary)]"
          type="button"
        >
          Sort: Priority ↓
        </button>
      </div>

      <div className="h-[454px] overflow-hidden rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]">
        <div
          className={`grid h-[34px] items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] ${columns}`}
        >
          {[
            "Ticker",
            "Company",
            "Market",
            "Price",
            "Daily %",
            "Status",
            "Score",
            "Nearest Buy",
            "Distance",
            "Last Monitoring",
            "Freshness",
          ].map((label) => (
            <span
              className="px-2 text-[9px] font-semibold text-[var(--text-muted)]"
              key={label}
            >
              {label}
            </span>
          ))}
          <Ellipsis
            aria-label="Actions"
            className="size-[14px] text-[var(--text-muted)]"
          />
        </div>
        {stocks.map((stock) => (
          <Link
            className={`grid h-[42px] items-center border-b border-[var(--border-subtle)] text-[10px] hover:bg-[var(--surface-hover)] ${stock.ticker === "EME" ? "bg-[var(--surface-selected)]" : ""} ${columns}`}
            href={`/stocks/${stock.market.toLowerCase()}/${stock.ticker.toLowerCase()}`}
            key={stock.ticker}
          >
            <span className="px-2 font-semibold">{stock.ticker}</span>
            <span className="truncate px-2">{stock.company}</span>
            <span className="px-2">{stock.market}</span>
            <span className="px-2 font-mono">{stock.price}</span>
            <span
              className={`px-2 font-mono ${stock.dailyTone === "positive" ? "text-[var(--positive)]" : stock.dailyTone === "negative" ? "text-[var(--negative)]" : "text-[var(--text-secondary)]"}`}
            >
              {stock.daily}
            </span>
            <span className="truncate px-2">{stock.status}</span>
            <span className="px-2 font-mono text-[var(--accent-primary)]">
              {stock.score}
            </span>
            <span className="px-2 font-mono">{stock.nearestBuy}</span>
            <span className="px-2 font-mono text-[var(--warning)]">
              {stock.distance}
            </span>
            <span className="px-2">{stock.lastMonitoring}</span>
            <span
              className={`truncate px-2 ${stock.freshnessTone === "negative" ? "text-[var(--negative)]" : stock.freshnessTone === "warning" ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}
            >
              {stock.freshness}
            </span>
            <Ellipsis
              aria-hidden="true"
              className="size-[14px] text-[var(--text-muted)]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
