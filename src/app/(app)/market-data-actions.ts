"use server";

import { revalidatePath } from "next/cache";

import { syncMarketQuotes } from "@/application/sync/sync-market-quotes";
import { syncUsdPlnRate } from "@/application/sync/sync-usd-pln-rate";
import { createNbpProvider } from "@/infrastructure/fx/nbp/nbp-provider";
import { createEodhdProvider } from "@/infrastructure/market-data/eodhd/eodhd-provider";
import { createSupabaseMarketDataSyncRepository } from "@/infrastructure/supabase/queries/market-data-sync";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createServiceClient } from "@/infrastructure/supabase/server/create-service-client";
import { getServerEnv } from "@/lib/env/server";

export type RefreshMarketDataActionState = {
  status: "idle" | "success" | "partial" | "error" | "cooldown";
  message?: string;
};

export async function refreshMarketDataAction(
  _previousState: RefreshMarketDataActionState,
): Promise<RefreshMarketDataActionState> {
  void _previousState;
  const user = await requireAllowedUser();
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return {
      status: "error",
      message: "Market-data writes are not configured on this server.",
    };
  }

  const repository = createSupabaseMarketDataSyncRepository(serviceClient);
  const env = getServerEnv();

  try {
    const quoteResult = await syncMarketQuotes({
      repository,
      provider: env.EODHD_API_TOKEN
        ? createEodhdProvider(env.EODHD_API_TOKEN)
        : null,
      userId: user.id,
      trigger: "manual",
    });
    if (quoteResult.status === "manual_cooldown") {
      const retryTime = quoteResult.retryAt
        ? new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Europe/Warsaw",
          }).format(new Date(quoteResult.retryAt))
        : "shortly";
      return {
        status: "cooldown",
        message: `Refresh cooldown active. Try again after ${retryTime}.`,
      };
    }

    const fxResult = await syncUsdPlnRate({
      provider: createNbpProvider(),
      repository,
    });
    revalidatePath("/dashboard");
    revalidatePath("/watchlist");
    revalidatePath("/settings/data");
    revalidatePath("/stocks/[market]/[ticker]", "page");
    revalidatePath("/monitoring/new");

    if (quoteResult.status === "success" && fxResult.status === "success") {
      return {
        status: "success",
        message: `${quoteResult.successCount} quotes and USD/PLN updated.`,
      };
    }
    if (quoteResult.status === "provider_not_configured") {
      return {
        status: fxResult.status === "success" ? "partial" : "error",
        message:
          fxResult.status === "success"
            ? "USD/PLN updated. EODHD is not configured."
            : "EODHD is not configured and USD/PLN could not be updated.",
      };
    }
    if (quoteResult.status === "skipped") {
      return {
        status: fxResult.status === "success" ? "success" : "error",
        message:
          fxResult.status === "success"
            ? "USD/PLN updated. No provider-mapped stocks need quotes."
            : "No mapped quotes and USD/PLN update failed.",
      };
    }

    return {
      status:
        quoteResult.status === "failed" && fxResult.status === "failed"
          ? "error"
          : "partial",
      message: `${quoteResult.successCount} of ${quoteResult.requestedCount} quotes updated; USD/PLN ${fxResult.status}.`,
    };
  } catch {
    return {
      status: "error",
      message: "Synchronization could not be completed. Stored data was kept.",
    };
  }
}
