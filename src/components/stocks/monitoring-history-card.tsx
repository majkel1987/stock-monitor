import Link from "next/link";

import type { MonitoringHistoryItem } from "@/application/stocks/research-types";
import { MonitoringSummaryText } from "@/components/monitoring/monitoring-summary-text";
import { SectionHeader, StatusBadge, Surface } from "@/components/ui/terminal";
import { WatchlistStatusBadge } from "@/components/watchlist/watchlist-badges";
import { cn } from "@/lib/utils/cn";

import {
  dateFormatter,
  emptyValue,
  formatMoney,
  formatSourceLabel,
  signed,
} from "./format";

function historyTransition(item: MonitoringHistoryItem) {
  if (!item.comparison) return item.status.label;
  if (item.comparison.previousStatus.id === item.status.id) {
    return item.status.label;
  }
  return `${item.comparison.previousStatus.label} → ${item.status.label}`;
}

function HistoryEntry({ item }: { item: MonitoringHistoryItem }) {
  const investmentDelta = item.comparison?.scoreDeltas.investment ?? null;
  const href = `/monitoring/${item.id}`;

  return (
    <article className="flex flex-col gap-2 border-b border-[var(--border-subtle)] px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <time
          className="ui-meta font-semibold"
          dateTime={item.analyzedAt}
        >
          {dateFormatter.format(new Date(item.analyzedAt))}
        </time>
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(item.price, item.currency)}
          <span className="text-muted-foreground"> · </span>
          Score {item.scores.investment ?? emptyValue}
          {investmentDelta === null ? "" : ` (${signed(investmentDelta, 0)})`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <WatchlistStatusBadge
          colorToken={item.status.colorToken}
          label={item.status.label}
        />
        {item.isSuperseded ? (
          <StatusBadge tone="neutral">Superseded</StatusBadge>
        ) : null}
        {item.comparison &&
        item.comparison.previousStatus.id !== item.status.id ? (
          <span className="text-[0.8125rem] text-muted-foreground">
            {historyTransition(item)}
          </span>
        ) : null}
      </div>

      <MonitoringSummaryText
        clampLines={2}
        summary={item.summary ?? item.recommendation}
      />

      <p className="ui-meta">
        Source: {formatSourceLabel(item.sourceType)}
        {item.sourceReference ? ` · ${item.sourceReference}` : ""}
      </p>

      <Link
        aria-label={`Open monitoring entry from ${dateFormatter.format(new Date(item.analyzedAt))}`}
        className="inline-flex min-h-9 w-fit items-center text-sm font-semibold text-primary hover:underline"
        href={href}
      >
        View details
      </Link>
    </article>
  );
}

export function MonitoringHistoryCard({
  items,
  className,
}: {
  items: MonitoringHistoryItem[];
  className?: string;
}) {
  return (
    <Surface className={cn("min-w-0", className)}>
      <SectionHeader
        meta={<span>{items.length} records</span>}
        title="Monitoring history"
      />
      {items.length ? (
        items.map((item) => <HistoryEntry item={item} key={item.id} />)
      ) : (
        <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5">
          No monitoring yet.
        </p>
      )}
    </Surface>
  );
}
