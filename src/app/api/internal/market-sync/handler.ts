import "server-only";

import type { ScheduledMarketSyncResult } from "@/application/sync/run-scheduled-market-sync";
import { hasValidCronAuthorization } from "@/lib/security/cron-auth";

const noStore = { "Cache-Control": "no-store" };

export async function handleScheduledMarketSync(
  request: Request,
  dependencies: {
    cronSecret: string | null;
    run(): Promise<ScheduledMarketSyncResult>;
  },
) {
  if (!dependencies.cronSecret) {
    return Response.json(
      { error: "scheduled_sync_not_configured" },
      { status: 503, headers: noStore },
    );
  }
  if (
    !hasValidCronAuthorization(
      request.headers.get("authorization"),
      dependencies.cronSecret,
    )
  ) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  }

  try {
    const result = await dependencies.run();
    return Response.json(
      {
        status: result.status,
        runId: result.runId,
        requested: result.requestedCount,
        success: result.successCount,
        failed: result.failureCount,
      },
      { status: result.status === "failed" ? 500 : 200, headers: noStore },
    );
  } catch {
    return Response.json(
      { error: "scheduled_sync_failed" },
      { status: 500, headers: noStore },
    );
  }
}
