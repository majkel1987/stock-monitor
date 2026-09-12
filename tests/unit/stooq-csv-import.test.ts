import { describe, expect, it, vi } from "vitest";

import {
  importStooqCsv,
  type StooqCsvImportRepository,
} from "@/application/sync/import-stooq-csv";
import { parseStooqCsvQuote } from "@/infrastructure/market-data/stooq/stooq-csv-adapter";

const csv = `Date,Open,High,Low,Close,Volume
2026-09-09,60.10,61.20,59.80,60.80,1000000
2026-09-10,60.90,62.00,60.50,61.75,1200000`;

function repository(
  overrides: Partial<StooqCsvImportRepository> = {},
): StooqCsvImportRepository {
  return {
    findActiveGpwInstrument: vi.fn().mockResolvedValue({
      stockId: "11111111-1111-4111-8111-111111111111",
      provider: "STOOQ",
      providerSymbol: "PZU",
      market: "GPW",
      currency: "PLN",
    }),
    startRun: vi.fn().mockResolvedValue("run-id"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    upsertQuote: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const input = {
  userId: "22222222-2222-4222-8222-222222222222",
  stockId: "11111111-1111-4111-8111-111111111111",
  payload: csv,
  fileName: "pzu.csv",
  now: new Date("2026-09-11T18:30:00.000Z"),
};

describe("Stooq CSV import", () => {
  it("authorizes the active GPW stock and persists the normalized quote", async () => {
    const repo = repository();

    await expect(
      importStooqCsv({
        ...input,
        repository: repo,
        parseQuote: parseStooqCsvQuote,
      }),
    ).resolves.toEqual({ status: "saved", tradingDate: "2026-09-10" });

    expect(repo.findActiveGpwInstrument).toHaveBeenCalledWith(
      input.userId,
      input.stockId,
    );
    expect(repo.upsertQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        stockId: input.stockId,
        price: "61.75",
        provider: "Stooq",
      }),
      "stale",
    );
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-id",
      expect.objectContaining({ status: "success", successCount: 1 }),
    );
  });

  it("rejects a stock outside the user's active GPW watchlist", async () => {
    const repo = repository({
      findActiveGpwInstrument: vi.fn().mockResolvedValue(null),
    });

    await expect(
      importStooqCsv({
        ...input,
        repository: repo,
        parseQuote: parseStooqCsvQuote,
      }),
    ).resolves.toEqual({ status: "invalid_stock" });
    expect(repo.startRun).not.toHaveBeenCalled();
    expect(repo.upsertQuote).not.toHaveBeenCalled();
  });

  it("records invalid CSV without writing a quote", async () => {
    const repo = repository();

    await expect(
      importStooqCsv({
        ...input,
        payload: "Date,Close\n2026-09-10,61.75",
        repository: repo,
        parseQuote: parseStooqCsvQuote,
      }),
    ).resolves.toEqual({ status: "invalid_csv" });
    expect(repo.upsertQuote).not.toHaveBeenCalled();
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-id",
      expect.objectContaining({ status: "failed", failureCount: 1 }),
    );
  });

  it("rejects an EOD row whose session close is still in the future", async () => {
    const repo = repository();

    await expect(
      importStooqCsv({
        ...input,
        payload:
          "Date,Open,High,Low,Close,Volume\n2026-09-11,61,62,60,61.5,100",
        now: new Date("2026-09-11T12:00:00.000Z"),
        repository: repo,
        parseQuote: parseStooqCsvQuote,
      }),
    ).resolves.toEqual({ status: "future_quote", tradingDate: "2026-09-11" });
    expect(repo.upsertQuote).not.toHaveBeenCalled();
  });
});
