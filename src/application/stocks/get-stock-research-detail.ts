import type { MarketCode } from "@/domain/markets/market";
import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import { normalizeTicker } from "@/domain/stocks/ticker";
import type { StockResearchReader } from "./research-types";

export async function getStockResearchDetail(
  reader: StockResearchReader,
  userId: string,
  marketCode: MarketCode,
  ticker: string,
  now = new Date(),
) {
  const detail = await reader.read(
    userId,
    marketCode,
    normalizeTicker(ticker, marketCode),
  );
  if (!detail?.quote) return detail;
  return {
    ...detail,
    quote: {
      ...detail.quote,
      qualityStatus: classifyMarketDataFreshness({
        market: detail.stock.marketCode,
        asOf: detail.quote.asOf,
        now,
      }),
    },
  };
}
