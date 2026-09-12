import type { ReactNode } from "react";

import { getMarketDataStatus } from "@/application/sync/get-market-data-status";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseMarketDataStatusReader } from "@/infrastructure/supabase/queries/market-data-status";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getServerEnv } from "@/lib/env/server";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAllowedUser();
  const client = await createClient();
  let lastSuccessfulSyncAt: string | null = null;
  try {
    ({ lastSuccessfulSyncAt } = await getMarketDataStatus(
      createSupabaseMarketDataStatusReader(client),
    ));
  } catch {
    // The application remains usable when operational metadata is unavailable.
  }
  return (
    <AppShell
      lastSuccessfulSyncAt={lastSuccessfulSyncAt}
      providerConfigured={Boolean(getServerEnv().MASSIVE_API_KEY)}
    >
      {children}
    </AppShell>
  );
}
