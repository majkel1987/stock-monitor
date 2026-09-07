import type { CurrencyCode, MarketCode } from "@/domain/markets/market";

export type InstrumentCandidate = {
  providerSymbol: string;
  ticker: string;
  market: MarketCode;
  name: string;
  exchange: string;
  currency: CurrencyCode;
  isin: string | null;
};

export type ProviderInstrument = {
  stockId: string;
  providerSymbol: string;
  market: MarketCode;
  currency: CurrencyCode;
};

export type NormalizedQuote = {
  stockId: string;
  price: string;
  currency: CurrencyCode;
  previousClose: string | null;
  dayChangePct: string | null;
  volume: string | null;
  fiftyTwoWeekHigh: string | null;
  fiftyTwoWeekLow: string | null;
  marketCap: string | null;
  asOf: string;
  receivedAt: string;
  provider: string;
  delayMinutes: number | null;
};

export interface MarketDataProvider {
  search(query: string, market?: MarketCode): Promise<InstrumentCandidate[]>;
  getQuotes(instruments: ProviderInstrument[]): Promise<NormalizedQuote[]>;
}
