import { describe, expect, it } from "vitest";

import {
  scheduledWorkDue,
  shouldSyncMarket,
  shouldSyncUsdPln,
} from "@/domain/markets/scheduling";

describe("market synchronization scheduling", () => {
  it("uses each exchange timezone during the US/Poland DST transition gap", () => {
    const transitionGap = new Date("2026-03-10T13:30:00.000Z");

    expect(shouldSyncMarket("USA", transitionGap)).toBe(true);
    expect(shouldSyncMarket("GPW", transitionGap)).toBe(true);
  });

  it("does not schedule exchange work during a weekend", () => {
    const saturday = new Date("2026-09-05T15:00:00.000Z");

    expect(shouldSyncMarket("GPW", saturday)).toBe(false);
    expect(shouldSyncMarket("USA", saturday)).toBe(false);
  });

  it("requests NBP once after noon Warsaw time until today's rate exists", () => {
    const now = new Date("2026-09-07T10:30:00.000Z");

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
