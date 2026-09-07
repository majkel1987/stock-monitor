import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AddStockInput,
  AddStockResult,
  MarketDefinition,
  StatusDefinition,
  WatchlistData,
  WatchlistQuery,
  WatchlistReader,
  WatchlistRow,
  WatchlistWriter,
} from "@/application/watchlist/types";
import { isMarketCode } from "@/domain/markets/market";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

type Tables = Database["public"]["Tables"];
type MarketRow = Tables["markets"]["Row"];
type QuoteRow = Tables["market_quotes"]["Row"];
type StatusRow = Tables["status_definitions"]["Row"];
type StockRow = Tables["stocks"]["Row"];
type MonitoringRow = Pick<
  Tables["monitoring_results"]["Row"],
  "analyzed_at" | "investment_score" | "stock_id"
>;
type WatchlistItemRow = Tables["watchlist_items"]["Row"];

const STOCK_COLUMNS = "id,market_id,ticker,name,currency,data_mode" as const;

export class WatchlistInfrastructureError extends Error {
  constructor() {
    super("Watchlist data could not be loaded.");
    this.name = "WatchlistInfrastructureError";
  }
}

function statusDefinition(row: StatusRow): StatusDefinition {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    colorToken: row.color_token,
    dashboardGroup: row.dashboard_group,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function marketDefinition(row: MarketRow): MarketDefinition | null {
  if (!isMarketCode(row.code)) return null;
  return { code: row.code, name: row.name, currency: row.currency };
}

function ilikePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function latestMonitoringByStock(rows: MonitoringRow[]) {
  const latest = new Map<string, MonitoringRow>();

  for (const row of rows) {
    if (!latest.has(row.stock_id)) latest.set(row.stock_id, row);
  }

  return latest;
}

async function matchingStockIds(
  client: SupabaseClient<Database>,
  stockIds: string[],
  search: string,
) {
  if (!search) return new Set(stockIds);

  const pattern = ilikePattern(search);
  const [tickerResult, nameResult] = await Promise.all([
    client
      .from("stocks")
      .select("id")
      .in("id", stockIds)
      .ilike("ticker", pattern),
    client
      .from("stocks")
      .select("id")
      .in("id", stockIds)
      .ilike("name", pattern),
  ]);

  if (tickerResult.error || nameResult.error) {
    throw new WatchlistInfrastructureError();
  }

  return new Set(
    [...tickerResult.data, ...nameResult.data].map((stock) => stock.id),
  );
}

function mapRows({
  items,
  stocks,
  markets,
  statuses,
  quotes,
  monitoring,
  query,
  searchMatches,
}: {
  items: WatchlistItemRow[];
  stocks: StockRow[];
  markets: MarketRow[];
  statuses: StatusRow[];
  quotes: QuoteRow[];
  monitoring: MonitoringRow[];
  query: WatchlistQuery;
  searchMatches: Set<string>;
}) {
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const quoteByStock = new Map(quotes.map((quote) => [quote.stock_id, quote]));
  const monitoringByStock = latestMonitoringByStock(monitoring);
  const rows: WatchlistRow[] = [];

  for (const item of items) {
    const isArchived = item.archived_at !== null;
    if (query.view === "active" && isArchived) continue;
    if (query.view === "archived" && !isArchived) continue;
    if (!searchMatches.has(item.stock_id)) continue;

    const stock = stockById.get(item.stock_id);
    const status = statusById.get(item.current_status_id);
    const marketRow = stock ? marketById.get(stock.market_id) : undefined;
    const market = marketRow ? marketDefinition(marketRow) : null;
    if (!stock || !status || !market) continue;
    if (query.market && market.code !== query.market) continue;
    if (query.status && status.slug !== query.status) continue;

    const quote = quoteByStock.get(stock.id) ?? null;
    const latestMonitoring = monitoringByStock.get(stock.id) ?? null;
    if (query.unmonitoredOnly && latestMonitoring) continue;

    rows.push({
      watchlistItemId: item.id,
      stockId: stock.id,
      ticker: stock.ticker,
      name: stock.name,
      market,
      currency: stock.currency,
      dataMode: stock.data_mode === "provider" ? "provider" : "manual",
      status: statusDefinition(status),
      price: quote
        ? {
            value: String(quote.price),
            dayChangePct:
              quote.day_change_pct === null
                ? null
                : String(quote.day_change_pct),
            asOf: quote.as_of,
            provider: quote.provider,
            qualityStatus: "unknown",
          }
        : null,
      lastMonitoring: latestMonitoring
        ? {
            analyzedAt: latestMonitoring.analyzed_at,
            investmentScore: latestMonitoring.investment_score,
          }
        : null,
      displayOrder: item.display_order,
      archivedAt: item.archived_at,
    });
  }

  return rows;
}

export function createSupabaseWatchlistReader(
  client: SupabaseClient<Database>,
): WatchlistReader {
  return {
    async read(userId, query): Promise<WatchlistData> {
      const [itemsResult, statusesResult, marketsResult] = await Promise.all([
        client
          .from("watchlist_items")
          .select("*")
          .eq("user_id", userId)
          .limit(200),
        client
          .from("status_definitions")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order"),
        client.from("markets").select("*").order("code"),
      ]);

      if (itemsResult.error || statusesResult.error || marketsResult.error) {
        throw new WatchlistInfrastructureError();
      }

      const items = itemsResult.data;
      const statuses = statusesResult.data;
      const markets = marketsResult.data;
      const stockIds = items.map((item) => item.stock_id);
      const marketModels = markets
        .map(marketDefinition)
        .filter((market): market is MarketDefinition => market !== null);

      if (stockIds.length === 0) {
        return {
          rows: [],
          statuses: statuses.map(statusDefinition),
          markets: marketModels,
          summary: { active: 0, gpw: 0, usa: 0 },
        };
      }

      const [stocksResult, searchMatches] = await Promise.all([
        client.from("stocks").select(STOCK_COLUMNS).in("id", stockIds),
        matchingStockIds(client, stockIds, query.q),
      ]);
      if (stocksResult.error) throw new WatchlistInfrastructureError();

      const stocks = stocksResult.data as StockRow[];
      const [quotesResult, monitoringResult] = await Promise.all([
        client.from("market_quotes").select("*").in("stock_id", stockIds),
        client
          .from("monitoring_results")
          .select("stock_id,analyzed_at,investment_score")
          .eq("user_id", userId)
          .in("stock_id", stockIds)
          .is("deleted_at", null)
          .order("analyzed_at", { ascending: false }),
      ]);
      if (quotesResult.error || monitoringResult.error) {
        throw new WatchlistInfrastructureError();
      }

      const marketById = new Map(markets.map((market) => [market.id, market]));
      const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
      const activeItems = items.filter((item) => item.archived_at === null);
      const marketCount = (code: string) =>
        activeItems.filter((item) => {
          const stock = stockById.get(item.stock_id);
          return stock && marketById.get(stock.market_id)?.code === code;
        }).length;

      return {
        rows: mapRows({
          items,
          stocks,
          markets,
          statuses,
          quotes: quotesResult.data,
          monitoring: monitoringResult.data,
          query,
          searchMatches,
        }),
        statuses: statuses.map(statusDefinition),
        markets: marketModels,
        summary: {
          active: activeItems.length,
          gpw: marketCount("GPW"),
          usa: marketCount("USA"),
        },
      };
    },
  };
}

function isAddStockResult(value: string): value is AddStockResult["status"] {
  return [
    "created",
    "restored",
    "already_active",
    "invalid_market",
    "invalid_status",
    "invalid_candidate",
    "mapping_conflict",
    "conflict",
  ].includes(value);
}

export function createSupabaseWatchlistWriter(
  client: SupabaseClient<Database>,
): WatchlistWriter {
  return {
    async addManualStock(_userId: string, input: AddStockInput) {
      const { data, error } = await client.rpc(
        "add_manual_stock_to_watchlist",
        {
          p_market_code: input.marketCode,
          p_name: input.name,
          p_status_id: input.initialStatusId,
          p_ticker: input.ticker,
        },
      );

      if (error || !data?.[0] || !isAddStockResult(data[0].outcome)) {
        throw new WatchlistInfrastructureError();
      }

      return { status: data[0].outcome };
    },

    async addProviderStock(_userId, candidate, initialStatusId) {
      const { data, error } = await client.rpc(
        "add_provider_stock_to_watchlist",
        {
          p_market_code: candidate.market,
          p_ticker: candidate.ticker,
          p_name: candidate.name,
          p_exchange: candidate.exchange,
          p_currency: candidate.currency,
          p_isin: candidate.isin,
          p_provider: "EODHD",
          p_provider_symbol: candidate.providerSymbol,
          p_status_id: initialStatusId,
          p_metadata: {
            exchange: candidate.exchange,
            isin: candidate.isin,
          },
        },
      );

      if (error || !data?.[0] || !isAddStockResult(data[0].outcome)) {
        throw new WatchlistInfrastructureError();
      }
      return { status: data[0].outcome };
    },

    async archive(userId, watchlistItemId) {
      const { data, error } = await client
        .from("watchlist_items")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", watchlistItemId)
        .eq("user_id", userId)
        .is("archived_at", null)
        .select("id")
        .maybeSingle();

      if (error) throw new WatchlistInfrastructureError();
      return data !== null;
    },

    async restore(userId, watchlistItemId) {
      const { data, error } = await client
        .from("watchlist_items")
        .update({ archived_at: null })
        .eq("id", watchlistItemId)
        .eq("user_id", userId)
        .not("archived_at", "is", null)
        .select("id")
        .maybeSingle();

      if (error) throw new WatchlistInfrastructureError();
      return data !== null;
    },
  };
}
