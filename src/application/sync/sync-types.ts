import type { FxRate } from "./fx-rate-provider";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type { MarketCode } from "@/domain/markets/market";
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

export type SyncLeaseClaim = {
  runId: string;
  userId: string | null;
  acquired: boolean;
  reason: string | null;
};

export interface MarketDataSyncRepository {
  latestManualAttemptAt(): Promise<string | null>;
  latestFxEffectiveDate(): Promise<string | null>;
  claimSyncLease(input: {
    jobType: "scheduled_market_sync" | "manual_market_sync";
    userId: string | null;
    ownerEmail: string | null;
    staleAfterSeconds: number;
    metadata: Record<string, unknown>;
  }): Promise<SyncLeaseClaim>;
  loadActiveInstruments(
    userId: string,
    markets?: MarketCode[],
  ): Promise<ProviderInstrument[]>;
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
      requestedCount?: number;
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
