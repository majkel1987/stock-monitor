import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type { MarketCode } from "@/domain/markets/market";
import type { MarketDataProviderRegistry } from "./market-data-provider";
import type { MarketDataSyncRepository, SyncFailure } from "./sync-types";

const BATCH_SIZE = 20;
const MANUAL_COOLDOWN_MS = 2 * 60_000;
const MAX_FAILURE_MESSAGE_LENGTH = 240;
const MARKETS = ["GPW", "USA"] as const;

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

function providerName(market: MarketCode) {
  return market === "GPW" ? "Stooq" : "Massive";
}

function providerLabel(markets: readonly MarketCode[]) {
  return [...new Set(markets.map(providerName))].join("/") || "Stooq/Massive";
}

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
  providers,
  userId,
  now = new Date(),
  trigger = "manual",
  markets,
  deadlineAtMs = Number.POSITIVE_INFINITY,
}: {
  repository: MarketDataSyncRepository;
  providers: MarketDataProviderRegistry;
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

  const selectedMarkets = markets ?? [...MARKETS];
  const instruments = await repository.loadActiveInstruments(
    userId,
    selectedMarkets,
  );
  const runId = await repository.startRun({
    jobType: trigger === "manual" ? "market_quotes_manual" : "market_quotes",
    provider: providerLabel(selectedMarkets),
    requestedCount: instruments.length,
    metadata: { trigger, markets: selectedMarkets },
  });

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

  const configuredInstrumentCount = instruments.filter(
    (instrument) => providers[instrument.market],
  ).length;
  if (configuredInstrumentCount === 0) {
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

  let successCount = 0;
  let skippedCount = 0;
  const failures: SyncFailure[] = [];

  for (const market of selectedMarkets) {
    const marketInstruments = instruments.filter(
      (instrument) => instrument.market === market,
    );
    if (marketInstruments.length === 0) continue;
    const provider = providers[market];
    if (!provider) {
      for (const instrument of marketInstruments) {
        failures.push({
          stockId: instrument.stockId,
          providerSymbol: instrument.providerSymbol,
          category: "provider_not_configured",
          message: `${providerName(market)} is not configured.`,
        });
      }
      continue;
    }

    for (
      let offset = 0;
      offset < marketInstruments.length;
      offset += BATCH_SIZE
    ) {
      if (Date.now() >= deadlineAtMs - 1_000) {
        for (const instrument of marketInstruments.slice(offset)) {
          failures.push({
            stockId: instrument.stockId,
            providerSymbol: instrument.providerSymbol,
            category: "deadline_exceeded",
            message: "The synchronization soft deadline was reached.",
          });
        }
        break;
      }
      const batch = marketInstruments.slice(offset, offset + BATCH_SIZE);
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
      markets: selectedMarkets,
      skippedCount,
      failures: failures.slice(0, 100),
    },
  });

  console.info("market_data_sync", {
    provider: providerLabel(selectedMarkets),
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
