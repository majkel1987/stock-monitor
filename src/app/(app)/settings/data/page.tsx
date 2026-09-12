import { AlertTriangle } from "lucide-react";

import type { SyncRunSummary } from "@/application/sync/get-market-data-status";
import { getWatchlist } from "@/application/watchlist/get-watchlist";
import { RefreshMarketDataButton } from "@/components/layout/refresh-market-data-button";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  StooqCsvImportForm,
  type StooqCsvImportTarget,
} from "@/components/settings/stooq-csv-import-form";
import { PageHeader, SectionHeader, Surface } from "@/components/ui/terminal";
import {
  createSupabaseMarketDataStatusReader,
  MarketDataStatusInfrastructureError,
} from "@/infrastructure/supabase/queries/market-data-status";
import {
  createSupabaseWatchlistReader,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getServerEnv } from "@/lib/env/server";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Warsaw",
});

const statusColumns = "grid-cols-[180px_120px_120px_minmax(0,1fr)_90px]";
const errorColumns = "grid-cols-[115px_110px_90px_minmax(0,1fr)_170px]";

function when(value: string | null) {
  return value ? `${dateTimeFormatter.format(new Date(value))} CET` : "Never";
}

function runName(run: SyncRunSummary) {
  if (run.jobType === "scheduled_market_sync") return "Scheduled sync";
  if (run.jobType === "manual_market_sync") return "Manual sync";
  if (run.jobType === "stooq_csv_import") return "Stooq CSV import";
  return run.jobType === "fx_usd_pln" ? "FX · USD/PLN" : "Market quotes";
}

function runTone(status: SyncRunSummary["status"]) {
  if (status === "success") return "text-[var(--positive)]";
  if (status === "failed" || status === "abandoned")
    return "text-[var(--negative)]";
  if (status === "partial") return "text-[var(--warning)]";
  return "text-[var(--text-secondary)]";
}

function DataError() {
  return (
    <section className="rounded-[7px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-4">
      <h2 className="text-[13px] font-semibold">Data status unavailable</h2>
      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
        The application and stored research remain available. Refresh and try
        again.
      </p>
    </section>
  );
}

export default async function DataSettingsPage() {
  const user = await requireAllowedUser();
  const client = await createClient();
  const massiveConfigured = Boolean(getServerEnv().MASSIVE_API_KEY);
  let status;
  let gpwImportTargets: StooqCsvImportTarget[];
  try {
    [status, gpwImportTargets] = await Promise.all([
      createSupabaseMarketDataStatusReader(client).read(),
      getWatchlist(createSupabaseWatchlistReader(client), user.id, {
        market: "GPW",
      }).then((data) =>
        data.rows.map((row) => ({
          stockId: row.stockId,
          ticker: row.ticker,
          name: row.name,
        })),
      ),
    ]);
  } catch (error) {
    if (
      error instanceof MarketDataStatusInfrastructureError ||
      error instanceof WatchlistInfrastructureError
    ) {
      return (
        <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
          <PageHeader
            description="Market-data provider health and synchronization history"
            title="Settings"
          />
          <SettingsTabs active="data" />
          <DataError />
        </div>
      );
    }
    throw error;
  }

  const recentRuns = status.recentRuns.slice(0, 3);
  const failedRuns = status.recentRuns
    .filter((run) => run.status === "failed" || run.status === "partial")
    .slice(0, 4);

  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Market-data provider health and synchronization history"
        title="Settings"
      >
        <RefreshMarketDataButton label="Sync USA + FX" />
      </PageHeader>

      <SettingsTabs active="data" />

      <div className="flex flex-col gap-4">
        <Surface className="h-[116px]">
          <div className="grid h-full grid-cols-[340px_repeat(4,211px)]">
            <div className="flex h-[82px] flex-col gap-[2px] border-r border-[var(--border-subtle)] px-[14px] pt-[14px]">
              <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                MARKET DATA PROVIDER
              </span>
              <strong className="text-[13px] leading-[18px]">
                Stooq CSV + Massive
              </strong>
              <span className="mt-[2px] font-mono text-[9px] text-[var(--text-muted)]">
                {massiveConfigured
                  ? "GPW manual file · USA API configured"
                  : "GPW manual file · USA API not configured"}
              </span>
            </div>
            {[
              [
                "CONFIGURATION",
                massiveConfigured ? "HYBRID READY" : "GPW CSV ONLY",
                massiveConfigured ? "positive" : "warning",
              ],
              ["LAST SUCCESS", when(status.lastSuccessfulSyncAt), "default"],
              ["LAST FAILURE", when(status.lastFailureAt), "warning"],
              [
                "COVERAGE",
                `${status.providerCoverageCount} instruments`,
                "default",
              ],
            ].map(([label, value, tone]) => (
              <div
                className="flex h-[61px] flex-col gap-[5px] border-r border-[var(--border-subtle)] px-[14px] pt-[14px] last:border-r-0"
                key={label}
              >
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                  {label}
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold ${tone === "positive" ? "text-[var(--positive)]" : tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text-primary)]"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionHeader
            meta="Date, Open, High, Low, Close, Volume · max 750 KB"
            title="Import GPW prices from Stooq"
          />
          <StooqCsvImportForm targets={gpwImportTargets} />
        </Surface>

        <Surface className="min-h-48">
          <SectionHeader
            meta={
              status.latestFx
                ? `NBP ${status.latestFx.rate} · effective ${status.latestFx.effectiveDate}`
                : "NBP reference rate unavailable"
            }
            title="Synchronization status"
          />
          {recentRuns.length ? (
            recentRuns.map((run) => (
              <div
                className={`grid h-[52px] items-center border-t border-[var(--border-subtle)] px-3 text-[10px] ${statusColumns}`}
                key={run.id}
              >
                <strong>{runName(run)}</strong>
                <span className="font-mono text-[var(--text-secondary)]">
                  {run.successCount} / {run.requestedCount}
                </span>
                <span className={runTone(run.status)}>
                  {run.status.toUpperCase()}
                </span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {when(run.finishedAt ?? run.startedAt)}
                </span>
                <span
                  className={
                    run.failureCount
                      ? "text-[var(--negative)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  {run.failureCount} failed
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-[11px] text-[var(--text-muted)]">
              No synchronization attempts yet.
            </p>
          )}
        </Surface>

        <Surface className="min-h-[180px]">
          <SectionHeader
            meta="Provider secrets are never displayed"
            title="Recent synchronization errors"
          />
          {failedRuns.length ? (
            failedRuns.map((run) => (
              <div
                className={`grid h-12 items-center border-t border-[var(--border-subtle)] px-3 text-[10px] ${errorColumns}`}
                key={run.id}
              >
                <span className="font-mono text-[var(--text-muted)]">
                  {when(run.finishedAt ?? run.startedAt)}
                </span>
                <strong>{runName(run)}</strong>
                <span className={runTone(run.status)}>
                  {run.status.toUpperCase()}
                </span>
                <span className="truncate pr-4 text-[var(--negative)]">
                  {run.errorSummary ?? "One or more provider items failed."}
                </span>
                <span className="text-right text-[var(--text-secondary)]">
                  Stored data retained
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-[11px] text-[var(--text-muted)]">
              No recent synchronization errors.
            </p>
          )}
        </Surface>

        <div className="flex h-14 items-center gap-3 rounded-[7px] border border-[var(--warning)] bg-[var(--warning-subtle)] px-4">
          <AlertTriangle
            aria-hidden="true"
            className="size-4 shrink-0 text-[var(--warning)]"
          />
          <span className="flex flex-col gap-[2px]">
            <strong className="text-[10px] text-[var(--warning)]">
              Historical research remains usable during provider failures
            </strong>
            <span className="text-[9px] text-[var(--text-secondary)]">
              Prices retain their last-known timestamps; manual and unavailable
              values remain explicitly labeled.
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
