import { Archive, ArchiveRestore } from "lucide-react";
import Link from "next/link";

import {
  archiveStockAction,
  restoreStockAction,
} from "@/app/(app)/watchlist/actions";
import { getWatchlist } from "@/application/watchlist/get-watchlist";
import type {
  MarketDefinition,
  StatusDefinition,
  WatchlistRow,
} from "@/application/watchlist/types";
import { PageHeader } from "@/components/ui/terminal";
import { AddStockDialog } from "@/components/watchlist/add-stock-dialog";
import { WatchlistFilters } from "@/components/watchlist/watchlist-filters";
import {
  createSupabaseWatchlistReader,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

type WatchlistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const columns = [70, 234, 60, 104, 72, 118, 68, 100, 104, 112, 108, 34];

function formatPrice(value: string, currency: string) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(Number(value))} ${currency}`;
}

function formatDailyChange(value: string | null) {
  if (value === null) return "—";
  const number = Number(value);
  const sign = number > 0 ? "+" : number < 0 ? "−" : "";
  return `${sign}${Math.abs(number).toFixed(1)}%`;
}

function dailyTone(value: string | null) {
  const number = value === null ? 0 : Number(value);
  if (number > 0) return "text-[var(--positive)]";
  if (number < 0) return "text-[var(--negative)]";
  return "text-[var(--text-secondary)]";
}

function statusTone(status: StatusDefinition) {
  const tones: Record<string, string> = {
    accent: "text-[var(--accent-primary)]",
    danger: "text-[var(--negative)]",
    info: "text-[var(--info)]",
    negative: "text-[var(--negative)]",
    neutral: "text-[var(--text-secondary)]",
    portfolio: "text-[var(--positive)]",
    positive: "text-[var(--positive)]",
    warning: "text-[var(--warning)]",
  };
  return tones[status.colorToken] ?? "text-[var(--text-primary)]";
}

function formatMonitoringDate(value: string | null) {
  if (!value) return "Not analyzed";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

function freshness(row: WatchlistRow) {
  if (!row.price) {
    return {
      label: "UNAVAILABLE",
      className: "text-[var(--negative)]",
      title: "No market price is available.",
    };
  }

  const quality = row.price.qualityStatus.trim().toUpperCase();
  const normalized = quality.toLowerCase();
  const asOf = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(row.price.asOf));

  return {
    label: `${quality} · ${row.price.provider}`,
    className:
      normalized === "stale" || normalized === "unavailable"
        ? "text-[var(--negative)]"
        : normalized === "manual"
          ? "text-[var(--text-secondary)]"
          : "text-[var(--warning)]",
    title: `As of ${asOf} · ${row.price.provider}`,
  };
}

function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  return (
    <div className="max-h-[454px] overflow-auto rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]">
      <table className="w-full min-w-[1184px] table-fixed border-collapse">
        <colgroup>
          {columns.map((width, index) => (
            <col key={`${width}-${index}`} style={{ width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[var(--bg-tertiary)]">
          <tr className="h-[34px] border-b border-[var(--border-subtle)]">
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
              "",
            ].map((label, index) => (
              <th
                className="px-2 text-left text-[9px] font-semibold text-[var(--text-muted)]"
                key={`${label}-${index}`}
                scope="col"
              >
                {label || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const quote = row.price;
            const quoteFreshness = freshness(row);
            const action = row.archivedAt
              ? restoreStockAction
              : archiveStockAction;
            const actionLabel = `${row.archivedAt ? "Restore" : "Archive"} ${row.ticker}`;
            const ActionIcon = row.archivedAt ? ArchiveRestore : Archive;

            return (
              <tr
                className="h-[42px] border-b border-[var(--border-subtle)] text-[10px] hover:bg-[var(--surface-hover)]"
                key={row.watchlistItemId}
              >
                <td className="px-2 font-semibold">
                  <Link
                    className="hover:text-[var(--accent-primary)]"
                    href={`/stocks/${row.market.code.toLowerCase()}/${encodeURIComponent(row.ticker)}`}
                  >
                    {row.ticker}
                  </Link>
                </td>
                <td className="truncate px-2">
                  <Link
                    className="hover:text-[var(--accent-primary)]"
                    href={`/stocks/${row.market.code.toLowerCase()}/${encodeURIComponent(row.ticker)}`}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-2">{row.market.code}</td>
                <td className="truncate px-2 font-mono">
                  {quote ? formatPrice(quote.value, row.currency) : "—"}
                </td>
                <td
                  className={`px-2 font-mono ${dailyTone(quote?.dayChangePct ?? null)}`}
                >
                  {formatDailyChange(quote?.dayChangePct ?? null)}
                </td>
                <td
                  className={`truncate px-2 font-medium ${statusTone(row.status)}`}
                  title={row.status.label}
                >
                  {row.status.label.toUpperCase()}
                </td>
                <td className="px-2 font-mono text-[var(--accent-primary)]">
                  {row.lastMonitoring?.investmentScore ?? "—"}
                </td>
                <td className="px-2 font-mono">—</td>
                <td className="px-2 font-mono text-[var(--text-muted)]">—</td>
                <td className="px-2">
                  {formatMonitoringDate(row.lastMonitoring?.analyzedAt ?? null)}
                </td>
                <td
                  className={`truncate px-2 text-[9px] ${quoteFreshness.className}`}
                  title={quoteFreshness.title}
                >
                  {quoteFreshness.label}
                </td>
                <td className="px-2">
                  <form action={action}>
                    <input
                      name="watchlistItemId"
                      type="hidden"
                      value={row.watchlistItemId}
                    />
                    <button
                      aria-label={actionLabel}
                      className="grid size-[18px] place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                      title={actionLabel}
                      type="submit"
                    >
                      <ActionIcon aria-hidden="true" className="size-[14px]" />
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  isUnfilteredEmpty,
  statuses,
  markets,
}: {
  isUnfilteredEmpty: boolean;
  statuses: StatusDefinition[];
  markets: MarketDefinition[];
}) {
  return (
    <section className="flex w-[335px] flex-col gap-1.5 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
      <h2 className="text-[13px] leading-[17px] font-semibold">
        {isUnfilteredEmpty ? "No stocks yet" : "No matching stocks"}
      </h2>
      <p className="text-[11px] leading-[14px] text-[var(--text-secondary)]">
        {isUnfilteredEmpty
          ? "Add the first company to start a research watchlist."
          : "Adjust the filters or search phrase to see more instruments."}
      </p>
      {isUnfilteredEmpty ? (
        <AddStockDialog compactTrigger markets={markets} statuses={statuses} />
      ) : (
        <Link
          className="text-[11px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
          href="/watchlist"
        >
          Clear filters
        </Link>
      )}
    </section>
  );
}

function DataError() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Your database-backed GPW + USA research list"
        title="Watchlist"
      />
      <section className="rounded-[7px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-4">
        <h2 className="text-[13px] font-semibold">Watchlist unavailable</h2>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          The data could not be loaded. Refresh the page and try again.
        </p>
      </section>
    </div>
  );
}

export default async function WatchlistPage({
  searchParams,
}: WatchlistPageProps) {
  const rawQuery = await searchParams;
  const user = await requireAllowedUser();
  const client = await createClient();

  let data: Awaited<ReturnType<typeof getWatchlist>>;
  try {
    data = await getWatchlist(
      createSupabaseWatchlistReader(client),
      user.id,
      rawQuery,
    );
  } catch (error) {
    if (error instanceof WatchlistInfrastructureError) return <DataError />;
    throw error;
  }

  const errorCode =
    typeof rawQuery.error === "string" ? rawQuery.error : undefined;
  const mutationError = errorCode
    ? {
        invalid_action: "The requested watchlist action was invalid.",
        archive_failed: "The stock could not be archived. Please try again.",
        restore_failed: "The stock could not be restored. Please try again.",
      }[errorCode]
    : undefined;
  const isUnfilteredEmpty =
    data.summary.active === 0 && data.query.view === "active";

  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description={`${data.summary.active} active instruments · ${data.summary.gpw} GPW · ${data.summary.usa} USA`}
        title="Watchlist"
      >
        <AddStockDialog markets={data.markets} statuses={data.statuses} />
      </PageHeader>

      {mutationError ? (
        <p
          className="rounded-[5px] border border-[var(--negative)] bg-[var(--negative-subtle)] px-3 py-2 text-[11px] text-[var(--negative)]"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}

      <WatchlistFilters
        markets={data.markets}
        query={data.query}
        statuses={data.statuses}
      />

      {data.rows.length ? (
        <WatchlistTable rows={data.rows} />
      ) : (
        <EmptyState
          isUnfilteredEmpty={isUnfilteredEmpty}
          markets={data.markets}
          statuses={data.statuses}
        />
      )}
    </div>
  );
}
