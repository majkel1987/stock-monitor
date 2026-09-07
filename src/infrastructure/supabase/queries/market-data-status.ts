import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MarketDataStatusReader,
  SyncRunSummary,
} from "@/application/sync/get-market-data-status";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

const syncStatuses = new Set<SyncRunSummary["status"]>([
  "running",
  "success",
  "partial",
  "failed",
  "skipped",
]);

export class MarketDataStatusInfrastructureError extends Error {
  constructor() {
    super("Market data status could not be loaded.");
    this.name = "MarketDataStatusInfrastructureError";
  }
}

export function createSupabaseMarketDataStatusReader(
  client: SupabaseClient<Database>,
): MarketDataStatusReader {
  return {
    async read() {
      const [
        runsResult,
        lastSuccessResult,
        lastFailureResult,
        coverageResult,
        fxResult,
      ] = await Promise.all([
        client
          .from("sync_runs")
          .select(
            "id,job_type,provider,status,started_at,finished_at,requested_count,success_count,failure_count,error_summary",
          )
          .order("started_at", { ascending: false })
          .limit(20),
        client
          .from("sync_runs")
          .select("started_at,finished_at")
          .eq("status", "success")
          .order("finished_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from("sync_runs")
          .select("started_at,finished_at")
          .in("status", ["failed", "partial"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from("stock_provider_symbols")
          .select("id", { count: "exact", head: true })
          .eq("provider", "EODHD")
          .eq("is_primary", true),
        client
          .from("fx_rates")
          .select("rate,effective_date,as_of,provider")
          .eq("pair", "USDPLN")
          .order("effective_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (
        runsResult.error ||
        lastSuccessResult.error ||
        lastFailureResult.error ||
        coverageResult.error ||
        fxResult.error
      ) {
        throw new MarketDataStatusInfrastructureError();
      }

      const recentRuns = runsResult.data.map((run): SyncRunSummary => {
        if (!syncStatuses.has(run.status as SyncRunSummary["status"])) {
          throw new MarketDataStatusInfrastructureError();
        }
        return {
          id: run.id,
          jobType: run.job_type,
          provider: run.provider,
          status: run.status as SyncRunSummary["status"],
          startedAt: run.started_at,
          finishedAt: run.finished_at,
          requestedCount: run.requested_count,
          successCount: run.success_count,
          failureCount: run.failure_count,
          errorSummary: run.error_summary,
        };
      });
      const fx = fxResult.data;

      return {
        lastSuccessfulSyncAt:
          lastSuccessResult.data?.finished_at ??
          lastSuccessResult.data?.started_at ??
          null,
        lastAttemptAt: recentRuns[0]?.startedAt ?? null,
        lastFailureAt:
          lastFailureResult.data?.finished_at ??
          lastFailureResult.data?.started_at ??
          null,
        providerCoverageCount: coverageResult.count ?? 0,
        latestFx: fx
          ? {
              rate: String(fx.rate),
              effectiveDate: fx.effective_date,
              asOf: fx.as_of,
              provider: fx.provider,
            }
          : null,
        recentRuns,
      };
    },
  };
}
