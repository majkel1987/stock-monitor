import { describe, expect, it } from "vitest";

import { classifyMarketDataFreshness } from "@/domain/markets/freshness";

describe("market-aware quote freshness", () => {
  it("classifies a recent quote during an open GPW session as fresh", () => {
    expect(
      classifyMarketDataFreshness({
        market: "GPW",
        asOf: "2026-09-04T10:30:00Z",
        now: new Date("2026-09-04T11:20:00Z"),
      }),
    ).toBe("fresh");
  });

  it("classifies an older same-session quote as delayed", () => {
    expect(
      classifyMarketDataFreshness({
        market: "USA",
        asOf: "2026-09-04T14:00:00Z",
        now: new Date("2026-09-04T16:00:00Z"),
      }),
    ).toBe("delayed");
  });

  it("treats the latest Friday quote as closed during the weekend", () => {
    expect(
      classifyMarketDataFreshness({
        market: "GPW",
        asOf: "2026-09-04T14:55:00Z",
        now: new Date("2026-09-06T10:00:00Z"),
      }),
    ).toBe("closed");
  });

  it("treats the final same-day quote as closed after the regular session", () => {
    expect(
      classifyMarketDataFreshness({
        market: "USA",
        asOf: "2026-09-04T19:58:00Z",
        now: new Date("2026-09-04T21:00:00Z"),
      }),
    ).toBe("closed");
  });

  it("marks a multi-session-old weekend quote as stale", () => {
    expect(
      classifyMarketDataFreshness({
        market: "GPW",
        asOf: "2026-09-03T14:55:00Z",
        now: new Date("2026-09-06T10:00:00Z"),
      }),
    ).toBe("stale");
  });

  it("uses New York time during the US/Poland DST offset gap", () => {
    expect(
      classifyMarketDataFreshness({
        market: "USA",
        asOf: "2026-03-16T13:50:00Z",
        now: new Date("2026-03-16T14:15:00Z"),
      }),
    ).toBe("fresh");
  });

  it("reports missing or invalid timestamps as unknown", () => {
    expect(classifyMarketDataFreshness({ market: "USA", asOf: null })).toBe(
      "unknown",
    );
    expect(
      classifyMarketDataFreshness({ market: "USA", asOf: "not-a-date" }),
    ).toBe("unknown");
  });
});
