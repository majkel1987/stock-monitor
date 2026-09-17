import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisSnapshot } from "@/components/monitoring/analysis-snapshot";
import { ActionButton, StatusBadge } from "@/components/ui/terminal";
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

  return (
    <div className="flex min-h-[1368px] flex-col gap-4 p-6">
      <header className="flex min-h-[88px] flex-col justify-center gap-2 border-b border-[var(--border-default)] py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/monitoring">
              <ActionButton variant="ghost">← History</ActionButton>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">
                  {detail.companyName} · {detail.ticker}
                </h1>
                <StatusBadge>{detail.marketCode}</StatusBadge>
                <StatusBadge tone="warning">
                  {detail.statusLabel.toUpperCase()}
                </StatusBadge>
              </div>
              <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)]">
                Historical analysis snapshot ·{" "}
                {formatter.format(new Date(detail.analyzedAt))} ·{" "}
                {detail.sourceType.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-[8px] font-bold text-[var(--text-muted)]">
                ANALYSIS PRICE
              </p>
              <strong className="font-mono text-base">
                {detail.price ?? "—"} {detail.currency}
              </strong>
            </div>
            <div>
              <p className="text-[8px] font-bold text-[var(--text-muted)]">
                CURRENT PRICE
              </p>
              <strong className="font-mono text-base text-[var(--accent-primary)]">
                {detail.currentPrice ?? "—"} {detail.currency}
              </strong>
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
          <span>
            {detail.decisionAction?.replaceAll("_", " ") ?? "No decision"} —{" "}
            {detail.decisionReason ?? detail.summary ?? "No summary"}
          </span>
          <span className="font-mono text-[var(--text-muted)]">
            {detail.sourceReference ?? detail.id}
          </span>
        </div>
      </header>
      {detail.analysis ? (
        <AnalysisSnapshot company={detail.analysis} />
      ) : (
        <div className="rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
          <h2 className="text-sm font-semibold">Manual monitoring snapshot</h2>
          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
            {detail.summary ??
              "No extended analysis was recorded for this manual monitoring."}
          </p>
        </div>
      )}
    </div>
  );
}
