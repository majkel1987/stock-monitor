import { AlertTriangle } from "lucide-react";

import type { SyncRunSummary } from "@/application/sync/get-market-data-status";
import { getWatchlist } from "@/application/watchlist/get-watchlist";
import { RefreshMarketDataButton } from "@/components/layout/refresh-market-data-button";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  StooqCsvImportForm,
  type StooqCsvImportTarget,
} from "@/components/settings/stooq-csv-import-form";
import {
  MetricCard,
  PageHeader,
  SectionHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";
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
import { cn } from "@/lib/utils/cn";

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Warsaw",
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const polishPlural = (count: number, one: string, few: string, many: string) => {
  if (count === 1) return one;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

function when(value: string | null) {
  return value ? `${dateTimeFormatter.format(new Date(value))} CET` : "Nigdy";
}

function formatEffectiveDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function runName(run: SyncRunSummary) {
  if (run.jobType === "scheduled_market_sync") return "Synchronizacja zaplanowana";
  if (run.jobType === "manual_market_sync") return "Synchronizacja ręczna";
  if (run.jobType === "stooq_csv_import") return "Import CSV Stooq";
  return run.jobType === "fx_usd_pln" ? "FX · USD/PLN" : "Notowania";
}

function runStatusLabel(status: SyncRunSummary["status"]) {
  if (status === "success") return "SUKCES";
  if (status === "failed") return "BŁĄD";
  if (status === "partial") return "CZĘŚCIOWY";
  if (status === "abandoned") return "PORZUCONY";
  if (status === "running") return "W TOKU";
  if (status === "skipped") return "POMINIĘTY";
  return String(status).toUpperCase();
}

function runBadgeTone(
  status: SyncRunSummary["status"],
): "positive" | "negative" | "warning" | "neutral" | "info" {
  if (status === "success") return "positive";
  if (status === "failed" || status === "abandoned") return "negative";
  if (status === "partial") return "warning";
  if (status === "running") return "info";
  return "neutral";
}

function instrumentCoverageLabel(count: number) {
  return `${count} ${polishPlural(count, "instrument", "instrumenty", "instrumentów")}`;
}

function failedCountLabel(count: number) {
  return `${count} ${polishPlural(count, "nieudany", "nieudane", "nieudanych")}`;
}

function formatErrorSummary(summary: string | null) {
  if (!summary) {
    return "Co najmniej jeden element dostawcy zakończył się błędem.";
  }

  const quotesMissed = summary.match(
    /^(\d+) of (\d+) quotes were not updated\.$/,
  );
  if (quotesMissed) {
    const failed = Number(quotesMissed[1]);
    const total = Number(quotesMissed[2]);
    return `Nie zaktualizowano ${failed} z ${total} ${polishPlural(total, "notowania", "notowań", "notowań")}.`;
  }

  const known: Record<string, string> = {
    provider_not_configured: "Dostawca danych nie jest skonfigurowany.",
    fx_unavailable: "Kurs walutowy jest niedostępny.",
    "Uploaded Stooq CSV was invalid.": "Wgrany plik CSV Stooq był nieprawidłowy.",
    "Uploaded Stooq CSV contains a future EOD quote.":
      "Wgrany plik CSV Stooq zawiera przyszłe notowanie EOD.",
    "Stooq CSV persistence failed.": "Nie udało się zapisać danych z CSV Stooq.",
    "Manual synchronization failed unexpectedly.":
      "Ręczna synchronizacja zakończyła się nieoczekiwanym błędem.",
    "Scheduled synchronization failed unexpectedly.":
      "Zaplanowana synchronizacja zakończyła się nieoczekiwanym błędem.",
    "One or more manual synchronization operations failed.":
      "Co najmniej jedna ręczna synchronizacja zakończyła się błędem.",
    "One or more scheduled synchronization operations failed.":
      "Co najmniej jedna zaplanowana synchronizacja zakończyła się błędem.",
  };

  return known[summary] ?? summary;
}

function DataError() {
  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden">
      <PageHeader
        description="Stan dostawców danych rynkowych i historia synchronizacji"
        eyebrow="Settings"
        index
        title="Ustawienia"
      />
      <SettingsTabs active="data" />
      <Surface className="border-negative bg-[var(--negative-subtle)] p-4 sm:p-5">
        <h2 className="text-card-title">Status danych niedostępny</h2>
        <p className="mt-2 text-sm text-secondary-foreground">
          Aplikacja i zapisane analizy pozostają dostępne. Odśwież stronę i
          spróbuj ponownie.
        </p>
      </Surface>
    </div>
  );
}

export default async function DataSettingsPage() {
  const user = await requireAllowedUser();
  const client = await createClient();
  const env = getServerEnv();
  const massiveConfigured = Boolean(env.MASSIVE_API_KEY);
  const writesConfigured = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
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
      return <DataError />;
    }
    throw error;
  }

  const recentRuns = status.recentRuns.slice(0, 3);
  const failedRuns = status.recentRuns
    .filter((run) => run.status === "failed" || run.status === "partial")
    .slice(0, 4);
  const configurationLabel = !writesConfigured
    ? "KONFIGURACJA NIEKOMPLETNA"
    : massiveConfigured
      ? "HYBRYDA GOTOWA"
      : "TYLKO CSV GPW";
  const configurationTone = !writesConfigured
    ? "negative"
    : massiveConfigured
      ? "positive"
      : "warning";

  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden sm:gap-6">
      <PageHeader
        description="Stan dostawców danych rynkowych i historia synchronizacji"
        eyebrow="Settings"
        index
        title="Ustawienia"
      >
        <StooqCsvImportForm targets={gpwImportTargets} />
        <RefreshMarketDataButton
          className="w-full sm:w-auto"
          label="Synchronizuj USA + FX"
        />
      </PageHeader>

      <SettingsTabs active="data" />

      <section
        aria-label="Dostawca danych rynkowych"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <MetricCard
          className="sm:col-span-2 xl:col-span-1"
          hint={
            !writesConfigured
              ? "Zapis do bazy nie jest skonfigurowany"
              : massiveConfigured
                ? "Plik ręczny GPW · API USA skonfigurowane"
                : "Plik ręczny GPW · API USA nie skonfigurowane"
          }
          label="Dostawca danych rynkowych"
          value={
            <span className="text-lg tracking-tight sm:text-xl">
              Stooq CSV + Massive
            </span>
          }
        />
        <MetricCard
          label="Konfiguracja"
          tone={configurationTone}
          value={
            <span className="font-mono text-sm tracking-tight sm:text-base">
              {configurationLabel}
            </span>
          }
        />
        <MetricCard
          label="Ostatni sukces"
          value={
            <span className="font-mono text-sm tracking-tight sm:text-base">
              {when(status.lastSuccessfulSyncAt)}
            </span>
          }
        />
        <MetricCard
          label="Ostatni błąd"
          tone="warning"
          value={
            <span className="font-mono text-sm tracking-tight sm:text-base">
              {when(status.lastFailureAt)}
            </span>
          }
        />
        <MetricCard
          label="Pokrycie"
          value={
            <span className="font-mono text-sm tracking-tight sm:text-base">
              {instrumentCoverageLabel(status.providerCoverageCount)}
            </span>
          }
        />
      </section>

      <Surface>
        <SectionHeader
          meta={
            status.latestFx
              ? `NBP ${status.latestFx.rate} · obowiązuje ${formatEffectiveDate(status.latestFx.effectiveDate)}`
              : "Kurs referencyjny NBP niedostępny"
          }
          title="Status synchronizacji"
        />
        {recentRuns.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Operacja</th>
                  <th scope="col">Wynik</th>
                  <th scope="col">Status</th>
                  <th scope="col">Czas</th>
                  <th scope="col">Błędy</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong className="text-sm font-semibold">
                        {runName(run)}
                      </strong>
                    </td>
                    <td className="font-mono text-sm tabular-nums text-secondary-foreground">
                      {run.successCount} / {run.requestedCount}
                    </td>
                    <td>
                      <StatusBadge tone={runBadgeTone(run.status)}>
                        {runStatusLabel(run.status)}
                      </StatusBadge>
                    </td>
                    <td className="font-mono text-sm text-secondary-foreground">
                      {when(run.finishedAt ?? run.startedAt)}
                    </td>
                    <td
                      className={cn(
                        "text-sm",
                        run.failureCount
                          ? "text-negative"
                          : "text-muted-foreground",
                      )}
                    >
                      {failedCountLabel(run.failureCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Brak prób synchronizacji.
          </p>
        )}
      </Surface>

      <Surface>
        <SectionHeader
          meta="Sekrety dostawców nigdy nie są wyświetlane"
          title="Ostatnie błędy synchronizacji"
        />
        {failedRuns.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {failedRuns.map((run) => (
              <li className="flex flex-col gap-2 px-4 py-3.5" key={run.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-semibold">{runName(run)}</strong>
                  <StatusBadge tone={runBadgeTone(run.status)}>
                    {runStatusLabel(run.status)}
                  </StatusBadge>
                </div>
                <p className="text-sm text-negative">
                  {formatErrorSummary(run.errorSummary)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 ui-meta">
                  <span className="font-mono">
                    {when(run.finishedAt ?? run.startedAt)}
                  </span>
                  <span>Zapisane dane zachowane</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Brak ostatnich błędów synchronizacji.
          </p>
        )}
      </Surface>

      <div className="flex items-start gap-3 rounded-[var(--radius-surface)] border border-warning/50 bg-[var(--warning-subtle)] px-4 py-3.5">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-warning"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <strong className="text-sm text-warning">
            Historyczne analizy pozostają dostępne przy awariach dostawcy
          </strong>
          <span className="text-[0.8125rem] leading-normal text-secondary-foreground">
            Ceny zachowują ostatnio znane znaczniki czasu; wartości ręczne i
            niedostępne pozostają jednoznacznie oznaczone.
          </span>
        </div>
      </div>
    </div>
  );
}
