import type { MarketCode } from "@/domain/markets/market";
import { normalizeTicker } from "@/domain/stocks/ticker";
import type { StockResearchReader } from "./research-types";

export function getStockResearchDetail(
  reader: StockResearchReader,
  userId: string,
  marketCode: MarketCode,
  ticker: string,
) {
  return reader.read(userId, marketCode, normalizeTicker(ticker, marketCode));
}
