"use client";

import type { DashboardKpis } from "@/application/dashboard/types";
import { MetricCard, MetricStrip } from "@/components/ui/terminal";
import { useT } from "@/i18n/provider";

export function DashboardStats({ kpis }: { kpis: DashboardKpis }) {
  const t = useT();

  return (
    <MetricStrip label={t("dashboard.statistics")}>
      <MetricCard
        embedded
        hint={t("dashboard.marketBreakdown", {
          gpw: kpis.gpw,
          usa: kpis.usa,
        })}
        label={t("dashboard.monitored")}
        value={kpis.monitored}
      />
      <MetricCard
        embedded
        hint={t("dashboard.buyCandidates")}
        label={t("dashboard.opportunities")}
        tone="positive"
        value={kpis.buyCandidates}
      />
      <MetricCard
        embedded
        hint={t("dashboard.dataResearchIssues")}
        label={t("dashboard.needsAttention")}
        tone={kpis.needsAttention > 0 ? "warning" : "default"}
        value={kpis.needsAttention}
      />
      <MetricCard
        embedded
        hint={t("dashboard.currentHoldings")}
        label={t("dashboard.portfolio")}
        value={kpis.portfolio}
      />
    </MetricStrip>
  );
}
