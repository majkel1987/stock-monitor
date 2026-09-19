import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ImportBatchSummary,
  ImportCandidateInspection,
  MonitoringImportCompany,
  ImportReviewItem,
  MonitoringImportRepository,
} from "@/application/imports/types";
import type {
  JsonValue,
  ValidationIssue,
} from "@/application/imports/gpw-monitoring-schema";

export class MonitoringImportInfrastructureError extends Error {
  constructor() {
    super("Monitoring import data could not be processed.");
    this.name = "MonitoringImportInfrastructureError";
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function validationIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item))
      return [];
    const record = item as Record<string, unknown>;
    return typeof record.path === "string" && typeof record.message === "string"
      ? [{ path: record.path, message: record.message }]
      : [];
  });
}

function importCompany(value: unknown): MonitoringImportCompany | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record = value as Record<string, unknown>;
  return typeof record.externalId === "string" &&
    typeof record.identity === "object"
    ? (record as unknown as MonitoringImportCompany)
    : null;
}

export function createSupabaseMonitoringImportRepository(
  client: SupabaseClient,
  marketCode: "GPW" | "USA" = "GPW",
): MonitoringImportRepository {
  return {
    async inspectCandidates(
      userId,
      candidates,
    ): Promise<ImportCandidateInspection[]> {
      if (candidates.length === 0) return [];
      const tickers = [...new Set(candidates.map((item) => item.ticker))];
      const statusSlugs = [
        ...new Set(candidates.map((item) => item.statusSlug)),
      ];
      const externalIds = [
        ...new Set(candidates.map((item) => item.externalId)),
      ];
      const [marketResult, statusesResult, existingResult] = await Promise.all([
        client.from("markets").select("id").eq("code", marketCode).single(),
        client
          .from("status_definitions")
          .select("id,slug,is_active")
          .eq("user_id", userId)
          .in("slug", statusSlugs),
        client
          .from("monitoring_results")
          .select("id,source_reference")
          .eq("user_id", userId)
          .eq("source_type", "json_import")
          .in("source_reference", externalIds),
      ]);
      if (marketResult.error || statusesResult.error || existingResult.error) {
        throw new MonitoringImportInfrastructureError();
      }

      const stocksResult = await client
        .from("stocks")
        .select("id,ticker")
        .eq("market_id", marketResult.data.id)
        .in("ticker", tickers);
      if (stocksResult.error) throw new MonitoringImportInfrastructureError();
      const stockIds = stocksResult.data.map((stock) => stock.id);
      const [watchlistResult, quotesResult] =
        stockIds.length === 0
          ? [
              { data: [], error: null },
              { data: [], error: null },
            ]
          : await Promise.all([
              client
                .from("watchlist_items")
                .select("stock_id,archived_at,current_status_id")
                .eq("user_id", userId)
                .in("stock_id", stockIds),
              client
                .from("market_quotes")
                .select("stock_id,price")
                .in("stock_id", stockIds),
            ]);
      if (watchlistResult.error || quotesResult.error)
        throw new MonitoringImportInfrastructureError();

      const currentStatusIds = watchlistResult.data.map(
        (item) => item.current_status_id,
      );
      const currentStatusesResult =
        currentStatusIds.length === 0
          ? { data: [], error: null }
          : await client
              .from("status_definitions")
              .select("id,slug")
              .eq("user_id", userId)
              .in("id", currentStatusIds);
      if (currentStatusesResult.error)
        throw new MonitoringImportInfrastructureError();

      const statusBySlug = new Map(
        statusesResult.data.map((status) => [status.slug, status]),
      );
      const statusSlugById = new Map(
        currentStatusesResult.data.map((status) => [status.id, status.slug]),
      );
      const stockByTicker = new Map(
        stocksResult.data.map((stock) => [String(stock.ticker), stock]),
      );
      const watchlistByStock = new Map(
        watchlistResult.data.map((item) => [item.stock_id, item]),
      );
      const quoteByStock = new Map(
        quotesResult.data.map((quote) => [quote.stock_id, Number(quote.price)]),
      );
      const monitoringByExternalId = new Map(
        existingResult.data.map((monitoring) => [
          monitoring.source_reference,
          monitoring.id,
        ]),
      );

      return candidates.map((candidate) => {
        const status = statusBySlug.get(candidate.statusSlug) ?? null;
        const stockRow = stockByTicker.get(candidate.ticker) ?? null;
        const watchlist = stockRow
          ? (watchlistByStock.get(stockRow.id) ?? null)
          : null;
        return {
          externalId: candidate.externalId,
          status: status ? { id: status.id, isActive: status.is_active } : null,
          stock: stockRow
            ? {
                id: stockRow.id,
                archivedAt: watchlist?.archived_at ?? null,
                currentStatusSlug: watchlist
                  ? (statusSlugById.get(watchlist.current_status_id) ??
                    "UNKNOWN")
                  : "NOT_ON_WATCHLIST",
                currentPrice: quoteByStock.get(stockRow.id) ?? null,
              }
            : null,
          existingMonitoringId:
            monitoringByExternalId.get(candidate.externalId) ?? null,
        };
      });
    },

    async saveDraft(_userId, input) {
      const args = {
        p_analysis_date: input.analysisDate,
        p_external_id: input.externalId,
        p_file_name: input.fileName,
        p_generated_at: input.generatedAt,
        p_items: input.items as unknown as JsonValue,
        p_raw_payload: input.rawPayload,
        p_raw_size_bytes: input.rawSizeBytes,
      };
      const { data, error } =
        marketCode === "USA"
          ? await client.rpc("create_usa_monitoring_import_draft", args)
          : await client.rpc("create_gpw_monitoring_import_draft", args);
      const row = data?.[0];
      if (
        error ||
        !row ||
        !["created", "already_exists"].includes(row.outcome)
      ) {
        throw new MonitoringImportInfrastructureError();
      }
      return {
        outcome: row.outcome as "created" | "already_exists",
        batchId: row.batch_id,
      };
    },

    async readBatch(userId, batchId): Promise<ImportBatchSummary | null> {
      const [batchResult, itemsResult] = await Promise.all([
        client
          .from("monitoring_import_batches")
          .select(
            "id,external_id,export_type,analysis_date,generated_at,file_name,state,created_at",
          )
          .eq("id", batchId)
          .eq("user_id", userId)
          .maybeSingle(),
        client
          .from("monitoring_import_items")
          .select("*")
          .eq("batch_id", batchId)
          .eq("user_id", userId)
          .order("ordinal"),
      ]);
      if (batchResult.error || itemsResult.error)
        throw new MonitoringImportInfrastructureError();
      if (!batchResult.data) return null;
      const items: ImportReviewItem[] = itemsResult.data.map((item) => ({
        id: item.id,
        externalId: item.external_id,
        ordinal: item.ordinal,
        ticker: item.ticker,
        companyName: item.company_name,
        decisionAction: item.decision_action,
        importedStatusSlug: item.imported_status_slug,
        existingStatusSlug: item.existing_status_slug,
        confidence: item.confidence,
        state: item.state as ImportReviewItem["state"],
        includeInCommit: item.include_in_commit,
        warningsAccepted: item.warnings_accepted,
        resolvedStockId: item.resolved_stock_id,
        currentPrice:
          item.current_price === null ? null : Number(item.current_price),
        warnings: stringArray(item.warnings),
        errors: validationIssues(item.errors),
        company: importCompany(item.normalized_payload),
        committedMonitoringResultId: item.committed_monitoring_result_id,
      }));
      return {
        id: batchResult.data.id,
        externalId: batchResult.data.external_id,
        exportType: batchResult.data
          .export_type as ImportBatchSummary["exportType"],
        analysisDate: batchResult.data.analysis_date,
        generatedAt: batchResult.data.generated_at,
        fileName: batchResult.data.file_name,
        state: batchResult.data.state as ImportBatchSummary["state"],
        createdAt: batchResult.data.created_at,
        items,
      };
    },

    async updateReviewSelection(userId, itemId, input) {
      const update: Record<string, boolean> = {};
      if (input.includeInCommit !== undefined)
        update.include_in_commit = input.includeInCommit;
      if (input.warningsAccepted !== undefined)
        update.warnings_accepted = input.warningsAccepted;
      if (Object.keys(update).length === 0) return false;
      const { data, error } = await client
        .from("monitoring_import_items")
        .update(update)
        .eq("id", itemId)
        .eq("user_id", userId)
        .in("state", ["READY", "WARNING"])
        .select("id")
        .maybeSingle();
      if (error) throw new MonitoringImportInfrastructureError();
      return data !== null;
    },

    async commitItem(_userId, itemId, priceLevelActions) {
      const args = {
        p_item_id: itemId,
        p_price_level_actions: priceLevelActions,
      };
      const { data, error } =
        marketCode === "USA"
          ? await client.rpc("commit_usa_monitoring_import_item", args)
          : await client.rpc("commit_gpw_monitoring_import_item", args);
      const row = data?.[0];
      const outcomes = [
        "committed",
        "already_imported",
        "already_committed",
        "invalid_item",
        "invalid_status",
        "not_committable",
      ] as const;
      if (error || !row || !outcomes.includes(row.outcome)) {
        throw new MonitoringImportInfrastructureError();
      }
      return {
        outcome: row.outcome,
        monitoringResultId: row.monitoring_result_id,
        stockId: row.stock_id,
      };
    },
  };
}
