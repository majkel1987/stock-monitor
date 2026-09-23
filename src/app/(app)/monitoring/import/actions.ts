"use server";

import { redirect } from "next/navigation";

import { createGpwMonitoringImportDraft } from "@/application/imports/create-import-draft";
import { createUsaMonitoringImportDraft } from "@/application/imports/create-usa-import-draft";
import { detectMonitoringImportKind } from "@/application/imports/detect-monitoring-import";
import { GPW_IMPORT_MAX_BYTES } from "@/application/imports/gpw-monitoring-schema";
import { getServerTranslator } from "@/i18n/get-locale";
import {
  createSupabaseMonitoringImportRepository,
  MonitoringImportInfrastructureError,
} from "@/infrastructure/supabase/queries/monitoring-imports";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export type ImportUploadState = {
  status: "idle" | "error";
  message: string;
  issues?: Array<{ path: string; message: string }>;
};

export async function createImportDraftAction(
  _previous: ImportUploadState,
  formData: FormData,
): Promise<ImportUploadState> {
  const { t } = await getServerTranslator();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: t("monitoring.import.errorSelectFile"),
    };
  }
  if (!file.name.toLowerCase().endsWith(".json")) {
    return {
      status: "error",
      message: t("monitoring.import.errorJsonOnly"),
    };
  }
  if (file.size > GPW_IMPORT_MAX_BYTES) {
    return {
      status: "error",
      message: t("monitoring.import.errorFileTooLarge"),
    };
  }

  const user = await requireAllowedUser();
  const payload = await file.text();
  const importKind = detectMonitoringImportKind(payload) ?? "GPW";
  let result: Awaited<ReturnType<typeof createGpwMonitoringImportDraft>>;
  try {
    const client = await createClient("writable");
    const repository = createSupabaseMonitoringImportRepository(
      client,
      importKind,
    );
    result =
      importKind === "USA"
        ? await createUsaMonitoringImportDraft({
            repository,
            userId: user.id,
            payload,
            fileName: file.name,
          })
        : await createGpwMonitoringImportDraft({
            repository,
            userId: user.id,
            payload,
            fileName: file.name,
          });
  } catch (error) {
    if (error instanceof MonitoringImportInfrastructureError) {
      return {
        status: "error",
        message: t("monitoring.import.errorDraftSaveFailed"),
      };
    }
    throw error;
  }

  if (result.status === "invalid_file") {
    return {
      status: "error",
      message: t("monitoring.import.errorContractMismatch", {
        kind: importKind,
      }),
      issues: result.issues.slice(0, 20),
    };
  }
  redirect(`/monitoring/imports/${result.batchId}`);
}
