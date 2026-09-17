import { FileJson2 } from "lucide-react";
import Link from "next/link";

import {
  ActionButton,
  PageHeader,
  StatusBadge,
} from "@/components/ui/terminal";
import { readMonitoringTimeline } from "@/infrastructure/supabase/queries/monitoring-history";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

const columns =
  "grid-cols-[112px_70px_160px_60px_100px_138px_62px_170px_minmax(180px,1fr)_62px]";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const user = await requireAllowedUser();
  const records = await readMonitoringTimeline(await createClient(), user.id);
  const imported = (await searchParams).imported === "1";

  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Chronological research log across every monitored company"
        title="Monitoring history"
      >
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {records.length} records
        </span>
        <Link href="/monitoring/import">
          <ActionButton variant="primary">
            <FileJson2 className="mr-2 size-3.5" /> Import JSON
          </ActionButton>
        </Link>
      </PageHeader>
      {imported ? (
        <p className="rounded-[5px] border border-[var(--positive)] bg-[var(--positive-subtle)] px-3 py-2 text-[10px] text-[var(--positive)]">
          Selected monitoring snapshots were committed successfully.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]">
        <div
          className={`grid h-[34px] items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] ${columns}`}
        >
          {[
            "Date",
            "Ticker",
            "Company",
            "Market",
            "Price",
            "Status",
            "Score",
            "Decision",
            "Summary",
            "Source",
          ].map((label) => (
            <span
              className="px-2 text-[9px] font-semibold text-[var(--text-muted)]"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        {records.length === 0 ? (
          <div className="grid h-48 place-items-center text-center">
            <div>
              <p className="text-sm font-semibold">No monitoring history yet</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Create one manually or import a validated JSON export.
              </p>
            </div>
          </div>
        ) : (
          records.map((record) => (
            <Link
              className={`grid h-[52px] items-center border-b border-[var(--border-subtle)] text-[10px] hover:bg-[var(--surface-hover)] ${columns}`}
              href={`/monitoring/${record.id}`}
              key={record.id}
            >
              <time className="px-2 font-mono">
                {formatter.format(new Date(record.analyzedAt)).toUpperCase()}
              </time>
              <strong className="px-2">{record.ticker}</strong>
              <span className="truncate px-2">{record.companyName}</span>
              <span className="px-2">{record.marketCode}</span>
              <span className="px-2 font-mono">
                {record.price ?? "—"} {record.currency}
              </span>
              <span className="truncate px-2">
                <StatusBadge>{record.statusLabel.toUpperCase()}</StatusBadge>
              </span>
              <span className="px-2 font-mono text-[var(--accent-primary)]">
                {record.investmentScore ?? "—"}
              </span>
              <span className="truncate px-2">
                {record.decisionAction?.replaceAll("_", " ") ?? "—"}
              </span>
              <span className="truncate px-2 text-[var(--text-secondary)]">
                {record.summary ?? "—"}
              </span>
              <span className="truncate px-2 font-mono text-[9px] text-[var(--text-muted)]">
                {record.sourceType.replaceAll("_", " ")}
              </span>
            </Link>
          ))
        )}
        {records.length ? (
          <footer className="flex h-[38px] items-center justify-between bg-[var(--bg-tertiary)] px-3">
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              Showing 1–{records.length} of {records.length} records
            </span>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
