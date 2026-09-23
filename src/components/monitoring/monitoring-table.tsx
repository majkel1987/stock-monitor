"use client";

import Link from "next/link";

import type { MonitoringTimelineItem } from "@/application/monitoring/history-types";
import { Surface } from "@/components/ui/terminal";
import {
  MarketBadge,
  WatchlistStatusBadge,
} from "@/components/watchlist/watchlist-badges";
import { useTranslate } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

import {
  emptyValue,
  formatDecision,
  formatHistoryDate,
  formatPrice,
  formatSourceLabel,
  monitoringHref,
  statusColorTokenFromSlug,
} from "./format";
import { MonitoringSummaryClamp } from "./monitoring-summary-clamp";

export function MonitoringTable({
  records,
}: {
  records: MonitoringTimelineItem[];
}) {
  const { t, locale } = useTranslate();

  return (
    <Surface className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th scope="col">{t("common.date")}</th>
              <th className="lg:hidden" scope="col">
                {t("monitoring.instrument")}
              </th>
              <th className="hidden lg:table-cell" scope="col">
                {t("common.ticker")}
              </th>
              <th className="hidden lg:table-cell" scope="col">
                {t("common.company")}
              </th>
              <th className="hidden text-center xl:table-cell" scope="col">
                {t("common.market")}
              </th>
              <th className="hidden text-right xl:table-cell" scope="col">
                {t("common.price")}
              </th>
              <th scope="col">{t("common.status")}</th>
              <th className="text-right" scope="col">
                {t("common.score")}
              </th>
              <th scope="col">{t("monitoring.decision")}</th>
              <th className="min-w-[14rem] max-w-[28rem]" scope="col">
                {t("common.summary")}
              </th>
              <th className="hidden text-center xl:table-cell" scope="col">
                {t("common.source")}
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const href = monitoringHref(record.id);
              const price = formatPrice(record.price, record.currency, locale);
              const score = record.investmentScore;
              const decision = formatDecision(record.decisionAction);

              return (
                <tr key={record.id}>
                  <td className="whitespace-nowrap">
                    <Link
                      className="font-medium text-foreground hover:text-primary"
                      href={href}
                    >
                      <time dateTime={record.analyzedAt}>
                        {formatHistoryDate(record.analyzedAt, locale)}
                      </time>
                    </Link>
                  </td>

                  <td className="lg:hidden">
                    <Link
                      className="block min-w-0 hover:text-primary"
                      href={href}
                    >
                      <span className="block font-mono text-base font-semibold tracking-tight">
                        {record.ticker}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {record.companyName}
                        <span className="text-muted-foreground">
                          {" "}
                          · {record.marketCode}
                        </span>
                      </span>
                      {record.price !== null ? (
                        <span className="mt-0.5 block font-mono text-sm tabular-nums text-secondary-foreground">
                          {price}
                        </span>
                      ) : null}
                    </Link>
                  </td>

                  <td className="hidden lg:table-cell">
                    <Link
                      className="font-mono text-base font-semibold tracking-tight hover:text-primary"
                      href={href}
                    >
                      {record.ticker}
                    </Link>
                  </td>

                  <td className="hidden max-w-[12rem] lg:table-cell">
                    <Link
                      className="block truncate text-secondary-foreground hover:text-primary"
                      href={href}
                      title={record.companyName}
                    >
                      {record.companyName}
                    </Link>
                  </td>

                  <td className="hidden text-center xl:table-cell">
                    <MarketBadge code={record.marketCode} />
                  </td>

                  <td
                    className={cn(
                      "hidden text-right font-mono font-semibold tabular-nums xl:table-cell",
                      record.price === null && "text-muted-foreground",
                    )}
                  >
                    <Link href={href}>{price}</Link>
                  </td>

                  <td>
                    <WatchlistStatusBadge
                      colorToken={statusColorTokenFromSlug(record.statusSlug)}
                      label={record.statusLabel}
                      slug={record.statusSlug}
                    />
                  </td>

                  <td
                    className={cn(
                      "text-right font-mono font-semibold tabular-nums",
                      score == null && "text-muted-foreground",
                    )}
                  >
                    <Link href={href}>{score ?? emptyValue}</Link>
                  </td>

                  <td className="max-w-[10rem]">
                    <Link
                      className="block truncate font-semibold text-foreground hover:text-primary"
                      href={href}
                      title={decision}
                    >
                      {decision}
                    </Link>
                  </td>

                  <td className="min-w-0 max-w-[28rem]">
                    <MonitoringSummaryClamp
                      clampLines={2}
                      summary={record.summary}
                    />
                  </td>

                  <td className="hidden text-center xl:table-cell">
                    <span
                      className="inline-flex min-h-6 items-center rounded-[var(--radius-sm)] border border-border bg-muted px-2 text-sm font-medium text-muted-foreground"
                      title={record.sourceType}
                    >
                      {formatSourceLabel(record.sourceType, t)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="flex min-h-11 items-center border-t border-border bg-muted/60 px-4">
        <p className="ui-meta">
          {t("monitoring.recordsRange", {
            count: records.length,
            from: 1,
            to: records.length,
          })}
        </p>
      </footer>
    </Surface>
  );
}
