export const MARKET_CODES = ["GPW", "USA"] as const;

export type MarketCode = (typeof MARKET_CODES)[number];
export type CurrencyCode = "PLN" | "USD";

export function isMarketCode(value: string): value is MarketCode {
  return MARKET_CODES.some((code) => code === value);
}
