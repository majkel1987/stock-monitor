export const MARKET_CODES = ["GPW", "USA"] as const;

export type MarketCode = (typeof MARKET_CODES)[number];
export type CurrencyCode = "PLN" | "USD";
