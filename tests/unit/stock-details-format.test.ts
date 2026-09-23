import { describe, expect, it } from "vitest";

import {
  dataModeLabel,
  emptyValue,
  formatAsymmetry,
  formatDecision,
  formatEntryZone,
  formatMoney,
  formatNumber,
  formatPercentValue,
  quoteStatusPresentation,
  reachedLabel,
  signed,
  signedPercent,
} from "@/components/stocks/format";

describe("stock details format helpers", () => {
  it("formats money with the application currency suffix", () => {
    expect(formatMoney("275.12", "USD")).toBe("275.12 USD");
    expect(formatMoney(null, "PLN")).toBe(emptyValue);
  });

  it("keeps numeric precision from stored values", () => {
    expect(formatNumber("440")).toBe("440");
    expect(formatNumber("245.5")).toBe("245.5");
  });

  it("formats signed percent changes with a unicode minus", () => {
    expect(signedPercent(2.1)).toBe("+2.1%");
    expect(signed(-1.4)).toBe("−1.4");
    expect(signedPercent(0)).toBe("0.0%");
  });

  it("formats analysis KPIs without inventing missing values", () => {
    expect(formatDecision("BUY_GRADUALLY")).toBe("Buy Gradually");
    expect(formatEntryZone("245", "260", "USD", "USD")).toBe("245–260 USD");
    expect(formatEntryZone(null, null, null, "USD")).toBe(emptyValue);
    expect(formatPercentValue("65.74")).toBe("65.74%");
    expect(formatAsymmetry("6.21")).toBe("6.21×");
    expect(formatAsymmetry(null)).toBe(emptyValue);
  });

  it("treats a missing quote as a muted unavailable state", () => {
    const status = quoteStatusPresentation(null);
    expect(status.label).toBe("Unavailable");
    expect(status.tone).toBe("muted");
    expect(status.description).toMatch(/not available/i);
  });

  it("maps quote freshness without treating unavailable as a system error", () => {
    const status = quoteStatusPresentation({
      qualityStatus: "fresh",
      asOf: "2026-09-19T12:10:00.000Z",
      provider: "manual",
    });
    expect(status.label).toBe("Fresh");
    expect(status.tone).toBe("positive");
    expect(status.description).toMatch(/Manual/);
  });

  it("uses readable labels for data mode and reached state", () => {
    expect(dataModeLabel("manual")).toBe("Manual instrument");
    expect(reachedLabel(true)).toBe("Reached");
    expect(reachedLabel(false)).toBe("Not reached");
    expect(reachedLabel(null)).toBe(emptyValue);
  });
});
