import "server-only";

import type { MarketDataProviderRegistry } from "@/application/sync/market-data-provider";
import { createMassiveProvider } from "./massive/massive-provider";
import { createStooqProvider } from "./stooq/stooq-provider";

export function createMarketDataProviders(
  configuration: {
    massiveApiKey?: string;
  },
  options: { deadlineAtMs?: number } = {},
): MarketDataProviderRegistry {
  return {
    GPW: createStooqProvider(options),
    ...(configuration.massiveApiKey
      ? { USA: createMassiveProvider(configuration.massiveApiKey, options) }
      : {}),
  };
}
