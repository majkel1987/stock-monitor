import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisSnapshot } from "@/components/monitoring/analysis-snapshot";
import {
  ActionButton,
  MetricCard,
  PageHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";
import { readMonitoringDetail } from "@/infrastructure/supabase/queries/monitoring-history";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

const formatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/Warsaw",
});

export default async function MonitoringDetailPage({
  params,
}: {
  params: Promise<{ monitoringId: string }>;
}) {
  const { monitoringId } = await params;
  const user = await requireAllowedUser();
  const detail = await readMonitoringDetail(
    await createClient(),
    user.id,
    monitoringId,
  );
  if (!detail) notFound();

  const decisionLabel =
    detail.decisionAction?.replaceAll("_", " ") ?? "No decision";
  const decisionDetail =
    detail.decisionReason ?? detail.summary ?? "No summary";

  return (
    <div className="page-frame flex flex-col gap-5">
      <PageHeader
        compact
        description={`Historical analysis snapshot · ${formatter.format(new Date(detail.analyzedAt))} · ${detail.sourceType.replaceAll("_", " ")}`}
        title={`${detail.companyName} · ${detail.ticker}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info">{detail.marketCode}</StatusBadge>
          <StatusBadge tone="warning">
            {detail.statusLabel.toUpperCase()}
          </StatusBadge>
          <Link href="/monitoring">
            <ActionButton variant="ghost">← History</ActionButton>
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          hint={decisionDetail}
          label="Decision"
          value={decisionLabel}
        />
        <MetricCard
          label="Analysis price"
          value={
            <span className="font-mono">
              {detail.price ?? "—"} {detail.currency}
            </span>
          }
        />
        <MetricCard
          label="Current price"
          value={
            <span className="font-mono text-primary">
              {detail.currentPrice ?? "—"} {detail.currency}
            </span>
          }
        />
        <MetricCard
          hint={detail.sourceReference ?? detail.id}
          label="Source"
          value={
            <span className="font-mono text-base tracking-normal">
              {detail.sourceType.replaceAll("_", " ")}
            </span>
          }
        />
      </div>

      {detail.analysis ? (
        <AnalysisSnapshot company={detail.analysis} />
      ) : (
        <Surface padded>
          <h2 className="text-card-title">Manual monitoring snapshot</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {detail.summary ??
              "No extended analysis was recorded for this manual monitoring."}
          </p>
        </Surface>
      )}
    </div>
  );
}
