"use server";

import { redirect } from "next/navigation";

import { createGpwMonitoringImportDraft } from "@/application/imports/create-import-draft";
import { GPW_IMPORT_MAX_BYTES } from "@/application/imports/gpw-monitoring-schema";
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
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Select a JSON file to continue." };
  }
  if (!file.name.toLowerCase().endsWith(".json")) {
    return { status: "error", message: "Only JSON files are accepted." };
  }
  if (file.size > GPW_IMPORT_MAX_BYTES) {
    return {
      status: "error",
      message: "The file exceeds the 1 MB import limit.",
    };
  }

  const user = await requireAllowedUser();
  let result: Awaited<ReturnType<typeof createGpwMonitoringImportDraft>>;
  try {
    const client = await createClient("writable");
    result = await createGpwMonitoringImportDraft({
      repository: createSupabaseMonitoringImportRepository(client),
      userId: user.id,
      payload: await file.text(),
      fileName: file.name,
    });
  } catch (error) {
    if (error instanceof MonitoringImportInfrastructureError) {
      return {
        status: "error",
        message: "The draft could not be saved. No monitoring was committed.",
      };
    }
    throw error;
  }

  if (result.status === "invalid_file") {
    return {
      status: "error",
      message: "The file does not match the GPW monitoring contract.",
      issues: result.issues.slice(0, 20),
    };
  }
  redirect(`/monitoring/imports/${result.batchId}`);
}
