import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createUsaMonitoringImportDraft } from "@/application/imports/create-usa-import-draft";
import type {
  CreateImportDraftInput,
  ImportBatchSummary,
  ImportCandidateInspection,
  MonitoringImportRepository,
} from "@/application/imports/types";

const payload = () =>
  readFileSync(
    resolve(process.cwd(), "tests/fixtures/imports/usa-monitoring-valid.json"),
    "utf8",
  );

function repositoryWith(inspections: ImportCandidateInspection[]) {
  let saved: CreateImportDraftInput | null = null;
  const repository: MonitoringImportRepository = {
    async inspectCandidates() {
      return inspections;
    },
    async saveDraft(_userId, input) {
      saved = input;
      return { outcome: "created", batchId: "usa-batch-id" };
    },
    async readBatch(): Promise<ImportBatchSummary | null> {
      return null;
    },
    async updateReviewSelection() {
      return false;
    },
    async commitItem() {
      return {
        outcome: "committed",
        monitoringResultId: "monitoring-id",
        stockId: "stock-id",
      };
    },
  };
  return { repository, saved: () => saved };
}

describe("USA monitoring import draft", () => {
  it("imports every company and maps USA candidates without changing currencies", async () => {
    const report = JSON.parse(payload());
    const setup = repositoryWith(
      report.companies.map(
        (company: { externalId: string }, index: number) => ({
          externalId: company.externalId,
          status: { id: `status-${index}`, isActive: true },
          stock: null,
          existingMonitoringId: null,
        }),
      ),
    );
    await expect(
      createUsaMonitoringImportDraft({
        repository: setup.repository,
        userId: "user-id",
        payload: JSON.stringify(report),
        fileName: "anything.json",
      }),
    ).resolves.toEqual({ status: "created", batchId: "usa-batch-id" });
    expect(setup.saved()?.items).toHaveLength(3);
    expect(setup.saved()?.items.map((item) => item.ticker)).toEqual([
      "EME",
      "CDW",
      "SYK",
    ]);
    expect(
      setup.saved()?.items.every((item) => {
        const marketData = item.normalizedPayload.marketData;
        return (
          typeof marketData === "object" &&
          marketData !== null &&
          !Array.isArray(marketData) &&
          marketData.currency === "USD"
        );
      }),
    ).toBe(true);
  });

  it("marks a repeated company externalId as already imported", async () => {
    const report = JSON.parse(payload());
    const setup = repositoryWith(
      report.companies.map(
        (company: { externalId: string }, index: number) => ({
          externalId: company.externalId,
          status: { id: `status-${index}`, isActive: true },
          stock: null,
          existingMonitoringId: index === 0 ? "existing-monitoring" : null,
        }),
      ),
    );
    await createUsaMonitoringImportDraft({
      repository: setup.repository,
      userId: "user-id",
      payload: JSON.stringify(report),
      fileName: "usa.json",
    });
    expect(setup.saved()?.items[0]?.state).toBe("ALREADY_IMPORTED");
  });

  it("returns the existing batch when the same report is uploaded again", async () => {
    const report = JSON.parse(payload());
    const setup = repositoryWith(
      report.companies.map(
        (company: { externalId: string }, index: number) => ({
          externalId: company.externalId,
          status: { id: `status-${index}`, isActive: true },
          stock: null,
          existingMonitoringId: null,
        }),
      ),
    );
    setup.repository.saveDraft = async () => ({
      outcome: "already_exists",
      batchId: "existing-usa-batch",
    });
    await expect(
      createUsaMonitoringImportDraft({
        repository: setup.repository,
        userId: "user-id",
        payload: JSON.stringify(report),
        fileName: "same-report.json",
      }),
    ).resolves.toEqual({
      status: "already_exists",
      batchId: "existing-usa-batch",
    });
  });

  it("allows a later analysis of the same ticker with a new externalId", async () => {
    const report = JSON.parse(payload());
    report.externalId = "usa-monitoring-2026-12-19";
    report.analysisDate = "2026-12-19";
    report.companies[0].externalId = "usa-EME-2026-12-19";
    const setup = repositoryWith(
      report.companies.map(
        (company: { externalId: string }, index: number) => ({
          externalId: company.externalId,
          status: { id: `status-${index}`, isActive: true },
          stock:
            index === 0
              ? {
                  id: "existing-eme-stock",
                  archivedAt: null,
                  currentStatusSlug: "WATCH",
                  currentPrice: 750.09,
                }
              : null,
          existingMonitoringId: null,
        }),
      ),
    );
    await createUsaMonitoringImportDraft({
      repository: setup.repository,
      userId: "user-id",
      payload: JSON.stringify(report),
      fileName: "later.json",
    });
    expect(setup.saved()?.items[0]).toMatchObject({
      externalId: "usa-EME-2026-12-19",
      resolvedStockId: "existing-eme-stock",
      state: "READY",
    });
  });
});
