"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AddStockActionState } from "@/application/watchlist/action-state";
import { addProviderStockToWatchlist } from "@/application/watchlist/add-provider-stock-to-watchlist";
import { addStockToWatchlist } from "@/application/watchlist/add-stock-to-watchlist";
import {
  archiveWatchlistItem,
  restoreWatchlistItem,
} from "@/application/watchlist/change-watchlist-archive";
import {
  addStockSchema,
  addProviderStockSchema,
  providerSearchSchema,
  watchlistItemIdSchema,
} from "@/application/watchlist/schemas";
import type { InstrumentCandidate } from "@/application/sync/market-data-provider";
import { InvalidTickerError } from "@/domain/stocks/ticker";
import {
  createSupabaseWatchlistWriter,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { createEodhdProvider } from "@/infrastructure/market-data/eodhd/eodhd-provider";
import { EodhdError } from "@/infrastructure/market-data/eodhd/eodhd-errors";
import { getServerEnv } from "@/lib/env/server";

export type ProviderSearchActionState = {
  status: "idle" | "success" | "error" | "not_configured";
  message?: string;
  candidates: InstrumentCandidate[];
};

export async function searchInstrumentsAction(
  _previousState: ProviderSearchActionState,
  formData: FormData,
): Promise<ProviderSearchActionState> {
  await requireAllowedUser();
  const parsed = providerSearchSchema.safeParse({
    marketCode: formData.get("marketCode"),
    query: formData.get("query"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid ticker or company name.",
      candidates: [],
    };
  }

  const token = getServerEnv().EODHD_API_TOKEN;
  if (!token) {
    return {
      status: "not_configured",
      message: "EODHD is not configured. You can still add the stock manually.",
      candidates: [],
    };
  }

  try {
    const candidates = await createEodhdProvider(token).search(
      parsed.data.query,
      parsed.data.marketCode,
    );
    return {
      status: "success",
      message: candidates.length ? undefined : "No matching instruments found.",
      candidates,
    };
  } catch (error) {
    if (error instanceof EodhdError) {
      return {
        status: "error",
        message:
          "Provider search is temporarily unavailable. Add manually instead.",
        candidates: [],
      };
    }
    throw error;
  }
}

export async function addProviderStockAction(
  _previousState: AddStockActionState,
  formData: FormData,
): Promise<AddStockActionState> {
  const user = await requireAllowedUser();
  const parsed = addProviderStockSchema.safeParse({
    marketCode: formData.get("marketCode"),
    providerSymbol: formData.get("providerSymbol"),
    initialStatusId: formData.get("initialStatusId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid provider instrument." };
  }

  const token = getServerEnv().EODHD_API_TOKEN;
  if (!token) {
    return { status: "error", message: "EODHD is not configured." };
  }

  try {
    const provider = createEodhdProvider(token);
    const candidates = await provider.search(
      parsed.data.providerSymbol,
      parsed.data.marketCode,
    );
    const candidate = candidates.find(
      (item) =>
        item.providerSymbol.toUpperCase() ===
        parsed.data.providerSymbol.toUpperCase(),
    );
    if (!candidate) {
      return {
        status: "error",
        message: "The provider instrument could not be verified.",
      };
    }

    const client = await createClient("writable");
    const result = await addProviderStockToWatchlist(
      createSupabaseWatchlistWriter(client),
      user.id,
      candidate,
      parsed.data.initialStatusId,
    );
    if (result.status === "created" || result.status === "restored") {
      revalidatePath("/watchlist");
      revalidatePath("/dashboard");
      return {
        status: "success",
        message:
          result.status === "restored"
            ? "Archived provider instrument restored."
            : "Provider instrument added.",
      };
    }

    const messages = {
      already_active: "This stock is already on your active watchlist.",
      invalid_market: "Choose a supported market.",
      invalid_status: "Choose an active status that belongs to your account.",
      invalid_candidate: "The provider candidate is invalid.",
      mapping_conflict: "This provider symbol is mapped to another stock.",
      conflict: "The stock could not be added. Please try again.",
    } as const;
    return { status: "error", message: messages[result.status] };
  } catch (error) {
    if (error instanceof EodhdError) {
      return {
        status: "error",
        message: "The provider instrument could not be verified right now.",
      };
    }
    if (error instanceof WatchlistInfrastructureError) {
      return { status: "error", message: "The stock could not be saved." };
    }
    throw error;
  }
}

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
      revalidatePath("/dashboard");
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
      invalid_candidate: "The provider candidate is invalid.",
      mapping_conflict: "This provider symbol is mapped to another stock.",
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
  revalidatePath("/dashboard");
}

export async function archiveStockAction(formData: FormData) {
  await changeArchiveState(formData, "archive");
}

export async function restoreStockAction(formData: FormData) {
  await changeArchiveState(formData, "restore");
}
