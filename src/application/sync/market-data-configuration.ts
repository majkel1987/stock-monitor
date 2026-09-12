export type MarketDataConfiguration = "ready" | "manual" | "incomplete";

export function classifyMarketDataConfiguration({
  writesConfigured,
  usaProviderConfigured,
}: {
  writesConfigured: boolean;
  usaProviderConfigured: boolean;
}): MarketDataConfiguration {
  if (!writesConfigured) return "incomplete";
  return usaProviderConfigured ? "ready" : "manual";
}
