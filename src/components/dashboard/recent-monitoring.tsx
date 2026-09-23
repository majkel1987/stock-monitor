"use client";

import Link from "next/link";

import type { RecentMonitoringRow } from "@/application/dashboard/types";
import { EmptyState, SectionHeader, Surface } from "@/components/ui/terminal";
import {
  MarketBadge,
  WatchlistStatusBadge,
} from "@/components/watchlist/watchlist-badges";
import { stockHref } from "@/components/watchlist/format";
import { formatDate, formatPrice } from "@/i18n/format";
import { resolveStatusLabel } from "@/i18n/status";
import { useTranslate } from "@/i18n/provider";

export function RecentMonitoring({ rows }: { rows: RecentMonitoringRow[] }) {
  const { t, locale } = useTranslate();

  return (
    <Surface>
      <SectionHeader
        action={
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            href="/monitoring"
          >
            {t("dashboard.viewMonitoringHistory")} →
          </Link>
        }
        title={t("dashboard.latestMonitoring")}
      />
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="data-table min-w-[40rem]">
              <thead>
                <tr>
                  <th scope="col">{t("common.ticker")}</th>
                  <th scope="col">{t("common.status")}</th>
                  <th className="!text-right" scope="col">
                    {t("common.score")}
                  </th>
                  <th className="!text-right" scope="col">
                    {t("common.price")}
                  </th>
                  <th className="!text-right" scope="col">
                    {t("common.date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const href = stockHref(row.marketCode, row.ticker);
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="flex min-w-0 flex-col gap-0.5 hover:text-primary"
                          href={href}
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold tracking-tight">
                              {row.ticker}
                            </span>
                            <MarketBadge code={row.marketCode} />
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {row.name}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <WatchlistStatusBadge
                          colorToken={row.status.colorToken}
                          label={resolveStatusLabel(row.status, t)}
                          slug={row.status.slug}
                        />
                      </td>
                      <td className="!text-right font-mono text-sm font-semibold tabular-nums">
                        {row.investmentScore ?? t("common.emptyValue")}
                      </td>
                      <td className="!text-right font-mono text-sm tabular-nums">
                        {formatPrice(row.price, row.currency, locale)}
                      </td>
                      <td className="!text-right">
                        <time
                          className="font-mono text-sm text-muted-foreground tabular-nums"
                          dateTime={row.analyzedAt}
                        >
                          {formatDate(row.analyzedAt, locale)}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[var(--border-subtle)] sm:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  className="flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/70"
                  href={stockHref(row.marketCode, row.ticker)}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="font-mono text-sm font-semibold">
                        {row.ticker}
                      </strong>
                      <span className="ml-2 truncate text-sm text-muted-foreground">
                        {row.name}
                      </span>
                    </span>
                    <time
                      className="shrink-0 font-mono text-sm text-muted-foreground"
                      dateTime={row.analyzedAt}
                    >
                      {formatDate(row.analyzedAt, locale)}
                    </time>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <MarketBadge code={row.marketCode} />
                    <WatchlistStatusBadge
                      colorToken={row.status.colorToken}
                      label={resolveStatusLabel(row.status, t)}
                      slug={row.status.slug}
                    />
                    <span className="ui-meta font-mono">
                      {t("dashboard.scoreInline", {
                        score: row.investmentScore ?? t("common.emptyValue"),
                      })}
                    </span>
                    <span className="ui-meta font-mono">
                      {formatPrice(row.price, row.currency, locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          action={
            <Link
              className="ui-button ui-button-secondary"
              href="/monitoring/new"
            >
              {t("dashboard.addMonitoring")}
            </Link>
          }
          description={t("dashboard.noMonitoringDescription")}
          title={t("dashboard.noMonitoringTitle")}
        />
      )}
    </Surface>
  );
}
