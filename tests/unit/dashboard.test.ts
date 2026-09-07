import { describe, expect, it } from "vitest";

import {
  buildDashboardData,
  selectNearBuyLevel,
} from "@/application/dashboard/rules";
import type {
  DashboardMonitoringSource,
  DashboardSourceData,
  DashboardStatus,
  DashboardStockSource,
} from "@/application/dashboard/types";

const now = new Date("2026-09-06T12:00:00.000Z");

const opportunityStatus: DashboardStatus = {
  id: "opportunity",
  slug: "BUY_CANDIDATE",
  label: "Buy Candidate",
  colorToken: "accent",
  dashboardGroup: "opportunity",
  sortOrder: 0,
};

const watchStatus: DashboardStatus = {
  id: "watch",
  slug: "WATCH",
  label: "Watch",
  colorToken: "info",
  dashboardGroup: "watch",
  sortOrder: 10,
};

function monitoring(
  stockId: string,
  analyzedAt: string,
  investmentScore: number | null,
  id = `${stockId}-monitoring`,
): DashboardMonitoringSource {
  return {
    id,
    stockId,
    analyzedAt,
    createdAt: analyzedAt,
    status: opportunityStatus,
    previousStatus: null,
    investmentScore,
    previousInvestmentScore: null,
    recommendation: null,
    summary: null,
    price: "100",
    currency: "USD",
    stockRank: 1,
    recentRank: 1,
  };
}

function stock(
  id: string,
  options: Partial<DashboardStockSource> = {},
): DashboardStockSource {
  return {
    id,
    ticker: id.toUpperCase(),
    name: `${id} Inc.`,
    marketCode: "USA",
    currency: "USD",
    status: opportunityStatus,
    quote: {
      price: "100",
      currency: "USD",
      dayChangePct: null,
      asOf: "2026-09-06T11:30:00.000Z",
      provider: "manual",
      qualityStatus: "unknown",
    },
    latestMonitoring: monitoring(id, "2026-09-05T12:00:00.000Z", 80),
    buyLevels: [],
    ...options,
  };
}

function buyLevel(stockId: string, value: string) {
  return {
    id: `${stockId}-${value}`,
    stockId,
    label: "Buy",
    value,
    currency: "USD",
    triggerDirection: "lte" as const,
    priority: 1,
    sortOrder: 0,
    validFrom: null,
    validTo: null,
  };
}

function source(
  stocks: DashboardStockSource[],
  recentMonitoring: DashboardMonitoringSource[] = [],
): DashboardSourceData {
  return { stocks, recentMonitoring, lastSuccessfulSyncAt: null };
}

describe("dashboard opportunity ranking", () => {
  it("ranks opportunity statuses and reached levels before a closer not-reached row", () => {
    const reached = stock("reached", {
      latestMonitoring: monitoring("reached", "2026-09-01T12:00:00.000Z", 80),
      buyLevels: [buyLevel("reached", "102")],
    });
    const notReached = stock("not-reached", {
      latestMonitoring: monitoring(
        "not-reached",
        "2026-09-05T12:00:00.000Z",
        90,
      ),
      buyLevels: [buyLevel("not-reached", "95")],
    });
    const nonOpportunity = stock("watch", {
      status: watchStatus,
      buyLevels: [buyLevel("watch", "101")],
    });

    const data = buildDashboardData(
      source([nonOpportunity, notReached, reached]),
      now,
    );

    expect(data.opportunities.map((row) => row.stockId)).toEqual([
      "reached",
      "not-reached",
      "watch",
    ]);
  });

  it("keeps quote, level, score and monitoring nulls deterministic and last", () => {
    const complete = stock("complete", {
      buyLevels: [buyLevel("complete", "95")],
    });
    const empty = stock("empty", {
      quote: null,
      latestMonitoring: null,
      buyLevels: [],
    });

    const data = buildDashboardData(source([empty, complete]), now);

    expect(data.opportunities.map((row) => row.stockId)).toEqual([
      "complete",
      "empty",
    ]);
    expect(data.opportunities[1]).toMatchObject({
      quote: null,
      investmentScore: null,
      nearestBuyLevel: null,
      lastAnalysisAt: null,
    });
  });
});

describe("dashboard near buy zone", () => {
  it("includes 475 to 460 within 10 percent and excludes farther, reached and missing-price levels", () => {
    const included = stock("included", {
      quote: {
        price: "475",
        currency: "USD",
        dayChangePct: null,
        asOf: now.toISOString(),
        provider: "manual",
        qualityStatus: "unknown",
      },
      buyLevels: [buyLevel("included", "460")],
    });
    const far = stock("far", {
      quote: { ...included.quote!, price: "475" },
      buyLevels: [buyLevel("far", "400")],
    });
    const reached = stock("reached", {
      quote: { ...included.quote!, price: "475" },
      buyLevels: [buyLevel("reached", "500")],
    });
    const noPrice = stock("no-price", {
      quote: null,
      buyLevels: [buyLevel("no-price", "460")],
    });

    expect(selectNearBuyLevel(included, now)?.distancePct).toBeCloseTo(
      -3.15789,
      5,
    );
    const data = buildDashboardData(
      source([far, reached, noPrice, included]),
      now,
    );
    expect(data.nearBuyZone.map((row) => row.stockId)).toEqual(["included"]);
  });
});

describe("dashboard attention and monitoring aggregation", () => {
  it("combines no-monitoring, stale-monitoring, missing-price and explicit stale-price reasons", () => {
    const never = stock("never", { quote: null, latestMonitoring: null });
    const old = stock("old", {
      latestMonitoring: monitoring("old", "2026-08-06T11:59:59.000Z", 70),
    });
    const current = stock("current", {
      latestMonitoring: monitoring("current", "2026-08-27T12:00:00.000Z", 70),
    });
    const staleQuote = stock("stale-quote", {
      quote: {
        ...stock("base").quote!,
        asOf: "2026-09-03T19:00:00.000Z",
        qualityStatus: "stale",
      },
    });

    const data = buildDashboardData(
      source([current, staleQuote, old, never]),
      now,
    );

    expect(
      data.needsAttention.map((row) => [row.stockId, row.reasons]),
    ).toEqual([
      ["never", ["no_monitoring", "missing_price"]],
      ["old", ["stale_monitoring"]],
      ["stale-quote", ["stale_price"]],
    ]);
  });

  it("returns only the five latest decisions ordered by analyzed_at", () => {
    const stocks = Array.from({ length: 6 }, (_, index) => stock(`s${index}`));
    const recent = stocks.map((item, index) => ({
      ...monitoring(
        item.id,
        `2026-09-0${index + 1}T12:00:00.000Z`,
        70 + index,
        `monitoring-${index}`,
      ),
      recentRank: 6 - index,
    }));

    const data = buildDashboardData(source(stocks, recent), now);

    expect(data.recentMonitoring.map((row) => row.id)).toEqual([
      "monitoring-5",
      "monitoring-4",
      "monitoring-3",
      "monitoring-2",
      "monitoring-1",
    ]);
  });

  it("aggregates markets, status groups and only explicit stale quotes", () => {
    const gpw = stock("gpw", {
      marketCode: "GPW",
      currency: "PLN",
      status: watchStatus,
      quote: {
        price: "10",
        currency: "PLN",
        dayChangePct: null,
        asOf: "2026-09-03T16:00:00.000Z",
        provider: "manual",
        qualityStatus: "stale",
      },
    });
    const usa = stock("usa");

    const data = buildDashboardData(source([gpw, usa]), now);

    expect(data.marketOverview).toEqual({
      all: 2,
      opportunity: 1,
      watch: 1,
      research: 0,
      portfolio: 0,
      stale: 1,
      gpw: 1,
      usa: 1,
    });
  });
});
