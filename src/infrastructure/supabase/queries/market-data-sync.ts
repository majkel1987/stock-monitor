import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MarketDataSyncRepository } from "@/application/sync/sync-types";
import { isMarketCode } from "@/domain/markets/market";
import type {
  Database,
  Json,
} from "@/infrastructure/supabase/generated/database.types";

export class MarketDataSyncInfrastructureError extends Error {
  constructor() {
    super("Market data synchronization persistence failed.");
    this.name = "MarketDataSyncInfrastructureError";
  }
}

export function createSupabaseMarketDataSyncRepository(
  client: SupabaseClient<Database>,
): MarketDataSyncRepository {
  return {
    async latestManualAttemptAt() {
      const { data, error } = await client
        .from("sync_runs")
        .select("started_at")
        .eq("job_type", "market_quotes_manual")
        .eq("provider", "EODHD")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new MarketDataSyncInfrastructureError();
      return data?.started_at ?? null;
    },

    async loadActiveInstruments(userId) {
      const itemsResult = await client
        .from("watchlist_items")
        .select("stock_id")
        .eq("user_id", userId)
        .is("archived_at", null)
        .limit(200);
      if (itemsResult.error) throw new MarketDataSyncInfrastructureError();
      const stockIds = itemsResult.data.map((item) => item.stock_id);
      if (!stockIds.length) return [];

      const [stocksResult, mappingsResult, marketsResult] = await Promise.all([
        client
          .from("stocks")
          .select("id,market_id,currency")
          .in("id", stockIds),
        client
          .from("stock_provider_symbols")
          .select("stock_id,provider_symbol")
          .eq("provider", "EODHD")
          .eq("is_primary", true)
          .in("stock_id", stockIds),
        client.from("markets").select("id,code"),
      ]);
      if (stocksResult.error || mappingsResult.error || marketsResult.error) {
        throw new MarketDataSyncInfrastructureError();
      }

      const stockById = new Map(
        stocksResult.data.map((stock) => [stock.id, stock]),
      );
      const marketById = new Map(
        marketsResult.data.map((market) => [market.id, market.code]),
      );

      return mappingsResult.data.flatMap((mapping) => {
        const stock = stockById.get(mapping.stock_id);
        const market = stock ? marketById.get(stock.market_id) : null;
        if (
          !stock ||
          !market ||
          !isMarketCode(market) ||
          (stock.currency !== "PLN" && stock.currency !== "USD")
        ) {
          return [];
        }
        return [
          {
            stockId: stock.id,
            providerSymbol: mapping.provider_symbol,
            market,
            currency: stock.currency,
          },
        ];
      });
    },

    async startRun(input) {
      const { data, error } = await client
        .from("sync_runs")
        .insert({
          job_type: input.jobType,
          provider: input.provider,
          requested_count: input.requestedCount,
          metadata: input.metadata as Json,
        })
        .select("id")
        .single();
      if (error) throw new MarketDataSyncInfrastructureError();
      return data.id;
    },

    async finishRun(runId, input) {
      const { error } = await client
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: input.status,
          success_count: input.successCount,
          failure_count: input.failureCount,
          error_summary: input.errorSummary,
          metadata: input.metadata as Json,
        })
        .eq("id", runId);
      if (error) throw new MarketDataSyncInfrastructureError();
    },

    async upsertQuote(quote, qualityStatus) {
      const { data, error } = await client.rpc("upsert_market_quote", {
        p_stock_id: quote.stockId,
        p_price: Number(quote.price),
        p_previous_close:
          quote.previousClose === null ? null : Number(quote.previousClose),
        p_day_change_pct:
          quote.dayChangePct === null ? null : Number(quote.dayChangePct),
        p_market_cap: quote.marketCap === null ? null : Number(quote.marketCap),
        p_volume: quote.volume === null ? null : Number(quote.volume),
        p_fifty_two_week_high:
          quote.fiftyTwoWeekHigh === null
            ? null
            : Number(quote.fiftyTwoWeekHigh),
        p_fifty_two_week_low:
          quote.fiftyTwoWeekLow === null ? null : Number(quote.fiftyTwoWeekLow),
        p_currency: quote.currency,
        p_as_of: quote.asOf,
        p_received_at: quote.receivedAt,
        p_provider: quote.provider,
        p_raw_hash: null,
        p_quality_status: qualityStatus,
      });
      if (error) throw new MarketDataSyncInfrastructureError();
      return data;
    },

    async upsertFxRate(rate, receivedAt) {
      const { data, error } = await client.rpc("upsert_fx_rate", {
        p_pair: `${rate.baseCurrency}${rate.quoteCurrency}`,
        p_effective_date: rate.effectiveDate,
        p_rate: Number(rate.rate),
        p_as_of: rate.asOf,
        p_received_at: receivedAt,
        p_provider: rate.provider,
      });
      if (error) throw new MarketDataSyncInfrastructureError();
      return data;
    },
  };
}
