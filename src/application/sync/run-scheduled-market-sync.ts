import { scheduledWorkDue } from "@/domain/markets/scheduling";
import type { FxRateProvider } from "./fx-rate-provider";
import type { MarketDataProviderRegistry } from "./market-data-provider";
import { syncMarketQuotes } from "./sync-market-quotes";
import type { MarketDataSyncRepository } from "./sync-types";
import { syncUsdPlnRate } from "./sync-usd-pln-rate";

const STALE_LEASE_SECONDS = 5 * 60;

export type ScheduledMarketSyncResult = {
  status:
    | "success"
    | "partial"
    | "failed"
    | "skipped"
    | "not_due"
    | "skipped_locked"
    | "provider_not_configured";
  runId: string;
  requestedCount: number;
  successCount: number;
  failureCount: number;
};

export async function runScheduledMarketSync({
  repository,
  marketDataProviders,
  fxRateProvider,
  ownerEmail,
  now = new Date(),
  deadlineAtMs,
}: {
  repository: MarketDataSyncRepository;
  marketDataProviders: MarketDataProviderRegistry;
  fxRateProvider: FxRateProvider;
  ownerEmail: string;
  now?: Date;
  deadlineAtMs: number;
}): Promise<ScheduledMarketSyncResult> {
  const startedAtMs = Date.now();
  const claim = await repository.claimSyncLease({
    jobType: "scheduled_market_sync",
    userId: null,
    ownerEmail,
    staleAfterSeconds: STALE_LEASE_SECONDS,
    metadata: { trigger: "scheduled" },
  });

  if (!claim.acquired || !claim.userId) {
    const failed = claim.reason === "owner_not_found";
    const resultStatus = failed ? "failed" : "skipped_locked";
    const log = failed ? console.error : console.info;
    log("market_data_sync", {
      runId: claim.runId,
      jobType: "scheduled_market_sync",
      provider: "Massive/NBP",
      market: null,
      requestedCount: 0,
      successCount: 0,
      failureCount: failed ? 1 : 0,
      durationMs: Date.now() - startedAtMs,
      status: resultStatus,
    });
    return {
      status: resultStatus,
      runId: claim.runId,
      requestedCount: 0,
      successCount: 0,
      failureCount: failed ? 1 : 0,
    };
  }

  let requestedCount = 0;
  let successCount = 0;
  let failureCount = 0;

  try {
    const latestFxEffectiveDate = await repository.latestFxEffectiveDate();
    const due = scheduledWorkDue({ now, latestFxEffectiveDate });
    const automatedMarkets = due.markets.filter((market) => market === "USA");
    if (automatedMarkets.length === 0 && !due.fx) {
      await repository.finishRun(claim.runId, {
        status: "skipped",
        requestedCount: 0,
        successCount: 0,
        failureCount: 0,
        errorSummary: null,
        metadata: { trigger: "scheduled", reason: "not_due" },
      });
      console.info("market_data_sync", {
        runId: claim.runId,
        jobType: "scheduled_market_sync",
        provider: "Massive/NBP",
        market: null,
        requestedCount: 0,
        successCount: 0,
        failureCount: 0,
        durationMs: Date.now() - startedAtMs,
        status: "not_due",
      });
      return {
        status: "not_due",
        runId: claim.runId,
        requestedCount: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    const quoteResult = automatedMarkets.length
      ? await syncMarketQuotes({
          repository,
          providers: marketDataProviders,
          userId: claim.userId,
          now,
          trigger: "scheduled",
          markets: automatedMarkets,
          deadlineAtMs,
        })
      : null;
    requestedCount += quoteResult?.requestedCount ?? 0;
    successCount += quoteResult?.successCount ?? 0;
    failureCount += quoteResult?.failureCount ?? 0;

    const fxResult =
      due.fx && Date.now() < deadlineAtMs - 1_000
        ? await syncUsdPlnRate({
            provider: fxRateProvider,
            repository,
            now,
          })
        : null;
    if (due.fx) requestedCount += 1;
    if (fxResult?.status === "success") successCount += 1;
    if (fxResult?.status === "failed" || (due.fx && !fxResult)) {
      failureCount += 1;
    }

    const providerNotConfigured =
      quoteResult?.status === "provider_not_configured";
    const runStatus =
      failureCount > 0
        ? successCount > 0
          ? "partial"
          : "failed"
        : providerNotConfigured
          ? successCount > 0
            ? "partial"
            : "skipped"
          : successCount > 0
            ? "success"
            : "skipped";
    await repository.finishRun(claim.runId, {
      status: runStatus,
      requestedCount,
      successCount,
      failureCount,
      errorSummary: failureCount
        ? "One or more scheduled synchronization operations failed."
        : providerNotConfigured
          ? "provider_not_configured"
          : null,
      metadata: {
        trigger: "scheduled",
        markets: automatedMarkets,
        fxDue: due.fx,
        quoteRunId: quoteResult?.runId ?? null,
        fxRunId: fxResult?.runId ?? null,
      },
    });

    const resultStatus =
      providerNotConfigured && failureCount === 0
        ? "provider_not_configured"
        : runStatus;
    console.info("market_data_sync", {
      runId: claim.runId,
      jobType: "scheduled_market_sync",
      provider: "Massive/NBP",
      market: automatedMarkets.join(",") || null,
      requestedCount,
      successCount,
      failureCount,
      durationMs: Date.now() - startedAtMs,
      status: resultStatus,
    });
    return {
      status: resultStatus,
      runId: claim.runId,
      requestedCount,
      successCount,
      failureCount,
    };
  } catch {
    failureCount = Math.max(1, failureCount);
    requestedCount = Math.max(failureCount, requestedCount);
    try {
      await repository.finishRun(claim.runId, {
        status: "failed",
        requestedCount,
        successCount,
        failureCount,
        errorSummary: "Scheduled synchronization failed unexpectedly.",
        metadata: { trigger: "scheduled", category: "internal_failure" },
      });
    } catch {
      // A later claim classifies an old running row as abandoned.
    }
    console.error("market_data_sync", {
      runId: claim.runId,
      jobType: "scheduled_market_sync",
      provider: "Massive/NBP",
      market: null,
      requestedCount,
      successCount,
      failureCount,
      durationMs: Date.now() - startedAtMs,
      status: "failed",
    });
    return {
      status: "failed",
      runId: claim.runId,
      requestedCount,
      successCount,
      failureCount,
    };
  }
}
