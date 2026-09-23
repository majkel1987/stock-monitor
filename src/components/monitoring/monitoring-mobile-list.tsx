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
  formatPrice,
  formatSourceLabel,
  groupByHistoryDate,
  monitoringHref,
  statusColorTokenFromSlug,
} from "./format";
import { MonitoringSummaryText } from "./monitoring-summary-text";

export function MonitoringMobileList({
  records,
}: {
  records: MonitoringTimelineItem[];
}) {
  const { locale } = useTranslate();
  const groups = groupByHistoryDate(records, locale);

  return (
    <div className="flex flex-col gap-6 md:hidden">
      {groups.map((group) => (
        <section
          aria-labelledby={`monitoring-date-${group.key}`}
          key={group.key}
        >
          <h2
            className="ui-eyebrow mb-3"
            id={`monitoring-date-${group.key}`}
          >
            {group.label}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.records.map((record) => (
              <li key={record.id}>
                <MonitoringMobileCard record={record} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MonitoringMobileCard({
  record,
}: {
  record: MonitoringTimelineItem;
}) {
  const { t, locale } = useTranslate();
  const href = monitoringHref(record.id);
  const price = formatPrice(record.price, record.currency, locale);
  const score = record.investmentScore;
  const decision = formatDecision(record.decisionAction);
  const sourceLabel = formatSourceLabel(record.sourceType, t);

  return (
    <Surface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link className="min-w-0 flex-1 hover:text-primary" href={href}>
          <p className="font-mono text-base font-semibold tracking-tight">
            {record.ticker}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {record.companyName}
          </p>
        </Link>
        <MarketBadge code={record.marketCode} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-y border-[var(--border-subtle)] py-3">
        <p
          className={cn(
            "font-mono text-base font-semibold tabular-nums",
            record.price === null && "text-muted-foreground",
          )}
        >
          {price}
        </p>
        <p
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            score == null && "text-muted-foreground",
          )}
        >
          {t("monitoring.scoreInline", {
            score: score ?? emptyValue,
          })}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <WatchlistStatusBadge
          colorToken={statusColorTokenFromSlug(record.statusSlug)}
          label={record.statusLabel}
          slug={record.statusSlug}
        />
      </div>

      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">
          {t("monitoring.decisionLabel")}{" "}
        </span>
        <span
          className={cn(
            "font-semibold",
            !record.decisionAction && "text-muted-foreground",
          )}
        >
          {decision}
        </span>
      </p>

      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
        <MonitoringSummaryText clampLines={3} summary={record.summary} />
      </div>

      <p className="ui-meta mt-3">
        {t("monitoring.sourceInline", { source: sourceLabel })}
      </p>

      <Link
        aria-label={t("monitoring.openEntryAria", { ticker: record.ticker })}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
        href={href}
      >
        {t("monitoring.viewDetails")}
      </Link>
    </Surface>
  );
}
