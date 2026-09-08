import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type { MarketCode } from "@/domain/markets/market";
import type { MarketDataProvider } from "./market-data-provider";
import type { MarketDataSyncRepository, SyncFailure } from "./sync-types";

const BATCH_SIZE = 20;
const MANUAL_COOLDOWN_MS = 2 * 60_000;
const MAX_FAILURE_MESSAGE_LENGTH = 240;

export type MarketQuoteSyncResult = {
  status:
    | "success"
    | "partial"
    | "failed"
    | "skipped"
    | "manual_cooldown"
    | "provider_not_configured";
  requestedCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  retryAt: string | null;
  runId: string | null;
};

function failureFor(
  stockId: string | null,
  providerSymbol: string | null,
  error: unknown,
): SyncFailure {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return {
      stockId,
      providerSymbol,
      category: error.code.slice(0, 64),
      message: error.message.slice(0, MAX_FAILURE_MESSAGE_LENGTH),
    };
  }
  return {
    stockId,
    providerSymbol,
    category: "provider_unavailable",
    message: "The market-data provider request failed.",
  };
}

export async function syncMarketQuotes({
  repository,
  provider,
  userId,
  now = new Date(),
  trigger = "manual",
  markets,
  deadlineAtMs = Number.POSITIVE_INFINITY,
}: {
  repository: MarketDataSyncRepository;
  provider: MarketDataProvider | null;
  userId: string;
  now?: Date;
  trigger?: "manual" | "scheduled";
  markets?: MarketCode[];
  deadlineAtMs?: number;
}): Promise<MarketQuoteSyncResult> {
  const startedAtMs = Date.now();
  if (trigger === "manual") {
    const latestAttempt = await repository.latestManualAttemptAt();
    if (latestAttempt) {
      const retryAt = new Date(Date.parse(latestAttempt) + MANUAL_COOLDOWN_MS);
      if (retryAt.getTime() > now.getTime()) {
        return {
          status: "manual_cooldown",
          requestedCount: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          retryAt: retryAt.toISOString(),
          runId: null,
        };
      }
    }
  }

  const instruments = await repository.loadActiveInstruments(userId, markets);
  const runId = await repository.startRun({
    jobType: trigger === "manual" ? "market_quotes_manual" : "market_quotes",
    provider: "EODHD",
    requestedCount: instruments.length,
    metadata: { trigger, markets: markets ?? ["GPW", "USA"] },
  });

  if (!provider) {
    await repository.finishRun(runId, {
      status: "skipped",
      successCount: 0,
      failureCount: 0,
      errorSummary: "provider_not_configured",
      metadata: { trigger, reason: "provider_not_configured" },
    });
    return {
      status: "provider_not_configured",
      requestedCount: instruments.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: instruments.length,
      retryAt: null,
      runId,
    };
  }

  if (instruments.length === 0) {
    await repository.finishRun(runId, {
      status: "skipped",
      successCount: 0,
      failureCount: 0,
      errorSummary: null,
      metadata: { trigger, reason: "no_provider_mappings" },
    });
    return {
      status: "skipped",
      requestedCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      retryAt: null,
      runId,
    };
  }

  let successCount = 0;
  let skippedCount = 0;
  const failures: SyncFailure[] = [];

  for (let offset = 0; offset < instruments.length; offset += BATCH_SIZE) {
    if (Date.now() >= deadlineAtMs - 1_000) {
      for (const instrument of instruments.slice(offset)) {
        failures.push({
          stockId: instrument.stockId,
          providerSymbol: instrument.providerSymbol,
          category: "deadline_exceeded",
          message: "The synchronization soft deadline was reached.",
        });
      }
      break;
    }
    const batch = instruments.slice(offset, offset + BATCH_SIZE);
    try {
      const quotes = await provider.getQuotes(batch);
      const quoteByStock = new Map(
        quotes.map((quote) => [quote.stockId, quote]),
      );

      for (const instrument of batch) {
        const quote = quoteByStock.get(instrument.stockId);
        if (!quote) {
          failures.push({
            stockId: instrument.stockId,
            providerSymbol: instrument.providerSymbol,
            category: "provider_invalid_response",
            message: "Provider response did not include this symbol.",
          });
          continue;
        }
        if (quote.currency !== instrument.currency) {
          failures.push({
            stockId: instrument.stockId,
            providerSymbol: instrument.providerSymbol,
            category: "currency_mismatch",
            message:
              "Quote currency differs from the canonical stock currency.",
          });
          continue;
        }

        const qualityStatus = classifyMarketDataFreshness({
          market: instrument.market,
          asOf: quote.asOf,
          now,
          expectedDelayMinutes: quote.delayMinutes ?? 20,
        });
        const saved = await repository.upsertQuote(quote, qualityStatus);
        if (saved) successCount += 1;
        else skippedCount += 1;
      }
    } catch (error) {
      for (const instrument of batch) {
        failures.push(
          failureFor(instrument.stockId, instrument.providerSymbol, error),
        );
      }
    }
  }

  const status =
    failures.length === 0 ? "success" : successCount > 0 ? "partial" : "failed";
  await repository.finishRun(runId, {
    status,
    successCount,
    failureCount: failures.length,
    errorSummary:
      failures.length > 0
        ? `${failures.length} of ${instruments.length} quotes were not updated.`
        : null,
    metadata: {
      trigger,
      markets: markets ?? ["GPW", "USA"],
      skippedCount,
      failures: failures.slice(0, 100),
    },
  });

  console.info("market_data_sync", {
    provider: "EODHD",
    runId,
    operation: trigger,
    requestedCount: instruments.length,
    successCount,
    failureCount: failures.length,
    skippedCount,
    durationMs: Date.now() - startedAtMs,
    status,
  });

  return {
    status,
    requestedCount: instruments.length,
    successCount,
    failureCount: failures.length,
    skippedCount,
    retryAt: null,
    runId,
  };
}
