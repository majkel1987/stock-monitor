import type { ReactNode } from "react";

import { getMarketDataStatus } from "@/application/sync/get-market-data-status";
import { classifyMarketDataConfiguration } from "@/application/sync/market-data-configuration";
import { AppShell } from "@/components/layout/app-shell";
import { getLocale } from "@/i18n/get-locale";
import { LocaleProvider } from "@/i18n/provider";
import { createSupabaseMarketDataStatusReader } from "@/infrastructure/supabase/queries/market-data-status";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getServerEnv } from "@/lib/env/server";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAllowedUser();
  const locale = await getLocale();
  const client = await createClient();
  let lastSuccessfulSyncAt: string | null = null;
  try {
    ({ lastSuccessfulSyncAt } = await getMarketDataStatus(
      createSupabaseMarketDataStatusReader(client),
    ));
  } catch {
    // The application remains usable when operational metadata is unavailable.
  }
  const env = getServerEnv();
  const marketDataConfiguration = classifyMarketDataConfiguration({
    writesConfigured: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    usaProviderConfigured: Boolean(env.MASSIVE_API_KEY),
  });
  return (
    <LocaleProvider key={locale} locale={locale}>
      <AppShell
        lastSuccessfulSyncAt={lastSuccessfulSyncAt}
        marketDataConfiguration={marketDataConfiguration}
      >
        {children}
      </AppShell>
    </LocaleProvider>
  );
}
