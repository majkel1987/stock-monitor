import type { FxRateProvider } from "./fx-rate-provider";
import type { MarketDataProviderRegistry } from "./market-data-provider";
import {
  syncMarketQuotes,
  type MarketQuoteSyncResult,
} from "./sync-market-quotes";
import type { MarketDataSyncRepository } from "./sync-types";
import { syncUsdPlnRate, type FxSyncResult } from "./sync-usd-pln-rate";

export type ManualMarketSyncResult =
  | { status: "locked"; runId: string }
  | {
      status: "completed" | "cooldown" | "failed";
      runId: string;
      quotes: MarketQuoteSyncResult | null;
      fx: FxSyncResult | null;
    };

export async function runManualMarketSync({
  repository,
  marketDataProviders,
  fxRateProvider,
  userId,
  now = new Date(),
  deadlineAtMs,
}: {
  repository: MarketDataSyncRepository;
  marketDataProviders: MarketDataProviderRegistry;
  fxRateProvider: FxRateProvider;
  userId: string;
  now?: Date;
  deadlineAtMs: number;
}): Promise<ManualMarketSyncResult> {
  const startedAtMs = Date.now();
  const claim = await repository.claimSyncLease({
    jobType: "manual_market_sync",
    userId,
    ownerEmail: null,
    staleAfterSeconds: 5 * 60,
    metadata: { trigger: "manual" },
  });
  if (!claim.acquired) {
    console.info("market_data_sync", {
      runId: claim.runId,
      jobType: "manual_market_sync",
      provider: "Stooq/Massive/NBP",
      market: null,
      requestedCount: 0,
      successCount: 0,
      failureCount: 0,
      durationMs: Date.now() - startedAtMs,
      status: "skipped_locked",
    });
    return { status: "locked", runId: claim.runId };
  }

  let quotes: MarketQuoteSyncResult | null = null;
  let fx: FxSyncResult | null = null;
  try {
    quotes = await syncMarketQuotes({
      repository,
      providers: marketDataProviders,
      userId,
      now,
      trigger: "manual",
      deadlineAtMs,
    });
    if (quotes.status === "manual_cooldown") {
      await repository.finishRun(claim.runId, {
        status: "skipped",
        requestedCount: 0,
        successCount: 0,
        failureCount: 0,
        errorSummary: null,
        metadata: { trigger: "manual", reason: "manual_cooldown" },
      });
      console.info("market_data_sync", {
        runId: claim.runId,
        jobType: "manual_market_sync",
        provider: "Stooq/Massive/NBP",
        market: "GPW,USA",
        requestedCount: 0,
        successCount: 0,
        failureCount: 0,
        durationMs: Date.now() - startedAtMs,
        status: "skipped",
      });
      return { status: "cooldown", runId: claim.runId, quotes, fx };
    }

    fx =
      Date.now() < deadlineAtMs - 1_000
        ? await syncUsdPlnRate({ provider: fxRateProvider, repository, now })
        : null;
    const requestedCount = quotes.requestedCount + 1;
    const successCount =
      quotes.successCount + (fx?.status === "success" ? 1 : 0);
    const failureCount =
      quotes.failureCount + (fx?.status === "failed" || !fx ? 1 : 0);
    const status =
      failureCount > 0
        ? successCount > 0
          ? "partial"
          : "failed"
        : quotes.status === "provider_not_configured"
          ? successCount > 0
            ? "partial"
            : "skipped"
          : successCount > 0
            ? "success"
            : "skipped";
    await repository.finishRun(claim.runId, {
      status,
      requestedCount,
      successCount,
      failureCount,
      errorSummary: failureCount
        ? "One or more manual synchronization operations failed."
        : quotes.status === "provider_not_configured"
          ? "provider_not_configured"
          : null,
      metadata: {
        trigger: "manual",
        quoteRunId: quotes.runId,
        fxRunId: fx?.runId ?? null,
        fxSkippedForDeadline: !fx,
      },
    });
    console.info("market_data_sync", {
      runId: claim.runId,
      jobType: "manual_market_sync",
      provider: "Stooq/Massive/NBP",
      market: "GPW,USA",
      requestedCount,
      successCount,
      failureCount,
      durationMs: Date.now() - startedAtMs,
      status,
    });
    return { status: "completed", runId: claim.runId, quotes, fx };
  } catch {
    try {
      await repository.finishRun(claim.runId, {
        status: "failed",
        requestedCount: 1,
        successCount: 0,
        failureCount: 1,
        errorSummary: "Manual synchronization failed unexpectedly.",
        metadata: { trigger: "manual", category: "internal_failure" },
      });
    } catch {
      // A later claim classifies an old running row as abandoned.
    }
    console.error("market_data_sync", {
      runId: claim.runId,
      jobType: "manual_market_sync",
      provider: "Stooq/Massive/NBP",
      market: "GPW,USA",
      requestedCount: 1,
      successCount: 0,
      failureCount: 1,
      durationMs: Date.now() - startedAtMs,
      status: "failed",
    });
    return { status: "failed", runId: claim.runId, quotes, fx };
  }
}
