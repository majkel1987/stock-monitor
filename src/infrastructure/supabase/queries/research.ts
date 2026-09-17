import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MonitoringWriter } from "@/application/monitoring/types";
import type { GpwImportCompany } from "@/application/imports/gpw-monitoring-schema";
import type { NoteWriter } from "@/application/notes/types";
import type { PriceLevelWriter } from "@/application/price-levels/types";
import type {
  MonitoringHistoryItem,
  ResearchStatus,
  StockResearchDetail,
  StockResearchReader,
  ThesisSummary,
} from "@/application/stocks/research-types";
import { compareMonitoringScores } from "@/domain/monitoring/calculations";
import {
  calculatePriceLevelDistance,
  isPriceLevelReached,
} from "@/domain/price-levels/calculations";
import type {
  Database,
  Json,
} from "@/infrastructure/supabase/generated/database.types";

type Tables = Database["public"]["Tables"];
type MonitoringRow = Tables["monitoring_results"]["Row"];
type StatusRow = Tables["status_definitions"]["Row"];
type ThesisRow = Tables["investment_theses"]["Row"];

export class ResearchInfrastructureError extends Error {
  constructor(message = "Research data could not be processed.") {
    super(message);
    this.name = "ResearchInfrastructureError";
  }
}

function statusView(row: StatusRow): ResearchStatus {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    colorToken: row.color_token,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function stringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sourceType(value: string) {
  return value === "json_import" || value === "api_import" ? value : "manual";
}

function importedCompany(value: Json): GpwImportCompany | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return typeof value.externalId === "string" &&
    typeof value.identity === "object" &&
    value.identity !== null
    ? (value as GpwImportCompany)
    : null;
}

function thesisView(row: ThesisRow): ThesisSummary {
  return {
    id: row.id,
    monitoringResultId: row.monitoring_result_id,
    summary: row.summary,
    bullCase: row.bull_case,
    baseCase: row.base_case,
    bearCase: row.bear_case,
    catalysts: stringArray(row.catalysts),
    keyRisks: stringArray(row.key_risks),
    killCriteria: stringArray(row.kill_criteria),
    createdAt: row.created_at,
  };
}

function monitoringScores(row: MonitoringRow) {
  return {
    investment: row.investment_score,
    quality: row.quality_score,
    valuation: row.valuation_score,
    momentum: row.momentum_score,
    riskSafety: row.risk_score,
  };
}

function monitoringHistory(
  rows: MonitoringRow[],
  statuses: Map<string, ResearchStatus>,
) {
  const supersededIds = new Set(
    rows.flatMap((row) => (row.supersedes_id ? [row.supersedes_id] : [])),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));

  return rows.map((row, index): MonitoringHistoryItem => {
    const status = statuses.get(row.status_definition_id);
    if (!status) throw new ResearchInfrastructureError();
    const chronologicalPrevious = rows[index + 1] ?? null;
    const previous = row.supersedes_id
      ? (byId.get(row.supersedes_id) ?? chronologicalPrevious)
      : chronologicalPrevious;
    const previousStatus = previous
      ? statuses.get(previous.status_definition_id)
      : null;
    if (previous && !previousStatus) throw new ResearchInfrastructureError();

    return {
      id: row.id,
      analyzedAt: row.analyzed_at,
      createdAt: row.created_at,
      status,
      scores: monitoringScores(row),
      recommendation: row.recommendation,
      summary: row.summary,
      pros: stringArray(row.pros),
      risks: stringArray(row.risks),
      price: row.price === null ? null : String(row.price),
      currency: row.currency,
      priceAsOf: row.price_as_of,
      fxUsdPln: row.fx_usd_pln === null ? null : String(row.fx_usd_pln),
      pricePln: row.price_pln === null ? null : String(row.price_pln),
      sourceType: sourceType(row.source_type),
      sourceReference: row.source_reference,
      analysisDate: row.analysis_date,
      decisionAction: row.decision_action,
      decisionReason: row.decision_reason,
      opportunityCategory: row.opportunity_category,
      analysisDetails: importedCompany(row.analysis_details),
      baseFairValue:
        row.base_fair_value === null ? null : String(row.base_fair_value),
      entryZoneFrom:
        row.entry_zone_from === null ? null : String(row.entry_zone_from),
      entryZoneTo:
        row.entry_zone_to === null ? null : String(row.entry_zone_to),
      entryZoneCurrency: row.entry_zone_currency,
      baseTotalReturnPct:
        row.base_total_return_pct === null
          ? null
          : String(row.base_total_return_pct),
      baseAnnualizedReturnPct:
        row.base_annualized_return_pct === null
          ? null
          : String(row.base_annualized_return_pct),
      bearDownsidePct:
        row.bear_downside_pct === null ? null : String(row.bear_downside_pct),
      asymmetryRatio:
        row.asymmetry_ratio === null ? null : String(row.asymmetry_ratio),
      dataConfidence: row.data_confidence,
      nextReviewDate: row.next_review_date,
      nextExpectedReportDate: row.next_expected_report_date,
      supersedesId: row.supersedes_id,
      isSuperseded: supersededIds.has(row.id),
      comparison:
        previous && previousStatus
          ? {
              previousId: previous.id,
              previousStatus,
              priceDelta:
                row.price === null || previous.price === null
                  ? null
                  : Number(row.price) - Number(previous.price),
              scoreDeltas: compareMonitoringScores(
                monitoringScores(row),
                monitoringScores(previous),
              ),
            }
          : null,
    };
  });
}

export function createSupabaseStockResearchReader(
  client: SupabaseClient<Database>,
): StockResearchReader {
  return {
    async read(
      userId,
      marketCode,
      ticker,
    ): Promise<StockResearchDetail | null> {
      const marketResult = await client
        .from("markets")
        .select("*")
        .eq("code", marketCode)
        .maybeSingle();
      if (marketResult.error) throw new ResearchInfrastructureError();
      if (!marketResult.data) return null;

      const stockResult = await client
        .from("stocks")
        .select("*")
        .eq("market_id", marketResult.data.id)
        .eq("ticker", ticker)
        .maybeSingle();
      if (stockResult.error) throw new ResearchInfrastructureError();
      if (!stockResult.data) return null;

      const stock = stockResult.data;
      const watchlistResult = await client
        .from("watchlist_items")
        .select("*")
        .eq("user_id", userId)
        .eq("stock_id", stock.id)
        .maybeSingle();
      if (watchlistResult.error) throw new ResearchInfrastructureError();
      if (!watchlistResult.data) return null;

      const [
        statusesResult,
        quoteResult,
        levelsResult,
        monitoringResult,
        thesesResult,
        notesResult,
      ] = await Promise.all([
        client
          .from("status_definitions")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order"),
        client
          .from("market_quotes")
          .select("*")
          .eq("stock_id", stock.id)
          .maybeSingle(),
        client
          .from("price_levels")
          .select("*")
          .eq("user_id", userId)
          .eq("stock_id", stock.id)
          .eq("is_active", true)
          .order("priority", { ascending: true, nullsFirst: false })
          .order("sort_order")
          .order("created_at"),
        client
          .from("monitoring_results")
          .select("*")
          .eq("user_id", userId)
          .eq("stock_id", stock.id)
          .is("deleted_at", null)
          .order("analyzed_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
        client.from("investment_theses").select("*").eq("stock_id", stock.id),
        client
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .eq("stock_id", stock.id)
          .is("deleted_at", null)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (
        statusesResult.error ||
        quoteResult.error ||
        levelsResult.error ||
        monitoringResult.error ||
        thesesResult.error ||
        notesResult.error
      ) {
        throw new ResearchInfrastructureError();
      }

      const statusById = new Map(
        statusesResult.data.map((status) => [status.id, statusView(status)]),
      );
      const currentStatus = statusById.get(
        watchlistResult.data.current_status_id,
      );
      if (!currentStatus) throw new ResearchInfrastructureError();

      const history = monitoringHistory(monitoringResult.data, statusById);
      const activeHistory = history.filter(
        (monitoring) => !monitoring.isSuperseded,
      );
      const thesisByMonitoring = new Map(
        thesesResult.data.map((thesis) => [
          thesis.monitoring_result_id,
          thesisView(thesis),
        ]),
      );
      const latestThesis =
        activeHistory
          .map((monitoring) => thesisByMonitoring.get(monitoring.id) ?? null)
          .find((thesis): thesis is ThesisSummary => thesis !== null) ?? null;
      const quote = quoteResult.data;
      const comparablePrice =
        quote && quote.currency === stock.currency ? String(quote.price) : null;

      return {
        stock: {
          id: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          marketCode,
          marketName: marketResult.data.name,
          exchange: stock.exchange,
          currency: stock.currency,
          dataMode: stock.data_mode === "provider" ? "provider" : "manual",
        },
        watchlistItem: {
          id: watchlistResult.data.id,
          archivedAt: watchlistResult.data.archived_at,
        },
        currentStatus,
        availableStatuses: [...statusById.values()].filter(
          (status) => status.isActive,
        ),
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
              qualityStatus: "unknown",
            }
          : null,
        latestMonitoring: activeHistory[0] ?? null,
        latestThesis,
        priceLevels: levelsResult.data.map((level) => ({
          id: level.id,
          label: level.label,
          kind: level.kind as "buy" | "fair_value" | "sell" | "custom",
          value: String(level.value),
          currency: level.currency,
          triggerDirection: level.trigger_direction as "lte" | "gte",
          priority: level.priority,
          sortOrder: level.sort_order,
          isActive: level.is_active,
          validFrom: level.valid_from,
          validTo: level.valid_to,
          note: level.note,
          distancePct: calculatePriceLevelDistance(
            comparablePrice,
            String(level.value),
          ),
          reached: isPriceLevelReached(
            comparablePrice,
            String(level.value),
            level.trigger_direction as "lte" | "gte",
          ),
        })),
        monitoringHistory: history,
        notes: notesResult.data.map((note) => ({
          id: note.id,
          content: note.content,
          isPinned: note.is_pinned,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        })),
      };
    },
  };
}

export function createSupabasePriceLevelWriter(
  client: SupabaseClient<Database>,
): PriceLevelWriter {
  return {
    async create(userId, input) {
      const { data, error } = await client
        .from("price_levels")
        .insert({
          user_id: userId,
          stock_id: input.stockId,
          label: input.label,
          kind: input.kind,
          value: input.value,
          currency: input.currency,
          trigger_direction: input.triggerDirection,
          priority: input.priority,
          sort_order: input.sortOrder,
          note: input.note,
          valid_from: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
    async update(userId, levelId, input) {
      const { data, error } = await client
        .from("price_levels")
        .update({
          label: input.label,
          kind: input.kind,
          value: input.value,
          currency: input.currency,
          trigger_direction: input.triggerDirection,
          priority: input.priority,
          sort_order: input.sortOrder,
          note: input.note,
        })
        .eq("id", levelId)
        .eq("user_id", userId)
        .eq("stock_id", input.stockId)
        .eq("is_active", true)
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
    async deactivate(userId, levelId, stockId) {
      const { data, error } = await client
        .from("price_levels")
        .update({ is_active: false, valid_to: new Date().toISOString() })
        .eq("id", levelId)
        .eq("user_id", userId)
        .eq("stock_id", stockId)
        .eq("is_active", true)
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
  };
}

export function createSupabaseNoteWriter(
  client: SupabaseClient<Database>,
): NoteWriter {
  return {
    async create(userId, input) {
      const { data, error } = await client
        .from("notes")
        .insert({
          user_id: userId,
          stock_id: input.stockId,
          content: input.content,
        })
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
    async update(userId, noteId, input) {
      const { data, error } = await client
        .from("notes")
        .update({ content: input.content })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("stock_id", input.stockId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
    async togglePin(userId, noteId, stockId, isPinned) {
      const { data, error } = await client
        .from("notes")
        .update({ is_pinned: isPinned })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("stock_id", stockId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
    async archive(userId, noteId, stockId) {
      const { data, error } = await client
        .from("notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("stock_id", stockId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw new ResearchInfrastructureError();
      return data !== null;
    },
  };
}

function isMonitoringOutcome(
  value: string,
): value is Exclude<
  Awaited<ReturnType<MonitoringWriter["create"]>>,
  { status: "created" }
>["status"] {
  return [
    "invalid_stock",
    "invalid_status",
    "invalid_currency",
    "invalid_fx",
    "invalid_supersedes",
  ].includes(value);
}

export function createSupabaseMonitoringWriter(
  client: SupabaseClient<Database>,
): MonitoringWriter {
  return {
    async create(_userId, input) {
      const { data, error } = await client.rpc(
        "create_monitoring_with_thesis",
        {
          p_stock_id: input.stockId,
          p_status_definition_id: input.statusDefinitionId,
          p_analyzed_at: input.analyzedAt,
          p_investment_score: input.scores.investment,
          p_quality_score: input.scores.quality,
          p_valuation_score: input.scores.valuation,
          p_momentum_score: input.scores.momentum,
          p_risk_score: input.scores.riskSafety,
          p_recommendation: input.recommendation,
          p_summary: input.summary,
          p_pros: input.pros,
          p_risks: input.risks,
          p_price: input.price,
          p_currency: input.currency,
          p_price_as_of: input.priceAsOf,
          p_fx_usd_pln: input.fxUsdPln,
          p_source_reference: input.sourceReference,
          p_supersedes_id: input.supersedesId,
          p_thesis_summary: input.thesis.summary,
          p_bull_case: input.thesis.bullCase,
          p_base_case: input.thesis.baseCase,
          p_bear_case: input.thesis.bearCase,
          p_catalysts: input.thesis.catalysts,
          p_key_risks: input.thesis.keyRisks,
          p_kill_criteria: input.thesis.killCriteria,
        },
      );

      const result = data?.[0];
      if (error || !result) throw new ResearchInfrastructureError();
      if (result.outcome === "created" && result.monitoring_result_id) {
        return {
          status: "created",
          monitoringResultId: result.monitoring_result_id,
        };
      }
      if (isMonitoringOutcome(result.outcome))
        return { status: result.outcome };
      throw new ResearchInfrastructureError();
    },
  };
}
