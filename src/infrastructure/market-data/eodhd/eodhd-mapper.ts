import type {
  InstrumentCandidate,
  NormalizedQuote,
  ProviderInstrument,
} from "@/application/sync/market-data-provider";
import type { CurrencyCode, MarketCode } from "@/domain/markets/market";
import { EodhdError } from "./eodhd-errors";
import type { EodhdQuoteRow, EodhdSearchRow } from "./eodhd-schemas";

const marketBySuffix: Record<string, MarketCode | undefined> = {
  WAR: "GPW",
  US: "USA",
};

function currency(value: string): CurrencyCode | null {
  const normalized = value.toUpperCase();
  return normalized === "PLN" || normalized === "USD" ? normalized : null;
}

export function mapEodhdCandidate(
  row: EodhdSearchRow,
): InstrumentCandidate | null {
  const providerSymbol = row.Code.toUpperCase();
  const separator = providerSymbol.lastIndexOf(".");
  if (separator <= 0) return null;

  const ticker = providerSymbol.slice(0, separator);
  const market = marketBySuffix[providerSymbol.slice(separator + 1)];
  const candidateCurrency = currency(row.Currency);
  if (!market || !candidateCurrency) return null;
  if (
    (market === "GPW" && candidateCurrency !== "PLN") ||
    (market === "USA" && candidateCurrency !== "USD")
  ) {
    return null;
  }

  return {
    provider: "EODHD",
    providerSymbol,
    ticker,
    market,
    name: row.Name,
    exchange: row.Exchange,
    currency: candidateCurrency,
    isin: row.ISIN ?? row.Isin ?? null,
  };
}

export function mapEodhdQuote(
  row: EodhdQuoteRow,
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  const providerSymbol = row.code.toUpperCase();
  if (providerSymbol !== instrument.providerSymbol.toUpperCase()) {
    throw new EodhdError(
      "provider_invalid_response",
      "EODHD returned a quote for an unexpected symbol.",
    );
  }

  const asOf = new Date(row.timestamp * 1_000);
  if (Number.isNaN(asOf.getTime())) {
    throw new EodhdError(
      "provider_invalid_response",
      "EODHD returned an invalid quote timestamp.",
    );
  }

  return {
    stockId: instrument.stockId,
    tradingDate: asOf.toISOString().slice(0, 10),
    open: null,
    high: null,
    low: null,
    price: String(row.close),
    currency: instrument.currency,
    previousClose:
      row.previousClose === null || row.previousClose === undefined
        ? null
        : String(row.previousClose),
    dayChangePct:
      row.change_p === null || row.change_p === undefined
        ? null
        : String(row.change_p),
    volume:
      row.volume === null || row.volume === undefined
        ? null
        : String(row.volume),
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: null,
    asOf: asOf.toISOString(),
    receivedAt: receivedAt.toISOString(),
    provider: "EODHD",
    delayMinutes: 20,
  };
}
