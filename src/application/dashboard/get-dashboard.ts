import type { MarketCode } from "@/domain/markets/market";

import { buildDashboardData, filterDashboardSourceByMarket } from "./rules";
import type { DashboardReader } from "./types";

export async function getDashboard(
  reader: DashboardReader,
  userId: string,
  options?: { now?: Date; market?: MarketCode },
) {
  const source = filterDashboardSourceByMarket(
    await reader.read(userId),
    options?.market,
  );
  return buildDashboardData(source, options?.now ?? new Date());
}
