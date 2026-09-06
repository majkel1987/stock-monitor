import { describe, expect, it } from "vitest";

import { createMonitoringSchema } from "@/application/monitoring/schemas";
import { createNoteSchema } from "@/application/notes/schemas";
import {
  calculatePricePln,
  compareMonitoringScores,
  isValidMonitoringScore,
  type MonitoringScores,
} from "@/domain/monitoring/calculations";
import {
  calculatePriceLevelDistance,
  isPriceLevelReached,
} from "@/domain/price-levels/calculations";

const monitoringInput = {
  stockId: "00000000-0000-4000-8000-000000000001",
  marketCode: "USA",
  ticker: "EME",
  statusDefinitionId: "00000000-0000-4000-8000-000000000002",
  analyzedAt: "2026-09-05T12:00:00.000Z",
  investmentScore: "0",
  qualityScore: "100",
  valuationScore: "",
  momentumScore: "50",
  riskScore: "75",
  recommendation: "Watch",
  summary: "Summary",
  pros: "Backlog; Execution",
  risks: "Labor pressure",
  price: "100",
  currency: "USD",
  priceAsOf: "2026-09-05T11:30:00.000Z",
  fxUsdPln: "4.00",
  sourceReference: "",
  supersedesId: "",
  thesisSummary: "Durable execution",
  bullCase: "Upside",
  baseCase: "Base",
  bearCase: "Downside",
  catalysts: "Awards",
  killCriteria: "Backlog declines",
};

describe("price level domain rules", () => {
  it("calculates signed distance from the current price", () => {
    expect(calculatePriceLevelDistance(475, 460)).toBeCloseTo(-3.15789, 5);
    expect(calculatePriceLevelDistance(475, 500)).toBeCloseTo(5.26315789, 7);
  });

  it("evaluates lte and gte triggers", () => {
    expect(isPriceLevelReached(475, 500, "lte")).toBe(true);
    expect(isPriceLevelReached(475, 460, "lte")).toBe(false);
    expect(isPriceLevelReached(475, 460, "gte")).toBe(true);
    expect(isPriceLevelReached(475, 500, "gte")).toBe(false);
  });

  it("does not invent distance or reached state without a quote", () => {
    expect(calculatePriceLevelDistance(null, 460)).toBeNull();
    expect(isPriceLevelReached(null, 460, "lte")).toBeNull();
  });
});

describe("monitoring domain rules", () => {
  it.each([
    [0, true],
    [100, true],
    [-1, false],
    [101, false],
    [null, true],
  ])("validates score %s", (score, expected) => {
    expect(isValidMonitoringScore(score)).toBe(expected);
  });

  it("calculates the historical PLN value with full JS precision", () => {
    expect(calculatePricePln(100, 4)).toBe(400);
    expect(calculatePricePln(100, null)).toBeNull();
  });

  it("compares scores without treating null as zero", () => {
    const previous: MonitoringScores = {
      investment: 70,
      quality: null,
      valuation: 0,
      momentum: 50,
      riskSafety: 75,
    };
    const current: MonitoringScores = {
      investment: 80,
      quality: 82,
      valuation: 0,
      momentum: null,
      riskSafety: 70,
    };

    expect(compareMonitoringScores(current, previous)).toEqual({
      investment: 10,
      quality: null,
      valuation: 0,
      momentum: null,
      riskSafety: -5,
    });
  });
});

describe("research boundary schemas", () => {
  it("accepts score zero and parses typed monitoring values", () => {
    const parsed = createMonitoringSchema.parse(monitoringInput);
    expect(parsed.investmentScore).toBe(0);
    expect(parsed.qualityScore).toBe(100);
    expect(parsed.valuationScore).toBeNull();
    expect(parsed.pros).toEqual(["Backlog", "Execution"]);
  });

  it("rejects scores outside 0..100 and PLN monitoring with USD FX", () => {
    expect(
      createMonitoringSchema.safeParse({ ...monitoringInput, riskScore: "101" })
        .success,
    ).toBe(false);
    expect(
      createMonitoringSchema.safeParse({
        ...monitoringInput,
        marketCode: "GPW",
        currency: "PLN",
      }).success,
    ).toBe(false);
  });

  it("accepts a 10,000-character note and rejects a longer note", () => {
    const stockId = "00000000-0000-4000-8000-000000000001";
    expect(
      createNoteSchema.safeParse({ stockId, content: "a".repeat(10_000) })
        .success,
    ).toBe(true);
    expect(
      createNoteSchema.safeParse({ stockId, content: "a".repeat(10_001) })
        .success,
    ).toBe(false);
  });
});
