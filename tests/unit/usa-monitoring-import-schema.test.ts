import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { detectMonitoringImportKind } from "@/application/imports/detect-monitoring-import";
import {
  parseUsaMonitoringImport,
  parseUsaMonitoringImportDraft,
} from "@/application/imports/usa-monitoring-schema";

const fixture = () =>
  readFileSync(
    resolve(process.cwd(), "tests/fixtures/imports/usa-monitoring-valid.json"),
    "utf8",
  );

describe("USA opportunity monitoring schema 1.0", () => {
  it("detects and validates the USA report independently of its filename", () => {
    expect(detectMonitoringImportKind(fixture())).toBe("USA");
    expect(parseUsaMonitoringImport(fixture()).success).toBe(true);
  });

  it("keeps the existing GPW export type on the GPW path", () => {
    expect(
      detectMonitoringImportKind(
        JSON.stringify({ exportType: "gpw_opportunity_monitoring" }),
      ),
    ).toBe("GPW");
  });

  it("preserves all companies and the complete high-value analysis sections", () => {
    const result = parseUsaMonitoringImportDraft(fixture());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.companies).toHaveLength(3);
    const company = result.data.companies[0]?.company;
    expect(company?.identity).toMatchObject({
      ticker: "EME",
      name: "EMCOR Group, Inc.",
      exchange: "NYSE",
      currency: "USD",
      cik: "0000105634",
      isin: null,
    });
    expect(result.data.companies[1]?.company?.identity.exchange).toBe("NASDAQ");
    expect(company?.marketData.price).toBe(750.09);
    expect(company?.decision.action).toBe("WATCH");
    expect(company?.classification.status).toBe("WATCH");
    expect(company?.score.total).toBe(72);
    expect(company?.valuation.fairValueBase).toBe(985);
    expect(company?.valuation.entryZones).toMatchObject({
      highMarginOfSafety: { from: 500, to: 540, currency: "USD" },
    });
    expect(company?.scenarios.base).toMatchObject({ fairValue: 985 });
    expect(company?.expectedReturn.benchmarkComparison).toHaveLength(3);
    expect(company?.thesis.killCriteria[0]).toMatchObject({
      metricOrEvent: "RPO",
      reviewSource: "10-Q",
    });
    expect(company?.positionPlan.tranches[0]).toMatchObject({
      triggerPrice: 670,
      currency: "USD",
    });
    expect(company?.monitoringPlan.nextReviewDate).toBe("2026-11-01");
    expect(company?.sources?.[0]).toMatchObject({ type: "SEC_10_Q" });
    expect(company?.dilutionAndBuybacks).toMatchObject({
      netBuybackSpend: null,
    });
  });

  it("accepts nullable optional values without rejecting the batch", () => {
    const payload = JSON.parse(fixture());
    payload.companies[2].valuation.reverseDcf = null;
    payload.companies[2].marketData.source = null;
    payload.companies[2].thesis.summary = null;
    payload.companies[2].businessQuality = null;
    payload.companies[2].screeningAssessment = null;
    expect(parseUsaMonitoringImport(JSON.stringify(payload)).success).toBe(
      true,
    );
  });

  it("reports a readable path for missing minimum company identity", () => {
    const payload = JSON.parse(fixture());
    delete payload.companies[1].identity.ticker;
    const result = parseUsaMonitoringImport(JSON.stringify(payload));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "$.companies[1].identity.ticker" }),
      ]),
    );
  });

  it("keeps other companies reviewable when one analysis lacks commit data", () => {
    const payload = JSON.parse(fixture());
    delete payload.companies[1].classification;
    const result = parseUsaMonitoringImportDraft(JSON.stringify(payload));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.companies[0]?.company).not.toBeNull();
    expect(result.data.companies[1]?.company).toBeNull();
    expect(result.data.companies[2]?.company).not.toBeNull();
  });
});
