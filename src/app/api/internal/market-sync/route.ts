import { runScheduledMarketSync } from "@/application/sync/run-scheduled-market-sync";
import { createNbpProvider } from "@/infrastructure/fx/nbp/nbp-provider";
import { createEodhdProvider } from "@/infrastructure/market-data/eodhd/eodhd-provider";
import { createSupabaseMarketDataSyncRepository } from "@/infrastructure/supabase/queries/market-data-sync";
import { createServiceClient } from "@/infrastructure/supabase/server/create-service-client";
import { getServerEnv } from "@/lib/env/server";
import { handleScheduledMarketSync } from "./handler";

export const maxDuration = 300;

export async function POST(request: Request) {
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return Response.json(
      { error: "scheduled_sync_not_configured" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return handleScheduledMarketSync(request, {
    cronSecret: env.CRON_SECRET ?? null,
    async run() {
      const serviceClient = createServiceClient();
      if (!serviceClient) throw new Error("service_role_not_configured");
      const deadlineAtMs = Date.now() + 240_000;
      return runScheduledMarketSync({
        repository: createSupabaseMarketDataSyncRepository(serviceClient),
        marketDataProvider: env.EODHD_API_TOKEN
          ? createEodhdProvider(env.EODHD_API_TOKEN, { deadlineAtMs })
          : null,
        fxRateProvider: createNbpProvider({ deadlineAtMs }),
        ownerEmail: env.ALLOWED_USER_EMAIL,
        deadlineAtMs,
      });
    },
  });
}
