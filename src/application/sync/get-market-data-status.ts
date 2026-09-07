export type SyncRunSummary = {
  id: string;
  jobType: string;
  provider: string;
  status: "running" | "success" | "partial" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string | null;
  requestedCount: number;
  successCount: number;
  failureCount: number;
  errorSummary: string | null;
};

export type MarketDataStatus = {
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  lastFailureAt: string | null;
  providerCoverageCount: number;
  latestFx: {
    rate: string;
    effectiveDate: string;
    asOf: string;
    provider: string;
  } | null;
  recentRuns: SyncRunSummary[];
};

export interface MarketDataStatusReader {
  read(): Promise<MarketDataStatus>;
}

export function getMarketDataStatus(reader: MarketDataStatusReader) {
  return reader.read();
}
