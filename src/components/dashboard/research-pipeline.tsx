"use client";

import type {
  DashboardStatus,
  DashboardStatusCount,
} from "@/application/dashboard/types";
import { EmptyState, SectionHeader, StatusBadge, Surface } from "@/components/ui/terminal";
import { resolveStatusLabel } from "@/i18n/status";
import { useT } from "@/i18n/provider";

import { statusBarClass, statusBadgeTone } from "./format";

function PipelineRow({
  count,
  label,
  status,
  total,
}: {
  count: number;
  label: string;
  status?: DashboardStatus;
  total: number;
}) {
  const t = useT();
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {status ? (
            <StatusBadge tone={statusBadgeTone(status.colorToken)}>
              <span className="max-w-[10rem] truncate">{label}</span>
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">
              <span className="max-w-[10rem] truncate">{label}</span>
            </StatusBadge>
          )}
        </span>
        <span className="shrink-0 font-mono text-foreground tabular-nums">
          {count}{" "}
          <span className="ui-meta" aria-hidden="true">
            · {percent}%
          </span>
        </span>
      </div>
      <div
        aria-label={t("dashboard.pipelineProgress", {
          label,
          count,
          total,
        })}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${status ? statusBarClass(status) : "bg-muted-foreground"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
}

export function ResearchPipeline({
  rows,
  total,
  deepDiveCount,
}: {
  rows: DashboardStatusCount[];
  total: number;
  deepDiveCount: number;
}) {
  const t = useT();
  const includesDeepDive = rows.some((row) => row.status.slug === "DEEP_DIVE");

  return (
    <Surface>
      <SectionHeader title={t("dashboard.researchPipeline")} />
      {rows.length || deepDiveCount > 0 ? (
        <ul className="flex flex-col gap-3 p-4">
          {rows.map((row) => (
            <PipelineRow
              count={row.count}
              key={row.status.id}
              label={resolveStatusLabel(row.status, t)}
              status={row.status}
              total={total}
            />
          ))}
          {!includesDeepDive ? (
            <PipelineRow
              count={deepDiveCount}
              label={t("status.DEEP_DIVE")}
              total={total}
            />
          ) : null}
        </ul>
      ) : (
        <EmptyState
          description={t("dashboard.noPipelineDescription")}
          title={t("dashboard.noPipelineTitle")}
        />
      )}
    </Surface>
  );
}
