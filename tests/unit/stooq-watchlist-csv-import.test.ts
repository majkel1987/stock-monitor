import { describe, expect, it, vi } from "vitest";
import { importStooqWatchlistCsv } from "@/application/sync/import-stooq-watchlist-csv";
import type { StooqCsvImportRepository } from "@/application/sync/import-stooq-csv";
import type { ProviderInstrument } from "@/application/sync/market-data-provider";
import { parseStooqBulkImport } from "@/infrastructure/market-data/stooq/stooq-csv-adapter";

const instruments: ProviderInstrument[] = ["PZU", "XTB", "PKO"].map(
  (ticker) => ({
    stockId: ticker,
    provider: "STOOQ",
    providerSymbol: ticker,
    market: "GPW",
    currency: "PLN",
  }),
);
const payload = `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>
PZU,D,20260909,000000,60,62,59,60.8,100,0
pzu,D,20260910,000000,61,63,60,61.75,120,0
XTB,D,20260910,000000,73,75,72,73.9,200,0
OTHER,D,20260910,000000,10,11,9,10.5,50,0`;

function setup() {
  const repository: StooqCsvImportRepository = {
    loadActiveGpwImportInstruments: vi.fn().mockResolvedValue(instruments),
    findActiveGpwInstrument: vi.fn(),
    startRun: vi.fn().mockResolvedValue("run"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    importPrices: vi
      .fn()
      .mockResolvedValue({ historyInsertedCount: 1, quoteUpdated: true }),
  };
  return {
    repository,
    parseFile: parseStooqBulkImport,
    userId: "owner",
    payload,
    fileName: "daily.csv",
    now: new Date("2026-09-11T18:00:00Z"),
  };
}

describe("Stooq watchlist CSV import", () => {
  it("updates all matching authorized stocks, skips missing tickers, and keeps histories separate", async () => {
    const input = setup();
    expect(await importStooqWatchlistCsv(input)).toEqual({
      status: "success",
      updatedCount: 2,
      unchangedCount: 0,
      missingCount: 1,
      failureCount: 0,
      historyInsertedCount: 2,
    });
    expect(
      input.repository.loadActiveGpwImportInstruments,
    ).toHaveBeenCalledWith("owner");
    expect(input.repository.importPrices).toHaveBeenCalledTimes(2);
    expect(input.repository.importPrices).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prices: [
          expect.objectContaining({ close: "60.8" }),
          expect.objectContaining({ close: "61.75" }),
        ],
        latestQuote: expect.objectContaining({
          stockId: "PZU",
          price: "61.75",
          previousClose: "60.8",
        }),
      }),
    );
    expect(input.repository.importPrices).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        latestQuote: expect.objectContaining({
          stockId: "XTB",
          price: "73.9",
          previousClose: null,
        }),
      }),
    );
    expect(input.repository.startRun).toHaveBeenCalledWith(
      expect.objectContaining({ requestedCount: 3 }),
    );
    expect(input.repository.finishRun).toHaveBeenCalledWith(
      "run",
      expect.objectContaining({
        status: "success",
        successCount: 2,
        metadata: expect.objectContaining({ missingCount: 1 }),
      }),
    );
  });

  it("counts unchanged quotes and imported history without reporting a quote update", async () => {
    const input = setup();
    vi.mocked(input.repository.importPrices).mockResolvedValue({
      historyInsertedCount: 0,
      quoteUpdated: false,
    });
    expect(await importStooqWatchlistCsv(input)).toMatchObject({
      status: "success",
      updatedCount: 0,
      unchangedCount: 2,
      historyInsertedCount: 0,
    });
  });

  it.each([
    "Date,Open,High,Low,Close,Volume\n2026-09-10,10,11,9,10,1",
    payload.replace("61.75", "N/D"),
  ])(
    "rejects unidentified or invalid data before writing any stock",
    async (payload) => {
      const input = { ...setup(), payload };
      expect(await importStooqWatchlistCsv(input)).toEqual({
        status: "invalid_csv",
      });
      expect(input.repository.importPrices).not.toHaveBeenCalled();
    },
  );

  it("reports no matching tickers without changing data", async () => {
    const input = {
      ...setup(),
      payload: payload.replace(/PZU|pzu|XTB/g, "OTHER"),
    };
    expect(await importStooqWatchlistCsv(input)).toMatchObject({
      status: "no_matches",
      missingCount: 3,
    });
    expect(input.repository.importPrices).not.toHaveBeenCalled();
  });

  it("rejects future sessions for individual stocks while importing valid stocks", async () => {
    const input = {
      ...setup(),
      payload: payload.replace("XTB,D,20260910", "XTB,D,20260912"),
    };
    expect(await importStooqWatchlistCsv(input)).toMatchObject({
      status: "partial",
      updatedCount: 1,
      failureCount: 1,
    });
    expect(input.repository.importPrices).toHaveBeenCalledOnce();
  });

  it("continues after a persistence failure and records partial success", async () => {
    const input = setup();
    vi.mocked(input.repository.importPrices).mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    expect(await importStooqWatchlistCsv(input)).toMatchObject({
      status: "partial",
      updatedCount: 1,
      failureCount: 1,
    });
    expect(input.repository.importPrices).toHaveBeenCalledTimes(2);
    expect(input.repository.finishRun).toHaveBeenCalledWith(
      "run",
      expect.objectContaining({ status: "partial", failureCount: 1 }),
    );
  });

  it("does not import when there are no authorized active GPW stocks", async () => {
    const input = setup();
    vi.mocked(
      input.repository.loadActiveGpwImportInstruments,
    ).mockResolvedValue([]);
    expect(await importStooqWatchlistCsv(input)).toEqual({
      status: "invalid_stock",
    });
    expect(input.repository.startRun).not.toHaveBeenCalled();
    expect(input.repository.importPrices).not.toHaveBeenCalled();
  });
});
