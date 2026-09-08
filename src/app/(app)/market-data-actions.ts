"use server";

import { revalidatePath } from "next/cache";

import { runManualMarketSync } from "@/application/sync/run-manual-market-sync";
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
  const deadlineAtMs = Date.now() + 240_000;

  try {
    const result = await runManualMarketSync({
      repository,
      marketDataProvider: env.EODHD_API_TOKEN
        ? createEodhdProvider(env.EODHD_API_TOKEN, { deadlineAtMs })
        : null,
      fxRateProvider: createNbpProvider({ deadlineAtMs }),
      userId: user.id,
      deadlineAtMs,
    });
    if (result.status === "locked") {
      return {
        status: "cooldown",
        message: "A synchronization is already running. Try again shortly.",
      };
    }
    if (result.status === "failed") {
      return {
        status: "error",
        message:
          "Synchronization could not be completed. Stored data was kept.",
      };
    }
    const quoteResult = result.quotes;
    if (result.status === "cooldown" && quoteResult) {
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
    if (!quoteResult) {
      return {
        status: "error",
        message:
          "Synchronization could not be completed. Stored data was kept.",
      };
    }
    if (!result.fx) {
      return {
        status: quoteResult.successCount > 0 ? "partial" : "error",
        message: `${quoteResult.successCount} of ${quoteResult.requestedCount} quotes updated; USD/PLN skipped because the synchronization deadline was reached.`,
      };
    }
    const fxResult = result.fx;
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
