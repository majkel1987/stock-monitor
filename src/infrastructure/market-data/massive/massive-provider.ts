import "server-only";

import type {
  InstrumentCandidate,
  MarketDataProvider,
  NormalizedQuote,
  ProviderInstrument,
} from "@/application/sync/market-data-provider";
import type { MarketCode } from "@/domain/markets/market";
import { zonedDateParts } from "@/domain/markets/market-session";
import { HttpMassiveClient, type MassiveClient } from "./massive-client";
import { MassiveError } from "./massive-errors";
import {
  massivePreviousDayResponseSchema,
  massiveTickerResponseSchema,
  type MassivePreviousDayRow,
} from "./massive-schemas";

function mapPreviousDay(
  row: MassivePreviousDayRow,
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  if (row.T.toUpperCase() !== instrument.providerSymbol.toUpperCase()) {
    throw new MassiveError(
      "provider_invalid_response",
      "Massive returned a quote for an unexpected symbol.",
    );
  }
  const timestamp = new Date(row.t);
  const tradingDate = zonedDateParts(timestamp, "America/New_York")?.date;
  if (!tradingDate) {
    throw new MassiveError(
      "provider_invalid_response",
      "Massive returned an invalid trading date.",
    );
  }
  return {
    stockId: instrument.stockId,
    tradingDate,
    open: String(row.o),
    high: String(row.h),
    low: String(row.l),
    price: String(row.c),
    currency: "USD",
    previousClose: null,
    dayChangePct: null,
    volume: String(row.v),
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: null,
    asOf: timestamp.toISOString(),
    receivedAt: receivedAt.toISOString(),
    provider: "Massive",
    delayMinutes: null,
  };
}

export class MassiveMarketDataProvider implements MarketDataProvider {
  readonly code = "MASSIVE";
  readonly displayName = "Massive";

  constructor(
    private readonly client: MassiveClient,
    private readonly now = () => new Date(),
  ) {}

  async search(
    query: string,
    market?: MarketCode,
  ): Promise<InstrumentCandidate[]> {
    if (market && market !== "USA") return [];
    const parsed = massiveTickerResponseSchema.safeParse(
      await this.client.search(query),
    );
    if (!parsed.success || parsed.data.status.toUpperCase() !== "OK") {
      throw new MassiveError(
        "provider_invalid_response",
        "Massive returned an invalid ticker response.",
      );
    }
    return parsed.data.results
      .filter((row) => row.market.toLowerCase() === "stocks")
      .filter((row) => row.currency_name?.toLowerCase() === "usd")
      .map((row) => ({
        provider: this.code,
        providerSymbol: row.ticker.toUpperCase(),
        ticker: row.ticker.toUpperCase(),
        market: "USA" as const,
        name: row.name,
        exchange: row.primary_exchange ?? "USA",
        currency: "USD" as const,
        isin: null,
      }));
  }

  async getQuotes(instruments: ProviderInstrument[]) {
    const quotes: NormalizedQuote[] = [];
    let lastError: unknown;
    for (const instrument of instruments) {
      if (
        instrument.market !== "USA" ||
        instrument.provider.toUpperCase() !== this.code
      )
        continue;
      try {
        const parsed = massivePreviousDayResponseSchema.safeParse(
          await this.client.previousDay(instrument.providerSymbol),
        );
        if (
          !parsed.success ||
          parsed.data.status.toUpperCase() !== "OK" ||
          parsed.data.results.length !== 1
        ) {
          continue;
        }
        quotes.push(
          mapPreviousDay(parsed.data.results[0]!, instrument, this.now()),
        );
      } catch (error) {
        lastError = error;
        // Per-symbol failures are reported by the synchronization use case.
      }
    }
    if (quotes.length === 0 && lastError) throw lastError;
    return quotes;
  }
}

export function createMassiveProvider(
  apiKey: string,
  options: { deadlineAtMs?: number } = {},
) {
  return new MassiveMarketDataProvider(
    new HttpMassiveClient(
      apiKey,
      fetch,
      8_000,
      options.deadlineAtMs ?? Number.POSITIVE_INFINITY,
    ),
  );
}
