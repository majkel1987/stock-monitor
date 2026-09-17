import {
  parseGpwMonitoringImportDraft,
  type ParsedDraftItem,
} from "./gpw-monitoring-schema";
import type {
  ImportCandidateInspection,
  ImportDraftItemInput,
  MonitoringImportRepository,
} from "./types";

export type CreateImportDraftResult =
  | { status: "created" | "already_exists"; batchId: string }
  | {
      status: "invalid_file";
      category: "payload_too_large" | "invalid_json" | "invalid_schema";
      issues: Array<{ path: string; message: string }>;
    };

function percentageDifference(importedPrice: number, currentPrice: number) {
  return Math.abs(importedPrice - currentPrice) / currentPrice;
}

function reviewItem(
  ordinal: number,
  parsed: ParsedDraftItem,
  inspection: ImportCandidateInspection | null,
): ImportDraftItemInput {
  const company = parsed.company;
  if (!company) {
    return {
      externalId: parsed.externalId,
      ordinal,
      ticker:
        typeof parsed.rawCompany.identity === "object" &&
        parsed.rawCompany.identity !== null &&
        !Array.isArray(parsed.rawCompany.identity)
          ? String(parsed.rawCompany.identity.ticker ?? "") || null
          : null,
      companyName: null,
      decisionAction: null,
      importedStatusSlug: null,
      existingStatusSlug: null,
      confidence: null,
      state: "ERROR",
      includeInCommit: false,
      warningsAccepted: false,
      resolvedStockId: null,
      resolvedStatusId: null,
      currentPrice: null,
      warnings: [],
      errors: parsed.issues,
      normalizedPayload: parsed.rawCompany,
    };
  }

  const warnings: string[] = [];
  const errors = [...parsed.issues];
  if (!inspection?.status) {
    errors.push({
      path: `$.companies[${ordinal}].classification.status`,
      message: "Status slug is not configured.",
    });
  } else if (!inspection.status.isActive) {
    errors.push({
      path: `$.companies[${ordinal}].classification.status`,
      message: "Status exists but is inactive.",
    });
  }
  if (company.dataQuality.confidence === "LOW")
    warnings.push("Data confidence is LOW.");
  if (company.dataQuality.missingCriticalData.length > 0)
    warnings.push("Critical data is missing.");
  if (company.dataQuality.conflictingData.length > 0)
    warnings.push("Conflicting source data was reported.");
  if (inspection?.stock?.archivedAt)
    warnings.push(
      "The existing stock is archived and will be restored on commit.",
    );
  if (
    inspection?.stock &&
    inspection.stock.currentStatusSlug !== company.classification.status
  ) {
    warnings.push(
      `Current status ${inspection.stock.currentStatusSlug} will change to ${company.classification.status}.`,
    );
  }
  if (
    company.marketData.price !== null &&
    inspection?.stock?.currentPrice !== null &&
    inspection?.stock?.currentPrice !== undefined &&
    percentageDifference(
      company.marketData.price,
      inspection.stock.currentPrice,
    ) >= 0.1
  ) {
    warnings.push(
      "Current market price differs from the analysis price by at least 10%.",
    );
  }

  const state = inspection?.existingMonitoringId
    ? "ALREADY_IMPORTED"
    : errors.length > 0
      ? "ERROR"
      : warnings.length > 0
        ? "WARNING"
        : "READY";

  return {
    externalId: company.externalId,
    ordinal,
    ticker: company.identity.ticker,
    companyName: company.identity.name,
    decisionAction: company.decision.action,
    importedStatusSlug: company.classification.status,
    existingStatusSlug: inspection?.stock?.currentStatusSlug ?? null,
    confidence: company.dataQuality.confidence,
    state,
    includeInCommit: state === "READY" || state === "WARNING",
    warningsAccepted: false,
    resolvedStockId: inspection?.stock?.id ?? null,
    resolvedStatusId: inspection?.status?.id ?? null,
    currentPrice: inspection?.stock?.currentPrice ?? null,
    warnings,
    errors,
    normalizedPayload: company,
  };
}

export async function createGpwMonitoringImportDraft({
  repository,
  userId,
  payload,
  fileName,
}: {
  repository: MonitoringImportRepository;
  userId: string;
  payload: string;
  fileName: string;
}): Promise<CreateImportDraftResult> {
  const parsed = parseGpwMonitoringImportDraft(payload);
  if (!parsed.success) {
    return {
      status: "invalid_file",
      category: parsed.category,
      issues: parsed.issues,
    };
  }

  const validCandidates = parsed.data.companies.flatMap((item) =>
    item.company
      ? [
          {
            externalId: item.company.externalId,
            ticker: item.company.identity.ticker,
            statusSlug: item.company.classification.status,
          },
        ]
      : [],
  );
  const inspections = await repository.inspectCandidates(
    userId,
    validCandidates,
  );
  const inspectionByExternalId = new Map(
    inspections.map((item) => [item.externalId, item]),
  );
  const items = parsed.data.companies.map((item, ordinal) =>
    reviewItem(
      ordinal,
      item,
      inspectionByExternalId.get(item.externalId) ?? null,
    ),
  );
  const saved = await repository.saveDraft(userId, {
    externalId: parsed.data.externalId,
    generatedAt: parsed.data.generatedAt,
    analysisDate: parsed.data.analysisDate,
    fileName: fileName.slice(0, 255),
    rawPayload: parsed.data.rawPayload,
    rawSizeBytes: Buffer.byteLength(payload, "utf8"),
    items,
  });
  return { status: saved.outcome, batchId: saved.batchId };
}
