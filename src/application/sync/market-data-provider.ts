import type { CurrencyCode, MarketCode } from "@/domain/markets/market";

export type InstrumentCandidate = {
  provider: string;
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
  provider: string;
  providerSymbol: string;
  market: MarketCode;
  currency: CurrencyCode;
};

export type NormalizedQuote = {
  stockId: string;
  tradingDate: string;
  open: string | null;
  high: string | null;
  low: string | null;
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
  readonly code: string;
  readonly displayName: string;
  search(query: string, market?: MarketCode): Promise<InstrumentCandidate[]>;
  getQuotes(instruments: ProviderInstrument[]): Promise<NormalizedQuote[]>;
}

export type MarketDataProviderRegistry = Partial<
  Record<MarketCode, MarketDataProvider>
>;
