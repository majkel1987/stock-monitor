"use client";

import Link from "next/link";

import type { WatchlistRow } from "@/application/watchlist/types";
import { Surface } from "@/components/ui/terminal";
import { useTranslate } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

import {
  dailyToneClass,
  emptyValue,
  formatDailyChange,
  formatMonitoringDate,
  formatPrice,
  stockHref,
} from "./format";
import {
  FreshnessBadge,
  MarketBadge,
  WatchlistRowActions,
  WatchlistStatusBadge,
} from "./watchlist-badges";

export function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  const { t, locale } = useTranslate();

  return (
    <Surface className="hidden md:block">
      <div className="max-h-[min(70vh,44rem)] overflow-auto">
        <table className="data-table min-w-[720px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="lg:hidden" scope="col">
                {t("watchlist.instrument")}
              </th>
              <th className="hidden lg:table-cell" scope="col">
                {t("common.ticker")}
              </th>
              <th className="hidden lg:table-cell" scope="col">
                {t("common.company")}
              </th>
              <th className="!text-center" scope="col">
                {t("common.market")}
              </th>
              <th className="!text-right" scope="col">
                {t("common.price")}
              </th>
              <th
                className="!text-right"
                scope="col"
                title={t("watchlist.dailyPct")}
              >
                {t("watchlist.dailyPct")}
              </th>
              <th scope="col">{t("common.status")}</th>
              <th className="!text-right" scope="col">
                {t("common.score")}
              </th>
              <th
                className="hidden xl:table-cell !text-right"
                scope="col"
                title={t("watchlist.nearestBuy")}
              >
                {t("watchlist.nearestBuy")}
              </th>
              <th className="hidden xl:table-cell !text-right" scope="col">
                {t("watchlist.distance")}
              </th>
              <th
                className="hidden lg:table-cell"
                scope="col"
                title={t("watchlist.lastMonitoring")}
              >
                {t("watchlist.lastMonitoring")}
              </th>
              <th scope="col">{t("watchlist.freshness")}</th>
              <th className="w-14 !text-center" scope="col">
                <span className="sr-only">{t("common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = stockHref(row.market.code, row.ticker);
              const quote = row.price;
              const score = row.lastMonitoring?.investmentScore;

              return (
                <tr key={row.watchlistItemId}>
                  <td className="lg:hidden">
                    <Link
                      className="block min-w-0 hover:text-primary"
                      href={href}
                    >
                      <span className="block font-mono text-base font-semibold tracking-tight">
                        {row.ticker}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {row.name}
                      </span>
                    </Link>
                  </td>
                  <td className="hidden lg:table-cell">
                    <Link
                      className="font-mono text-base font-semibold tracking-tight hover:text-primary"
                      href={href}
                    >
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="hidden max-w-[14rem] lg:table-cell">
                    <Link
                      className="block truncate text-secondary-foreground hover:text-primary"
                      href={href}
                      title={row.name}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="!text-center">
                    <MarketBadge code={row.market.code} />
                  </td>
                  <td
                    className={cn(
                      "!text-right font-mono text-sm font-semibold tabular-nums",
                      !quote && "text-muted-foreground",
                    )}
                  >
                    {quote
                      ? formatPrice(quote.value, row.currency, locale)
                      : emptyValue}
                  </td>
                  <td
                    className={cn(
                      "!text-right font-mono text-sm font-medium tabular-nums",
                      dailyToneClass(quote?.dayChangePct ?? null),
                    )}
                  >
                    {formatDailyChange(
                      quote?.dayChangePct ?? null,
                      locale,
                      t("common.emptyValue"),
                    )}
                  </td>
                  <td>
                    <WatchlistStatusBadge
                      colorToken={row.status.colorToken}
                      label={row.status.label}
                      slug={row.status.slug}
                    />
                  </td>
                  <td
                    className={cn(
                      "!text-right font-mono text-sm font-semibold tabular-nums",
                      score == null && "text-muted-foreground",
                    )}
                  >
                    {score ?? emptyValue}
                  </td>
                  <td className="hidden xl:table-cell !text-right font-mono tabular-nums text-muted-foreground">
                    {emptyValue}
                  </td>
                  <td className="hidden xl:table-cell !text-right font-mono tabular-nums text-muted-foreground">
                    {emptyValue}
                  </td>
                  <td className="hidden whitespace-nowrap text-secondary-foreground lg:table-cell">
                    {formatMonitoringDate(
                      row.lastMonitoring?.analyzedAt ?? null,
                      locale,
                      t("watchlist.notAnalyzed"),
                    )}
                  </td>
                  <td>
                    <FreshnessBadge row={row} />
                  </td>
                  <td className="!text-center">
                    <WatchlistRowActions row={row} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
