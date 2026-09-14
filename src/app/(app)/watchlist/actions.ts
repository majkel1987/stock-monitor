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
  watchlistItemIdSchema,
} from "@/application/watchlist/schemas";
import { syncMarketQuotes } from "@/application/sync/sync-market-quotes";
import { InvalidTickerError } from "@/domain/stocks/ticker";
import { MassiveError } from "@/infrastructure/market-data/massive/massive-errors";
import { createMassiveProvider } from "@/infrastructure/market-data/massive/massive-provider";
import { createSupabaseMarketDataSyncRepository } from "@/infrastructure/supabase/queries/market-data-sync";
import {
  createSupabaseWatchlistWriter,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { createServiceClient } from "@/infrastructure/supabase/server/create-service-client";
import { getServerEnv } from "@/lib/env/server";

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

  const apiKey = getServerEnv().MASSIVE_API_KEY;
  if (!apiKey) {
    return { status: "error", message: "Massive is not configured." };
  }

  try {
    const provider = createMassiveProvider(apiKey, {
      deadlineAtMs: Date.now() + 60_000,
    });
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
        message: `No active USA stock exists with ticker ${parsed.data.providerSymbol.toUpperCase()}.`,
      };
    }

    const client = await createClient("writable");
    const result = await addProviderStockToWatchlist(
      createSupabaseWatchlistWriter(client),
      user.id,
      candidate,
      parsed.data.initialStatusId,
    );
    if (
      result.status === "created" ||
      result.status === "restored" ||
      result.status === "already_active"
    ) {
      let initialPriceAvailable = false;
      const serviceClient = createServiceClient();
      if (serviceClient) {
        try {
          const quoteResult = await syncMarketQuotes({
            repository: createSupabaseMarketDataSyncRepository(serviceClient),
            providers: { USA: provider },
            userId: user.id,
            trigger: "initial",
            markets: ["USA"],
            stockIds: [result.stockId],
            deadlineAtMs: Date.now() + 45_000,
          });
          initialPriceAvailable =
            quoteResult.status === "success" ||
            quoteResult.status === "partial";
        } catch {
          initialPriceAvailable = false;
        }
      }

      revalidatePath("/watchlist");
      revalidatePath("/dashboard");
      revalidatePath("/stocks/[market]/[ticker]", "page");

      const baseMessage =
        result.status === "restored"
          ? "Archived USA stock restored."
          : result.status === "already_active"
            ? "Existing USA stock connected to Massive."
            : "USA stock added with company details.";
      return {
        status: "success",
        message: initialPriceAvailable
          ? `${baseMessage} The latest EOD price was fetched.`
          : `${baseMessage} The initial price is temporarily unavailable; daily synchronization will retry.`,
      };
    }

    const messages = {
      invalid_market: "Choose a supported market.",
      invalid_status: "Choose an active status that belongs to your account.",
      invalid_candidate: "The provider candidate is invalid.",
      mapping_conflict: "This provider symbol is mapped to another stock.",
      conflict: "The stock could not be added. Please try again.",
    } as const;
    return { status: "error", message: messages[result.status] };
  } catch (error) {
    if (error instanceof MassiveError) {
      return {
        status: "error",
        message: "The ticker could not be verified with Massive right now.",
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
