import { describe, expect, it } from "vitest";

import {
  formatDecision,
  formatHistoryDate,
  formatPrice,
  formatSourceLabel,
  groupByHistoryDate,
  statusColorTokenFromSlug,
} from "@/components/monitoring/format";
import type { MonitoringTimelineItem } from "@/application/monitoring/history-types";
import { createTranslator } from "@/i18n/translate";

const sample = (
  overrides: Partial<MonitoringTimelineItem>,
): MonitoringTimelineItem => ({
  id: "1",
  analyzedAt: "2026-09-19T10:00:00.000Z",
  ticker: "CDW",
  companyName: "CDW Corporation",
  marketCode: "USA",
  price: "146.19",
  currency: "USD",
  statusSlug: "BUY_CANDIDATE",
  statusLabel: "Buy Candidate",
  investmentScore: 75,
  decisionAction: "BUY_GRADUALLY",
  summary: "Example",
  sourceType: "json_import",
  ...overrides,
});

describe("monitoring format helpers", () => {
  it("formats decisions without underscores and without localization", () => {
    expect(formatDecision("BUY_GRADUALLY")).toBe("Buy Gradually");
    expect(formatDecision(null)).toBe("—");
  });

  it("maps source types to localized presentation labels", () => {
    const tEn = createTranslator("en");
    const tPl = createTranslator("pl");
    expect(formatSourceLabel("json_import", tEn)).toBe("JSON Import");
    expect(formatSourceLabel("manual", tEn)).toBe("Manual");
    expect(formatSourceLabel("json_import", tPl)).toBe("Import JSON");
    expect(formatSourceLabel("manual", tPl)).toBe("Ręczny");
    expect(formatSourceLabel("api_import", tPl)).toBe("Import API");
  });

  it("maps known status slugs to badge color tokens", () => {
    expect(statusColorTokenFromSlug("BUY_CANDIDATE")).toBe("positive");
    expect(statusColorTokenFromSlug("WAIT_FOR_CORRECTION")).toBe("warning");
    expect(statusColorTokenFromSlug("UNKNOWN")).toBe("accent");
  });

  it("formats history dates for the active locale without mutating the source", () => {
    const source = "2026-09-19T10:00:00.000Z";
    const en = formatHistoryDate(source, "en");
    const pl = formatHistoryDate(source, "pl");
    expect(en).toMatch(/19/);
    expect(en).toMatch(/2026/);
    expect(pl).toMatch(/19/);
    expect(pl).toMatch(/2026/);
    expect(en).not.toBe(en.toUpperCase());
    expect(source).toBe("2026-09-19T10:00:00.000Z");
  });

  it("localizes price separators without changing currency or numeric value", () => {
    expect(formatPrice("146.19", "USD", "en")).toBe("146.19 USD");
    expect(formatPrice("146.19", "USD", "pl")).toBe("146,19 USD");
    expect(formatPrice("148.4", "PLN", "pl")).toBe("148,40 PLN");
    expect(formatPrice(null, "USD", "pl")).toBe("—");
  });

  it("groups records by Warsaw calendar day while preserving order", () => {
    const groups = groupByHistoryDate(
      [
        sample({ id: "a", analyzedAt: "2026-09-19T18:00:00.000Z" }),
        sample({
          id: "b",
          ticker: "SYK",
          analyzedAt: "2026-09-19T08:00:00.000Z",
        }),
        sample({
          id: "c",
          ticker: "XTB",
          analyzedAt: "2026-09-17T12:00:00.000Z",
        }),
      ],
      "en",
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.records.map((row) => row.id)).toEqual(["a", "b"]);
    expect(groups[1]?.records.map((row) => row.id)).toEqual(["c"]);
  });
});
