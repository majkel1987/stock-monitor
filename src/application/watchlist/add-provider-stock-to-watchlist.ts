import type { InstrumentCandidate } from "@/application/sync/market-data-provider";
import type { WatchlistWriter } from "./types";

export function addProviderStockToWatchlist(
  writer: WatchlistWriter,
  userId: string,
  candidate: InstrumentCandidate,
  initialStatusId: string,
) {
  return writer.addProviderStock(userId, candidate, initialStatusId);
}
