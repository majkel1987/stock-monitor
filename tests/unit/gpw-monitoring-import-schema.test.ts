import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  GPW_IMPORT_MAX_BYTES,
  parseGpwMonitoringImport,
  parseGpwMonitoringImportDraft,
} from "@/application/imports/gpw-monitoring-schema";

const fixture = (name: string) =>
  readFileSync(resolve(process.cwd(), "tests/fixtures/imports", name), "utf8");

function validPayload() {
  return JSON.parse(fixture("gpw-monitoring-valid.json"));
}

function expectInvalid(value: unknown, expectedPath: string) {
  const result = parseGpwMonitoringImport(JSON.stringify(value));
  expect(result.success).toBe(false);
  if (!result.success)
    expect(
      result.issues.some((issue) => issue.path.includes(expectedPath)),
    ).toBe(true);
}

describe("GPW opportunity monitoring schema 1.0", () => {
  it("accepts the canonical multi-company payload", () => {
    const result = parseGpwMonitoringImport(
      fixture("gpw-monitoring-valid.json"),
    );
    expect(result.success).toBe(true);
  });

  it("accepts the canonical empty export", () => {
    const result = parseGpwMonitoringImport(
      fixture("gpw-monitoring-empty.json"),
    );
    expect(result.success).toBe(true);
  });

  it("rejects invalid JSON and oversized payloads", () => {
    expect(parseGpwMonitoringImport("{")).toMatchObject({
      success: false,
      category: "invalid_json",
    });
    expect(
      parseGpwMonitoringImport(`{"pad":"${"x".repeat(GPW_IMPORT_MAX_BYTES)}"}`),
    ).toMatchObject({
      success: false,
      category: "payload_too_large",
    });
  });

  it("rejects unsupported version, export type and missing companies", () => {
    const version = validPayload();
    version.schemaVersion = "2.0";
    expectInvalid(version, "schemaVersion");
    const exportType = validPayload();
    exportType.exportType = "other";
    expectInvalid(exportType, "exportType");
    const missing = validPayload();
    delete missing.companies;
    expectInvalid(missing, "companies");
  });

  it("rejects invalid ticker, market, price, enums and dates", () => {
    const ticker = validPayload();
    ticker.companies[0].identity.ticker = "PKN.WA";
    expectInvalid(ticker, "ticker");
    const market = validPayload();
    market.companies[0].identity.market = "USA";
    expectInvalid(market, "market");
    const price = validPayload();
    price.companies[0].marketData.price = -1;
    expectInvalid(price, "price");
    const enumValue = validPayload();
    enumValue.companies[0].decision.action = "STRONG_BUY";
    expectInvalid(enumValue, "action");
    const date = validPayload();
    date.analysisDate = "2026-02-30";
    expectInvalid(date, "analysisDate");
  });

  it("rejects total and component score violations", () => {
    const totalLow = validPayload();
    totalLow.companies[0].score.total = -1;
    expectInvalid(totalLow, "total");
    const totalHigh = validPayload();
    totalHigh.companies[0].score.total = 101;
    expectInvalid(totalHigh, "total");
    const component = validPayload();
    component.companies[0].score.components.businessModelAndRecurringRevenue = 11;
    expectInvalid(component, "businessModelAndRecurringRevenue");
    const sum = validPayload();
    sum.companies[0].score.total = 83;
    expectInvalid(sum, "total");
  });

  it("rejects too many companies and excessive text", () => {
    const companies = validPayload();
    companies.companies = Array.from({ length: 51 }, (_, index) => ({
      ...companies.companies[0],
      externalId: `gpw-demo-${index}`,
      identity: { ...companies.companies[0].identity, ticker: `D${index}` },
    }));
    companies.scanSummary.companiesExported = 51;
    expectInvalid(companies, "companies");
    const text = validPayload();
    text.companies[0].decision.reason = "x".repeat(20_001);
    expectInvalid(text, "reason");
  });

  it("keeps a mixed batch and reports errors per company", () => {
    const result = parseGpwMonitoringImportDraft(
      fixture("gpw-monitoring-partial-errors.json"),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.companies[0]?.company).toBeNull();
    expect(
      result.data.companies[0]?.issues.some((issue) =>
        issue.path.includes("score.total"),
      ),
    ).toBe(true);
    expect(result.data.companies[1]?.company?.dataQuality.confidence).toBe(
      "LOW",
    );
  });
});
