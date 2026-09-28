import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type { ProviderInstrument } from "./market-data-provider";
import type {
  StooqCsvImportRepository,
  StooqCsvParsedData,
} from "./import-stooq-csv";

export async function importStooqWatchlistCsv({
  repository,
  parseFile,
  userId,
  payload,
  fileName,
  now = new Date(),
}: {
  repository: StooqCsvImportRepository;
  parseFile: (
    payload: string,
    instruments: ProviderInstrument[],
    now: Date,
  ) => StooqCsvParsedData[];
  userId: string;
  payload: string;
  fileName: string;
  now?: Date;
}) {
  const instruments = await repository.loadActiveGpwImportInstruments(userId);
  if (!instruments.length) return { status: "invalid_stock" as const };
  const metadata = {
    trigger: "file_import",
    market: "GPW",
    scope: "watchlist",
    fileName,
  };
  const runId = await repository.startRun({
    jobType: "stooq_csv_import",
    provider: "Stooq CSV",
    requestedCount: instruments.length,
    metadata,
  });
  let parsed: StooqCsvParsedData[];
  try {
    parsed = parseFile(payload, instruments, now);
  } catch {
    await repository.finishRun(runId, {
      status: "failed",
      successCount: 0,
      failureCount: instruments.length,
      errorSummary: "Uploaded Stooq CSV was invalid.",
      metadata,
    });
    return { status: "invalid_csv" as const };
  }
  const missingCount = instruments.length - parsed.length;
  let updatedCount = 0;
  let unchangedCount = 0;
  let failureCount = 0;
  let historyInsertedCount = 0;
  const failures: { stockId: string; category: string }[] = [];
  for (const data of parsed) {
    const quote = data.latestQuote;
    if (Date.parse(quote.asOf) > now.getTime() + 5 * 60_000) {
      failureCount += 1;
      failures.push({ stockId: quote.stockId, category: "future_quote" });
      continue;
    }
    try {
      const result = await repository.importPrices({
        ...data,
        qualityStatus: classifyMarketDataFreshness({
          market: "GPW",
          asOf: quote.asOf,
          now,
        }),
      });
      historyInsertedCount += result.historyInsertedCount;
      if (result.quoteUpdated) updatedCount += 1;
      else unchangedCount += 1;
    } catch {
      failureCount += 1;
      failures.push({
        stockId: quote.stockId,
        category: "persistence_failure",
      });
    }
  }
  const status: "no_matches" | "partial" | "failed" | "success" = !parsed.length
    ? "no_matches"
    : failureCount
      ? updatedCount + unchangedCount
        ? "partial"
        : "failed"
      : "success";
  await repository.finishRun(runId, {
    status: status === "no_matches" ? "skipped" : status,
    successCount: updatedCount,
    failureCount,
    errorSummary: failureCount
      ? "Some Stooq CSV stocks could not be imported."
      : null,
    metadata: {
      ...metadata,
      missingCount,
      skippedCount: missingCount + unchangedCount,
      historyInsertedCount,
      failures,
    },
  });
  return {
    status,
    updatedCount,
    unchangedCount,
    missingCount,
    failureCount,
    historyInsertedCount,
  };
}
