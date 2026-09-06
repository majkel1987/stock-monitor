"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AddStockActionState } from "@/application/watchlist/action-state";
import { addStockToWatchlist } from "@/application/watchlist/add-stock-to-watchlist";
import {
  archiveWatchlistItem,
  restoreWatchlistItem,
} from "@/application/watchlist/change-watchlist-archive";
import {
  addStockSchema,
  watchlistItemIdSchema,
} from "@/application/watchlist/schemas";
import { InvalidTickerError } from "@/domain/stocks/ticker";
import {
  createSupabaseWatchlistWriter,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export async function addStockAction(
  _previousState: AddStockActionState,
  formData: FormData,
): Promise<AddStockActionState> {
  const user = await requireAllowedUser();
  const parsed = addStockSchema.safeParse({
    marketCode: formData.get("marketCode"),
    ticker: formData.get("ticker"),
    name: formData.get("name"),
    initialStatusId: formData.get("initialStatusId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const client = await createClient("writable");
    const result = await addStockToWatchlist(
      createSupabaseWatchlistWriter(client),
      user.id,
      parsed.data,
    );

    if (result.status === "created" || result.status === "restored") {
      revalidatePath("/watchlist");
      return {
        status: "success",
        message:
          result.status === "restored"
            ? "Archived stock restored."
            : "Stock added to the watchlist.",
      };
    }

    const messages = {
      already_active: "This stock is already on your active watchlist.",
      invalid_market: "Choose a supported market.",
      invalid_status: "Choose an active status that belongs to your account.",
      conflict: "The stock could not be added. Please try again.",
    } as const;

    return { status: "error", message: messages[result.status] };
  } catch (error) {
    if (error instanceof InvalidTickerError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: { ticker: [error.message] },
      };
    }
    if (error instanceof WatchlistInfrastructureError) {
      return {
        status: "error",
        message: "The stock could not be saved. Please try again.",
      };
    }
    throw error;
  }
}

async function changeArchiveState(
  formData: FormData,
  operation: "archive" | "restore",
) {
  const user = await requireAllowedUser();
  const parsed = watchlistItemIdSchema.safeParse(
    formData.get("watchlistItemId"),
  );
  if (!parsed.success) redirect("/watchlist?error=invalid_action");

  let failed = false;
  try {
    const client = await createClient("writable");
    const writer = createSupabaseWatchlistWriter(client);
    const result =
      operation === "archive"
        ? await archiveWatchlistItem(writer, user.id, parsed.data)
        : await restoreWatchlistItem(writer, user.id, parsed.data);
    failed = result.status === "not_found";
  } catch (error) {
    if (!(error instanceof WatchlistInfrastructureError)) throw error;
    failed = true;
  }

  if (failed) redirect(`/watchlist?error=${operation}_failed`);
  revalidatePath("/watchlist");
}

export async function archiveStockAction(formData: FormData) {
  await changeArchiveState(formData, "archive");
}

export async function restoreStockAction(formData: FormData) {
  await changeArchiveState(formData, "restore");
}
