import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MarketDataSyncRepository } from "@/application/sync/sync-types";
import type { StooqCsvImportRepository } from "@/application/sync/import-stooq-csv";
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

export function resolveMarketDataProviderSymbol(
  market: "GPW" | "USA",
  directSymbol: string | undefined,
  legacyEodhdSymbol: string | undefined,
) {
  return (
    directSymbol ??
    legacyEodhdSymbol?.replace(market === "GPW" ? /\.WAR$/i : /\.US$/i, "") ??
    null
  );
}

export function createSupabaseMarketDataSyncRepository(
  client: SupabaseClient<Database>,
): MarketDataSyncRepository & StooqCsvImportRepository {
  return {
    async latestManualAttemptAt() {
      const { data, error } = await client
        .from("sync_runs")
        .select("started_at")
        .eq("job_type", "market_quotes_manual")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new MarketDataSyncInfrastructureError();
      return data?.started_at ?? null;
    },

    async latestFxEffectiveDate() {
      const { data, error } = await client
        .from("fx_rates")
        .select("effective_date")
        .eq("pair", "USDPLN")
        .eq("provider", "NBP")
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new MarketDataSyncInfrastructureError();
      return data?.effective_date ?? null;
    },

    async claimSyncLease(input) {
      const { data, error } = await client
        .rpc("claim_market_sync", {
          p_job_type: input.jobType,
          p_user_id: input.userId,
          p_owner_email: input.ownerEmail,
          p_stale_after_seconds: input.staleAfterSeconds,
          p_metadata: input.metadata as Json,
        })
        .single();
      if (error || !data) throw new MarketDataSyncInfrastructureError();
      const providerUpdate = await client
        .from("sync_runs")
        .update({ provider: "Massive/NBP" })
        .eq("id", data.run_id);
      if (providerUpdate.error) throw new MarketDataSyncInfrastructureError();
      return {
        runId: data.run_id,
        userId: data.user_id,
        acquired: data.acquired,
        reason: data.reason,
      };
    },

    async loadActiveInstruments(userId, markets) {
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
          .select("stock_id,provider,provider_symbol")
          .in("provider", ["STOOQ", "MASSIVE", "EODHD"])
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
      const mappingByStockAndProvider = new Map(
        mappingsResult.data.map((mapping) => [
          `${mapping.stock_id}:${mapping.provider}`,
          mapping.provider_symbol,
        ]),
      );

      return stockIds.flatMap((stockId) => {
        const stock = stockById.get(stockId);
        const market = stock ? marketById.get(stock.market_id) : null;
        if (
          !stock ||
          !market ||
          !isMarketCode(market) ||
          (markets && !markets.includes(market)) ||
          (stock.currency !== "PLN" && stock.currency !== "USD")
        ) {
          return [];
        }
        const provider = market === "GPW" ? "STOOQ" : "MASSIVE";
        const directSymbol = mappingByStockAndProvider.get(
          `${stock.id}:${provider}`,
        );
        const legacySymbol = mappingByStockAndProvider.get(`${stock.id}:EODHD`);
        const providerSymbol = resolveMarketDataProviderSymbol(
          market,
          directSymbol,
          legacySymbol,
        );
        if (!providerSymbol) return [];
        return [
          {
            stockId: stock.id,
            provider,
            providerSymbol,
            market,
            currency: stock.currency,
          },
        ];
      });
    },

    async findActiveGpwInstrument(userId, stockId) {
      const itemResult = await client
        .from("watchlist_items")
        .select("stock_id")
        .eq("user_id", userId)
        .eq("stock_id", stockId)
        .is("archived_at", null)
        .maybeSingle();
      if (itemResult.error) throw new MarketDataSyncInfrastructureError();
      if (!itemResult.data) return null;

      const stockResult = await client
        .from("stocks")
        .select("id,market_id,ticker,currency")
        .eq("id", stockId)
        .maybeSingle();
      if (stockResult.error) throw new MarketDataSyncInfrastructureError();
      const stock = stockResult.data;
      if (!stock || stock.currency !== "PLN") return null;

      const marketResult = await client
        .from("markets")
        .select("code")
        .eq("id", stock.market_id)
        .maybeSingle();
      if (marketResult.error) throw new MarketDataSyncInfrastructureError();
      if (marketResult.data?.code !== "GPW") return null;

      return {
        stockId: stock.id,
        provider: "STOOQ",
        providerSymbol: stock.ticker,
        market: "GPW",
        currency: "PLN",
      };
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

    async importPrices(input) {
      const quote = input.latestQuote;
      const { data, error } = await client
        .rpc("import_stooq_csv_prices", {
          p_stock_id: quote.stockId,
          p_rows: input.prices.map((price) => ({
            trading_date: price.tradingDate,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            adjusted_close: price.adjustedClose,
            volume: price.volume,
          })),
          p_price: quote.price,
          p_previous_close: quote.previousClose,
          p_day_change_pct: quote.dayChangePct,
          p_volume: quote.volume,
          p_as_of: quote.asOf,
          p_received_at: quote.receivedAt,
          p_quality_status: input.qualityStatus,
        })
        .single();
      if (error || !data) throw new MarketDataSyncInfrastructureError();
      return {
        historyInsertedCount: data.history_inserted_count,
        quoteUpdated: data.quote_updated,
      };
    },

    async finishRun(runId, input) {
      const { error } = await client
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: input.status,
          ...(input.requestedCount === undefined
            ? {}
            : { requested_count: input.requestedCount }),
          success_count: input.successCount,
          failure_count: input.failureCount,
          error_summary: input.errorSummary,
          metadata: input.metadata as Json,
        })
        .eq("id", runId);
      if (error) throw new MarketDataSyncInfrastructureError();
    },

    async upsertQuote(quote, qualityStatus) {
      const { data, error } = await client.rpc("upsert_eod_market_quote", {
        p_stock_id: quote.stockId,
        p_trading_date: quote.tradingDate,
        p_open: quote.open === null ? null : Number(quote.open),
        p_high: quote.high === null ? null : Number(quote.high),
        p_low: quote.low === null ? null : Number(quote.low),
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
