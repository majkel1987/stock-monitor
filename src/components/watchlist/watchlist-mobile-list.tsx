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

export function WatchlistMobileList({ rows }: { rows: WatchlistRow[] }) {
  const { t, locale } = useTranslate();

  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {rows.map((row) => {
        const href = stockHref(row.market.code, row.ticker);
        const quote = row.price;
        const score = row.lastMonitoring?.investmentScore;

        return (
          <li key={row.watchlistItemId}>
            <Surface className="p-4">
              <div className="flex items-start justify-between gap-3">
                <Link className="min-w-0 flex-1 hover:text-primary" href={href}>
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-base font-semibold tracking-tight">
                      {row.ticker}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {row.name}
                    </span>
                  </p>
                </Link>
                <MarketBadge code={row.market.code} />
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p
                  className={cn(
                    "font-mono text-base font-semibold tabular-nums",
                    !quote && "text-muted-foreground",
                  )}
                >
                  {quote
                    ? formatPrice(quote.value, row.currency, locale)
                    : emptyValue}
                </p>
                <p
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    dailyToneClass(quote?.dayChangePct ?? null),
                  )}
                >
                  {formatDailyChange(
                    quote?.dayChangePct ?? null,
                    locale,
                    t("common.emptyValue"),
                  )}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <WatchlistStatusBadge
                  colorToken={row.status.colorToken}
                  label={row.status.label}
                  slug={row.status.slug}
                />
                <p
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    score == null && "text-muted-foreground",
                  )}
                >
                  {t("watchlist.scoreInline", {
                    score: score ?? emptyValue,
                  })}
                </p>
              </div>

              <dl className="mt-3 grid gap-2 border-t border-[var(--border-subtle)] pt-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="ui-meta">{t("watchlist.lastMonitoring")}</dt>
                  <dd className="text-secondary-foreground">
                    {formatMonitoringDate(
                      row.lastMonitoring?.analyzedAt ?? null,
                      locale,
                      t("watchlist.notAnalyzed"),
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="ui-meta pt-0.5">{t("watchlist.freshness")}</dt>
                  <dd>
                    <FreshnessBadge row={row} />
                  </dd>
                </div>
              </dl>

              <div className="mt-2 flex justify-end">
                <WatchlistRowActions row={row} />
              </div>
            </Surface>
          </li>
        );
      })}
    </ul>
  );
}
