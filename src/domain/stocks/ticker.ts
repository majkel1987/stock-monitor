import type { MarketCode } from "@/domain/markets/market";

const MAX_TICKER_LENGTH = 16;
const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]*$/;

export class InvalidTickerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTickerError";
  }
}

export function normalizeTicker(rawTicker: string, market: MarketCode) {
  let ticker = rawTicker.trim().toUpperCase();

  if (market === "GPW") {
    ticker = ticker.replace(/\.(WAR|WA)$/, "");
  }

  if (!ticker) {
    throw new InvalidTickerError("Ticker is required.");
  }

  if (ticker.length > MAX_TICKER_LENGTH || !TICKER_PATTERN.test(ticker)) {
    throw new InvalidTickerError(
      "Use 1–16 letters, numbers, dots, or hyphens for the ticker.",
    );
  }

  return ticker;
}
