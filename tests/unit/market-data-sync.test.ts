import { describe, expect, it, vi } from "vitest";

import type { MarketDataProvider } from "@/application/sync/market-data-provider";
import { syncMarketQuotes } from "@/application/sync/sync-market-quotes";
import type { MarketDataSyncRepository } from "@/application/sync/sync-types";
import { resolveMarketDataProviderSymbol } from "@/infrastructure/supabase/queries/market-data-sync";

const instruments = [
  {
    stockId: "pzu",
    provider: "STOOQ",
    providerSymbol: "PZU.WAR",
    market: "GPW" as const,
    currency: "PLN" as const,
  },
  {
    stockId: "msft",
    provider: "MASSIVE",
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
    latestFxEffectiveDate: vi.fn().mockResolvedValue("2026-09-04"),
    claimSyncLease: vi.fn().mockResolvedValue({
      runId: "lease-id",
      userId: "user-id",
      acquired: true,
      reason: null,
    }),
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
    tradingDate: "2026-09-04",
    open: "99",
    high: "101",
    low: "98",
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
    provider: currency === "PLN" ? "Stooq" : "Massive",
    delayMinutes: null,
  };
}

describe("market quote synchronization", () => {
  it("limits an initial synchronization to the newly added stock", async () => {
    const repo = repository();
    const provider: MarketDataProvider = {
      code: "MASSIVE",
      displayName: "Massive",
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("msft", "USD")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { USA: provider },
      userId: "user-id",
      trigger: "initial",
      markets: ["USA"],
      stockIds: ["msft"],
    });

    expect(provider.getQuotes).toHaveBeenCalledWith([instruments[1]]);
    expect(repo.startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: "market_quote_initial",
        requestedCount: 1,
      }),
    );
    expect(result).toMatchObject({
      status: "success",
      requestedCount: 1,
      successCount: 1,
    });
  });

  it("maps legacy EME.US to Massive EME without changing canonical identity", () => {
    const stock = { market: "USA" as const, ticker: "EME" };

    expect(
      resolveMarketDataProviderSymbol(stock.market, undefined, "EME.US"),
    ).toBe("EME");
    expect(stock).toEqual({ market: "USA", ticker: "EME" });
  });

  it("persists valid symbols and records a partial result for a missing symbol", async () => {
    const repo = repository();
    const provider: MarketDataProvider = {
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("pzu", "PLN")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
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
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi.fn().mockRejectedValue({
        code: "provider_unavailable",
        message: "Provider request failed.",
      }),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
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
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi.fn(),
    };

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
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
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("msft", "PLN")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
      userId: "user-id",
    });

    expect(result).toMatchObject({ status: "failed", failureCount: 1 });
    expect(repo.upsertQuote).not.toHaveBeenCalled();
  });

  it("treats older or equal provider quotes as idempotent skips", async () => {
    const repo = repository({
      upsertQuote: vi.fn().mockResolvedValue(false),
    });
    const provider: MarketDataProvider = {
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi
        .fn()
        .mockResolvedValue([quote("pzu", "PLN"), quote("msft", "USD")]),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
      userId: "user-id",
    });

    expect(result).toMatchObject({
      status: "success",
      requestedCount: 2,
      successCount: 0,
      failureCount: 0,
      skippedCount: 2,
    });
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-id",
      expect.objectContaining({ status: "success", failureCount: 0 }),
    );
  });

  it("stops before starting a provider batch after the soft deadline", async () => {
    const repo = repository();
    const provider: MarketDataProvider = {
      code: "TEST",
      displayName: "Test",
      search: vi.fn(),
      getQuotes: vi.fn(),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: provider, USA: provider },
      userId: "user-id",
      deadlineAtMs: 0,
    });

    expect(result).toMatchObject({
      status: "failed",
      requestedCount: 2,
      successCount: 0,
      failureCount: 2,
    });
    expect(provider.getQuotes).not.toHaveBeenCalled();
  });

  it("routes GPW to Stooq and USA to Massive while preserving partial success", async () => {
    const repo = repository();
    const stooq: MarketDataProvider = {
      code: "STOOQ",
      displayName: "Stooq",
      search: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([quote("pzu", "PLN")]),
    };
    const massive: MarketDataProvider = {
      code: "MASSIVE",
      displayName: "Massive",
      search: vi.fn(),
      getQuotes: vi.fn().mockRejectedValue({
        code: "provider_unavailable",
        message: "Massive unavailable.",
      }),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await syncMarketQuotes({
      repository: repo,
      providers: { GPW: stooq, USA: massive },
      userId: "user-id",
      now: new Date("2026-09-04T22:00:00.000Z"),
    });

    expect(stooq.getQuotes).toHaveBeenCalledWith([instruments[0]]);
    expect(massive.getQuotes).toHaveBeenCalledWith([instruments[1]]);
    expect(result).toMatchObject({
      status: "partial",
      successCount: 1,
      failureCount: 1,
    });
    expect(repo.upsertQuote).toHaveBeenCalledTimes(1);
  });
});
