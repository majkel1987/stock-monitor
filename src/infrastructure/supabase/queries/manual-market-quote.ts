import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ManualMarketQuoteResult,
  ManualMarketQuoteWriter,
} from "@/application/sync/manual-market-quote";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

const outcomes = new Set<ManualMarketQuoteResult>([
  "saved",
  "quote_older_than_stored",
  "invalid_stock",
  "invalid_price",
  "currency_mismatch",
  "invalid_timestamp",
]);

export class ManualMarketQuoteInfrastructureError extends Error {
  constructor() {
    super("The manual quote could not be saved.");
    this.name = "ManualMarketQuoteInfrastructureError";
  }
}

export function createSupabaseManualMarketQuoteWriter(
  client: SupabaseClient<Database>,
): ManualMarketQuoteWriter {
  return {
    async submit(input) {
      const { data, error } = await client.rpc("submit_manual_market_quote", {
        p_stock_id: input.stockId,
        p_price: Number(input.price),
        p_currency: input.currency,
        p_as_of: input.asOf.toISOString(),
      });
      if (error || !data || !outcomes.has(data as ManualMarketQuoteResult)) {
        throw new ManualMarketQuoteInfrastructureError();
      }
      return data as ManualMarketQuoteResult;
    },
  };
}
