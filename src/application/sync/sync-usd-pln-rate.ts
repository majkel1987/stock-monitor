import type { FxRateProvider } from "./fx-rate-provider";
import type { MarketDataSyncRepository } from "./sync-types";

export type FxSyncResult = {
  status: "success" | "failed";
  runId: string;
};

export async function syncUsdPlnRate({
  provider,
  repository,
  now = new Date(),
}: {
  provider: FxRateProvider;
  repository: MarketDataSyncRepository;
  now?: Date;
}): Promise<FxSyncResult> {
  const startedAtMs = Date.now();
  const runId = await repository.startRun({
    jobType: "fx_usd_pln",
    provider: "NBP",
    requestedCount: 1,
    metadata: {},
  });

  try {
    const rate = await provider.getUsdPln();
    await repository.upsertFxRate(rate, now.toISOString());
    await repository.finishRun(runId, {
      status: "success",
      successCount: 1,
      failureCount: 0,
      errorSummary: null,
      metadata: { effectiveDate: rate.effectiveDate },
    });
    console.info("market_data_sync", {
      provider: "NBP",
      runId,
      operation: "fx_usd_pln",
      requestedCount: 1,
      successCount: 1,
      failureCount: 0,
      durationMs: Date.now() - startedAtMs,
      status: "success",
    });
    return { status: "success", runId };
  } catch {
    await repository.finishRun(runId, {
      status: "failed",
      successCount: 0,
      failureCount: 1,
      errorSummary: "fx_unavailable",
      metadata: { category: "fx_unavailable" },
    });
    console.info("market_data_sync", {
      provider: "NBP",
      runId,
      operation: "fx_usd_pln",
      requestedCount: 1,
      successCount: 0,
      failureCount: 1,
      durationMs: Date.now() - startedAtMs,
      status: "failed",
    });
    return { status: "failed", runId };
  }
}
