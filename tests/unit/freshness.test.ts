import { describe, expect, it } from "vitest";

import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import { zonedSessionTimestamp } from "@/domain/markets/market-session";

describe("market-aware quote freshness", () => {
  it("converts the GPW close from Warsaw time across DST", () => {
    expect(
      zonedSessionTimestamp(
        "2026-09-10",
        17 * 60,
        "Europe/Warsaw",
      )?.toISOString(),
    ).toBe("2026-09-10T15:00:00.000Z");
    expect(
      zonedSessionTimestamp(
        "2026-12-10",
        17 * 60,
        "Europe/Warsaw",
      )?.toISOString(),
    ).toBe("2026-12-10T16:00:00.000Z");
  });
  it("classifies a recent quote during an open GPW session as fresh", () => {
    expect(
      classifyMarketDataFreshness({
        market: "GPW",
        asOf: "2026-09-04T10:30:00Z",
        now: new Date("2026-09-04T11:20:00Z"),
      }),
    ).toBe("fresh");
  });

  it("treats the last completed EOD session as current while the market is open", () => {
    expect(
      classifyMarketDataFreshness({
        market: "USA",
        asOf: "2026-09-03T04:00:00Z",
        now: new Date("2026-09-04T16:00:00Z"),
      }),
    ).toBe("fresh");
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
