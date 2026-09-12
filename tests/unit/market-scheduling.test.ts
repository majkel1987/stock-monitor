import { describe, expect, it } from "vitest";

import {
  scheduledWorkDue,
  shouldSyncMarket,
  shouldSyncUsdPln,
} from "@/domain/markets/scheduling";

describe("market synchronization scheduling", () => {
  it("does not request EOD data during live exchange sessions", () => {
    const transitionGap = new Date("2026-03-10T13:30:00.000Z");

    expect(shouldSyncMarket("USA", transitionGap)).toBe(false);
    expect(shouldSyncMarket("GPW", transitionGap)).toBe(false);
  });

  it("requests EOD data after a post-close publication buffer", () => {
    expect(shouldSyncMarket("GPW", new Date("2026-09-07T18:30:00Z"))).toBe(
      true,
    );
    expect(shouldSyncMarket("USA", new Date("2026-09-07T23:30:00Z"))).toBe(
      true,
    );
  });

  it("does not schedule exchange work during a weekend", () => {
    const saturday = new Date("2026-09-05T15:00:00.000Z");

    expect(shouldSyncMarket("GPW", saturday)).toBe(false);
    expect(shouldSyncMarket("USA", saturday)).toBe(false);
  });

  it("requests NBP once after noon Warsaw time until today's rate exists", () => {
    const now = new Date("2026-09-07T11:30:00.000Z");

    expect(shouldSyncUsdPln({ now, latestEffectiveDate: "2026-09-04" })).toBe(
      true,
    );
    expect(shouldSyncUsdPln({ now, latestEffectiveDate: "2026-09-07" })).toBe(
      false,
    );
  });

  it("returns no work outside all market and FX windows", () => {
    expect(
      scheduledWorkDue({
        now: new Date("2026-09-07T03:00:00.000Z"),
        latestFxEffectiveDate: "2026-09-07",
      }),
    ).toEqual({ markets: [], fx: false });
  });
});
