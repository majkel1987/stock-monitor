"use server";

import { revalidatePath } from "next/cache";

import { manualMarketQuoteSchema } from "@/application/sync/manual-market-quote";
import {
  createSupabaseManualMarketQuoteWriter,
  ManualMarketQuoteInfrastructureError,
} from "@/infrastructure/supabase/queries/manual-market-quote";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export type ManualQuoteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitManualQuoteAction(
  _previousState: ManualQuoteActionState,
  formData: FormData,
): Promise<ManualQuoteActionState> {
  await requireAllowedUser();
  const parsed = manualMarketQuoteSchema.safeParse({
    stockId: formData.get("stockId"),
    marketCode: formData.get("marketCode"),
    ticker: formData.get("ticker"),
    price: formData.get("price"),
    currency: formData.get("currency"),
    asOf: formData.get("asOf"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the quote details.",
    };
  }

  try {
    const client = await createClient("writable");
    const result = await createSupabaseManualMarketQuoteWriter(client).submit(
      parsed.data,
    );
    if (result === "saved") {
      const stockPath = `/stocks/${parsed.data.marketCode.toLowerCase()}/${encodeURIComponent(parsed.data.ticker)}`;
      revalidatePath(stockPath);
      revalidatePath("/dashboard");
      revalidatePath("/watchlist");
      return { status: "success", message: "Manual quote saved." };
    }

    const messages: Record<Exclude<typeof result, "saved">, string> = {
      quote_older_than_stored:
        "This quote is not newer than the currently stored quote.",
      invalid_stock: "This stock is not available on your watchlist.",
      invalid_price: "Price must be greater than zero.",
      currency_mismatch: "The quote currency does not match the stock.",
      invalid_timestamp: "Enter a valid quote time that is not in the future.",
    };
    return { status: "error", message: messages[result] };
  } catch (error) {
    if (error instanceof ManualMarketQuoteInfrastructureError) {
      return {
        status: "error",
        message: "The manual quote could not be saved. Please try again.",
      };
    }
    throw error;
  }
}
