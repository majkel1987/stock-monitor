"use server";

import { revalidatePath } from "next/cache";

import type { SaveStatusActionState } from "@/application/settings/action-state";
import { reorderStatusDefinitions } from "@/application/settings/reorder-status-definitions";
import {
  createStatusDefinition,
  updateStatusDefinition,
} from "@/application/settings/save-status-definition";
import {
  createStatusSchema,
  updateStatusSchema,
} from "@/application/settings/schemas";
import {
  createSupabaseStatusDefinitionStore,
  StatusDefinitionInfrastructureError,
} from "@/infrastructure/supabase/queries/status-definitions";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "1";
}

function draftFromForm(formData: FormData) {
  return {
    label: String(formData.get("label") ?? ""),
    description: String(formData.get("description") ?? ""),
    colorToken: String(formData.get("colorToken") ?? ""),
    dashboardGroup: String(formData.get("dashboardGroup") ?? ""),
    sortOrder: formData.get("sortOrder"),
    isActive: parseBoolean(formData.get("isActive")),
  };
}

function revalidateStatusPaths() {
  revalidatePath("/settings/statuses");
  revalidatePath("/watchlist");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
}

const invalidResponse: SaveStatusActionState = {
  status: "error",
  message: "Check the highlighted fields and try again.",
};

export async function saveStatusAction(
  _previous: SaveStatusActionState,
  formData: FormData,
): Promise<SaveStatusActionState> {
  const user = await requireAllowedUser();
  const mode = String(formData.get("mode") ?? "edit");
  const raw = draftFromForm(formData);

  try {
    const client = await createClient("writable");
    const store = createSupabaseStatusDefinitionStore(client);

    if (mode === "create") {
      const parsed = createStatusSchema.safeParse(raw);
      if (!parsed.success) return invalidResponse;
      const result = await createStatusDefinition(store, user.id, parsed.data);
      if (result.status !== "created") return invalidResponse;
      revalidateStatusPaths();
      return {
        status: "success",
        kind: "created",
        statusId: result.record.id,
        label: result.record.label,
        message: "The new workflow status is now available.",
      };
    }

    const parsed = updateStatusSchema.safeParse({
      ...raw,
      id: String(formData.get("id") ?? ""),
    });
    if (!parsed.success) return invalidResponse;
    const result = await updateStatusDefinition(store, user.id, parsed.data);
    if (result.status === "not_found") {
      return {
        status: "error",
        message: "The selected status could not be found.",
      };
    }
    if (result.status !== "updated") return invalidResponse;
    revalidateStatusPaths();
    return {
      status: "success",
      kind: "updated",
      statusId: result.record.id,
      label: result.record.label,
      message: `${result.record.label} was updated successfully.`,
    };
  } catch (error) {
    if (error instanceof StatusDefinitionInfrastructureError) {
      return {
        status: "error",
        message: "The status could not be saved. Please try again.",
      };
    }
    throw error;
  }
}

export async function reorderStatusesAction(
  orderedIds: string[],
): Promise<{ status: "ok" | "error"; message?: string }> {
  const user = await requireAllowedUser();

  try {
    const client = await createClient("writable");
    const store = createSupabaseStatusDefinitionStore(client);
    const result = await reorderStatusDefinitions(
      store,
      store,
      user.id,
      orderedIds,
    );
    if (result.status === "invalid") {
      return {
        status: "error",
        message: "The status order could not be updated.",
      };
    }
    revalidateStatusPaths();
    return { status: "ok" };
  } catch (error) {
    if (error instanceof StatusDefinitionInfrastructureError) {
      return {
        status: "error",
        message: "The status order could not be saved.",
      };
    }
    throw error;
  }
}
