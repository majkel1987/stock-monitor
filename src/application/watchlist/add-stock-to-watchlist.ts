import { normalizeTicker } from "@/domain/stocks/ticker";
import type { AddStockInput, AddStockResult, WatchlistWriter } from "./types";

export async function addStockToWatchlist(
  writer: WatchlistWriter,
  userId: string,
  input: AddStockInput,
): Promise<AddStockResult> {
  return writer.addManualStock(userId, {
    ...input,
    name: input.name.trim(),
    ticker: normalizeTicker(input.ticker, input.marketCode),
  });
}
