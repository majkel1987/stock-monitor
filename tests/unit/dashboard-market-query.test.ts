import { describe, expect, it } from "vitest";

import {
  parseDashboardMarket,
  resolveDashboardMarketFilter,
} from "@/application/dashboard/market-query";

describe("dashboard market query", () => {
  it("accepts only existing market codes", () => {
    expect(parseDashboardMarket("gpw")).toBe("GPW");
    expect(parseDashboardMarket(["USA"])).toBe("USA");
    expect(parseDashboardMarket("ALL")).toBeUndefined();
    expect(parseDashboardMarket("nasdaq")).toBeUndefined();
  });

  it("defaults the UI filter to all markets", () => {
    expect(resolveDashboardMarketFilter(undefined)).toBe("ALL");
    expect(resolveDashboardMarketFilter("usa")).toBe("USA");
  });
});
