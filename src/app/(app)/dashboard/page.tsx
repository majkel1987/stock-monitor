import Link from "next/link";

import {
  ActionButton,
  PageHeader,
  SectionHeader,
  Surface,
} from "@/components/ui/terminal";
import { stocks } from "@/lib/mock-data/stock-monitor";

const overview = [
  ["ALL", "78", "text-[var(--text-primary)]"],
  ["BUY", "9", "text-[var(--accent-primary)]"],
  ["WATCH", "31", "text-[var(--info)]"],
  ["DEEP DIVE", "7", "text-[var(--warning)]"],
  ["PORTFOLIO", "12", "text-[var(--positive)]"],
  ["STALE", "6", "text-[var(--negative)]"],
  ["GPW", "34", "text-[var(--text-secondary)]"],
  ["USA", "44", "text-[var(--text-secondary)]"],
] as const;

const tableColumns =
  "grid-cols-[76px_minmax(180px,1fr)_64px_96px_78px_130px_80px_104px_116px_110px]";

function OpportunitiesTable() {
  return (
    <div className="h-[326px] overflow-hidden rounded-b-[7px] border-x border-b border-[var(--border-default)] bg-[var(--surface-default)]">
      <div
        className={`grid h-8 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] ${tableColumns}`}
      >
        {[
          "Ticker",
          "Company",
          "Market",
          "Price",
          "Daily %",
          "Status",
          "Investment",
          "Nearest Buy",
          "Distance",
          "Last Analysis",
        ].map((label) => (
          <span
            className="px-[9px] text-[9px] font-semibold text-[var(--text-muted)]"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
      {stocks.slice(0, 7).map((stock) => (
        <Link
          className={`grid h-[42px] items-center border-b border-[var(--border-subtle)] text-[11px] hover:bg-[var(--surface-hover)] ${tableColumns}`}
          href={`/stocks/${stock.market.toLowerCase()}/${stock.ticker.toLowerCase()}`}
          key={stock.ticker}
        >
          <span className="px-[9px] font-semibold">{stock.ticker}</span>
          <span className="truncate px-[9px]">{stock.company}</span>
          <span className="px-[9px]">{stock.market}</span>
          <span className="px-[9px] font-mono">{stock.price}</span>
          <span
            className={`px-[9px] font-mono ${stock.dailyTone === "positive" ? "text-[var(--positive)]" : stock.dailyTone === "negative" ? "text-[var(--negative)]" : "text-[var(--text-secondary)]"}`}
          >
            {stock.daily}
          </span>
          <span className="truncate px-[9px]">{stock.status}</span>
          <span className="px-[9px] font-mono text-[var(--accent-primary)]">
            {stock.score}
          </span>
          <span className="px-[9px] font-mono">{stock.nearestBuy}</span>
          <span className="px-[9px] font-mono text-[var(--warning)]">
            {stock.distance}
          </span>
          <span className="px-[9px]">{stock.lastMonitoring} 2026</span>
        </Link>
      ))}
    </div>
  );
}

const nearBuy = [
  ["EME", "475.00 USD", "Tranche 1 · 460.00", "3.2% above target"],
  ["XTB", "74.62 PLN", "Strong Buy · 72.00", "3.6% above target"],
  ["PZU", "57.84 PLN", "Tranche 1 · 56.00", "3.3% above target"],
] as const;

const attention = [
  ["FIX · Monitoring stale", "Last analysis 30 days ago"],
  ["ABE · Missing market data", "Provider failed at 16:42"],
  ["DVL · Manual price", "Verify before next analysis"],
] as const;

const recent = [
  [
    "V",
    "31 Aug · 18:20",
    "WATCH → PORTFOLIO",
    "349.12 USD",
    "Score 77 → 81",
    "Payments resilience confirmed after Q3 update.",
  ],
  [
    "XTB",
    "30 Aug · 09:10",
    "WATCH → BUY CANDIDATE",
    "74.62 PLN",
    "Score 78 → 82",
    "Valuation entered planned accumulation range.",
  ],
  [
    "EME",
    "28 Aug · 21:05",
    "WAIT → DEEP DIVE",
    "475.00 USD",
    "Score 74 → 78",
    "Backlog quality merits refreshed downside case.",
  ],
] as const;

export default function DashboardPage() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Research priorities across GPW and USA"
        title="Dashboard"
      >
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          Last full sync 01 Sep · 16:42 CET
        </span>
        <ActionButton>Refresh prices</ActionButton>
      </PageHeader>

      <Surface className="h-[94px]">
        <div className="flex h-8 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3">
          <h2 className="text-[10px] font-semibold text-[var(--text-muted)]">
            MARKET OVERVIEW
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            78 active instruments
          </span>
        </div>
        <div className="grid h-[62px] grid-cols-8">
          {overview.map(([label, value, tone], index) => (
            <div
              className={`flex flex-col gap-1 px-3 pt-[10px] ${index ? "border-l border-[var(--border-subtle)]" : ""}`}
              key={label}
            >
              <span className="text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
                {label}
              </span>
              <strong
                className={`font-mono text-lg leading-[23px] font-semibold ${tone}`}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>
      </Surface>

      <section className="h-[360px]">
        <SectionHeader
          className="h-[34px] bg-transparent px-0"
          meta={<span className="font-mono">Sorted by priority score</span>}
          title="Opportunities · investigate now"
        />
        <OpportunitiesTable />
      </section>

      <div className="grid h-[180px] grid-cols-2 gap-[18px]">
        <Surface>
          <SectionHeader
            meta={
              <span className="font-mono text-[9px]">≤ 6% from target</span>
            }
            title="Near buy zone"
          />
          {nearBuy.map(([ticker, current, target, distance]) => (
            <Link
              className="grid h-12 grid-cols-[112px_1fr_auto] items-center border-b border-[var(--border-subtle)] px-3 hover:bg-[var(--surface-hover)]"
              href={`/stocks/${ticker === "XTB" || ticker === "PZU" ? "gpw" : "usa"}/${ticker.toLowerCase()}`}
              key={ticker}
            >
              <span className="flex flex-col">
                <strong className="font-mono text-[11px] leading-[14px]">
                  {ticker}
                </strong>
                <span className="font-mono text-[9px] leading-3 text-[var(--text-muted)]">
                  {current}
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {target}
                </span>
                <strong className="font-mono text-[10px] text-[var(--warning)]">
                  {distance}
                </strong>
              </span>
              <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                NOT REACHED
              </span>
            </Link>
          ))}
        </Surface>
        <Surface>
          <SectionHeader
            meta={
              <span className="font-mono text-[9px]">
                6 open research tasks
              </span>
            }
            title="Needs attention"
          />
          {attention.map(([issue, detail]) => (
            <div
              className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-3"
              key={issue}
            >
              <span className="flex flex-col">
                <strong className="text-[11px] leading-[14px]">{issue}</strong>
                <span className="text-[9px] leading-3 text-[var(--text-muted)]">
                  {detail}
                </span>
              </span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                →
              </span>
            </div>
          ))}
        </Surface>
      </div>

      <Surface className="h-[180px]">
        <SectionHeader
          meta={
            <Link
              className="font-semibold text-[var(--accent-primary)]"
              href="/monitoring"
            >
              View full history →
            </Link>
          }
          title="Recent monitoring changes"
        />
        {recent.map(([ticker, time, transition, price, score, explanation]) => (
          <div
            className="grid h-12 grid-cols-[48px_110px_170px_100px_120px_1fr] items-center gap-[14px] border-b border-[var(--border-subtle)] px-3 text-[10px]"
            key={`${ticker}-${time}`}
          >
            <strong className="font-mono text-[11px]">{ticker}</strong>
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              {time}
            </span>
            <strong className="text-[var(--accent-primary)]">
              {transition}
            </strong>
            <span className="font-mono">{price}</span>
            <span className="font-mono text-[var(--text-secondary)]">
              {score}
            </span>
            <span className="truncate text-[var(--text-secondary)]">
              {explanation}
            </span>
          </div>
        ))}
      </Surface>
    </div>
  );
}
