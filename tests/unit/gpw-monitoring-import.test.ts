import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createGpwMonitoringImportDraft } from "@/application/imports/create-import-draft";
import { commitSelectedImportItems } from "@/application/imports/commit-import";
import type { GpwImportCompany } from "@/application/imports/gpw-monitoring-schema";
import type {
  CreateImportDraftInput,
  ImportBatchSummary,
  ImportCandidateInspection,
  MonitoringImportRepository,
} from "@/application/imports/types";

const fixture = (name: string) =>
  readFileSync(resolve(process.cwd(), "tests/fixtures/imports", name), "utf8");

function repositoryWith(inspections: ImportCandidateInspection[]) {
  let saved: CreateImportDraftInput | null = null;
  const repository: MonitoringImportRepository = {
    async inspectCandidates() {
      return inspections;
    },
    async saveDraft(_userId, input) {
      saved = input;
      return { outcome: "created", batchId: "batch-id" };
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

describe("GPW monitoring import draft", () => {
  it("creates READY items for new stocks with active statuses", async () => {
    const payload = JSON.parse(fixture("gpw-monitoring-valid.json"));
    const inspections = payload.companies.map(
      (
        company: { externalId: string; classification: { status: string } },
        index: number,
      ) => ({
        externalId: company.externalId,
        status: { id: `status-${index}`, isActive: true },
        stock: null,
        existingMonitoringId: null,
      }),
    );
    const setup = repositoryWith(inspections);
    await expect(
      createGpwMonitoringImportDraft({
        repository: setup.repository,
        userId: "user-id",
        payload: JSON.stringify(payload),
        fileName: "scan.json",
      }),
    ).resolves.toEqual({ status: "created", batchId: "batch-id" });
    expect(setup.saved()?.items.every((item) => item.state === "READY")).toBe(
      true,
    );
  });

  it("marks archived, changed-price and LOW-confidence rows as warnings", async () => {
    const payload = JSON.parse(fixture("gpw-monitoring-valid.json"));
    payload.companies[0].dataQuality.confidence = "LOW";
    const company = payload.companies[0];
    const setup = repositoryWith([
      {
        externalId: company.externalId,
        status: { id: "status-id", isActive: true },
        stock: {
          id: "stock-id",
          archivedAt: "2026-09-01T00:00:00Z",
          currentStatusSlug: "WATCH",
          currentPrice: company.marketData.price * 1.25,
        },
        existingMonitoringId: null,
      },
      ...payload.companies
        .slice(1)
        .map((item: { externalId: string }, index: number) => ({
          externalId: item.externalId,
          status: { id: `status-${index}`, isActive: true },
          stock: null,
          existingMonitoringId: null,
        })),
    ]);
    await createGpwMonitoringImportDraft({
      repository: setup.repository,
      userId: "user-id",
      payload: JSON.stringify(payload),
      fileName: "scan.json",
    });
    const item = setup.saved()?.items[0];
    expect(item?.state).toBe("WARNING");
    expect(item?.warnings).toEqual(
      expect.arrayContaining([
        "Data confidence is LOW.",
        "The existing stock is archived and will be restored on commit.",
        "Current market price differs from the analysis price by at least 10%.",
      ]),
    );
  });

  it("marks duplicate monitoring and inactive or unknown statuses", async () => {
    const payload = JSON.parse(fixture("gpw-monitoring-valid.json"));
    const setup = repositoryWith([
      {
        externalId: payload.companies[0].externalId,
        status: { id: "status-1", isActive: true },
        stock: null,
        existingMonitoringId: "monitoring-id",
      },
      {
        externalId: payload.companies[1].externalId,
        status: { id: "status-2", isActive: false },
        stock: null,
        existingMonitoringId: null,
      },
      {
        externalId: payload.companies[2].externalId,
        status: null,
        stock: null,
        existingMonitoringId: null,
      },
    ]);
    await createGpwMonitoringImportDraft({
      repository: setup.repository,
      userId: "user-id",
      payload: JSON.stringify(payload),
      fileName: "scan.json",
    });
    expect(setup.saved()?.items.map((item) => item.state)).toEqual([
      "ALREADY_IMPORTED",
      "ERROR",
      "ERROR",
    ]);
  });

  it("keeps valid rows when another company has schema errors", async () => {
    const payload = JSON.parse(fixture("gpw-monitoring-partial-errors.json"));
    const inspections = payload.companies
      .slice(1)
      .map((company: { externalId: string }, index: number) => ({
        externalId: company.externalId,
        status: { id: `status-${index}`, isActive: true },
        stock: null,
        existingMonitoringId: null,
      }));
    const setup = repositoryWith(inspections);
    await createGpwMonitoringImportDraft({
      repository: setup.repository,
      userId: "user-id",
      payload: JSON.stringify(payload),
      fileName: "partial.json",
    });
    expect(setup.saved()?.items[0]?.state).toBe("ERROR");
    expect(setup.saved()?.items[1]?.state).toBe("WARNING");
    expect(setup.saved()?.items[2]?.state).toBe("READY");
  });
});

describe("GPW monitoring selective commit", () => {
  it("passes reviewed tranche actions to the atomic item commit", async () => {
    const company = JSON.parse(fixture("gpw-monitoring-valid.json"))
      .companies[0] as GpwImportCompany;
    const committed: unknown[] = [];
    const repository: MonitoringImportRepository = {
      async inspectCandidates() {
        return [];
      },
      async saveDraft() {
        return { outcome: "created", batchId: "batch-id" };
      },
      async readBatch() {
        return {
          id: "batch-id",
          externalId: "batch-external-id",
          exportType: "gpw_opportunity_monitoring",
          analysisDate: "2026-09-16",
          generatedAt: "2026-09-16T18:00:00Z",
          fileName: "scan.json",
          state: "draft",
          createdAt: "2026-09-16T18:00:00Z",
          items: [
            {
              id: "item-id",
              externalId: company.externalId,
              ordinal: 0,
              ticker: company.identity.ticker,
              companyName: company.identity.name,
              decisionAction: company.decision.action,
              importedStatusSlug: company.classification.status,
              existingStatusSlug: null,
              confidence: company.dataQuality.confidence,
              state: "READY",
              includeInCommit: true,
              warningsAccepted: false,
              resolvedStockId: null,
              currentPrice: null,
              warnings: [],
              errors: [],
              company,
              committedMonitoringResultId: null,
            },
          ],
        };
      },
      async updateReviewSelection() {
        return true;
      },
      async commitItem(_userId, _itemId, actions) {
        committed.push(actions);
        return {
          outcome: "committed",
          monitoringResultId: "monitoring-id",
          stockId: "stock-id",
        };
      },
    };

    await commitSelectedImportItems({
      repository,
      userId: "user-id",
      batchId: "batch-id",
      priceLevelActionsByItem: {
        "item-id": [
          { trancheNumber: 1, action: "ADD" },
          { trancheNumber: 2, action: "SUPERSEDE" },
        ],
      },
    });

    expect(committed).toEqual([
      [
        { trancheNumber: 1, action: "ADD" },
        { trancheNumber: 2, action: "SUPERSEDE" },
      ],
    ]);
  });
});
