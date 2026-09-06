import { describe, expect, it, vi } from "vitest";

import { addStockToWatchlist } from "@/application/watchlist/add-stock-to-watchlist";
import { getWatchlist } from "@/application/watchlist/get-watchlist";
import {
  addStockSchema,
  parseWatchlistQuery,
} from "@/application/watchlist/schemas";
import type {
  AddStockResult,
  WatchlistData,
  WatchlistReader,
  WatchlistWriter,
} from "@/application/watchlist/types";

function writerWith(result: AddStockResult): WatchlistWriter {
  return {
    addManualStock: vi.fn().mockResolvedValue(result),
    archive: vi.fn(),
    restore: vi.fn(),
  };
}

const input = {
  marketCode: "GPW" as const,
  ticker: " pzu ",
  name: " PZU S.A. ",
  initialStatusId: "11111111-1111-4111-8111-111111111111",
};

describe("Add Stock application use case", () => {
  it.each(["created", "restored", "already_active"] as const)(
    "returns the %s branch from the persistence boundary",
    async (status) => {
      const writer = writerWith({ status });
      await expect(
        addStockToWatchlist(writer, "owner-id", input),
      ).resolves.toEqual({ status });
      expect(writer.addManualStock).toHaveBeenCalledWith("owner-id", {
        ...input,
        ticker: "PZU",
        name: "PZU S.A.",
      });
    },
  );
});

describe("watchlist boundary schemas", () => {
  it("rejects a blank ticker", () => {
    expect(addStockSchema.safeParse({ ...input, ticker: " " }).success).toBe(
      false,
    );
  });

  it("rejects an unsupported market", () => {
    expect(
      addStockSchema.safeParse({ ...input, marketCode: "XYZ" }).success,
    ).toBe(false);
  });

  it("falls back safely for arbitrary sort and filter values", () => {
    expect(
      parseWatchlistQuery({
        market: "XYZ",
        sort: "ticker desc; drop table stocks",
        dir: "sideways",
        view: "deleted",
      }),
    ).toMatchObject({
      market: undefined,
      sort: "priority",
      direction: "asc",
      view: "active",
    });
  });
});

describe("watchlist query", () => {
  it("sorts real nullable fields with missing values last", async () => {
    const data: WatchlistData = {
      statuses: [],
      markets: [],
      summary: { active: 2, gpw: 1, usa: 1 },
      rows: [
        {
          watchlistItemId: "2",
          stockId: "2",
          ticker: "NONE",
          name: "No price",
          market: { code: "USA", name: "United States", currency: "USD" },
          currency: "USD",
          dataMode: "manual",
          status: {
            id: "2",
            slug: "WATCH",
            label: "Watch",
            colorToken: "info",
            dashboardGroup: "watch",
            sortOrder: 20,
            isActive: true,
          },
          price: null,
          lastMonitoring: null,
          displayOrder: null,
          archivedAt: null,
        },
        {
          watchlistItemId: "1",
          stockId: "1",
          ticker: "PZU",
          name: "PZU S.A.",
          market: {
            code: "GPW",
            name: "Warsaw Stock Exchange",
            currency: "PLN",
          },
          currency: "PLN",
          dataMode: "manual",
          status: {
            id: "1",
            slug: "BUY_CANDIDATE",
            label: "Buy Candidate",
            colorToken: "positive",
            dashboardGroup: "opportunity",
            sortOrder: 10,
            isActive: true,
          },
          price: {
            value: "50",
            dayChangePct: "1.5",
            asOf: "2026-09-05T10:00:00Z",
            provider: "manual",
            qualityStatus: "manual",
          },
          lastMonitoring: null,
          displayOrder: 1,
          archivedAt: null,
        },
      ],
    };
    const reader: WatchlistReader = { read: vi.fn().mockResolvedValue(data) };

    const result = await getWatchlist(reader, "owner", {
      sort: "price",
      dir: "desc",
    });

    expect(result.rows.map((row) => row.ticker)).toEqual(["PZU", "NONE"]);
  });
});
