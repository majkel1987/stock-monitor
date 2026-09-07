import { describe, expect, it, vi } from "vitest";

import type { MarketDataProvider } from "@/application/sync/market-data-provider";
import { syncMarketQuotes } from "@/application/sync/sync-market-quotes";
import type { MarketDataSyncRepository } from "@/application/sync/sync-types";

const instruments = [
  {
    stockId: "pzu",
    providerSymbol: "PZU.WAR",
    market: "GPW" as const,
    currency: "PLN" as const,
  },
  {
    stockId: "msft",
    providerSymbol: "MSFT.US",
    market: "USA" as const,
    currency: "USD" as const,
  },
];

function repository(
  overrides: Partial<MarketDataSyncRepository> = {},
): MarketDataSyncRepository {
  return {
    latestManualAttemptAt: vi.fn().mockResolvedValue(null),
    loadActiveInstruments: vi.fn().mockResolvedValue(instruments),
    startRun: vi.fn().mockResolvedValue("run-id"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    upsertQuote: vi.fn().mockResolvedValue(true),
    upsertFxRate: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function quote(stockId: string, currency: "PLN" | "USD") {
  return {
    stockId,
    price: "100",
    currency,
    previousClose: null,
    dayChangePct: null,
    volume: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: null,
    asOf: "2026-09-04T14:00:00.000Z",
    receivedAt: "2026-09-04T14:20:00.000Z",
    provider: "EODHD",
    delayMinutes: 20,
  };
}

describe("market quote synchronization", () => {
  it("persists valid symbols and records a partial result for a missing symbol", async () => {
    const repo = repository();
    const provider: MarketDataProvider = {
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("pzu", "PLN")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      provider,
      userId: "user-id",
      now: new Date("2026-09-04T14:20:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "partial",
      requestedCount: 2,
      successCount: 1,
      failureCount: 1,
    });
    expect(repo.upsertQuote).toHaveBeenCalledTimes(1);
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-id",
      expect.objectContaining({ status: "partial", failureCount: 1 }),
    );
  });

  it("does not erase or write quotes when the provider fails", async () => {
    const repo = repository();
    const provider: MarketDataProvider = {
      search: vi.fn(),
      getQuotes: vi.fn().mockRejectedValue({
        code: "provider_unavailable",
        message: "Provider request failed.",
      }),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      provider,
      userId: "user-id",
    });

    expect(result.status).toBe("failed");
    expect(repo.upsertQuote).not.toHaveBeenCalled();
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-id",
      expect.objectContaining({ status: "failed", failureCount: 2 }),
    );
  });

  it("enforces the manual cooldown before starting a provider request", async () => {
    const repo = repository({
      latestManualAttemptAt: vi
        .fn()
        .mockResolvedValue("2026-09-04T14:19:00.000Z"),
    });
    const provider: MarketDataProvider = {
      search: vi.fn(),
      getQuotes: vi.fn(),
    };

    const result = await syncMarketQuotes({
      repository: repo,
      provider,
      userId: "user-id",
      now: new Date("2026-09-04T14:20:00.000Z"),
    });

    expect(result.status).toBe("manual_cooldown");
    expect(repo.startRun).not.toHaveBeenCalled();
    expect(provider.getQuotes).not.toHaveBeenCalled();
  });

  it("rejects a provider currency mismatch for that instrument", async () => {
    const repo = repository({
      loadActiveInstruments: vi.fn().mockResolvedValue([instruments[1]]),
    });
    const provider: MarketDataProvider = {
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("msft", "PLN")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      provider,
      userId: "user-id",
    });

    expect(result).toMatchObject({ status: "failed", failureCount: 1 });
    expect(repo.upsertQuote).not.toHaveBeenCalled();
  });
});
