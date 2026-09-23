"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

import type {
  AttentionReason,
  NeedsAttentionRow,
} from "@/application/dashboard/types";
import {
  EmptyState,
  SectionHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";
import { MarketBadge } from "@/components/watchlist/watchlist-badges";
import { stockHref } from "@/components/watchlist/format";
import { useT } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/dictionaries";

const reasonKeys: Record<AttentionReason, TranslationKey> = {
  no_monitoring: "dashboard.reasonNoMonitoring",
  stale_monitoring: "dashboard.reasonStaleMonitoring",
  missing_price: "dashboard.reasonMissingPrice",
  stale_price: "dashboard.reasonStalePrice",
};

export function NeedsAttentionCard({ rows }: { rows: NeedsAttentionRow[] }) {
  const t = useT();

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
        meta={<span className="ui-meta tabular-nums">{rows.length}</span>}
        title={t("dashboard.needsAttention")}
      />
      {rows.length ? (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {rows.slice(0, 5).map((row) => {
            const visibleReasons = row.reasons.slice(0, 2);
            const remainingReasons = row.reasons.length - visibleReasons.length;

            return (
              <li key={row.stockId}>
                <Link
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/70"
                  href={stockHref(row.marketCode, row.ticker)}
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-warning"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <strong className="font-mono text-sm font-semibold tracking-tight">
                        {row.ticker}
                      </strong>
                      <MarketBadge code={row.marketCode} />
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {visibleReasons.map((reason) => (
                        <StatusBadge key={reason} tone="warning">
                          {t(reasonKeys[reason])}
                        </StatusBadge>
                      ))}
                      {remainingReasons > 0 ? (
                        <StatusBadge tone="neutral">
                          +{remainingReasons}
                        </StatusBadge>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          description={t("dashboard.attentionOkDescription")}
          title={t("dashboard.attentionOkTitle")}
        />
      )}
    </Surface>
  );
}
