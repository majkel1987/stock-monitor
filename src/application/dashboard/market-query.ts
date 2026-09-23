import { isMarketCode, type MarketCode } from "@/domain/markets/market";

export type DashboardMarketFilter = MarketCode | "ALL";

export function parseDashboardMarket(
  value: string | string[] | undefined,
): MarketCode | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase();
  return isMarketCode(normalized) ? normalized : undefined;
}

export function resolveDashboardMarketFilter(
  value: string | string[] | undefined,
): DashboardMarketFilter {
  return parseDashboardMarket(value) ?? "ALL";
}
