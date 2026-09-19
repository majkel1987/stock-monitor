"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { commitSelectedImportItems } from "@/application/imports/commit-import";
import {
  createSupabaseMonitoringImportRepository,
  MonitoringImportInfrastructureError,
} from "@/infrastructure/supabase/queries/monitoring-imports";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export type ImportReviewActionState = {
  status: "idle" | "error";
  message: string;
};

const idSchema = z.uuid();
const actionSchema = z.enum(["KEEP", "ADD", "SUPERSEDE"]);

export async function commitImportReviewAction(
  _previous: ImportReviewActionState,
  formData: FormData,
): Promise<ImportReviewActionState> {
  const batchId = idSchema.safeParse(formData.get("batchId"));
  if (!batchId.success) {
    return { status: "error", message: "The import batch is invalid." };
  }

  const user = await requireAllowedUser();
  try {
    const client = await createClient("writable");
    const lookupRepository = createSupabaseMonitoringImportRepository(client);
    const batch = await lookupRepository.readBatch(user.id, batchId.data);
    if (!batch) return { status: "error", message: "Import batch not found." };
    const repository = createSupabaseMonitoringImportRepository(
      client,
      batch.exportType === "usa_opportunity_monitoring" ? "USA" : "GPW",
    );

    const selected = new Set(
      formData
        .getAll("includeItem")
        .filter((value): value is string => typeof value === "string"),
    );
    const accepted = new Set(
      formData
        .getAll("acceptWarning")
        .filter((value): value is string => typeof value === "string"),
    );
    const priceLevelActionsByItem: Parameters<
      typeof commitSelectedImportItems
    >[0]["priceLevelActionsByItem"] = {};

    for (const item of batch.items) {
      const includeInCommit = selected.has(item.id);
      const warningsAccepted = accepted.has(item.id);
      await repository.updateReviewSelection(user.id, item.id, {
        includeInCommit,
        warningsAccepted,
      });
      if (includeInCommit && item.state === "WARNING" && !warningsAccepted) {
        return {
          status: "error",
          message: `Accept warnings for ${item.ticker ?? item.externalId} before committing.`,
        };
      }
      priceLevelActionsByItem[item.id] =
        item.company?.positionPlan.tranches.map((tranche) => {
          const parsed = actionSchema.safeParse(
            formData.get(`trancheAction:${item.id}:${tranche.number}`),
          );
          return {
            trancheNumber: tranche.number,
            action: parsed.success ? parsed.data : "KEEP",
          };
        }) ?? [];
    }

    const result = await commitSelectedImportItems({
      repository,
      userId: user.id,
      batchId: batchId.data,
      priceLevelActionsByItem,
    });
    const failed = result.results.filter(
      (item) =>
        !["committed", "already_imported", "already_committed"].includes(
          item.outcome,
        ),
    );
    if (failed.length > 0) {
      return {
        status: "error",
        message: `${failed.length} selected item(s) could not be committed. No partial record was left for those items.`,
      };
    }
  } catch (error) {
    if (error instanceof MonitoringImportInfrastructureError) {
      return {
        status: "error",
        message: "The import transaction failed. Review data was preserved.",
      };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/watchlist");
  revalidatePath("/monitoring");
  revalidatePath("/stocks/[market]/[ticker]", "page");
  redirect("/monitoring?imported=1");
}
