import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MonitoringImportCompany } from "@/application/imports/types";
import type {
  MonitoringDetail,
  MonitoringTimelineItem,
} from "@/application/monitoring/history-types";
import type {
  Database,
  Json,
} from "@/infrastructure/supabase/generated/database.types";

export class MonitoringHistoryInfrastructureError extends Error {
  constructor() {
    super("Monitoring history could not be loaded.");
    this.name = "MonitoringHistoryInfrastructureError";
  }
}

function companySnapshot(value: Json): MonitoringImportCompany | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return typeof value.externalId === "string" &&
    typeof value.identity === "object" &&
    value.identity !== null
    ? (value as unknown as MonitoringImportCompany)
    : null;
}

export async function readMonitoringTimeline(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<MonitoringTimelineItem[]> {
  const monitoring = await client
    .from("monitoring_results")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("analyzed_at", { ascending: false })
    .limit(200);
  if (monitoring.error) throw new MonitoringHistoryInfrastructureError();
  if (monitoring.data.length === 0) return [];

  const stockIds = [...new Set(monitoring.data.map((row) => row.stock_id))];
  const statusIds = [
    ...new Set(monitoring.data.map((row) => row.status_definition_id)),
  ];
  const [stocks, statuses, markets] = await Promise.all([
    client.from("stocks").select("id,ticker,name,market_id").in("id", stockIds),
    client
      .from("status_definitions")
      .select("id,slug,label")
      .eq("user_id", userId)
      .in("id", statusIds),
    client.from("markets").select("id,code"),
  ]);
  if (stocks.error || statuses.error || markets.error)
    throw new MonitoringHistoryInfrastructureError();

  const stockById = new Map(stocks.data.map((row) => [row.id, row]));
  const statusById = new Map(statuses.data.map((row) => [row.id, row]));
  const marketById = new Map(markets.data.map((row) => [row.id, row.code]));

  return monitoring.data.flatMap((row) => {
    const stock = stockById.get(row.stock_id);
    const status = statusById.get(row.status_definition_id);
    if (!stock || !status) return [];
    return [
      {
        id: row.id,
        analyzedAt: row.analyzed_at,
        ticker: stock.ticker,
        companyName: stock.name,
        marketCode: marketById.get(stock.market_id) ?? "—",
        price: row.price === null ? null : String(row.price),
        currency: row.currency,
        statusSlug: status.slug,
        statusLabel: status.label,
        investmentScore: row.investment_score,
        decisionAction: row.decision_action,
        summary: row.summary,
        sourceType: row.source_type,
      },
    ];
  });
}

export async function readMonitoringDetail(
  client: SupabaseClient<Database>,
  userId: string,
  monitoringId: string,
): Promise<MonitoringDetail | null> {
  const result = await client
    .from("monitoring_results")
    .select("*")
    .eq("id", monitoringId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) throw new MonitoringHistoryInfrastructureError();
  if (!result.data) return null;
  const row = result.data;

  const [stock, status, quote, market] = await Promise.all([
    client.from("stocks").select("*").eq("id", row.stock_id).single(),
    client
      .from("status_definitions")
      .select("id,slug,label")
      .eq("id", row.status_definition_id)
      .eq("user_id", userId)
      .single(),
    client
      .from("market_quotes")
      .select("price,as_of")
      .eq("stock_id", row.stock_id)
      .maybeSingle(),
    client.from("markets").select("id,code"),
  ]);
  if (stock.error || status.error || quote.error || market.error)
    throw new MonitoringHistoryInfrastructureError();
  const marketCode =
    market.data.find((item) => item.id === stock.data.market_id)?.code ?? "—";

  return {
    id: row.id,
    analyzedAt: row.analyzed_at,
    ticker: stock.data.ticker,
    companyName: stock.data.name,
    marketCode,
    price: row.price === null ? null : String(row.price),
    currency: row.currency,
    statusSlug: status.data.slug,
    statusLabel: status.data.label,
    investmentScore: row.investment_score,
    decisionAction: row.decision_action,
    summary: row.summary,
    sourceType: row.source_type,
    priceAsOf: row.price_as_of,
    currentPrice: quote.data ? String(quote.data.price) : null,
    currentPriceAsOf: quote.data?.as_of ?? null,
    decisionReason: row.decision_reason,
    opportunityCategory: row.opportunity_category,
    analysisDate: row.analysis_date,
    sourceReference: row.source_reference,
    analysis: companySnapshot(row.analysis_details),
  };
}
