import { describe, expect, it, vi } from "vitest";

import { runScheduledMarketSync } from "@/application/sync/run-scheduled-market-sync";
import type { MarketDataSyncRepository } from "@/application/sync/sync-types";

function repository(): MarketDataSyncRepository {
  return {
    latestManualAttemptAt: vi.fn().mockResolvedValue(null),
    latestFxEffectiveDate: vi.fn().mockResolvedValue("2026-09-07"),
    claimSyncLease: vi
      .fn()
      .mockResolvedValueOnce({
        runId: "run-a",
        userId: "user-id",
        acquired: true,
        reason: null,
      })
      .mockResolvedValueOnce({
        runId: "run-b",
        userId: null,
        acquired: false,
        reason: "skipped_locked",
      }),
    loadActiveInstruments: vi.fn().mockResolvedValue([
      {
        stockId: "pzu",
        provider: "STOOQ",
        providerSymbol: "PZU.WAR",
        market: "GPW",
        currency: "PLN",
      },
    ]),
    startRun: vi.fn().mockResolvedValue("quote-run"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    upsertQuote: vi.fn().mockResolvedValue(true),
    upsertFxRate: vi.fn().mockResolvedValue(true),
  };
}

describe("scheduled market synchronization", () => {
  it("leaves GPW for local CSV import instead of calling a provider", async () => {
    const repo = repository();
    vi.mocked(repo.latestFxEffectiveDate).mockResolvedValue("2026-09-07");
    const gpwProvider = {
      code: "STOOQ",
      displayName: "Stooq",
      search: vi.fn(),
      getQuotes: vi.fn(),
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await runScheduledMarketSync({
      repository: repo,
      marketDataProviders: { GPW: gpwProvider },
      fxRateProvider: { getUsdPln: vi.fn() },
      ownerEmail: "owner@example.test",
      now: new Date("2026-09-07T18:30:00.000Z"),
      deadlineAtMs: Date.now() + 60_000,
    });

    expect(result.status).toBe("not_due");
    expect(gpwProvider.getQuotes).not.toHaveBeenCalled();
    expect(repo.loadActiveInstruments).not.toHaveBeenCalled();
  });

  it("reports a real provider failure ahead of an unconfigured quote provider", async () => {
    const repo = repository();
    vi.mocked(repo.latestFxEffectiveDate).mockResolvedValue("2026-09-04");
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await runScheduledMarketSync({
      repository: repo,
      marketDataProviders: {},
      fxRateProvider: {
        getUsdPln: vi.fn().mockRejectedValue(new Error("NBP unavailable")),
      },
      ownerEmail: "owner@example.test",
      now: new Date("2026-09-07T18:30:00.000Z"),
      deadlineAtMs: Date.now() + 60_000,
    });

    expect(result.status).toBe("failed");
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-a",
      expect.objectContaining({
        status: "failed",
        errorSummary:
          "One or more scheduled synchronization operations failed.",
      }),
    );
  });

  it("does not call a provider for an overlapping run", async () => {
    const repo = repository();
    vi.mocked(repo.loadActiveInstruments).mockResolvedValue([
      {
        stockId: "msft",
        provider: "MASSIVE",
        providerSymbol: "MSFT",
        market: "USA",
        currency: "USD",
      },
    ]);
    let release: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = {
      code: "MASSIVE",
      displayName: "Massive",
      search: vi.fn(),
      getQuotes: vi.fn().mockImplementation(async () => {
        await waiting;
        return [
          {
            stockId: "msft",
            tradingDate: "2026-09-07",
            open: "99",
            high: "101",
            low: "98",
            price: "100",
            currency: "USD" as const,
            previousClose: null,
            dayChangePct: null,
            volume: null,
            fiftyTwoWeekHigh: null,
            fiftyTwoWeekLow: null,
            marketCap: null,
            asOf: "2026-09-07T14:00:00.000Z",
            receivedAt: "2026-09-07T14:10:00.000Z",
            provider: "Massive",
            delayMinutes: null,
          },
        ];
      }),
    };
    const input = {
      repository: repo,
      marketDataProviders: { USA: provider },
      fxRateProvider: { getUsdPln: vi.fn() },
      ownerEmail: "owner@example.test",
      now: new Date("2026-09-07T23:30:00.000Z"),
      deadlineAtMs: Date.now() + 60_000,
    };
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const runA = runScheduledMarketSync(input);
    await vi.waitFor(() => expect(provider.getQuotes).toHaveBeenCalledTimes(1));
    const runB = await runScheduledMarketSync(input);
    release?.();
    await runA;

    expect(runB.status).toBe("skipped_locked");
    expect(provider.getQuotes).toHaveBeenCalledTimes(1);
  });
});
