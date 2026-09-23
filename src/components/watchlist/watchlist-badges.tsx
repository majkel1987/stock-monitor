"use client";

import { Archive, ArchiveRestore } from "lucide-react";

import {
  archiveStockAction,
  restoreStockAction,
} from "@/app/(app)/watchlist/actions";
import type { WatchlistRow } from "@/application/watchlist/types";
import { StatusBadge } from "@/components/ui/terminal";
import { useTranslate } from "@/i18n/provider";
import { resolveStatusLabel } from "@/i18n/status";

import {
  freshnessPresentation,
  statusBadgeTone,
  type FreshnessPresentation,
} from "./format";

export function MarketBadge({ code }: { code: string }) {
  return (
    <span className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {code}
    </span>
  );
}

export function WatchlistStatusBadge({
  slug,
  label,
  colorToken,
}: {
  slug?: string;
  label: string;
  colorToken: string;
}) {
  const { t } = useTranslate();
  const displayLabel =
    slug != null ? resolveStatusLabel({ slug, label }, t) : label;

  return (
    <StatusBadge tone={statusBadgeTone(colorToken)}>
      <span className="max-w-[11rem] truncate">{displayLabel}</span>
    </StatusBadge>
  );
}

const freshnessTone: Record<
  FreshnessPresentation["tone"],
  "positive" | "warning" | "negative" | "info" | "neutral"
> = {
  positive: "positive",
  warning: "warning",
  negative: "negative",
  info: "info",
  muted: "neutral",
};

export function FreshnessBadge({ row }: { row: WatchlistRow }) {
  const { t, locale } = useTranslate();
  const freshness = freshnessPresentation(row, locale, t);

  return (
    <span
      className="inline-flex max-w-full flex-col gap-0.5"
      title={freshness.title}
    >
      <StatusBadge tone={freshnessTone[freshness.tone]}>
        {freshness.label}
      </StatusBadge>
      {freshness.source ? (
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {freshness.source}
        </span>
      ) : null}
    </span>
  );
}

export function WatchlistRowActions({ row }: { row: WatchlistRow }) {
  const { t } = useTranslate();
  const action = row.archivedAt ? restoreStockAction : archiveStockAction;
  const actionLabel = row.archivedAt
    ? t("watchlist.restoreStock", { ticker: row.ticker })
    : t("watchlist.archiveStock", { ticker: row.ticker });
  const ActionIcon = row.archivedAt ? ArchiveRestore : Archive;

  return (
    <form action={action}>
      <input name="watchlistItemId" type="hidden" value={row.watchlistItemId} />
      <button
        aria-label={actionLabel}
        className="grid size-10 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
        title={actionLabel}
        type="submit"
      >
        <ActionIcon aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
