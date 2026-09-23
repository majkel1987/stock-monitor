"use server";

import { revalidatePath } from "next/cache";

import type { PortfolioActionState } from "@/application/portfolio/action-state";
import {
  createPortfolioTransaction,
  deletePortfolioTransaction,
  updatePortfolioTransaction,
} from "@/application/portfolio/manage-transactions";
import {
  createPortfolioTransactionSchema,
  deletePortfolioTransactionSchema,
  updatePortfolioTransactionSchema,
} from "@/application/portfolio/schemas";
import {
  createSupabasePortfolioWriter,
  PortfolioInfrastructureError,
} from "@/infrastructure/supabase/queries/portfolio";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

function validationError(
  result: Exclude<
    ReturnType<typeof createPortfolioTransactionSchema.safeParse>,
    { success: true }
  >,
): PortfolioActionState {
  return {
    status: "error",
    message: "Check the investment details.",
    fieldErrors: result.error.flatten().fieldErrors,
  };
}

function refreshPortfolio() {
  revalidatePath("/portfolio", "layout");
}

export async function createPortfolioTransactionAction(
  _previousState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const user = await requireAllowedUser();
  const parsed = createPortfolioTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationError(parsed);

  try {
    const client = await createClient("writable");
    const outcome = await createPortfolioTransaction(
      createSupabasePortfolioWriter(client),
      user.id,
      parsed.data,
    );
    if (outcome === "invalid_stock") {
      return {
        status: "error",
        message: "Choose a company from your StockMonitor watchlist.",
      };
    }
    refreshPortfolio();
    return { status: "success", message: "Investment added." };
  } catch (error) {
    if (error instanceof PortfolioInfrastructureError) {
      return {
        status: "error",
        message: "The investment could not be saved. Please try again.",
      };
    }
    throw error;
  }
}

export async function updatePortfolioTransactionAction(
  _previousState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const user = await requireAllowedUser();
  const parsed = updatePortfolioTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the investment details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const client = await createClient("writable");
    const updated = await updatePortfolioTransaction(
      createSupabasePortfolioWriter(client),
      user.id,
      parsed.data.transactionId,
      parsed.data,
    );
    if (!updated) {
      return { status: "error", message: "The transaction no longer exists." };
    }
    refreshPortfolio();
    return { status: "success", message: "Investment updated." };
  } catch (error) {
    if (error instanceof PortfolioInfrastructureError) {
      return {
        status: "error",
        message: "The investment could not be updated. Please try again.",
      };
    }
    throw error;
  }
}

export async function deletePortfolioTransactionAction(
  _previousState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const user = await requireAllowedUser();
  const parsed = deletePortfolioTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid transaction." };
  }

  try {
    const client = await createClient("writable");
    const deleted = await deletePortfolioTransaction(
      createSupabasePortfolioWriter(client),
      user.id,
      parsed.data.transactionId,
    );
    if (!deleted) {
      return { status: "error", message: "The transaction no longer exists." };
    }
    refreshPortfolio();
    return { status: "success", message: "Investment deleted." };
  } catch (error) {
    if (error instanceof PortfolioInfrastructureError) {
      return {
        status: "error",
        message: "The investment could not be deleted. Please try again.",
      };
    }
    throw error;
  }
}
