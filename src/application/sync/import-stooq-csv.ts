import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type {
  NormalizedQuote,
  ProviderInstrument,
} from "./market-data-provider";
import type { MarketDataSyncRepository } from "./sync-types";

export interface StooqCsvImportRepository extends Pick<
  MarketDataSyncRepository,
  "startRun" | "finishRun"
> {
  findActiveGpwInstrument(
    userId: string,
    stockId: string,
  ): Promise<ProviderInstrument | null>;
  importPrices(input: StooqCsvPersistenceInput): Promise<{
    historyInsertedCount: number;
    quoteUpdated: boolean;
  }>;
}

export type StooqCsvImportResult = {
  status:
    "saved" | "not_newer" | "invalid_stock" | "invalid_csv" | "future_quote";
  tradingDate?: string;
  historyInsertedCount?: number;
};

export type StooqCsvQuoteParser = (
  payload: string,
  instrument: ProviderInstrument,
  receivedAt: Date,
) => StooqCsvParsedData;

export type StooqCsvPrice = {
  tradingDate: string;
  open: string;
  high: string;
  low: string;
  close: string;
  adjustedClose: string | null;
  volume: string;
  currency: "PLN";
  provider: "Stooq CSV";
};

export type StooqCsvParsedData = {
  prices: StooqCsvPrice[];
  latestQuote: NormalizedQuote;
};

export type StooqCsvPersistenceInput = {
  prices: StooqCsvPrice[];
  latestQuote: NormalizedQuote;
  qualityStatus: ReturnType<typeof classifyMarketDataFreshness>;
};

export async function importStooqCsv({
  repository,
  parseQuote,
  userId,
  stockId,
  payload,
  fileName,
  now = new Date(),
}: {
  repository: StooqCsvImportRepository;
  parseQuote: StooqCsvQuoteParser;
  userId: string;
  stockId: string;
  payload: string;
  fileName: string;
  now?: Date;
}): Promise<StooqCsvImportResult> {
  const instrument = await repository.findActiveGpwInstrument(userId, stockId);
  if (!instrument) return { status: "invalid_stock" };

  const runId = await repository.startRun({
    jobType: "stooq_csv_import",
    provider: "Stooq CSV",
    requestedCount: 1,
    metadata: {
      trigger: "file_import",
      market: "GPW",
      stockId,
      fileName,
    },
  });

  let parsedCsv: StooqCsvParsedData;
  try {
    parsedCsv = parseQuote(payload, instrument, now);
  } catch {
    await repository.finishRun(runId, {
      status: "failed",
      successCount: 0,
      failureCount: 1,
      errorSummary: "Uploaded Stooq CSV was invalid.",
      metadata: {
        trigger: "file_import",
        market: "GPW",
        stockId,
        category: "invalid_csv",
      },
    });
    return { status: "invalid_csv" };
  }

  const quote = parsedCsv.latestQuote;
  if (Date.parse(quote.asOf) > now.getTime() + 5 * 60_000) {
    await repository.finishRun(runId, {
      status: "failed",
      successCount: 0,
      failureCount: 1,
      errorSummary: "Uploaded Stooq CSV contains a future EOD quote.",
      metadata: {
        trigger: "file_import",
        market: "GPW",
        stockId,
        category: "future_quote",
        tradingDate: quote.tradingDate,
      },
    });
    return { status: "future_quote", tradingDate: quote.tradingDate };
  }

  const qualityStatus = classifyMarketDataFreshness({
    market: "GPW",
    asOf: quote.asOf,
    now,
  });
  let persistenceResult: Awaited<
    ReturnType<StooqCsvImportRepository["importPrices"]>
  >;
  try {
    persistenceResult = await repository.importPrices({
      prices: parsedCsv.prices,
      latestQuote: quote,
      qualityStatus,
    });
  } catch (error) {
    try {
      await repository.finishRun(runId, {
        status: "failed",
        successCount: 0,
        failureCount: 1,
        errorSummary: "Stooq CSV persistence failed.",
        metadata: {
          trigger: "file_import",
          market: "GPW",
          stockId,
          category: "persistence_failure",
          tradingDate: quote.tradingDate,
        },
      });
    } catch {
      // Operational metadata can be recovered independently from the quote write.
    }
    throw error;
  }
  await repository.finishRun(runId, {
    status: "success",
    successCount: persistenceResult.quoteUpdated ? 1 : 0,
    failureCount: 0,
    errorSummary: null,
    metadata: {
      trigger: "file_import",
      market: "GPW",
      stockId,
      tradingDate: quote.tradingDate,
      historyInsertedCount: persistenceResult.historyInsertedCount,
      skippedCount: persistenceResult.quoteUpdated ? 0 : 1,
    },
  });

  return {
    status: persistenceResult.quoteUpdated ? "saved" : "not_newer",
    tradingDate: quote.tradingDate,
    historyInsertedCount: persistenceResult.historyInsertedCount,
  };
}
