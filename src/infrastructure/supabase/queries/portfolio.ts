import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PortfolioQuote,
  PortfolioReader,
  PortfolioStock,
  PortfolioTransaction,
  PortfolioWriter,
} from "@/application/portfolio/types";
import { isMarketCode, type CurrencyCode } from "@/domain/markets/market";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

export class PortfolioInfrastructureError extends Error {
  constructor() {
    super("Portfolio data could not be loaded or changed.");
    this.name = "PortfolioInfrastructureError";
  }
}

function isCurrency(value: string): value is CurrencyCode {
  return value === "PLN" || value === "USD";
}

export function createSupabasePortfolioReader(
  client: SupabaseClient<Database>,
): PortfolioReader {
  return {
    async read(userId) {
      const [transactionsResult, watchlistResult, marketsResult, fxResult] =
        await Promise.all([
          client
            .from("portfolio_transactions")
            .select("*")
            .eq("user_id", userId)
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false }),
          client
            .from("watchlist_items")
            .select("stock_id")
            .eq("user_id", userId)
            .limit(500),
          client.from("markets").select("id,code,currency"),
          client
            .from("fx_rates")
            .select("rate,effective_date,as_of,provider")
            .eq("pair", "USDPLN")
            .eq("provider", "NBP")
            .order("effective_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (
        transactionsResult.error ||
        watchlistResult.error ||
        marketsResult.error ||
        fxResult.error
      ) {
        throw new PortfolioInfrastructureError();
      }

      const stockIds = [
        ...new Set([
          ...watchlistResult.data.map((item) => item.stock_id),
          ...transactionsResult.data.map((item) => item.stock_id),
        ]),
      ];
      if (stockIds.length === 0) {
        return {
          stocks: [],
          transactions: [],
          quotes: [],
          usdPlnRate: fxResult.data
            ? {
                rate: String(fxResult.data.rate),
                effectiveDate: fxResult.data.effective_date,
                asOf: fxResult.data.as_of,
                provider: "NBP" as const,
              }
            : null,
        };
      }

      const [stocksResult, quotesResult] = await Promise.all([
        client
          .from("stocks")
          .select("id,market_id,ticker,name,currency")
          .in("id", stockIds)
          .order("ticker"),
        client.from("market_quotes").select("*").in("stock_id", stockIds),
      ]);
      if (stocksResult.error || quotesResult.error) {
        throw new PortfolioInfrastructureError();
      }

      const marketById = new Map(
        marketsResult.data.map((market) => [market.id, market]),
      );
      const stocks: PortfolioStock[] = [];
      for (const stock of stocksResult.data) {
        const market = marketById.get(stock.market_id);
        if (
          !market ||
          !isMarketCode(market.code) ||
          !isCurrency(stock.currency)
        ) {
          continue;
        }
        stocks.push({
          id: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          marketCode: market.code,
          currency: stock.currency,
        });
      }

      const transactions: PortfolioTransaction[] = transactionsResult.data
        .filter((row) => isCurrency(row.currency))
        .map((row) => ({
          id: row.id,
          stockId: row.stock_id,
          transactionDate: row.transaction_date,
          quantity: String(row.quantity),
          pricePerShare: String(row.price_per_share),
          currency: row.currency as CurrencyCode,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      const quotes: PortfolioQuote[] = quotesResult.data
        .filter((row) => isCurrency(row.currency))
        .map((row) => ({
          stockId: row.stock_id,
          price: String(row.price),
          currency: row.currency as CurrencyCode,
          asOf: row.as_of,
          provider: row.provider,
          qualityStatus: row.quality_status,
        }));

      return {
        stocks,
        transactions,
        quotes,
        usdPlnRate: fxResult.data
          ? {
              rate: String(fxResult.data.rate),
              effectiveDate: fxResult.data.effective_date,
              asOf: fxResult.data.as_of,
              provider: "NBP",
            }
          : null,
      };
    },
  };
}

export function createSupabasePortfolioWriter(
  client: SupabaseClient<Database>,
): PortfolioWriter {
  return {
    async create(userId, input) {
      const { data: membership, error: membershipError } = await client
        .from("watchlist_items")
        .select("stock_id")
        .eq("user_id", userId)
        .eq("stock_id", input.stockId)
        .maybeSingle();
      if (membershipError) throw new PortfolioInfrastructureError();
      if (!membership) return "invalid_stock";

      const { data: stock, error: stockError } = await client
        .from("stocks")
        .select("currency")
        .eq("id", input.stockId)
        .maybeSingle();
      if (stockError) throw new PortfolioInfrastructureError();
      if (!stock || !isCurrency(stock.currency)) return "invalid_stock";

      const { error } = await client.from("portfolio_transactions").insert({
        user_id: userId,
        stock_id: input.stockId,
        transaction_type: "BUY",
        transaction_date: input.transactionDate,
        quantity: Number(input.quantity),
        price_per_share: Number(input.pricePerShare),
        currency: stock.currency,
      });
      if (error) throw new PortfolioInfrastructureError();
      return "created";
    },

    async update(userId, transactionId, input) {
      const { data, error } = await client
        .from("portfolio_transactions")
        .update({
          transaction_date: input.transactionDate,
          quantity: Number(input.quantity),
          price_per_share: Number(input.pricePerShare),
        })
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw new PortfolioInfrastructureError();
      return data !== null;
    },

    async delete(userId, transactionId) {
      const { data, error } = await client
        .from("portfolio_transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw new PortfolioInfrastructureError();
      return data !== null;
    },
  };
}
