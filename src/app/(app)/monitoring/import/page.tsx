import Link from "next/link";

import { ImportUploadForm } from "@/components/monitoring/import-upload-form";
import { ActionButton, PageHeader } from "@/components/ui/terminal";
import { getServerTranslator } from "@/i18n/get-locale";

export default async function MonitoringImportPage() {
  const { t } = await getServerTranslator();
  const stages = [
    t("monitoring.import.stageSelectFile"),
    t("monitoring.import.stageValidate"),
    t("monitoring.import.stageReview"),
    t("monitoring.import.stageCommit"),
  ];

  return (
    <div className="page-frame flex flex-col gap-5">
      <PageHeader
        description={t("monitoring.import.subtitle")}
        title={t("monitoring.import.title")}
      >
        <Link href="/monitoring">
          <ActionButton variant="secondary">
            {t("monitoring.import.back")}
          </ActionButton>
        </Link>
      </PageHeader>

      <ol className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card sm:grid-cols-4">
        {stages.map((stage, index) => (
          <li
            className={`flex min-h-11 items-center justify-center gap-2 border-b px-2 text-xs font-semibold sm:border-b-0 sm:border-r sm:last:border-r-0 sm:text-sm ${
              index === 0
                ? "border-primary bg-[var(--accent-subtle)] text-foreground"
                : "border-[var(--border-subtle)] bg-muted text-muted-foreground"
            }`}
            key={stage}
          >
            <span
              className={`grid size-6 place-items-center rounded-full font-mono text-[0.6875rem] font-bold ${
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {index + 1}
            </span>
            <span className="truncate">{stage}</span>
          </li>
        ))}
      </ol>

      <ImportUploadForm />
    </div>
  );
}
