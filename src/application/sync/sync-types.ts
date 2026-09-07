import type { FxRate } from "./fx-rate-provider";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type {
  NormalizedQuote,
  ProviderInstrument,
} from "./market-data-provider";

export type SyncRunStatus =
  "running" | "success" | "partial" | "failed" | "skipped";

export type SyncFailure = {
  stockId: string | null;
  providerSymbol: string | null;
  category: string;
  message: string;
};

export interface MarketDataSyncRepository {
  latestManualAttemptAt(): Promise<string | null>;
  loadActiveInstruments(userId: string): Promise<ProviderInstrument[]>;
  startRun(input: {
    jobType: string;
    provider: string;
    requestedCount: number;
    metadata: Record<string, unknown>;
  }): Promise<string>;
  finishRun(
    runId: string,
    input: {
      status: Exclude<SyncRunStatus, "running">;
      successCount: number;
      failureCount: number;
      errorSummary: string | null;
      metadata: Record<string, unknown>;
    },
  ): Promise<void>;
  upsertQuote(
    quote: NormalizedQuote,
    qualityStatus: MarketDataFreshness,
  ): Promise<boolean>;
  upsertFxRate(rate: FxRate, receivedAt: string): Promise<boolean>;
}
