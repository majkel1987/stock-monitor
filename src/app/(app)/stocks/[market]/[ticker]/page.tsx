import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getStockResearchDetail } from "@/application/stocks/get-stock-research-detail";
import type {
  MonitoringHistoryItem,
  ResearchStatus,
} from "@/application/stocks/research-types";
import { NotesPanel, NoteDialog } from "@/components/stocks/notes-panel";
import { ManualQuoteDialog } from "@/components/stocks/manual-quote-dialog";
import { PriceLevelsEditor } from "@/components/stocks/price-levels-panel";
import { SectionHeader, StatusBadge, Surface } from "@/components/ui/terminal";
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

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

function formatNumber(value: string | null, maximumFractionDigits = 6) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(
    Number(value),
  );
}

function signed(value: number, fractionDigits = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}`;
}

function statusTone(
  status: ResearchStatus,
): "accent" | "info" | "warning" | "positive" | "negative" {
  if (["danger", "negative"].includes(status.colorToken)) return "negative";
  if (status.colorToken === "warning") return "warning";
  if (["positive", "portfolio"].includes(status.colorToken)) return "positive";
  if (status.colorToken === "info") return "info";
  return "accent";
}

function scoreTone(value: number | null) {
  if (value === null) return "bg-[var(--border-strong)]";
  if (value >= 75) return "bg-[var(--positive)]";
  if (value >= 50) return "bg-[var(--info)]";
  if (value >= 25) return "bg-[var(--warning)]";
  return "bg-[var(--negative)]";
}

function ScoreStrip({
  monitoring,
}: {
  monitoring: MonitoringHistoryItem | null;
}) {
  const scores = [
    ["INVESTMENT", monitoring?.scores.investment ?? null],
    ["QUALITY", monitoring?.scores.quality ?? null],
    ["VALUATION", monitoring?.scores.valuation ?? null],
    ["MOMENTUM", monitoring?.scores.momentum ?? null],
    ["RISK SAFETY", monitoring?.scores.riskSafety ?? null],
  ] as const;

  return (
    <Surface className="flex h-[61px] flex-1 items-center gap-3 p-3">
      {scores.map(([label, value]) => (
        <div className="flex min-w-0 flex-1 flex-col gap-1" key={label}>
          <span className="truncate text-[9px] leading-3 font-semibold tracking-[0.6px] text-[var(--text-muted)]">
            {label}
          </span>
          <span className="flex items-center gap-1.5">
            <strong className="font-mono text-base leading-[21px] font-semibold">
              {value ?? "—"}
            </strong>
            <span
              className={`h-[3px] w-11 rounded-[1px] ${scoreTone(value)}`}
            />
          </span>
        </div>
      ))}
    </Surface>
  );
}

function listText(items: string[]) {
  return items.length ? items.map((item) => `• ${item}`).join("\n") : "—";
}

function historyTransition(item: MonitoringHistoryItem) {
  if (!item.comparison) return item.status.label;
  if (item.comparison.previousStatus.id === item.status.id)
    return item.status.label;
  return `${item.comparison.previousStatus.label} → ${item.status.label}`;
}

function HistoryRow({ item }: { item: MonitoringHistoryItem }) {
  const investmentDelta = item.comparison?.scoreDeltas.investment ?? null;
  return (
    <article className="grid min-h-[86px] grid-cols-[90px_1fr] gap-3 border-b border-[var(--border-subtle)] p-3">
      <time className="font-mono text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
        {dateFormatter.format(new Date(item.analyzedAt)).toUpperCase()}
      </time>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex gap-3">
          <strong className="min-w-0 flex-1 truncate text-[11px] text-[var(--accent-primary)]">
            {historyTransition(item)}
            {item.isSuperseded ? " · SUPERSEDED" : ""}
          </strong>
          <span className="font-mono text-[10px] text-[var(--text-secondary)]">
            {formatNumber(item.price)} {item.currency} · SCORE{" "}
            {item.scores.investment ?? "—"}
            {investmentDelta === null ? "" : ` (${signed(investmentDelta, 0)})`}
          </span>
        </div>
        <p className="line-clamp-2 text-[10px] text-[var(--text-secondary)]">
          {item.summary ?? item.recommendation ?? "No summary recorded."}
        </p>
        <span className="text-[9px] text-[var(--text-muted)]">
          Source: {item.sourceType.replaceAll("_", " ")}
          {item.sourceReference ? ` · ${item.sourceReference}` : ""} · Price as
          of{" "}
          {item.priceAsOf
            ? dateTimeFormatter.format(new Date(item.priceAsOf))
            : "unavailable"}
        </span>
      </div>
    </article>
  );
}

function DataError() {
  return (
    <div className="p-6">
      <section className="rounded-[7px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-4">
        <h1 className="text-[15px] font-semibold">Research data unavailable</h1>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          Refresh the page and try again. No historical data was changed.
        </p>
      </section>
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

  const { latestMonitoring, latestThesis, quote } = detail;
  const dayChange =
    quote?.dayChangePct === null || !quote ? null : Number(quote.dayChangePct);
  const ChangeIcon =
    dayChange !== null && dayChange < 0 ? ArrowDownRight : ArrowUpRight;
  const monitoringUrl = `/monitoring/new?market=${detail.stock.marketCode.toLowerCase()}&ticker=${encodeURIComponent(detail.stock.ticker)}`;

  return (
    <div className="flex min-h-[1148px] flex-col gap-4 p-6">
      <header className="flex min-h-[110px] flex-col gap-[10px] border-b border-[var(--border-default)] py-3">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[21px] leading-[27px] font-semibold">
                {detail.stock.name}
              </h1>
              <StatusBadge tone="info">{detail.stock.marketCode}</StatusBadge>
            </div>
            <p className="text-[11px] leading-[14px] text-[var(--text-muted)]">
              {detail.stock.ticker} · {detail.stock.exchange} ·{" "}
              {detail.stock.currency} ·{" "}
              {detail.stock.dataMode === "manual"
                ? "Manual instrument"
                : "Provider instrument"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <strong className="font-mono text-xl leading-[26px] font-semibold">
              {quote
                ? `${formatNumber(quote.price)} ${quote.currency}`
                : "Price unavailable"}
            </strong>
            {dayChange !== null ? (
              <span
                className={`flex items-center gap-1 font-mono text-xs font-semibold ${dayChange >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
              >
                <ChangeIcon className="size-3" /> {signed(dayChange)}%
              </span>
            ) : null}
            <StatusBadge
              tone={
                quote
                  ? quote.qualityStatus === "fresh"
                    ? "positive"
                    : quote.qualityStatus === "stale"
                      ? "negative"
                      : quote.qualityStatus === "closed"
                        ? "info"
                        : "warning"
                  : "negative"
              }
            >
              {quote ? quote.qualityStatus.toUpperCase() : "UNAVAILABLE"}
            </StatusBadge>
          </div>
        </div>
        <div className="flex min-h-8 items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="font-mono">
              {quote
                ? `As of ${dateTimeFormatter.format(new Date(quote.asOf))}`
                : "No current quote"}
            </span>
            <span>
              {quote
                ? `Provider: ${quote.provider === "manual" ? "Manual" : quote.provider}`
                : "Provider: —"}
            </span>
            <StatusBadge tone={statusTone(detail.currentStatus)}>
              {detail.currentStatus.label.toUpperCase()}
            </StatusBadge>
          </div>
          <div className="flex items-center gap-2">
            <ManualQuoteDialog
              currency={detail.stock.currency}
              currentPrice={quote?.price ?? null}
              marketCode={detail.stock.marketCode}
              stockId={detail.stock.id}
              ticker={detail.stock.ticker}
            />
            <PriceLevelsEditor
              currency={detail.stock.currency}
              levels={detail.priceLevels}
              stockId={detail.stock.id}
            />
            <NoteDialog stockId={detail.stock.id} />
            <Link
              className="flex h-8 items-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
              href={monitoringUrl}
            >
              New monitoring
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-[90px] gap-4">
        <ScoreStrip monitoring={latestMonitoring} />
        <Surface className="flex min-h-[90px] w-[300px] flex-col gap-1.5 p-3">
          {latestMonitoring ? (
            <>
              <span className="text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
                LAST ANALYSIS ·{" "}
                {dateFormatter
                  .format(new Date(latestMonitoring.analyzedAt))
                  .toUpperCase()}
              </span>
              <strong className="text-xs leading-4 text-[var(--accent-primary)]">
                {latestMonitoring.recommendation?.toUpperCase() ??
                  latestMonitoring.status.label.toUpperCase()}
              </strong>
              <p className="line-clamp-2 text-[10px] leading-[13px] text-[var(--text-secondary)]">
                {latestMonitoring.summary ?? "No summary recorded."}
              </p>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center">
              <strong className="text-xs">No monitoring yet</strong>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Create the first immutable research snapshot.
              </p>
            </div>
          )}
        </Surface>
      </div>

      {latestMonitoring?.analysisDetails ? (
        <Surface>
          <SectionHeader
            meta={
              <Link
                className="font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                href={`/monitoring/${latestMonitoring.id}`}
              >
                Open full analysis →
              </Link>
            }
            title="Latest imported analysis"
          />
          <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)] lg:grid-cols-6">
            {[
              [
                "DECISION",
                latestMonitoring.decisionAction?.replaceAll("_", " ") ?? "—",
              ],
              [
                "INVESTMENT SCORE",
                latestMonitoring.scores.investment?.toString() ?? "—",
              ],
              [
                "BASE FAIR VALUE",
                latestMonitoring.baseFairValue
                  ? `${formatNumber(latestMonitoring.baseFairValue)} ${detail.stock.currency}`
                  : "—",
              ],
              [
                "ENTRY ZONE",
                latestMonitoring.entryZoneFrom || latestMonitoring.entryZoneTo
                  ? `${latestMonitoring.entryZoneFrom ?? "—"}–${latestMonitoring.entryZoneTo ?? "—"} ${latestMonitoring.entryZoneCurrency ?? detail.stock.currency}`
                  : "—",
              ],
              [
                "BASE POTENTIAL",
                latestMonitoring.baseTotalReturnPct
                  ? `${latestMonitoring.baseTotalReturnPct}%`
                  : "—",
              ],
              [
                "ASYMMETRY",
                latestMonitoring.asymmetryRatio
                  ? `${latestMonitoring.asymmetryRatio}×`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                className="flex min-h-[68px] flex-col gap-1 bg-[var(--surface-default)] p-3"
                key={label}
              >
                <span className="text-[8px] font-bold tracking-[0.5px] text-[var(--text-muted)]">
                  {label}
                </span>
                <strong className="font-mono text-[12px] text-[var(--text-primary)]">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </Surface>
      ) : null}

      <div className="grid min-h-[328px] grid-cols-[490px_1fr] gap-4 max-xl:grid-cols-1">
        <Surface>
          <SectionHeader
            meta={
              <span className="font-mono">
                {quote
                  ? `Current ${formatNumber(quote.price)} ${quote.currency}`
                  : "Current price unavailable"}
              </span>
            }
            title="Price levels"
          />
          {detail.priceLevels.length ? (
            detail.priceLevels.map((level) => (
              <div
                className="grid min-h-[47px] grid-cols-[112px_110px_1fr_92px] items-center border-b border-[var(--border-subtle)] px-3 text-[10px]"
                key={level.id}
              >
                <strong className="truncate font-semibold text-[var(--text-secondary)]">
                  {level.label.toUpperCase()}
                </strong>
                <strong className="font-mono text-[11px]">
                  {formatNumber(level.value)} {level.currency}
                </strong>
                <span
                  className={`font-mono ${level.distancePct === null ? "text-[var(--text-muted)]" : level.distancePct <= 0 ? "text-[var(--warning)]" : "text-[var(--info)]"}`}
                >
                  {level.distancePct === null
                    ? "Distance unavailable"
                    : `${signed(level.distancePct)}% from current`}
                </span>
                <strong
                  className={`text-right text-[9px] ${level.reached === null ? "text-[var(--text-muted)]" : level.reached ? "text-[var(--positive)]" : "text-[var(--text-secondary)]"}`}
                >
                  {level.reached === null
                    ? "UNKNOWN"
                    : level.reached
                      ? "REACHED"
                      : "NOT REACHED"}
                </strong>
              </div>
            ))
          ) : (
            <p className="p-4 text-[11px] text-[var(--text-muted)]">
              No price levels
            </p>
          )}
        </Surface>

        <Surface className="flex flex-col gap-3 p-[14px]">
          <h2 className="text-[13px] leading-[17px] font-semibold">
            Investment thesis
          </h2>
          {latestThesis ? (
            <>
              <p className="text-[11px] leading-[15px] text-[var(--text-secondary)]">
                {latestThesis.summary ?? "No thesis summary recorded."}
              </p>
              <div className="grid min-h-[53px] grid-cols-3 gap-4">
                {[
                  [
                    "BULL CASE",
                    latestThesis.bullCase,
                    "text-[var(--positive)]",
                  ],
                  ["BASE CASE", latestThesis.baseCase, "text-[var(--info)]"],
                  [
                    "BEAR CASE",
                    latestThesis.bearCase,
                    "text-[var(--negative)]",
                  ],
                ].map(([label, body, tone]) => (
                  <div
                    className="border-l border-[var(--border-subtle)] pl-3"
                    key={label}
                  >
                    <strong className={`text-[9px] leading-3 ${tone}`}>
                      {label}
                    </strong>
                    <p className="mt-1 text-[10px] leading-[13px] text-[var(--text-secondary)]">
                      {body || "—"}
                    </p>
                  </div>
                ))}
              </div>
              <strong className="text-[9px] leading-3 text-[var(--text-muted)]">
                CATALYSTS
              </strong>
              <p className="whitespace-pre-line text-[10px] leading-[13px] text-[var(--text-secondary)]">
                {listText(latestThesis.catalysts)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">
              No thesis yet
            </p>
          )}
        </Surface>
      </div>

      <div className="grid min-h-[348px] grid-cols-[minmax(560px,808px)_1fr] gap-4 max-xl:grid-cols-1">
        <Surface>
          <SectionHeader
            meta={<span>{detail.monitoringHistory.length} records</span>}
            title="Monitoring history"
          />
          {detail.monitoringHistory.length ? (
            detail.monitoringHistory.map((item) => (
              <HistoryRow item={item} key={item.id} />
            ))
          ) : (
            <p className="p-4 text-[11px] text-[var(--text-muted)]">
              No monitoring yet
            </p>
          )}
        </Surface>
        <div className="flex min-h-[324px] flex-col gap-3">
          <Surface className="flex min-h-[91px] flex-col gap-1.5 p-3">
            <h2 className="text-xs font-semibold">Key risks</h2>
            <p className="whitespace-pre-line text-[10px] leading-[15px] text-[var(--text-secondary)]">
              {latestThesis ? listText(latestThesis.keyRisks) : "No thesis yet"}
            </p>
          </Surface>
          <section className="flex min-h-[68px] flex-col gap-1.5 rounded-[5px] border-l-[3px] border-[var(--negative)] bg-[var(--negative-subtle)] p-3">
            <strong className="text-[9px] text-[var(--negative)]">
              KILL THE THESIS
            </strong>
            <p className="whitespace-pre-line text-[10px] leading-[13px] text-[var(--text-secondary)]">
              {latestThesis
                ? listText(latestThesis.killCriteria)
                : "No thesis yet"}
            </p>
          </section>
          <Surface className="flex min-h-[165px] flex-1 flex-col gap-[7px] p-3">
            <NotesPanel notes={detail.notes} stockId={detail.stock.id} />
          </Surface>
        </div>
      </div>
    </div>
  );
}
