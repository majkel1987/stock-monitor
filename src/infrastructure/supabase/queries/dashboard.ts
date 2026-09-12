import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DashboardGroup,
  DashboardMonitoringSource,
  DashboardReader,
  DashboardStatus,
} from "@/application/dashboard/types";
import { isMarketCode } from "@/domain/markets/market";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

const WATCHLIST_COLUMNS = `
  stock_id,
  stocks!watchlist_items_stock_id_fkey (
    id,
    market_id,
    ticker,
    name,
    currency
  ),
  status_definitions!watchlist_items_status_owner_fkey (
    id,
    slug,
    label,
    color_token,
    dashboard_group,
    sort_order
  )
` as const;

const DASHBOARD_GROUPS = new Set<DashboardGroup>([
  "opportunity",
  "watch",
  "research",
  "portfolio",
  "negative",
  "other",
]);

export class DashboardInfrastructureError extends Error {
  constructor() {
    super("Dashboard data could not be loaded.");
    this.name = "DashboardInfrastructureError";
  }
}

function dashboardGroup(value: string): DashboardGroup {
  if (!DASHBOARD_GROUPS.has(value as DashboardGroup)) {
    throw new DashboardInfrastructureError();
  }
  return value as DashboardGroup;
}

function triggerDirection(value: string): "lte" | "gte" {
  return value === "gte" ? "gte" : "lte";
}

function statusView(row: {
  id: string;
  slug: string;
  label: string;
  color_token: string;
  dashboard_group: string;
  sort_order: number;
}): DashboardStatus {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    colorToken: row.color_token,
    dashboardGroup: dashboardGroup(row.dashboard_group),
    sortOrder: row.sort_order,
  };
}

type MonitoringViewRow =
  Database["public"]["Views"]["dashboard_monitoring_summary"]["Row"];

function monitoringView(row: MonitoringViewRow): DashboardMonitoringSource {
  if (
    !row.id ||
    !row.stock_id ||
    !row.analyzed_at ||
    !row.created_at ||
    !row.status_definition_id ||
    !row.status_slug ||
    !row.status_label ||
    !row.status_color_token ||
    !row.status_dashboard_group ||
    row.status_sort_order === null ||
    row.price === null ||
    !row.currency ||
    row.stock_rank === null ||
    row.recent_rank === null
  ) {
    throw new DashboardInfrastructureError();
  }

  const previousStatus =
    row.previous_status_definition_id &&
    row.previous_status_slug &&
    row.previous_status_label &&
    row.previous_status_color_token &&
    row.previous_status_dashboard_group &&
    row.previous_status_sort_order !== null
      ? statusView({
          id: row.previous_status_definition_id,
          slug: row.previous_status_slug,
          label: row.previous_status_label,
          color_token: row.previous_status_color_token,
          dashboard_group: row.previous_status_dashboard_group,
          sort_order: row.previous_status_sort_order,
        })
      : null;

  return {
    id: row.id,
    stockId: row.stock_id,
    analyzedAt: row.analyzed_at,
    createdAt: row.created_at,
    status: statusView({
      id: row.status_definition_id,
      slug: row.status_slug,
      label: row.status_label,
      color_token: row.status_color_token,
      dashboard_group: row.status_dashboard_group,
      sort_order: row.status_sort_order,
    }),
    previousStatus,
    investmentScore: row.investment_score,
    previousInvestmentScore: row.previous_investment_score,
    recommendation: row.recommendation,
    summary: row.summary,
    price: String(row.price),
    currency: row.currency,
    stockRank: row.stock_rank,
    recentRank: row.recent_rank,
  };
}

export function createSupabaseDashboardReader(
  client: SupabaseClient<Database>,
): DashboardReader {
  return {
    async read(userId) {
      const [itemsResult, marketsResult, syncResult] = await Promise.all([
        client
          .from("watchlist_items")
          .select(WATCHLIST_COLUMNS)
          .eq("user_id", userId)
          .is("archived_at", null)
          .limit(200),
        client.from("markets").select("id,code").order("code"),
        client
          .from("sync_runs")
          .select("finished_at")
          .eq("status", "success")
          .in("job_type", [
            "market_quotes",
            "market_quotes_manual",
            "stooq_csv_import",
          ])
          .not("finished_at", "is", null)
          .order("finished_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (itemsResult.error || marketsResult.error || syncResult.error) {
        throw new DashboardInfrastructureError();
      }

      if (!itemsResult.data.length) {
        return {
          stocks: [],
          recentMonitoring: [],
          lastSuccessfulSyncAt: syncResult.data?.finished_at ?? null,
        };
      }

      const stockIds = itemsResult.data.map((item) => item.stock_id);
      const [quotesResult, levelsResult, monitoringResult] = await Promise.all([
        client
          .from("market_quotes")
          .select(
            "stock_id,price,currency,day_change_pct,as_of,provider,quality_status",
          )
          .in("stock_id", stockIds),
        client
          .from("price_levels")
          .select(
            "id,stock_id,label,value,currency,trigger_direction,priority,sort_order,valid_from,valid_to",
          )
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("kind", "buy")
          .in("stock_id", stockIds)
          .limit(2_000),
        client
          .from("dashboard_monitoring_summary")
          .select("*")
          .eq("user_id", userId)
          .or("stock_rank.eq.1,recent_rank.lte.5")
          .order("analyzed_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(205),
      ]);

      if (quotesResult.error || levelsResult.error || monitoringResult.error) {
        throw new DashboardInfrastructureError();
      }

      const marketCodeById = new Map(
        marketsResult.data.flatMap((market) =>
          isMarketCode(market.code) ? [[market.id, market.code]] : [],
        ),
      );
      const quoteByStock = new Map(
        quotesResult.data.map((quote) => [quote.stock_id, quote]),
      );
      const levelsByStock = new Map<string, typeof levelsResult.data>();
      for (const level of levelsResult.data) {
        const levels = levelsByStock.get(level.stock_id) ?? [];
        levels.push(level);
        levelsByStock.set(level.stock_id, levels);
      }

      const monitoring = monitoringResult.data.map(monitoringView);
      const latestMonitoringByStock = new Map(
        monitoring
          .filter((item) => item.stockRank === 1)
          .map((item) => [item.stockId, item]),
      );

      const stocks = itemsResult.data.map((item) => {
        const stock = item.stocks;
        const status = item.status_definitions;
        const marketCode = stock
          ? marketCodeById.get(stock.market_id)
          : undefined;
        if (!stock || !status || !marketCode) {
          throw new DashboardInfrastructureError();
        }
        const quote = quoteByStock.get(stock.id) ?? null;

        return {
          id: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          marketCode,
          currency: stock.currency,
          status: statusView(status),
          quote: quote
            ? {
                price: String(quote.price),
                currency: quote.currency,
                dayChangePct:
                  quote.day_change_pct === null
                    ? null
                    : String(quote.day_change_pct),
                asOf: quote.as_of,
                provider: quote.provider,
                qualityStatus: "unknown" as const,
              }
            : null,
          latestMonitoring: latestMonitoringByStock.get(stock.id) ?? null,
          buyLevels: (levelsByStock.get(stock.id) ?? []).map((level) => ({
            id: level.id,
            stockId: level.stock_id,
            label: level.label,
            value: String(level.value),
            currency: level.currency,
            triggerDirection: triggerDirection(level.trigger_direction),
            priority: level.priority,
            sortOrder: level.sort_order,
            validFrom: level.valid_from,
            validTo: level.valid_to,
          })),
        };
      });

      return {
        stocks,
        recentMonitoring: monitoring.filter((item) => item.recentRank <= 5),
        lastSuccessfulSyncAt: syncResult.data?.finished_at ?? null,
      };
    },
  };
}
