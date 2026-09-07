import Link from "next/link";

import { getDashboard } from "@/application/dashboard/get-dashboard";
import type {
  AttentionReason,
  DashboardStatus,
  NeedsAttentionRow,
  OpportunityRow,
  RecentMonitoringRow,
} from "@/application/dashboard/types";
import { RefreshMarketDataButton } from "@/components/layout/refresh-market-data-button";
import { PageHeader, SectionHeader, Surface } from "@/components/ui/terminal";
import {
  createSupabaseDashboardReader,
  DashboardInfrastructureError,
} from "@/infrastructure/supabase/queries/dashboard";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

const opportunityColumns = [76, 0, 64, 96, 78, 130, 80, 104, 116, 110];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Warsaw",
});

function stockHref(marketCode: string, ticker: string) {
  return `/stocks/${marketCode.toLowerCase()}/${encodeURIComponent(ticker)}`;
}

function formatNumber(value: string, minimumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 6,
  }).format(Number(value));
}

function formatPrice(value: string, currency: string) {
  return `${formatNumber(value)} ${currency}`;
}

function formatPercent(value: string | null) {
  if (value === null) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const sign = number > 0 ? "+" : number < 0 ? "−" : "";
  return `${sign}${Math.abs(number).toFixed(1)}%`;
}

function freshnessClass(value: NonNullable<OpportunityRow["quote"]>["qualityStatus"]) {
  if (value === "fresh") return "text-[var(--positive)]";
  if (value === "stale") return "text-[var(--negative)]";
  if (value === "closed") return "text-[var(--text-muted)]";
  return "text-[var(--warning)]";
}

function signedDistance(value: number | null) {
  if (value === null) return "—";
  if (value > 0) return `${value.toFixed(1)}% below target`;
  if (value < 0) return `${Math.abs(value).toFixed(1)}% above target`;
  return "At target";
}

function statusClass(status: DashboardStatus) {
  const classes: Record<string, string> = {
    accent: "text-[var(--accent-primary)]",
    danger: "text-[var(--negative)]",
    info: "text-[var(--info)]",
    negative: "text-[var(--negative)]",
    neutral: "text-[var(--text-secondary)]",
    portfolio: "text-[var(--positive)]",
    positive: "text-[var(--positive)]",
    warning: "text-[var(--warning)]",
  };
  return classes[status.colorToken] ?? "text-[var(--text-primary)]";
}

function OpportunitiesTable({ rows }: { rows: OpportunityRow[] }) {
  return (
    <div className="h-[326px] overflow-auto rounded-b-[7px] border-x border-b border-[var(--border-default)] bg-[var(--surface-default)]">
      <table className="w-full min-w-[1040px] table-fixed border-collapse">
        <colgroup>
          {opportunityColumns.map((width, index) =>
            width ? (
              <col key={`${width}-${index}`} style={{ width }} />
            ) : (
              <col key={`fluid-${index}`} />
            ),
          )}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[var(--bg-tertiary)]">
          <tr className="h-8 border-b border-[var(--border-subtle)]">
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
            ].map((label, index) => (
              <th
                className={`px-[9px] text-[9px] font-semibold tracking-[0.45px] text-[var(--text-muted)] ${[3, 4, 6, 7, 8].includes(index) ? "text-right" : "text-left"}`}
                key={label}
                scope="col"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => {
              const href = stockHref(row.marketCode, row.ticker);
              return (
                <tr
                  className="h-[42px] border-b border-[var(--border-subtle)] text-[11px] hover:bg-[var(--surface-hover)]"
                  key={row.stockId}
                >
                  <td className="px-[9px] font-semibold">
                    <Link
                      className="hover:text-[var(--accent-primary)]"
                      href={href}
                    >
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="truncate px-[9px]">
                    <Link
                      className="hover:text-[var(--accent-primary)]"
                      href={href}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-[9px]">{row.marketCode}</td>
                  <td
                    className="px-[9px] text-right font-mono"
                    title={
                      row.quote
                        ? `${row.quote.qualityStatus.toUpperCase()} · ${row.quote.provider === "manual" ? "Manual" : row.quote.provider} · ${dateTimeFormatter.format(new Date(row.quote.asOf))}`
                        : "No current quote"
                    }
                  >
                    {row.quote ? (
                      <span className="flex flex-col items-end leading-3">
                        <span>
                          {formatPrice(row.quote.price, row.quote.currency)}
                        </span>
                        <span
                          className={`max-w-full truncate text-[8px] ${freshnessClass(row.quote.qualityStatus)}`}
                        >
                          {row.quote.qualityStatus.toUpperCase()} ·{" "}
                          {row.quote.provider === "manual"
                            ? "Manual"
                            : row.quote.provider}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--negative)]">UNAVAILABLE</span>
                    )}
                  </td>
                  <td
                    className={`px-[9px] text-right font-mono ${row.quote?.dayChangePct && Number(row.quote.dayChangePct) > 0 ? "text-[var(--positive)]" : row.quote?.dayChangePct && Number(row.quote.dayChangePct) < 0 ? "text-[var(--negative)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {formatPercent(row.quote?.dayChangePct ?? null)}
                  </td>
                  <td
                    className={`truncate px-[9px] ${statusClass(row.status)}`}
                    title={row.status.label}
                  >
                    {row.status.label.toUpperCase()}
                  </td>
                  <td className="px-[9px] text-right font-mono text-[var(--accent-primary)]">
                    {row.investmentScore ?? "—"}
                  </td>
                  <td className="px-[9px] text-right font-mono">
                    {row.nearestBuyLevel
                      ? formatNumber(row.nearestBuyLevel.value)
                      : "No buy level"}
                  </td>
                  <td className="px-[9px] text-right font-mono text-[var(--warning)]">
                    {row.nearestBuyLevel
                      ? signedDistance(row.nearestBuyLevel.distancePct)
                      : "—"}
                  </td>
                  <td className="px-[9px]">
                    {row.lastAnalysisAt
                      ? dateFormatter.format(new Date(row.lastAnalysisAt))
                      : "Never"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                className="h-[84px] px-4 text-[11px] text-[var(--text-muted)]"
                colSpan={10}
              >
                No opportunities
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const reasonLabels: Record<AttentionReason, string> = {
  no_monitoring: "No monitoring",
  stale_monitoring: "Monitoring stale",
  missing_price: "Missing market data",
  stale_price: "Market data stale",
};

function attentionDetail(row: NeedsAttentionRow) {
  if (row.reasons.includes("no_monitoring"))
    return "No analysis has been recorded";
  if (row.reasons.includes("stale_monitoring") && row.lastAnalysisAt) {
    const days = Math.floor(
      (Date.now() - Date.parse(row.lastAnalysisAt)) / 86_400_000,
    );
    return `Last analysis ${days} days ago`;
  }
  if (row.reasons.includes("missing_price"))
    return "No current quote is stored";
  return "Stored quote is explicitly marked stale";
}

function monitoringTransition(row: RecentMonitoringRow) {
  if (!row.previousStatus || row.previousStatus.id === row.status.id) {
    return row.status.label.toUpperCase();
  }
  return `${row.previousStatus.label.toUpperCase()} → ${row.status.label.toUpperCase()}`;
}

function scoreChange(row: RecentMonitoringRow) {
  if (row.investmentScore === null) return "Score —";
  if (row.previousInvestmentScore === null)
    return `Score ${row.investmentScore}`;
  return `Score ${row.previousInvestmentScore} → ${row.investmentScore}`;
}

function EmptyDashboard() {
  return (
    <section className="flex w-full flex-col gap-1.5 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
      <h2 className="text-[13px] leading-[17px] font-semibold">
        Add your first stock
      </h2>
      <p className="text-[11px] leading-[14px] text-[var(--text-secondary)]">
        Start a GPW or USA watchlist to build your research dashboard.
      </p>
      <Link
        className="text-[11px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
        href="/watchlist"
      >
        + Add stock
      </Link>
    </section>
  );
}

function DataError() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Research priorities across GPW and USA"
        title="Dashboard"
      />
      <section className="rounded-[7px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-4">
        <h2 className="text-[13px] font-semibold">Dashboard unavailable</h2>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          The stored research data could not be loaded. Refresh the page and try
          again.
        </p>
      </section>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireAllowedUser();
  const client = await createClient();
  let data: Awaited<ReturnType<typeof getDashboard>>;

  try {
    data = await getDashboard(createSupabaseDashboardReader(client), user.id);
  } catch (error) {
    if (error instanceof DashboardInfrastructureError) return <DataError />;
    throw error;
  }

  const overview = [
    ["ALL", data.marketOverview.all, "text-[var(--text-primary)]"],
    ["BUY", data.marketOverview.opportunity, "text-[var(--accent-primary)]"],
    ["WATCH", data.marketOverview.watch, "text-[var(--info)]"],
    ["DEEP DIVE", data.marketOverview.research, "text-[var(--warning)]"],
    ["PORTFOLIO", data.marketOverview.portfolio, "text-[var(--positive)]"],
    ["STALE", data.marketOverview.stale, "text-[var(--negative)]"],
    ["GPW", data.marketOverview.gpw, "text-[var(--text-secondary)]"],
    ["USA", data.marketOverview.usa, "text-[var(--text-secondary)]"],
  ] as const;
  const syncLabel = data.metadata.lastSuccessfulSyncAt
    ? `Last full sync ${dateTimeFormatter.format(new Date(data.metadata.lastSuccessfulSyncAt))} CET`
    : "Never synced";

  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Research priorities across GPW and USA"
        title="Dashboard"
      >
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {syncLabel}
        </span>
        <RefreshMarketDataButton label="Refresh prices" />
      </PageHeader>

      {data.marketOverview.all === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          <Surface className="h-[94px]">
            <div className="flex h-8 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3">
              <h2 className="text-[10px] font-semibold tracking-[0.7px] text-[var(--text-muted)]">
                MARKET OVERVIEW
              </h2>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {data.marketOverview.all} active instruments
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
            <OpportunitiesTable rows={data.opportunities} />
          </section>

          <div className="grid h-[180px] grid-cols-2 gap-[18px]">
            <Surface className="flex flex-col">
              <SectionHeader
                meta={
                  <span className="font-mono text-[9px]">
                    ≤ 10% from target
                  </span>
                }
                title="Near buy zone"
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                {data.nearBuyZone.length ? (
                  data.nearBuyZone.map((row) => (
                    <Link
                      className="grid h-[46px] grid-cols-[76px_1fr_auto] items-center border-b border-[var(--border-subtle)] px-3 hover:bg-[var(--surface-hover)]"
                      href={stockHref(row.marketCode, row.ticker)}
                      key={row.stockId}
                    >
                      <span className="flex flex-col gap-0.5">
                        <strong className="font-mono text-[11px] leading-[14px]">
                          {row.ticker}
                        </strong>
                        <span className="font-mono text-[9px] leading-3 text-[var(--text-muted)]">
                          {formatPrice(row.currentPrice, row.currency)}
                        </span>
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {row.level.label} · {formatNumber(row.level.value)}
                        </span>
                        <strong className="font-mono text-[10px] text-[var(--warning)]">
                          {signedDistance(row.level.distancePct)}
                        </strong>
                      </span>
                      <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                        NOT REACHED
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-[11px] text-[var(--text-muted)]">
                    No stocks near buy levels
                  </p>
                )}
              </div>
            </Surface>
            <Surface className="flex flex-col">
              <SectionHeader
                meta={
                  <span className="font-mono text-[9px]">
                    {data.needsAttention.length} open research tasks
                  </span>
                }
                title="Needs attention"
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                {data.needsAttention.length ? (
                  data.needsAttention.map((row) => (
                    <Link
                      className="flex h-[46px] items-center gap-[10px] border-b border-[var(--border-subtle)] px-3 hover:bg-[var(--surface-hover)]"
                      href={stockHref(row.marketCode, row.ticker)}
                      key={row.stockId}
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-[3px] rounded-[1px] bg-[var(--negative)]"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <strong className="truncate text-[11px] leading-[14px]">
                          {row.ticker} ·{" "}
                          {row.reasons
                            .map((reason) => reasonLabels[reason])
                            .join(" + ")}
                        </strong>
                        <span className="truncate text-[9px] leading-3 text-[var(--text-muted)]">
                          {attentionDetail(row)}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-[var(--text-muted)]"
                      >
                        →
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-[11px] text-[var(--text-muted)]">
                    Nothing needs attention
                  </p>
                )}
              </div>
            </Surface>
          </div>

          <Surface className="flex h-[180px] flex-col">
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              {data.recentMonitoring.length ? (
                data.recentMonitoring.map((row) => (
                  <Link
                    className="grid h-12 grid-cols-[48px_110px_170px_100px_120px_1fr] items-center gap-[14px] border-b border-[var(--border-subtle)] px-3 text-[10px] hover:bg-[var(--surface-hover)]"
                    href={stockHref(row.marketCode, row.ticker)}
                    key={row.id}
                  >
                    <strong className="font-mono text-[11px]">
                      {row.ticker}
                    </strong>
                    <time className="font-mono text-[9px] text-[var(--text-muted)]">
                      {dateTimeFormatter.format(new Date(row.analyzedAt))}
                    </time>
                    <strong className={statusClass(row.status)}>
                      {monitoringTransition(row)}
                    </strong>
                    <span className="text-right font-mono">
                      {formatPrice(row.price, row.currency)}
                    </span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {scoreChange(row)}
                    </span>
                    <span className="truncate text-[var(--text-secondary)]">
                      {row.summary ??
                        row.recommendation ??
                        "No summary recorded."}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="p-4 text-[11px] text-[var(--text-muted)]">
                  No monitoring yet
                </p>
              )}
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}
