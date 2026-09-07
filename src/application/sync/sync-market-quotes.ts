import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type { MarketDataProvider } from "./market-data-provider";
import type { MarketDataSyncRepository, SyncFailure } from "./sync-types";

const BATCH_SIZE = 20;
const MANUAL_COOLDOWN_MS = 2 * 60_000;

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
  retryAt: string | null;
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
      category: error.code,
      message: error.message,
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
}: {
  repository: MarketDataSyncRepository;
  provider: MarketDataProvider | null;
  userId: string;
  now?: Date;
  trigger?: "manual" | "scheduled";
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
          retryAt: retryAt.toISOString(),
        };
      }
    }
  }

  const instruments = await repository.loadActiveInstruments(userId);
  const runId = await repository.startRun({
    jobType: trigger === "manual" ? "market_quotes_manual" : "market_quotes",
    provider: "EODHD",
    requestedCount: instruments.length,
    metadata: { trigger, requestedByUserId: userId },
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
      retryAt: null,
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
      retryAt: null,
    };
  }

  let successCount = 0;
  const failures: SyncFailure[] = [];

  for (let offset = 0; offset < instruments.length; offset += BATCH_SIZE) {
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
        else {
          failures.push({
            stockId: instrument.stockId,
            providerSymbol: instrument.providerSymbol,
            category: "quote_older_than_stored",
            message: "A newer or equal quote is already stored.",
          });
        }
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
    successCount === instruments.length
      ? "success"
      : successCount > 0
        ? "partial"
        : "failed";
  await repository.finishRun(runId, {
    status,
    successCount,
    failureCount: failures.length,
    errorSummary:
      failures.length > 0
        ? `${failures.length} of ${instruments.length} quotes were not updated.`
        : null,
    metadata: { trigger, failures: failures.slice(0, 100) },
  });

  console.info("market_data_sync", {
    provider: "EODHD",
    operation: trigger,
    requestedCount: instruments.length,
    successCount,
    failureCount: failures.length,
    durationMs: Date.now() - startedAtMs,
  });

  return {
    status,
    requestedCount: instruments.length,
    successCount,
    failureCount: failures.length,
    retryAt: null,
  };
}
