import { FileUp } from "lucide-react";
import Link from "next/link";

import { MonitoringMobileList } from "@/components/monitoring/monitoring-mobile-list";
import { MonitoringTable } from "@/components/monitoring/monitoring-table";
import { FlashToast } from "@/components/ui/flash-toast";
import {
  EmptyState,
  PageHeader,
  Surface,
} from "@/components/ui/terminal";
import { getServerTranslator } from "@/i18n/get-locale";
import type { Translator } from "@/i18n/translate";
import {
  MonitoringHistoryInfrastructureError,
  readMonitoringTimeline,
} from "@/infrastructure/supabase/queries/monitoring-history";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

function ImportJsonLink({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <Link
      className={
        className ??
        "ui-button ui-button-primary inline-flex w-full min-h-11 sm:w-auto"
      }
      href="/monitoring/import"
    >
      <FileUp aria-hidden="true" className="mr-2 size-4" />
      {label}
    </Link>
  );
}

async function DataError() {
  const { t } = await getServerTranslator();
  return (
    <div className="page-frame flex flex-col gap-4">
      <PageHeader
        description={t("monitoring.subtitle")}
        index
        title={t("monitoring.title")}
      />
      <Surface className="border-negative bg-[var(--negative-subtle)]" padded>
        <h2 className="text-card-title">{t("monitoring.unavailableTitle")}</h2>
        <p className="mt-2 text-sm text-secondary-foreground">
          {t("monitoring.unavailableDescription")}
        </p>
      </Surface>
    </div>
  );
}

function MonitoringEmpty({ t }: { t: Translator }) {
  return (
    <Surface>
      <EmptyState
        action={<ImportJsonLink label={t("monitoring.importJson")} />}
        description={t("monitoring.emptyDescription")}
        title={t("monitoring.emptyTitle")}
      />
    </Surface>
  );
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const user = await requireAllowedUser();
  const { t } = await getServerTranslator();
  const imported = (await searchParams).imported === "1";

  let records: Awaited<ReturnType<typeof readMonitoringTimeline>>;
  try {
    records = await readMonitoringTimeline(await createClient(), user.id);
  } catch (error) {
    if (error instanceof MonitoringHistoryInfrastructureError) {
      return <DataError />;
    }
    throw error;
  }

  return (
    <div className="page-frame flex flex-col gap-4">
      <PageHeader
        description={t("monitoring.subtitle")}
        index
        title={t("monitoring.title")}
      >
        <ImportJsonLink label={t("monitoring.importJson")} />
      </PageHeader>

      {imported ? (
        <FlashToast
          clearParams={["imported"]}
          description={t("monitoring.toastImportedDescription")}
          title={t("monitoring.toastImportedTitle")}
          variant="success"
        />
      ) : null}

      {records.length ? (
        <>
          <MonitoringTable records={records} />
          <MonitoringMobileList records={records} />
          <p className="ui-meta md:hidden">
            {t("monitoring.recordsRange", {
              count: records.length,
              from: 1,
              to: records.length,
            })}
          </p>
        </>
      ) : (
        <MonitoringEmpty t={t} />
      )}
    </div>
  );
}
