import Link from "next/link";

import { ImportUploadForm } from "@/components/monitoring/import-upload-form";
import { ActionButton, PageHeader } from "@/components/ui/terminal";

const stages = ["SELECT FILE", "VALIDATE", "REVIEW", "COMMIT"];

export default function MonitoringImportPage() {
  return (
    <div className="flex min-h-[848px] flex-col gap-4 p-6">
      <PageHeader
        compact
        description="Create a reviewable draft from a Monitoruj GPW Okazje export. Nothing is committed yet."
        title="Import monitoring JSON"
      >
        <Link href="/monitoring">
          <ActionButton variant="ghost">Back to monitoring</ActionButton>
        </Link>
      </PageHeader>
      <ol className="grid h-10 grid-cols-4 overflow-hidden rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]">
        {stages.map((stage, index) => (
          <li
            className={`flex items-center justify-center gap-2 border-b text-[10px] font-semibold ${index === 0 ? "border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]" : "border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}
            key={stage}
          >
            <span
              className={`grid size-5 place-items-center rounded-full font-mono text-[9px] font-bold ${index === 0 ? "bg-[var(--accent-primary)] text-[var(--bg-primary)]" : "bg-[var(--surface-elevated)]"}`}
            >
              {index + 1}
            </span>
            {stage}
          </li>
        ))}
      </ol>
      <ImportUploadForm />
    </div>
  );
}
