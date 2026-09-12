import "server-only";

import type { MarketDataProviderRegistry } from "@/application/sync/market-data-provider";
import { createMassiveProvider } from "./massive/massive-provider";

export function createMarketDataProviders(
  configuration: {
    massiveApiKey?: string;
  },
  options: { deadlineAtMs?: number } = {},
): MarketDataProviderRegistry {
  return {
    ...(configuration.massiveApiKey
      ? { USA: createMassiveProvider(configuration.massiveApiKey, options) }
      : {}),
  };
}
