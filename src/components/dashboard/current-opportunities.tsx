"use client";

import Link from "next/link";

import type { OpportunityRow } from "@/application/dashboard/types";
import { EmptyState, SectionHeader, Surface } from "@/components/ui/terminal";
import {
  MarketBadge,
  WatchlistStatusBadge,
} from "@/components/watchlist/watchlist-badges";
import { stockHref } from "@/components/watchlist/format";
import { formatPrice } from "@/i18n/format";
import { resolveStatusLabel } from "@/i18n/status";
import { useTranslate } from "@/i18n/provider";

export function CurrentOpportunities({ rows }: { rows: OpportunityRow[] }) {
  const { t, locale } = useTranslate();

  return (
    <Surface>
      <SectionHeader
        action={
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            href="/watchlist"
          >
            {t("common.viewAll")} →
          </Link>
        }
        title={t("dashboard.currentOpportunities")}
      />
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="data-table min-w-[36rem]">
              <thead>
                <tr>
                  <th scope="col">{t("common.ticker")}</th>
                  <th scope="col">{t("common.market")}</th>
                  <th scope="col">{t("common.status")}</th>
                  <th className="!text-right" scope="col">
                    {t("common.score")}
                  </th>
                  <th className="!text-right" scope="col">
                    {t("common.price")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const href = stockHref(row.marketCode, row.ticker);
                  const statusLabel = resolveStatusLabel(row.status, t);
                  return (
                    <tr key={row.stockId}>
                      <td>
                        <Link
                          className="flex min-w-0 flex-col gap-0.5 hover:text-primary"
                          href={href}
                        >
                          <span className="font-mono text-base font-semibold tracking-tight">
                            {row.ticker}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {row.name}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <MarketBadge code={row.marketCode} />
                      </td>
                      <td>
                        <WatchlistStatusBadge
                          colorToken={row.status.colorToken}
                          label={statusLabel}
                          slug={row.status.slug}
                        />
                      </td>
                      <td className="!text-right">
                        <strong
                          aria-label={t("dashboard.scoreAria", {
                            score:
                              row.investmentScore ??
                              t("common.investmentScoreUnavailable"),
                          })}
                          className="font-mono text-sm font-semibold tabular-nums"
                        >
                          {row.investmentScore ?? t("common.emptyValue")}
                        </strong>
                      </td>
                      <td className="!text-right">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {row.quote
                            ? formatPrice(
                                row.quote.price,
                                row.quote.currency,
                                locale,
                              )
                            : t("common.noQuote")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[var(--border-subtle)] sm:hidden">
            {rows.map((row) => {
              const href = stockHref(row.marketCode, row.ticker);
              const statusLabel = resolveStatusLabel(row.status, t);
              return (
                <li key={row.stockId}>
                  <Link
                    className="flex flex-col gap-2 px-4 py-3.5 hover:bg-[var(--surface-row)]"
                    href={href}
                  >
                    <span className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <strong className="font-mono text-base font-semibold tracking-tight">
                          {row.ticker}
                        </strong>
                        <span className="ml-2 truncate text-sm text-muted-foreground">
                          {row.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {row.quote
                          ? formatPrice(
                              row.quote.price,
                              row.quote.currency,
                              locale,
                            )
                          : t("common.noQuote")}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <MarketBadge code={row.marketCode} />
                      <WatchlistStatusBadge
                        colorToken={row.status.colorToken}
                        label={statusLabel}
                        slug={row.status.slug}
                      />
                      <span className="ui-meta font-mono">
                        {t("dashboard.scoreInline", {
                          score:
                            row.investmentScore ?? t("common.emptyValue"),
                        })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          description={t("dashboard.noOpportunitiesDescription")}
          title={t("dashboard.noOpportunitiesTitle")}
        />
      )}
    </Surface>
  );
}
