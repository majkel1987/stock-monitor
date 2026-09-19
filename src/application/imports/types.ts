import type {
  GpwImportCompany,
  JsonValue,
  ValidationIssue,
} from "./gpw-monitoring-schema";
import type { UsaImportCompany } from "./usa-monitoring-schema";

export type MonitoringImportCompany = GpwImportCompany | UsaImportCompany;

export type ImportItemState =
  "READY" | "WARNING" | "ERROR" | "ALREADY_IMPORTED" | "COMMITTED" | "EXCLUDED";

export type ImportCandidateInspection = {
  externalId: string;
  status: { id: string; isActive: boolean } | null;
  stock: {
    id: string;
    archivedAt: string | null;
    currentStatusSlug: string;
    currentPrice: number | null;
  } | null;
  existingMonitoringId: string | null;
};

export type ImportDraftItemInput = {
  externalId: string;
  ordinal: number;
  ticker: string | null;
  companyName: string | null;
  decisionAction: string | null;
  importedStatusSlug: string | null;
  existingStatusSlug: string | null;
  confidence: string | null;
  state: ImportItemState;
  includeInCommit: boolean;
  warningsAccepted: boolean;
  resolvedStockId: string | null;
  resolvedStatusId: string | null;
  currentPrice: number | null;
  warnings: string[];
  errors: ValidationIssue[];
  normalizedPayload: Record<string, JsonValue>;
};

export type CreateImportDraftInput = {
  externalId: string;
  generatedAt: string;
  analysisDate: string;
  fileName: string;
  rawPayload: Record<string, JsonValue>;
  rawSizeBytes: number;
  items: ImportDraftItemInput[];
};

export type ImportBatchSummary = {
  id: string;
  externalId: string;
  exportType: "gpw_opportunity_monitoring" | "usa_opportunity_monitoring";
  analysisDate: string;
  generatedAt: string;
  fileName: string;
  state: "draft" | "partially_committed" | "committed";
  createdAt: string;
  items: ImportReviewItem[];
};

export type ImportReviewItem = {
  id: string;
  externalId: string;
  ordinal: number;
  ticker: string | null;
  companyName: string | null;
  decisionAction: string | null;
  importedStatusSlug: string | null;
  existingStatusSlug: string | null;
  confidence: string | null;
  state: ImportItemState;
  includeInCommit: boolean;
  warningsAccepted: boolean;
  resolvedStockId: string | null;
  currentPrice: number | null;
  warnings: string[];
  errors: ValidationIssue[];
  company: MonitoringImportCompany | null;
  committedMonitoringResultId: string | null;
};

export interface MonitoringImportRepository {
  inspectCandidates(
    userId: string,
    candidates: Array<{
      externalId: string;
      ticker: string;
      statusSlug: string;
    }>,
  ): Promise<ImportCandidateInspection[]>;
  saveDraft(
    userId: string,
    input: CreateImportDraftInput,
  ): Promise<{
    outcome: "created" | "already_exists";
    batchId: string;
  }>;
  readBatch(
    userId: string,
    batchId: string,
  ): Promise<ImportBatchSummary | null>;
  updateReviewSelection(
    userId: string,
    itemId: string,
    input: { includeInCommit?: boolean; warningsAccepted?: boolean },
  ): Promise<boolean>;
  commitItem(
    userId: string,
    itemId: string,
    priceLevelActions: Array<{
      trancheNumber: number;
      action: "KEEP" | "ADD" | "SUPERSEDE";
    }>,
  ): Promise<{
    outcome:
      | "committed"
      | "already_imported"
      | "already_committed"
      | "invalid_item"
      | "invalid_status"
      | "not_committable";
    monitoringResultId: string | null;
    stockId: string | null;
  }>;
}
