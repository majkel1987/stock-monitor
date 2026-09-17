import Link from "next/link";
import { notFound } from "next/navigation";

import { ImportReviewForm } from "@/components/monitoring/import-review-form";
import { ActionButton, PageHeader } from "@/components/ui/terminal";
import { createSupabaseMonitoringImportRepository } from "@/infrastructure/supabase/queries/monitoring-imports";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const user = await requireAllowedUser();
  const client = await createClient();
  const batch = await createSupabaseMonitoringImportRepository(
    client,
  ).readBatch(user.id, batchId);
  if (!batch) notFound();

  return (
    <div className="flex min-h-[1028px] flex-col gap-[14px] p-6">
      <PageHeader
        description={`${batch.fileName} · schema 1.0 · ${batch.externalId}`}
        title={`Review import · ${batch.analysisDate}`}
      >
        <Link href="/monitoring/import">
          <ActionButton variant="ghost">Discard draft</ActionButton>
        </Link>
      </PageHeader>
      <ImportReviewForm batch={batch} />
    </div>
  );
}
