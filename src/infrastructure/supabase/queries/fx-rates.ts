import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { FxRateReader } from "@/application/sync/get-latest-fx-rate";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

export class FxRateInfrastructureError extends Error {
  constructor() {
    super("The latest FX rate could not be loaded.");
    this.name = "FxRateInfrastructureError";
  }
}

export function createSupabaseFxRateReader(
  client: SupabaseClient<Database>,
): FxRateReader {
  return {
    async latestUsdPln() {
      const { data, error } = await client
        .from("fx_rates")
        .select("rate,effective_date,as_of,provider")
        .eq("pair", "USDPLN")
        .eq("provider", "NBP")
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new FxRateInfrastructureError();
      if (!data) return null;
      return {
        rate: String(data.rate),
        effectiveDate: data.effective_date,
        asOf: data.as_of,
        provider: "NBP",
      };
    },
  };
}
